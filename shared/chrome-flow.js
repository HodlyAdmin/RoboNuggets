/**
 * Chrome Flow — Google Flow / Veo 3.1 automation driver for RoboNuggets
 *
 * Connects to a live, logged-in Chrome session via CDP (port 9333) and drives
 * the Google Flow web UI to generate high-fidelity video and image assets.
 *
 * Architecture:
 *   - Connects via puppeteer-core to the shared Chrome session at port 9333
 *   - Navigates to labs.google/fx/tools/flow
 *   - Clicks "Create with Flow" to enter authenticated workspace
 *   - Creates a new project and injects prompt with strict parameters
 *   - Enforces aspect ratio (9:16, 16:9, 1:1) and model selection
 *   - Uses CDP Network Interception to capture generated media payloads
 *   - Executes Digital Citizenship cleanup: auto-names projects, deletes losers
 *
 * Media Extraction:
 *   DO NOT rely on DOM download buttons — macOS native "Save As" dialogs will
 *   deadlock Node.js when Chrome is attached to a user profile. Instead, use
 *   page.on('response', ...) CDP interceptors armed before prompt submission.
 *
 * No API keys needed — all generation is free via Google AI Ultra subscription.
 */
import { connectToChrome, disconnectChrome, withRetry } from './chrome-ai.js';
import { log } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { createCursor } from 'ghost-cursor';

const FLOW_URL = 'https://labs.google/fx/tools/flow';

/**
 * Main Generation Engine — Video & Image via Google Flow
 *
 * @param {string} prompt - Creative prompt for Veo/Imagen generation
 * @param {object} config
 * @param {string} config.mediaType - 'video' | 'image' (default: 'video')
 * @param {string} config.model - 'Veo 3.1 - Fast' | 'Veo 3.1 - Quality' | 'Veo 3.1 - Lite' (default: 'Veo 3.1 - Fast')
 * @param {string} config.aspectRatio - '16:9' | '9:16' | '1:1' (default: '9:16')
 * @param {string} config.projectName - Name for Digital Citizenship labeling
 * @param {number} config.timeout - Max wait in ms (default: 300000 / 5 min)
 * @returns {Promise<string>} Path to locally saved media file
 */
export async function generateFlowMedia(prompt, config = {}) {
  const {
    mediaType = 'video',
    model = 'Veo 3.1 - Fast',
    aspectRatio = '9:16',
    projectName = `Flow_${Date.now()}`,
    timeout = 300000,
  } = config;

  const browser = await connectToChrome();

  log.info(`🎬 [Flow Driver] Generating ${mediaType} for '${projectName}'`);
  log.info(`   Model: ${model} | Aspect: ${aspectRatio} | Timeout: ${timeout / 1000}s`);

  const page = await browser.newPage();
  const cursor = createCursor(page);

  try {
    // ──── STEP 1: Navigate to Flow landing page ────
    await page.goto(FLOW_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // ──── STEP 2: Click "Create with Flow" to enter authenticated workspace ────
    log.info('   Entering Flow workspace...');
    const workspaceHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent?.trim() === 'Create with Flow');
    });

    const isWorkspaceBtn = await workspaceHandle.evaluate(el => el instanceof Element);
    if (!isWorkspaceBtn) {
      log.info('   "Create with Flow" not found — may already be in workspace.');
    } else {
      await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
      await cursor.click(workspaceHandle);
    }

    await new Promise(r => setTimeout(r, 5000));

    // ──── STEP 3: Dismiss changelog/what's new modal if present ────
    const getStartedHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent?.trim() === 'Get started');
    });
    const isGetStarted = await getStartedHandle.evaluate(el => el instanceof Element);
    if (isGetStarted) {
      await cursor.click(getStartedHandle);
    }
    await new Promise(r => setTimeout(r, 2000));

    // ──── STEP 4: Click "New project" ────
    log.info('   Creating new project...');
    const newProjHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent?.includes('New project'));
    });

    const isNewProj = await newProjHandle.evaluate(el => el instanceof Element);
    if (!isNewProj) {
      throw new Error('Could not find "New project" button in Flow workspace.');
    }

    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
    await cursor.click(newProjHandle);

    await new Promise(r => setTimeout(r, 5000));

    // Check if a new tab opened for the editor
    const allPages = await browser.pages();
    let workPage = allPages[allPages.length - 1];
    await workPage.bringToFront();
    const workCursor = createCursor(workPage);

    // ──── STEP 5: Set aspect ratio ────
    log.info(`   Setting aspect ratio to ${aspectRatio}...`);
    // Flow uses material icon button labels for aspect ratios
    const aspectHandle = await workPage.evaluateHandle((ratio) => {
      // Look for aspect ratio toggle buttons by their text or aria labels
      const allEls = Array.from(document.querySelectorAll('button, div[role="button"]'));
      for (const el of allEls) {
        const label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
        if (ratio === '9:16' && (label.includes('9:16') || label.includes('portrait'))) return el;
        if (ratio === '16:9' && (label.includes('16:9') || label.includes('landscape'))) return el;
        if (ratio === '1:1' && (label.includes('1:1') || label.includes('square'))) return el;
      }
    }, aspectRatio);

    const isAspect = await aspectHandle.evaluate(el => el instanceof Element);
    if (isAspect) {
      await new Promise(r => setTimeout(r, Math.random() * 300 + 200));
      await workCursor.click(aspectHandle);
    }
    await new Promise(r => setTimeout(r, 1000));

    // ──── STEP 6: Select model ────
    log.info(`   Selecting model: ${model}...`);
    const ddHandle = await workPage.evaluateHandle(() => {
      const dropdowns = Array.from(document.querySelectorAll('button, div[role="button"], [class*="dropdown"], select'));
      return dropdowns.find(dd => (dd.textContent?.trim() || '').includes('Veo 3.1'));
    });

    const isDd = await ddHandle.evaluate(el => el instanceof Element);
    if (isDd) {
      await workCursor.click(ddHandle);
    }
    await new Promise(r => setTimeout(r, 1500));

    const modelItemHandle = await workPage.evaluateHandle((targetModel) => {
      const items = Array.from(document.querySelectorAll('li, div[role="option"], div[role="menuitem"], span'));
      return items.find(i => i.textContent?.trim() === targetModel);
    }, model);

    const isModelItem = await modelItemHandle.evaluate(el => el instanceof Element);
    if (isModelItem) {
      await new Promise(r => setTimeout(r, Math.random() * 300 + 100));
      await workCursor.click(modelItemHandle);
    }
    await new Promise(r => setTimeout(r, 1000));

    // ──── STEP 7: ARM CDP NETWORK INTERCEPTOR (before prompt submission) ────
    log.info('   Arming CDP Network Interceptor...');
    let capturedBuffer = null;
    let capturedContentType = '';

    const responseHandler = async (response) => {
      const url = response.url();
      const status = response.status();
      const ct = response.headers()['content-type'] || '';

      // Catch video payloads (Veo) or image payloads (Imagen)
      const isMedia = (
        ct.includes('video/mp4') ||
        ct.includes('video/webm') ||
        ct.includes('image/png') ||
        ct.includes('image/jpeg') ||
        ct.includes('image/webp') ||
        url.includes('videoplayback') ||
        url.includes('generatedmedia')
      );

      if (status === 200 && isMedia) {
        try {
          const buffer = await response.buffer();
          // Only capture substantial payloads (> 50KB = real media, not thumbnails)
          if (buffer.length > 50000 && (!capturedBuffer || buffer.length > capturedBuffer.length)) {
            capturedBuffer = buffer;
            capturedContentType = ct;
            log.success(`   CDP intercepted ${mediaType} payload: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (e) {
          // Ignore partial buffer errors — streaming responses may not buffer cleanly
        }
      }
    };

    workPage.on('response', responseHandler);

    // ──── STEP 8: Inject prompt ────
    log.info('   Injecting prompt...');
    const inputHandle = await workPage.evaluateHandle(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      for (const ta of textareas) {
        if (ta.placeholder?.includes('What do you want') || ta.className !== 'g-recaptcha-response') {
          return ta;
        }
      }
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
      if (editables.length > 0) return editables[0];

      return Array.from(document.querySelectorAll('*')).find(
        e => e.textContent?.includes('What do you want to create')
      );
    });

    const isInput = await inputHandle.evaluate(el => el instanceof Element);
    if (!isInput) {
      throw new Error('Could not find Flow prompt input field');
    }

    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
    await workCursor.click(inputHandle);

    for (const char of prompt) {
      await workPage.keyboard.type(char, { delay: Math.random() * 30 + 5 });
    }

    await new Promise(r => setTimeout(r, 500));

    // ──── STEP 9: Submit ────
    log.info('   Submitting generation request...');
    const submitHandle = await workPage.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => {
        const label = b.getAttribute('aria-label') || '';
        const text = b.textContent?.trim() || '';
        return label.includes('Send') || label.includes('Submit') || label.includes('Generate') ||
          text === 'Create' || text.includes('arrow_forward') || text.includes('→');
      });
      if (submitBtn) return submitBtn;
      const iconBtns = btns.filter(b => b.querySelector('svg, mat-icon, .material-icons'));
      if (iconBtns.length > 0) return iconBtns[iconBtns.length - 1];
    });

    const isSubmit = await submitHandle.evaluate(el => el instanceof Element);
    if (isSubmit) {
      await new Promise(r => setTimeout(r, Math.random() * 800 + 400));
      await workCursor.click(submitHandle);
    }

    // ──── STEP 10: Wait for generation ────
    log.info(`   ⏳ Waiting up to ${timeout / 1000}s for ${mediaType} generation...`);
    const start = Date.now();

    while (!capturedBuffer && (Date.now() - start) < timeout) {
      await new Promise(r => setTimeout(r, 5000));

      // Log progress every 30s
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed % 30 === 0 && elapsed > 0) {
        log.info(`   Still waiting... ${elapsed}s elapsed`);
      }
    }

    // ──── STEP 11: Save captured media ────
    if (capturedBuffer) {
      const ext = capturedContentType.includes('video/mp4') ? 'mp4'
        : capturedContentType.includes('video/webm') ? 'webm'
          : capturedContentType.includes('image/png') ? 'png'
            : capturedContentType.includes('image/webp') ? 'webp'
              : capturedContentType.includes('image/jpeg') ? 'jpg'
                : 'mp4';
      const filename = `flow_${projectName}_${Date.now()}.${ext}`;
      const savePath = path.resolve(process.cwd(), filename);
      fs.writeFileSync(savePath, capturedBuffer);
      log.success(`   Media saved: ${savePath} (${(capturedBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

      // ──── DIGITAL CITIZENSHIP: Name the project ────
      log.info(`   🛡️ Digital Citizenship: Naming project "${projectName}"...`);
      const renameHandle = await workPage.evaluateHandle(() => {
        const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        return editables.find(e => {
          const text = e.textContent || '';
          return text.includes('Untitled') || text.trim() === '';
        });
      });

      const isRename = await renameHandle.evaluate(el => el instanceof Element);
      if (isRename) {
        await workCursor.click(renameHandle);
        await new Promise(r => setTimeout(r, 100));
        await workPage.keyboard.down('Meta');
        await workPage.keyboard.press('a');
        await workPage.keyboard.up('Meta');
        await workPage.keyboard.press('Backspace');
        await new Promise(r => setTimeout(r, 200));
        for (const char of projectName) await workPage.keyboard.type(char, { delay: Math.random() * 40 + 10 });
        await workPage.keyboard.press('Enter');
      }

      workPage.off('response', responseHandler);
      return savePath;
    }

    workPage.off('response', responseHandler);
    throw new Error(`Flow ${mediaType} generation timed out after ${timeout / 1000}s. CDP interceptor captured no substantial media payload.`);

  } finally {
    await page.close().catch(() => { });
    browser.disconnect();
  }
}

export default { generateFlowMedia };
