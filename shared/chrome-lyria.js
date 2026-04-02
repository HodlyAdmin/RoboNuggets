import { connectToChrome, domFind } from './chrome-ai.js';
import { log } from './logger.js';
import fs from 'fs';
import path from 'path';
import { createCursor } from 'ghost-cursor';

/**
 * Generate a Lyria 3 Pro music track using the Gemini Web App.
 *
 * Self-healing architecture: All UI element lookups use domFind() with ranked
 * fallback strategies. If Google renames a button, the next rank catches it
 * automatically. Only fails if all strategies fail simultaneously.
 *
 * Digital Citizenship: auto-deletes the Gemini chat after saving the track.
 *
 * @param {string} structuredPrompt - Music prompt (style, mood, etc.)
 * @param {object} options
 * @param {number} options.timeout - Max wait for generation (default: 300000 / 5 mins)
 * @param {string} [options.outputDir] - Directory to save media (default: process.cwd())
 * @returns {Promise<string>} Absolute path to the locally saved .mp4 audio file
 */
export async function generateLyriaTrack(structuredPrompt, options = {}) {
  const { timeout = 300000, outputDir = process.cwd() } = options;
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await connectToChrome();

  log.info('🎵 [Lyria 3 Pro] Starting autonomous music generation...');

  const page = await browser.newPage();
  const cursor = createCursor(page);

  try {
    // ── 1. Navigate to Gemini ──
    log.info('   Navigating to Gemini...');
    await page.goto('https://gemini.google.com/app', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 3000));

    // ── 2 + 3. Mount Lyria via Create music (Inner Tools Menu) ──
    log.info('   Opening Tools menu...');
    
    // Find the 'Tools' button inside the input area. The button we want exactly has text "Tools".
    const toolsBtn = await domFind(page, [
      { type: 'selector', value: 'button[data-test-id="tools-button"]' },
      { type: 'itext', value: 'Tools' },
    ], {
      label: 'Inner Tools button',
      timeout: 8000,
      tags: ['button'],
    });

    if (toolsBtn) {
      await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
      await cursor.click(toolsBtn);
      await new Promise(r => setTimeout(r, 1500)); // wait for popup to animate

      log.info('   Selecting Create music from menu...');
      // Now find "Create music" button from the spawned menu
      const musicBtn = await domFind(page, [
        { type: 'itext', value: 'Create music' },
        { type: 'aria',  value: 'music' },
        { type: 'selector', value: 'button[aria-label*="music" i], [role="menuitem"][aria-label*="music" i]' },
      ], {
        label: 'Create music menu item',
        timeout: 4000,
        tags: ['button', 'li', 'span', '[role="menuitem"]'],
      });

      if (musicBtn) {
        await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
        await cursor.click(musicBtn);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        log.warn('   Create music option not found in Tools menu.');
      }
    } else {
      log.warn('   Tools menu button not found in UI.');
    }

    // ── 4. Find the prompt input ──
    log.info('   Locating prompt input field...');
    const inputEl = await domFind(page, [
      { type: 'selector', value: 'rich-textarea [contenteditable="true"]' },
      { type: 'selector', value: 'rich-textarea' },
      { type: 'selector', value: 'div[contenteditable="true"][role="textbox"]' },
      { type: 'selector', value: '.ql-editor[contenteditable="true"]' },
      { type: 'aria',     value: 'prompt' },
      { type: 'selector', value: 'textarea' },
    ], {
      label: 'Gemini prompt input',
      timeout: 12000,
      required: true,
    });

    // ── 5. Native Native Prompt Injection ──
    log.info('   Injecting music prompt...');
    await new Promise(r => setTimeout(r, Math.random() * 400 + 300));
    await cursor.click(inputEl);
    await new Promise(r => setTimeout(r, 500));

    // Clear existing safely
    await page.keyboard.down('Meta');
    await page.keyboard.press('a');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    // Inject massive payload directly into cursor context
    await page.evaluate((text) => {
      document.execCommand('insertText', false, text);
    }, structuredPrompt);

    log.info(`   Prompt natively injected (${structuredPrompt.length} chars)`);
    await new Promise(r => setTimeout(r, 800));

    // ── 6. Arm CDP network interceptor BEFORE submitting ──
    log.info('   Arming CDP network interceptor for audio payload...');
    let capturedBuffer = null;
    let fallbackSrc = null;

    const responseHandler = async (response) => {
      const url = response.url();
      const status = response.status();
      const ct = response.headers()['content-type'] || '';

      if (
        status === 200 &&
        (ct.includes('audio/') || ct.includes('video/mp4') || url.includes('videoplayback'))
      ) {
        try {
          const buffer = await response.buffer();
          if (buffer.length > 50000) {
            capturedBuffer = buffer;
            log.success(
              `   CDP intercepted audio payload: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
            );
          }
        } catch {
          // Ignore partial buffer errors from streaming responses
        }
      }
    };

    page.on('response', responseHandler);

    // ── 7. Submit prompt via native click ──
    log.info('   Submitting prompt to Lyria...');
    await new Promise(r => setTimeout(r, 1000)); // Let React state sync
    
    // Using execCommand bypasses React's onKeyDown listener sometimes. 
    // Finding the physical Send button ensures 100% submission success.
    const submitBtn = await domFind(page, [
      { type: 'selector', value: 'button[aria-label*="send message" i]' },
      { type: 'selector', value: 'button[data-test-id="send-button"]' },
    ], { label: 'Send button', timeout: 5000, tags: ['button'] });
    
    if (submitBtn) {
      log.info('   Found Send button — clicking...');
      await cursor.click(submitBtn);
    } else {
      log.warn('   Send button not found — falling back to Enter key');
      await page.keyboard.press('Enter');
    }
    
    log.info(`   Waiting up to ${Math.round(timeout / 1000)}s for generation...`);

    // ── 8. Wait for the audio payload ──
    const startTime = Date.now();

    while (!capturedBuffer && (Date.now() - startTime) < timeout) {
      // Check for DOM audio player as a secondary signal
      fallbackSrc = await page.evaluate(() => {
        const msgs = document.querySelectorAll(
          '[data-message-author-role="model"], .model-response-text, message-content'
        );
        if (!msgs || msgs.length === 0) return null;
        const lastMsg = msgs[msgs.length - 1];
        const media = lastMsg.querySelector('video source, video, audio source, audio');
        return (media && media.src) ? media.src : null;
      });

      if (!capturedBuffer) {
        await new Promise(r => setTimeout(r, 3000));
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (elapsed % 30 === 0 && elapsed > 0) {
          log.info(`   Still generating... ${elapsed}s elapsed`);
        }
      }
    }

    page.off('response', responseHandler);

    if (!capturedBuffer) {
      if (fallbackSrc) {
        throw new Error(
          `Lyria generated track visible in browser (${fallbackSrc.substring(0, 80)}) ` +
          `but CDP interceptor could not capture the raw file. ` +
          `This can happen with Blob MSE streams. Manual download required.`
        );
      }
      throw new Error(
        `Lyria generation timed out after ${Math.round(timeout / 1000)}s. ` +
        `No audio payload detected. Check that Gemini AI Ultra is active and Lyria loaded correctly.`
      );
    }

    // ── 9. Save the captured buffer ──
    const downloadPath = path.resolve(outputDir, `lyria_${Date.now()}.mp4`);
    fs.writeFileSync(downloadPath, capturedBuffer);
    log.success(`   Track saved: ${downloadPath}`);

    // ── 10. Digital Citizenship: Delete the Gemini chat ──
    log.info('🛡️  Digital Citizenship: Deleting Gemini chat history...');
    try {
      await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));

      // Hover the first chat item to reveal the Options button
      const chatItem = await domFind(page, [
        { type: 'selector', value: '[data-test-id="conversation-list-item"]' },
        { type: 'selector', value: '[class*="conversation-item"], [class*="chat-item"]' },
      ], { label: 'chat list item', timeout: 5000 });

      if (chatItem) {
        await cursor.move(chatItem);
        await new Promise(r => setTimeout(r, 400));

        const moreOptsBtn = await domFind(page, [
          { type: 'aria', value: 'Options' },
          { type: 'aria', value: 'More options' },
          { type: 'selector', value: '[data-test-id="conversation-list-item"] button' },
        ], { label: 'chat options button', timeout: 3000 });

        if (moreOptsBtn) {
          await cursor.click(moreOptsBtn);
          await new Promise(r => setTimeout(r, 800));

          const deleteBtn = await domFind(page, [
            { type: 'itext', value: 'Delete' },
            { type: 'selector', value: '[role="menuitem"]' },
          ], { label: 'Delete menu item', timeout: 3000, tags: ['span', 'div', 'li'] });

          if (deleteBtn) {
            await cursor.click(deleteBtn);
            await new Promise(r => setTimeout(r, 800));

            // Confirm the dialog
            const confirmBtn = await domFind(page, [
              { type: 'selector', value: '[role="dialog"] button' },
              { type: 'itext', value: 'Delete' },
            ], { label: 'Delete confirm button', timeout: 3000 });

            if (confirmBtn) {
              await cursor.click(confirmBtn);
              log.success('🛡️  Chat deleted. Workspace clean.');
            }
          }
        }
      }
    } catch (cleanupErr) {
      log.warn(`   Chat cleanup failed: ${cleanupErr.message} — continuing.`);
    }

    return downloadPath;

  } finally {
    await page.close();
  }
}

// ── CLI direct test ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const testPrompt = `Style: Epic cinematic orchestral
[Verse]
Rising strings escalate tension
[Chorus]
Massive brass chords hit, drums thunder
Instrumental only, no vocals.`;

  log.header('Lyria 3 Pro — Direct Test Mode');
  generateLyriaTrack(testPrompt)
    .then(p => { log.success(`Saved: ${p}`); process.exit(0); })
    .catch(e => { log.error(e.message); console.error(e); process.exit(1); });
}
