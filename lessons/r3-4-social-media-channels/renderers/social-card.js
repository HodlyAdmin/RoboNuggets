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

function buildHtml({ record, article, drafts, config }) {
  const title = escapeHtml(record.articleTitle || article.articleTitle);
  const insight = escapeHtml(drafts.keyInsight || drafts.articleSummary || '');
  const concept = escapeHtml(drafts.instagramImageConcept || '');
  const badge = escapeHtml(config.badgeLabel || 'R3 Multi-Channel Draft');
  const source = escapeHtml((record.articleUrl || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'local');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at 15% 15%, rgba(255, 183, 77, 0.55), transparent 24%),
        radial-gradient(circle at 85% 25%, rgba(0, 188, 212, 0.28), transparent 24%),
        linear-gradient(150deg, #0b1020 0%, #16213c 56%, #0b1020 100%);
      color: #f8fafc;
      overflow: hidden;
    }
    .frame {
      width: 100%;
      height: 100%;
      padding: 72px;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 36px;
      position: relative;
    }
    .topline {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 24px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(226, 232, 240, 0.8);
    }
    .badge {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      padding: 14px 22px;
      font-size: 16px;
      letter-spacing: 0.1em;
      background: rgba(255, 255, 255, 0.06);
    }
    .panel {
      border-radius: 42px;
      padding: 52px 48px 44px;
      background: linear-gradient(180deg, rgba(10, 15, 29, 0.55), rgba(10, 15, 29, 0.78));
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 28px 90px rgba(4, 8, 20, 0.45);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(10px);
    }
    .eyebrow {
      margin: 0 0 18px;
      color: #7dd3fc;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .title {
      margin: 0;
      font-size: 68px;
      line-height: 1.02;
      letter-spacing: -0.04em;
      max-width: 90%;
    }
    .insight {
      margin: 36px 0 0;
      font-size: 34px;
      line-height: 1.3;
      color: #e2e8f0;
      max-width: 90%;
    }
    .concept {
      margin-top: 32px;
      font-size: 22px;
      line-height: 1.5;
      color: rgba(226, 232, 240, 0.78);
      max-width: 88%;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: end;
      font-size: 20px;
      color: rgba(226, 232, 240, 0.8);
    }
    .index {
      font-size: 72px;
      font-weight: 800;
      line-height: 1;
      color: rgba(255, 183, 77, 0.92);
    }
  </style>
</head>
<body>
  <main class="frame">
    <div class="topline">
      <div>${source}</div>
      <div class="badge">${badge}</div>
    </div>
    <section class="panel">
      <div>
        <p class="eyebrow">Instagram Asset</p>
        <h1 class="title">${title}</h1>
        <p class="insight">${insight}</p>
        <p class="concept">${concept}</p>
      </div>
      <div class="footer">
        <div>Built from one article, then adapted for four channels.</div>
        <div class="index">${String(record.index).padStart(2, '0')}</div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export async function renderSocialCard({ record, article, drafts, outputPath, cardConfig }) {
  const browser = await connectToChrome();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: Number(cardConfig.width) || 1024,
      height: Number(cardConfig.height) || 1024,
      deviceScaleFactor: 1,
    });
    await page.setContent(buildHtml({ record, article, drafts, config: cardConfig }), {
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
      width: Number(cardConfig.width) || 1024,
      height: Number(cardConfig.height) || 1024,
      renderer: 'social-card',
      status: 'rendered',
    };
  } finally {
    await page.close();
  }
}
