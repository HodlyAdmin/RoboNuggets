import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LESSON_URL = 'https://www.skool.com/robonuggets/classroom/e3a5624c?md=f4cc926441bf4ac39bbb35ddd1ecb1f3';
const OUTPUT_DIR = join(__dirname, '..', 'assets', 'original');

function parseArgs() {
  const [command = 'inspect', resourceName] = process.argv.slice(2);
  return { command, resourceName };
}

async function withLessonPage(fn) {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9333',
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    await page.goto(LESSON_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
    await browser.disconnect().catch(() => {});
  }
}

async function getResources(page) {
  return page.evaluate(() => {
    const findSerializedResources = (value, seen = new Set()) => {
      if (typeof value === 'string') {
        if (value.includes('"file_id"') && value.includes('"file_name"')) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && 'file_id' in item)) {
              return value;
            }
          } catch {
            // keep searching
          }
        }
        return null;
      }

      if (!value || typeof value !== 'object' || seen.has(value)) {
        return null;
      }

      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = findSerializedResources(item, seen);
          if (found) return found;
        }
        return null;
      }

      for (const nested of Object.values(value)) {
        const found = findSerializedResources(nested, seen);
        if (found) return found;
      }

      return null;
    };

    const script = document.querySelector('#__NEXT_DATA__');
    if (!script?.textContent) {
      throw new Error('Skool __NEXT_DATA__ payload not found on page');
    }

    const payload = JSON.parse(script.textContent);
    const serialized = findSerializedResources(payload);

    if (!serialized) {
      throw new Error('Skool lesson resources were not found in page payload');
    }

    const resources = JSON.parse(serialized);
    return resources.map(resource => ({
      title: resource.title,
      fileId: resource.file_id,
      fileName: resource.file_name,
      contentType: resource.file_content_type,
    }));
  });
}

async function getDownloadUrl(page, fileId) {
  return page.evaluate(async (resolvedFileId) => {
    const url = `https://api2.skool.com/files/${resolvedFileId}/download-url?expire=28800`;
    const attempts = [];

    for (const method of ['GET', 'POST']) {
      const response = await fetch(url, {
        method,
        credentials: 'include',
      });
      const text = await response.text();
      attempts.push({
        method,
        status: response.status,
        ok: response.ok,
        preview: text.slice(0, 160),
      });

      if (response.ok && /^https?:\/\//.test(text)) {
        return { downloadUrl: text, attempts };
      }
    }

    return { downloadUrl: null, attempts };
  }, fileId);
}

async function inspect() {
  const result = await withLessonPage(async (page) => {
    const resources = await getResources(page);
    const probes = [];

    for (const resource of resources) {
      const probe = await getDownloadUrl(page, resource.fileId);
      probes.push({
        ...resource,
        ...probe,
      });
    }

    return probes;
  });

  console.log(JSON.stringify(result, null, 2));
}

async function download(resourceName) {
  if (!resourceName) {
    throw new Error('Pass the exact resource title to download, e.g. "R45 | Auto Music Creator template"');
  }

  const result = await withLessonPage(async (page) => {
    const resources = await getResources(page);
    const resource = resources.find(entry => entry.title === resourceName);

    if (!resource) {
      throw new Error(`Resource not found: ${resourceName}`);
    }

    const probe = await getDownloadUrl(page, resource.fileId);
    if (!probe.downloadUrl) {
      throw new Error(`Could not get signed download URL for ${resource.title}: ${JSON.stringify(probe.attempts)}`);
    }

    const response = await fetch(probe.downloadUrl);
    if (!response.ok) {
      throw new Error(`Signed download failed with ${response.status} ${response.statusText}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(OUTPUT_DIR, { recursive: true });
    const targetPath = join(OUTPUT_DIR, resource.fileName);
    await writeFile(targetPath, bytes);

    return {
      ...resource,
      downloadUrl: probe.downloadUrl,
      attempts: probe.attempts,
      targetPath,
      size: bytes.length,
      responseContentType: response.headers.get('content-type'),
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const { command, resourceName } = parseArgs();

  if (command === 'inspect') {
    await inspect();
    return;
  }

  if (command === 'download') {
    await download(resourceName);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
