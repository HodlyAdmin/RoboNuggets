import puppeteer from 'puppeteer-core';

const FLOW_URL = 'https://labs.google/fx/tools/flow';

const norm = (value = '') => value.replace(/\s+/g, ' ').trim();
const low = (value = '') => norm(value).toLowerCase();

async function clickByText(page, text) {
  const handle = await page.evaluateHandle((target) => {
    const normalize = (value = '') => value.replace(/\s+/g, ' ').trim().toLowerCase();
    const wanted = normalize(target);
    const nodes = Array.from(document.querySelectorAll('button, div[role="button"], a, [role="option"], [role="menuitem"]'));
    return nodes.find((node) => {
      const label = normalize(node.innerText || node.textContent || '');
      const aria = normalize(node.getAttribute('aria-label') || '');
      return label.includes(wanted) || aria.includes(wanted);
    }) || null;
  }, text);

  const exists = await handle.evaluate((el) => el instanceof Element).catch(() => false);
  if (!exists) return false;

  await handle.click();
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return true;
}

async function snapshot(page, label) {
  const data = await page.evaluate(() => {
    const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
    const controls = Array.from(document.querySelectorAll('button, div[role="button"], [role="option"], [role="menuitem"]'))
      .map((el) => ({
        text: normalize(el.innerText || el.textContent || '').slice(0, 120),
        aria: normalize(el.getAttribute('aria-label') || ''),
        pressed: el.getAttribute('aria-pressed'),
        expanded: el.getAttribute('aria-expanded'),
        selected: el.getAttribute('aria-selected'),
        disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
      }))
      .filter((entry) => entry.text || entry.aria);

    return {
      title: document.title,
      body: normalize(document.body.innerText).slice(0, 4000),
      controls: controls.slice(0, 220),
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2));
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
  const launched = await clickByText(landing, 'New project');
  if (!launched) {
    console.log('NO_NEW_PROJECT');
    await browser.disconnect();
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
  const pages = await browser.pages();
  const work = pages[pages.length - 1];
  await work.bringToFront();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  await snapshot(work, 'initial');
  await clickByText(work, 'Video');
  await snapshot(work, 'after-video');
  await clickByText(work, 'Veo 3.1');
  await snapshot(work, 'after-veo-menu');

  await browser.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
