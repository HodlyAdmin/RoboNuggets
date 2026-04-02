const { chromium } = require('rebrowser-playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://suno.com/create', { waitUntil: 'networkidle' });
  
  // Wait a sec for hydration
  await page.waitForTimeout(3000);
  
  console.log("Looking for Custom text...");
  const customEls = await page.getByText('Custom').all();
  for (const el of customEls) {
    const tagName = await el.evaluate(e => e.tagName);
    const role = await el.getAttribute('role');
    const type = await el.getAttribute('type');
    const html = await el.evaluate(e => e.outerHTML);
    console.log(`- Element: <${tagName} role="${role}" type="${type}">`);
    console.log(`  HTML: ${html.substring(0, 150)}...`);
  }
  
  await browser.close();
})();
