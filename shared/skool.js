import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { connectToChrome } from './chrome-ai.js';

function stripSkoolRichTextPrefix(value) {
  if (typeof value !== 'string') return value;
  return value.startsWith('[v2]') ? value.slice(4) : value;
}

export function parseSkoolJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;

  const trimmed = stripSkoolRichTextPrefix(value).trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function sanitizeFileName(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function openSkoolPage(url, options = {}) {
  const browser = await connectToChrome();
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: options.waitUntil || 'networkidle2',
    timeout: options.timeout || 120000,
  });
  return page;
}

export async function getNextData(page) {
  return page.evaluate(() => JSON.parse(document.querySelector('#__NEXT_DATA__')?.textContent || '{}'));
}

export async function getCourseSnapshot(page) {
  const nextData = await getNextData(page);
  const pageProps = nextData?.props?.pageProps || {};
  const course = pageProps.course || {};
  const root = course.course || {};
  const children = course.children || [];

  return {
    pageProps,
    selectedModuleId: pageProps.selectedModule || null,
    course: {
      id: root.id || null,
      slug: root.name || null,
      title: root.metadata?.title || null,
      description: root.metadata?.desc || null,
    },
    modules: children.map((child) => {
      const module = child.course || {};
      const metadata = module.metadata || {};
      return {
        id: module.id || null,
        slug: module.name || null,
        title: metadata.title || null,
        unitType: module.unitType || null,
        videoLink: metadata.videoLink || null,
        descRaw: metadata.desc || null,
        descParsed: parseSkoolJson(metadata.desc),
        resourcesRaw: metadata.resources || null,
        resourcesParsed: parseSkoolJson(metadata.resources),
      };
    }),
  };
}

export async function getVisibleResources(page) {
  return page.evaluate(() => {
    const wrappers = [...document.querySelectorAll('.styled__ResourceWrapper-sc-1wq200d-0')];

    return wrappers.map((wrapper) => {
      const fiberKey = Object.keys(wrapper).find((key) => key.startsWith('__reactFiber'));
      let fiber = fiberKey ? wrapper[fiberKey] : null;

      for (let i = 0; i < 12 && fiber; i += 1) {
        const props = fiber.memoizedProps || fiber.pendingProps || null;
        if (props && typeof props === 'object' && props.resource && typeof props.resource === 'object') {
          return {
            label: (wrapper.textContent || '').trim(),
            title: props.resource.title || null,
            fileId: props.resource.fileId || null,
            fileName: props.resource.fileName || null,
            fileContentType: props.resource.fileContentType || null,
          };
        }
        fiber = fiber.return;
      }

      return {
        label: (wrapper.textContent || '').trim(),
        title: null,
        fileId: null,
        fileName: null,
        fileContentType: null,
      };
    });
  });
}

export async function getVisibleLessonText(page) {
  return page.evaluate(() => document.body.innerText);
}

export async function fetchSkoolDownloadUrl(page, fileId, expireSeconds = 28800) {
  const result = await page.evaluate(async ({ fileId, expireSeconds }) => {
    const response = await fetch(`https://api2.skool.com/files/${fileId}/download-url?expire=${expireSeconds}`, {
      method: 'POST',
      credentials: 'include',
    });

    return {
      status: response.status,
      body: await response.text(),
    };
  }, { fileId, expireSeconds });

  if (result.status !== 200) {
    throw new Error(`Skool download URL request failed for ${fileId} with status ${result.status}`);
  }

  return result.body.trim();
}

export async function downloadSignedFile(url, destinationPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, buffer);

  return {
    path: destinationPath,
    bytes: buffer.byteLength,
    contentType: response.headers.get('content-type'),
  };
}

export async function downloadSkoolResource(page, resource, destinationPath, expireSeconds = 28800) {
  if (!resource?.fileId) {
    throw new Error(`Resource is missing fileId: ${resource?.title || resource?.label || 'unknown resource'}`);
  }

  const signedUrl = await fetchSkoolDownloadUrl(page, resource.fileId, expireSeconds);
  return downloadSignedFile(signedUrl, destinationPath);
}
