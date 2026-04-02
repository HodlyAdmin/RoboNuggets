import { connectToChrome } from '../../../shared/chrome-ai.js';

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

export async function prepareArticleContext({ record, config }) {
  if (record.articleText) {
    return {
      index: record.index,
      articleUrl: record.articleUrl || null,
      articleTitle: record.articleTitle || 'Untitled article',
      articleText: truncate(normalizeWhitespace(record.articleText), config.maxArticleChars),
      notes: record.notes || '',
      contextSource: 'record-field',
    };
  }

  if (!record.articleUrl) {
    throw new Error(`Record ${record.index} is missing articleUrl and articleText.`);
  }

  const browser = await connectToChrome();
  const page = await browser.newPage();

  try {
    await page.goto(record.articleUrl, {
      waitUntil: 'networkidle2',
      timeout: Number(config.navigationTimeoutMs) || 120000,
    });
    await new Promise((resolve) => setTimeout(resolve, Number(config.settleDelayMs) || 2000));

    const article = await page.evaluate(() => {
      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('title')?.textContent ||
        document.querySelector('h1')?.textContent ||
        '';
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        '';
      const bodyText = document.body?.innerText || '';
      return {
        title,
        description,
        bodyText,
      };
    });

    const combinedText = [article.description, article.bodyText]
      .filter(Boolean)
      .map(normalizeWhitespace)
      .join('\n\n');

    return {
      index: record.index,
      articleUrl: record.articleUrl,
      articleTitle: normalizeWhitespace(record.articleTitle || article.title || 'Untitled article'),
      articleText: truncate(combinedText, config.maxArticleChars),
      notes: record.notes || '',
      contextSource: 'browser-fetch',
    };
  } finally {
    await page.close();
  }
}
