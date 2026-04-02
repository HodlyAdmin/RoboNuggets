const { chromium } = require('rebrowser-playwright-core');
const path = require('path');
(async () => {
    const userDataDir = path.join(process.cwd(), '.suno-browser-profile');
    const browser = await chromium.launchPersistentContext(userDataDir, { headless: true });
    const page = await browser.newPage();
    
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Failed Response: ${response.url()} - ${response.status()}`);
      }
    });

    await page.goto('https://suno.com/create');
    await page.waitForTimeout(5000);
    
    console.log("Typing prompt...");
    const textareas = page.locator('textarea');
    await textareas.first().evaluate((el) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        nativeInputValueSetter.call(el, 'pop song with drums');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(1000);
    console.log("Clicking Create...");
    const button = page.getByRole('button', { name: 'Create song', exact: true }).first();
    await button.click({ force: true });
    
    await page.waitForTimeout(5000);
    const toasts = await page.$$eval('.toast, [role="alert"], [class*="toast"], [class*="alert"]', els => els.map(e => e.innerText));
    console.log("Toasts:", toasts);
    
    await page.screenshot({ path: 'suno-error.png' });
    await browser.close();
})();
