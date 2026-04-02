const { chromium } = require('rebrowser-playwright-core');
const path = require('path');
(async () => {
    const userDataDir = path.join(process.cwd(), '.suno-browser-profile');
    try {
        const browser = await chromium.launchPersistentContext(userDataDir, { headless: false });
        console.log("Browser launched.");
        const page = await browser.newPage();
        await page.goto('https://suno.com/create', { waitUntil: 'load' });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screen.png' });
        const text = await page.evaluate(() => document.body.innerText);
        require('fs').writeFileSync('screen.txt', text);
        console.log("Screenshot and text captured.");
        await browser.close();
    } catch(e) {
        console.error("Error:", e);
    }
})();
