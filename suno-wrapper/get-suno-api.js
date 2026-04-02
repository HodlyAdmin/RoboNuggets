const { chromium } = require('rebrowser-playwright-core');
const path = require('path');

(async () => {
    const userDataDir = path.join(process.cwd(), '.suno-browser-profile');
    const browser = await chromium.launchPersistentContext(userDataDir, { headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('https://suno.com/create', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        const signInBtn = page.locator('text="Sign in", text="Sign In", text="Sign up", text="Sign Up"').first();
        if (await signInBtn.isVisible()) {
            console.log("Sign In button found!");
            
            // Try clicking it!
            await signInBtn.click();
            await page.waitForTimeout(3000);
            
            const googleBtn = page.locator('button:has-text("Continue with Google")').first();
            if (await googleBtn.isVisible()) {
                console.log("Continue with Google found!");
            } else {
                console.log("No Google button found! Might be different text.");
                // Screenshot modal
                await page.screenshot({ path: 'suno-login-modal.png' });
            }
        } else {
            console.log("Sign In button NOT found!");
        }
    } catch(e) { console.error(e); }
    await browser.close();
})();
