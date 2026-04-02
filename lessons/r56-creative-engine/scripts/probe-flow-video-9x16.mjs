import puppeteer from 'puppeteer-core';

const FLOW_URL = 'https://labs.google/fx/tools/flow';

const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();

async function clickByText(page, text) {
  const handle = await page.evaluateHandle((target) => {
    const norm = (value = '') => value.replace(/\s+/g, ' ').trim().toLowerCase();
    const wanted = norm(target);
    const nodes = Array.from(document.querySelectorAll('button, div[role="button"], a, [role="option"], [role="menuitem"]'));
    return nodes.find((node) => {
      const label = norm(`${node.getAttribute('aria-label') || ''} ${node.innerText || node.textContent || ''}`);
      return label.includes(wanted);
    }) || null;
  }, text);

  const exists = await handle.evaluate((el) => el instanceof Element).catch(() => false);
  if (!exists) return false;

  await handle.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
    el.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return true;
}

async function readState(page) {
  return page.evaluate(() => ({
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
    selected: Array.from(document.querySelectorAll('[aria-selected="true"], [aria-pressed="true"]'))
      .map((node) => (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim()),
  }));
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9333',
    defaultViewport: null,
  });

  const landing = await browser.newPage();
  await landing.goto(FLOW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 4000));

  await clickByText(landing, 'Create with Flow');
  await clickByText(landing, 'Get started');
  await clickByText(landing, 'New project');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const pages = await browser.pages();
  const work = pages[pages.length - 1];
  await work.bringToFront();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  await clickByText(work, 'Video');
  const before = await readState(work);
  await clickByText(work, '9:16');
  const after = await readState(work);

  console.log(JSON.stringify({ before, after }, null, 2));
  await browser.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
