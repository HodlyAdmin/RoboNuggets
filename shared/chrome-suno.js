import { connectToChrome, domFind } from './chrome-ai.js';
import { log } from './logger.js';
import fs from 'fs';
import path from 'path';
import { createCursor } from 'ghost-cursor';

/**
 * Generate a music track using Suno via the Suno.com web UI.
 *
 * Trust model: Uses ghost-cursor for all clicks (isTrusted: true hardware events)
 * and randomized typing cadences. Session-based auth — requires the user's Chrome
 * to be logged into suno.com with a valid session cookie.
 *
 * Self-healing: All UI lookups use domFind() with ranked fallback strategies.
 * Suno's UI changes frequently — the waterfall catches renames without code changes.
 *
 * @param {object} song - Song concept object
 * @param {string} song.title - Song title
 * @param {string} song.style - Style descriptor (e.g. "lofi hip hop, chill")
 * @param {string} [song.prompt] - Lyric prompt (optional, for non-instrumental)
 * @param {boolean} [song.instrumental=true] - Skip lyrics if true
 * @param {string} outputDir - Directory to save the generated .mp3
 * @returns {Promise<{diskPath: string, duration: number}>}
 */
export async function generateSunoTrack(song, outputDir) {
  const browser = await connectToChrome();
  log.info('🎵 [Suno] Starting autonomous track generation...');

  const page = await browser.newPage();
  const { title, style, instrumental = true } = song;
  const cursor = createCursor(page);

  try {
    // ── 1. Navigate to Suno Create ──
    log.info('   Navigating to suno.com/create...');
    await page.goto('https://suno.com/create', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2500));

    // Wait for page to settle (no loading spinners)
    await page.waitForFunction(() => {
      const w = document.body.innerText.toLowerCase();
      return !w.includes('just a moment') && !w.includes('checking your browser');
    }, { timeout: 10000 }).catch(() => {
      log.warn('   Page settle check timed out — Suno may be showing a CAPTCHA or login gate.');
    });

    // ── 2. Arm CDP network interceptor (before UI interaction) ──
    log.info('   Arming CDP network interceptor for MP3 payload...');
    let mp3UrlResolve;
    const mp3Promise = new Promise(resolve => { mp3UrlResolve = resolve; });
    let trappingEnabled = false;

    const responseHandler = async (response) => {
      if (!trappingEnabled) return;
      const url = response.url();

      // Primary: Direct CDN MP3 URL
      if (url.includes('cdn1.suno.ai') && url.endsWith('.mp3')) {
        mp3UrlResolve(url);
        return;
      }
      // Secondary: Generate API response containing audio_url
      if (url.includes('/api/generate')) {
        try {
          const json = await response.json();
          const clips = json.clips || json.data?.clips || [];
          for (const clip of clips) {
            if (clip.audio_url) { mp3UrlResolve(clip.audio_url); return; }
          }
        } catch { /* not JSON or no clips */ }
      }
      // Tertiary: Any .mp3 URL that Suno serves
      if (url.includes('suno.ai') && url.includes('.mp3')) {
        mp3UrlResolve(url);
      }
    };

    page.on('response', responseHandler);

    // ── 3. Switch to Advanced mode (Suno renamed "Custom" → "Advanced") ──
    log.info('   Switching to Advanced mode...');
    const advancedTab = await domFind(page, [
      { type: 'text',     value: 'Advanced' },
      { type: 'itext',    value: 'advanced' },
      { type: 'aria',     value: 'Advanced' },
      { type: 'selector', value: 'button[data-testid="advanced-mode"]' },
      { type: 'text',     value: 'Custom' }, // fallback if they rename back
    ], { label: 'Advanced mode button', timeout: 8000, tags: ['button', 'div', 'span'] });

    if (advancedTab) {
      await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
      await cursor.click(advancedTab);
      await new Promise(r => setTimeout(r, 1500)); // wait for panel to animate open
    } else {
      log.warn('   Advanced button not found — may already be in Advanced mode.');
    }

    // ── 4. Toggle Instrumental if needed ──
    if (instrumental) {
      log.info('   Enabling Instrumental mode...');
      // Suno: instrumental is set by leaving lyrics blank + clicking a toggle
      // The toggle is near the lyrics textarea — find it by proximity
      const instrToggle = await domFind(page, [
        { type: 'itext',    value: 'Instrumental' },
        { type: 'aria',     value: 'Instrumental' },
        { type: 'aria',     value: 'instrumental' },
        { type: 'selector', value: '[role="switch"][aria-label*="nstrumental" i]' },
        { type: 'selector', value: 'input[type="checkbox"][name*="nstrumental" i]' },
      ], { label: 'Instrumental toggle', timeout: 5000, tags: ['button', 'div', 'span', 'input'] });

      if (instrToggle) {
        // Only click if it's not already on
        const isOn = await instrToggle.evaluate(el =>
          el.getAttribute('aria-checked') === 'true' ||
          el.getAttribute('data-state') === 'checked' ||
          el.classList.contains('active')
        );
        if (!isOn) {
          await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
          await cursor.click(instrToggle);
          await new Promise(r => setTimeout(r, 500));
        } else {
          log.info('   Instrumental already enabled.');
        }
      } else {
        // Fallback: leave lyrics blank — Suno treats empty lyrics as instrumental
        log.info('   Instrumental toggle not found — will leave lyrics blank (Suno treats this as instrumental).');
      }
    }

    // ── 5. Type into Style field ──
    log.info(`   Injecting style: "${style}"`);
    const styleInput = await domFind(page, [
      { type: 'selector', value: 'textarea[placeholder*="tenor"], textarea[placeholder*="corrido"], textarea[placeholder*="indian music"]' },
      { type: 'aria',     value: 'style' },
      { type: 'selector', value: 'textarea[placeholder*="style" i]' },
      { type: 'selector', value: 'textarea:not([placeholder*="lyrics" i]):not([placeholder*="Chat" i]):not([placeholder*="Enhance" i])' },
    ], { label: 'Style input', timeout: 8000, tags: ['textarea', 'input'] });

    if (styleInput) {
      await cursor.click(styleInput);
      await new Promise(r => setTimeout(r, 200));
      await page.keyboard.down('Meta');
      await page.keyboard.press('a');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 200));
      for (const char of style) {
        await page.keyboard.type(char, { delay: Math.random() * 45 + 10 });
      }
    } else {
      log.warn('   Style input not found.');
    }

    // ── 6. Type into Title field ──
    log.info(`   Injecting title: "${title}"`);
    const titleInput = await domFind(page, [
      { type: 'aria',     value: 'title' },
      { type: 'selector', value: 'input[placeholder*="title" i], input[placeholder*="song name" i]' },
      { type: 'selector', value: 'input[name="title"]' },
    ], { label: 'Title input', timeout: 5000, tags: ['input'] });

    if (titleInput) {
      await cursor.click(titleInput);
      await new Promise(r => setTimeout(r, 200));
      await page.keyboard.down('Meta');
      await page.keyboard.press('a');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 200));
      for (const char of title) {
        await page.keyboard.type(char, { delay: Math.random() * 35 + 10 });
      }
    } else {
      log.info('   Title input not found (Suno may auto-generate title).');
    }

    await new Promise(r => setTimeout(r, 1500));

    // ── 7. Click Create ──
    log.info('   Submitting to Suno...');
    trappingEnabled = true;

    const createBtn = await domFind(page, [
      { type: 'itext',    value: 'Create' },
      { type: 'aria',     value: 'Create' },
      { type: 'selector', value: 'button[type="submit"]' },
      { type: 'selector', value: 'button[class*="create" i]' },
    ], { label: 'Create button', timeout: 8000, tags: ['button'], required: true });

    await new Promise(r => setTimeout(r, Math.random() * 600 + 400));
    await cursor.click(createBtn);
    log.info('   Prompt submitted. Waiting for Suno generation (up to 5 min)...');

    // ── 8. Wait for MP3 URL ──
    const mp3Url = await Promise.race([
      mp3Promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Suno generation timed out after 5 minutes.')), 300000)
      ),
    ]);

    page.off('response', responseHandler);
    log.success(`   Intercepted MP3: ${mp3Url.substring(0, 80)}...`);

    // ── 9. Download the MP3 ──
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const downloadPath = path.resolve(outputDir, `${safeTitle}.mp3`);
    const buffer = await fetch(mp3Url).then(res => res.arrayBuffer());
    fs.writeFileSync(downloadPath, Buffer.from(buffer));
    log.success(`   Track saved: ${downloadPath}`);

    return {
      diskPath: downloadPath,
      duration: 120, // Suno generates ~2 min tracks; probed by caller via ffmpeg
    };

  } catch (e) {
    log.warn(`Suno driver failed: ${e.message}`);
    throw e;
  } finally {
    await page.close();
  }
}
