import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9333',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const flowPages = [];

  for (const page of pages) {
    const url = page.url();
    if (!url.includes('labs.google/fx/tools/flow')) continue;
    const snapshot = await page.evaluate(() => {
      const video = document.querySelector('video');
      const source = video?.querySelector('source');
      return {
        title: document.title,
        url: location.href,
        body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2000),
        video: video ? {
          currentSrc: video.currentSrc || '',
          src: video.src || '',
          sourceSrc: source?.src || '',
          readyState: video.readyState,
        } : null,
      };
    }).catch((error) => ({ error: error.message }));
    flowPages.push(snapshot);
  }

  console.log(JSON.stringify(flowPages, null, 2));
  await browser.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
