const { chromium } = require('rebrowser-playwright-core');
const path = require('path');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(process.cwd(), '.suno-browser-profile');
    const browser = await chromium.launchPersistentContext(userDataDir, { headless: false });
    console.log("Browser launched.");
    
    const page = await browser.newPage();
    console.log("Page created.");
    
    const logs = [];
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('suno') && !request.url().includes('telemetry') && !request.url().includes('metrics')) {
        console.log(`POST Request: ${request.url()}`);
        logs.push(`POST: ${request.url()}`);
      }
    });

    page.on('response', resp => {
        if (!resp.ok() && resp.url().includes('suno')) {
            console.log(`ERR: ${resp.url()} -> ${resp.status()}`);
            logs.push(`ERR: ${resp.url()} -> ${resp.status()}`);
        }
    });

    console.log("Going to create...");
    await page.goto('https://suno.com/create', { waitUntil: 'domcontentloaded' });
    console.log("Navigated.");
    await page.waitForTimeout(5000);
    
    // Set prompt
    const textareas = page.locator('textarea');
    if (await textareas.count() > 0) {
        console.log("Filling textarea...");
        await textareas.first().fill('pop song with drums');
    }

    await page.waitForTimeout(1000);
    const button = page.getByRole('button', { name: 'Create song', exact: true }).first();
    console.log("Clicking button...");
    await button.click({ force: true }).catch(console.error);

    await page.waitForTimeout(6000);
    
    const toasts = await page.$$eval('.toast, [role="alert"], [class*="toast"], [class*="alert"]', els => els.map(e => e.innerText));
    console.log("Toasts found:", toasts);

    fs.writeFileSync('suno-api-log.txt', logs.join('\n'));
    await page.screenshot({ path: 'suno-error.png' });
    console.log("Done.");
    
    await browser.close();
})();
