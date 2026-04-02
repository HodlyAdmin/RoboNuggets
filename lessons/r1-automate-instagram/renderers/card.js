import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { connectToChrome } from '../../../shared/chrome-ai.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPalette(cardConfig) {
  return {
    backgroundStart: cardConfig.backgroundStart || '#0f172a',
    backgroundEnd: cardConfig.backgroundEnd || '#312e81',
    accent: cardConfig.accent || '#f59e0b',
    text: cardConfig.text || '#f8fafc',
    secondaryText: cardConfig.secondaryText || '#cbd5e1',
  };
}

function buildCardHtml(record, cardConfig) {
  const palette = buildPalette(cardConfig);
  const quoteLength = record.quote.length;
  const quoteSize = quoteLength > 180 ? 'quote-long' : quoteLength > 120 ? 'quote-medium' : 'quote-short';
  const handle = escapeHtml(cardConfig.handle || '@automation');
  const title = escapeHtml(record.title);
  const quote = escapeHtml(record.quote);
  const footer = escapeHtml(cardConfig.footerLabel || 'Local agent-operated queue');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    :root {
      --background-start: ${palette.backgroundStart};
      --background-end: ${palette.backgroundEnd};
      --accent: ${palette.accent};
      --text: ${palette.text};
      --secondary-text: ${palette.secondaryText};
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(160deg, var(--background-start), var(--background-end));
      color: var(--text);
      font-family: "Georgia", "Times New Roman", serif;
    }
    body {
      overflow: hidden;
    }
    .frame {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 92px 88px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.24), transparent 32%),
        radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.09), transparent 26%);
    }
    .handle {
      font-family: "Helvetica Neue", Arial, sans-serif;
      letter-spacing: 0.28em;
      font-size: 28px;
      text-transform: uppercase;
      color: var(--secondary-text);
    }
    .quote-wrap {
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 36px;
      padding: 92px 72px 72px;
      background: rgba(15, 23, 42, 0.22);
      backdrop-filter: blur(10px);
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
    }
    .quote-mark {
      position: absolute;
      top: 22px;
      left: 52px;
      font-size: 156px;
      line-height: 1;
      color: rgba(245, 158, 11, 0.3);
    }
    .title {
      margin: 0 0 28px;
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 26px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .quote {
      margin: 0;
      font-weight: 700;
      line-height: 1.16;
      color: var(--text);
    }
    .quote-short {
      font-size: 76px;
    }
    .quote-medium {
      font-size: 64px;
    }
    .quote-long {
      font-size: 54px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-family: "Helvetica Neue", Arial, sans-serif;
      color: var(--secondary-text);
    }
    .footer-label {
      max-width: 70%;
      font-size: 22px;
      line-height: 1.5;
    }
    .badge {
      border-radius: 999px;
      padding: 14px 22px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 18px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <main class="frame">
    <div class="handle">${handle}</div>
    <section class="quote-wrap">
      <div class="quote-mark">"</div>
      <h1 class="title">${title}</h1>
      <p class="quote ${quoteSize}">${quote}</p>
    </section>
    <footer class="footer">
      <div class="footer-label">${footer}</div>
      <div class="badge">Day ${record.index}</div>
    </footer>
  </main>
</body>
</html>`;
}

export async function renderQuoteCard({ record, outputPath, cardConfig }) {
  const browser = await connectToChrome();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: cardConfig.width,
      height: cardConfig.height,
      deviceScaleFactor: 1,
    });
    await page.setContent(buildCardHtml(record, cardConfig), {
      waitUntil: 'load',
    });
    await mkdir(dirname(outputPath), { recursive: true });
    await page.screenshot({
      path: outputPath,
      type: 'png',
    });

    return {
      index: record.index,
      path: outputPath,
      width: cardConfig.width,
      height: cardConfig.height,
      renderer: 'quote-card',
      status: 'rendered',
    };
  } finally {
    await page.close();
  }
}
