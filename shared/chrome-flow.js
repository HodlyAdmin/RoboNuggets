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

function normalizeUiLabel(value = '') {
  return value
    .toLowerCase()
    .replace(/[_[\]()-]+/g, ' ')
    .replace(/[^\w\s:./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
 * @param {string} [config.outputDir] - Directory to save media (default: process.cwd())
 * @param {string[]} [config.referenceImages] - Local image paths to upload into Flow before generation
 * @returns {Promise<string>} Path to locally saved media file
 */
export async function generateFlowMedia(prompt, config = {}) {
  const {
    mediaType = 'video',
    model = mediaType === 'video' ? 'Veo 3.1 - Fast' : 'Nano Banana 2',
    aspectRatio = null,
    projectName = `Flow_${Date.now()}`,
    timeout = 300000,
    outputDir = process.cwd(),
    referenceImages = [],
    subMode = null,
    variantCount = null,
    requireZeroCredits = false,
  } = config;

  const resolvedReferenceImages = referenceImages.map(ref => path.resolve(ref));
  const missingReferenceImages = resolvedReferenceImages.filter(ref => !fs.existsSync(ref));
  if (missingReferenceImages.length > 0) {
    throw new Error(`Flow reference image(s) not found: ${missingReferenceImages.join(', ')}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await connectToChrome();
  let workPage = null;

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

    // ──── STEP 5: Identify the Editor Tab ────
    // Usually Flow opens a specific editor tab after "New project"
    const allPages = await browser.pages();
    workPage = allPages[allPages.length - 1] || page;
    await workPage.bringToFront();
    const workCursor = createCursor(workPage);

    const clickMatchingControl = async (labels, {
      exact = false,
      selectors = 'button, div[role="button"], [role="option"], [role="menuitem"], a',
      waitMs = 1200,
    } = {}) => {
      const candidates = Array.isArray(labels) ? labels : [labels];
      const handle = await workPage.evaluateHandle(({ wantedLabels, exactMatch, cssSelector, unselectedOnly }) => {
        const normalize = (value = '') => value
          .toLowerCase()
          .replace(/[_[\]()-]+/g, ' ')
          .replace(/[^\w\s:./]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const wanted = wantedLabels.map(normalize).filter(Boolean);
        const nodes = Array.from(document.querySelectorAll(cssSelector));
        const ranked = nodes
          .map((node) => {
            const label = normalize(`${node.getAttribute('aria-label') || ''} ${node.innerText || node.textContent || ''}`);
            const selected = node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-pressed') === 'true';
            if (!label) return null;

            let score = 0;
            for (const target of wanted) {
              if (!target) continue;
              if (exactMatch && label === target) score = Math.max(score, 100 + target.length);
              else if (!exactMatch && label.includes(target)) {
                const closeness = Math.max(1, 50 - Math.abs(label.length - target.length));
                score = Math.max(score, target.length * 10 + closeness);
              }
              else if (!exactMatch && target.includes(label)) score = Math.max(score, Math.max(1, label.length - 2));
            }

            if (score === 0) return null;
            return { node, score, label, selected };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);

        return ranked[0]?.node || null;
      }, {
        wantedLabels: candidates,
        exactMatch: exact,
        cssSelector: selectors,
        unselectedOnly: false,
      });

      const exists = await handle.evaluate((el) => el instanceof Element).catch(() => false);
      if (!exists) return false;

      await workCursor.click(handle);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return true;
    };

    const hasSelectedControl = async (label) => workPage.evaluate((target) => {
      const normalize = (value = '') => value
        .toLowerCase()
        .replace(/[_[\]()-]+/g, ' ')
        .replace(/[^\w\s:./]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const wanted = normalize(target);
      return Array.from(document.querySelectorAll('[aria-selected="true"], [aria-pressed="true"]'))
        .some((node) => normalize(`${node.getAttribute('aria-label') || ''} ${node.innerText || node.textContent || ''}`).includes(wanted));
    }, label);

    const ensureControlSelected = async (label, waitMs = 1200) => {
      if (await hasSelectedControl(label)) return true;
      return clickMatchingControl(label, {
        selectors: 'button, div[role="button"], [role="option"], [role="menuitem"]',
        waitMs,
      });
    };

    const openSettingsTray = async () => {
      if (mediaType === 'video') {
        return clickMatchingControl(['Video crop_16_9 x2', 'Video crop_9_16 x2', 'Video'], {
          selectors: 'button, div[role="button"]',
          waitMs: 1500,
        });
      }

      return clickMatchingControl(['Image', 'Nano Banana', 'Imagen'], {
        selectors: 'button, div[role="button"]',
        waitMs: 1200,
      });
    };

    // ──── STEP 5: Initial aspect ratio pass ────
    if (mediaType === 'video') {
      log.info(`   Configuring Flow video controls for ${model}...`);
      const opened = await openSettingsTray();
      if (!opened) {
        throw new Error('Could not open the Flow video settings tray.');
      }

      await ensureControlSelected('Video');
      if (subMode) await ensureControlSelected(subMode);
      if (aspectRatio) await ensureControlSelected(aspectRatio);
      if (variantCount) await ensureControlSelected(variantCount);

      const modelLabel = await workPage.evaluate(() => {
        const normalize = (value = '') => value
          .toLowerCase()
          .replace(/[_[\]()-]+/g, ' ')
          .replace(/[^\w\s:./]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const controls = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const match = controls.find((node) => normalize(node.innerText || node.textContent || '').includes('veo 3.1'));
        return match ? `${match.getAttribute('aria-label') || ''} ${match.innerText || match.textContent || ''}` : '';
      });

      if (!normalizeUiLabel(modelLabel).includes(normalizeUiLabel(model))) {
        const openedModelMenu = await clickMatchingControl(['Veo 3.1', model], {
          selectors: 'button, div[role="button"]',
          waitMs: 1000,
        });
        if (!openedModelMenu) {
          throw new Error(`Could not open the Flow model chooser for '${model}'.`);
        }

        const modelSelected = await clickMatchingControl(model, {
          selectors: 'button, div[role="button"], [role="option"], [role="menuitem"]',
          waitMs: 1500,
        });
        if (!modelSelected) {
          throw new Error(`Could not select Flow model '${model}'.`);
        }
      }

      const freeState = await workPage.evaluate(({ expectedRatio, expectedMode, expectedCount }) => {
        const body = document.body.innerText || '';
        const selected = Array.from(document.querySelectorAll('[aria-selected="true"], [aria-pressed="true"]'))
          .map((node) => (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim());
        return {
          body,
          selected,
          hasZeroCredits: body.includes('0 credits'),
          hasExpectedRatio: selected.some((label) => label.includes(expectedRatio)),
          hasExpectedMode: selected.some((label) => label.includes(expectedMode)),
          hasExpectedCount: selected.some((label) => label.includes(expectedCount)),
        };
      }, {
        expectedRatio: aspectRatio,
        expectedMode: subMode || '',
        expectedCount: variantCount || '',
      });

      if (requireZeroCredits && !freeState.hasZeroCredits) {
        throw new Error(`Flow video settings are not on the free path yet. Visible state did not show '0 credits'.`);
      }
      if (subMode && !freeState.hasExpectedMode) {
        throw new Error(`Flow video settings did not keep '${subMode}' selected.`);
      }
      if (aspectRatio && !freeState.hasExpectedRatio) {
        throw new Error(`Flow video settings did not keep '${aspectRatio}' selected.`);
      }
      if (variantCount && !freeState.hasExpectedCount) {
        throw new Error(`Flow video settings did not keep '${variantCount}' selected.`);
      }
      log.success(`   Flow free video path locked: ${subMode || 'default'} | ${aspectRatio} | ${variantCount || 'default'} | ${model}`);
    } else {
      log.info(`   Setting Flow image controls for ${model} at ${aspectRatio}...`);
      const opened = await openSettingsTray();
      if (!opened) {
        log.warn('   Could not open the Flow image settings tray — UI may already be in the correct state.');
      }

      await ensureControlSelected('Image');
      if (aspectRatio) await ensureControlSelected(aspectRatio);
      if (variantCount) await ensureControlSelected(variantCount);

      // Model selection — check if the current model label matches, otherwise click to change
      const currentModelLabel = await workPage.evaluate(() => {
        const normalize = (value = '') => value
          .toLowerCase()
          .replace(/[_[\]()-]+/g, ' ')
          .replace(/[^\w\s:./]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const controls = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const match = controls.find((node) => {
          const label = normalize(node.innerText || node.textContent || '');
          return label.includes('nano banana') || label.includes('imagen');
        });
        return match ? `${match.getAttribute('aria-label') || ''} ${match.innerText || match.textContent || ''}` : '';
      });

      if (!normalizeUiLabel(currentModelLabel).includes(normalizeUiLabel(model))) {
        const modelClicked = await clickMatchingControl([model, 'Nano Banana', 'Imagen'], {
          selectors: 'button, div[role="button"], [role="option"], [role="menuitem"]',
          waitMs: 1500,
        });
        if (!modelClicked) {
          log.warn(`   Could not explicitly select image model '${model}' — may already be the default.`);
        }
      }

      log.success(`   Flow image controls set: ${aspectRatio || 'default'} | ${variantCount || 'default'} | ${model}`);
    }

    // ──── STEP 8: Upload reference images before arming the network interceptor ────
    if (resolvedReferenceImages.length > 0) {
      log.info(`   Uploading ${resolvedReferenceImages.length} reference image(s) into Flow...`);

      let fileInputHandle = await workPage.evaluateHandle(() =>
        document.querySelector('input[type="file"][accept*="image"]')
      );
      let hasFileInput = await fileInputHandle.evaluate(el => el instanceof HTMLInputElement);

      if (!hasFileInput) {
        const addMediaHandle = await workPage.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.find(btn => (btn.textContent || '').includes('Add Media'));
        });
        const isAddMedia = await addMediaHandle.evaluate(el => el instanceof Element);
        if (isAddMedia) {
          await workCursor.click(addMediaHandle);
          await new Promise(r => setTimeout(r, 1500));
          fileInputHandle = await workPage.evaluateHandle(() =>
            document.querySelector('input[type="file"][accept*="image"]')
          );
          hasFileInput = await fileInputHandle.evaluate(el => el instanceof HTMLInputElement);
        }
      }

      if (!hasFileInput) {
        throw new Error('Flow reference upload was requested, but no image file input was available in the editor.');
      }

      await fileInputHandle.uploadFile(...resolvedReferenceImages);
      await workPage.waitForFunction(
        () => {
          const bodyText = document.body.innerText || '';
          return bodyText.includes('View uploaded media') ||
            Array.from(document.querySelectorAll('img')).some(img => /generated image/i.test(img.alt || ''));
        },
        { timeout: 30000 }
      );
      await new Promise(r => setTimeout(r, 1500));
      log.success(`   Flow uploaded reference media: ${resolvedReferenceImages.map(ref => path.basename(ref)).join(', ')}`);
    }

    // ──── STEP 9: ARM CDP NETWORK INTERCEPTOR (before prompt submission) ────
    log.info('   Arming CDP Network Interceptor...');
    const capturedMedia = new Map(); // url -> { buffer, contentType, url, timestamp, size }
    let totalMediaHitsSeen = 0;
    let captureEnabledAt = Date.now(); // Start capturing immediately to miss nothing

    const responseHandler = async (response) => {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const ct = headers['content-type'] || '';

      if (Date.now() < captureEnabledAt) return;

      // Catch video payloads (Veo) or image payloads (Imagen) strictly by mediaType
      const isMedia = (
        (mediaType === 'video' && (
          ct.includes('video/') ||
          url.includes('videoplayback') ||
          url.includes('getMediaUrl') ||
          url.includes('.mp4') ||
          url.includes('.webm') ||
          url.includes('google-video')
        )) ||
        (mediaType === 'image' && (
          ct.includes('image/') ||
          url.includes('generatedmedia') ||
          url.includes('output_file')
        ))
      );

      if (isMedia) {
        totalMediaHitsSeen++;
        if ((status === 200 || status === 206)) {
          try {
            const buffer = await response.buffer();
            // Only capture substantial payloads (> 50KB = real media, not thumbnails)
            if (buffer.length > 50000) {
              const existing = capturedMedia.get(url);
              if (!existing || buffer.length > existing.buffer.length) {
                capturedMedia.set(url, { 
                  buffer, 
                  contentType: ct, 
                  url, 
                  size: buffer.length,
                  timestamp: new Date().toISOString()
                });
                log.success(`   CDP intercepted ${mediaType} candidate: ${(buffer.length / 1024 / 1024).toFixed(2)} MB [Status: ${status}] [URL: ...${url.slice(-30)}]`);
              }
            } else {
              log.info(`   CDP skipped small ${mediaType} payload: ${(buffer.length / 1024).toFixed(1)} KB [URL: ...${url.slice(-30)}]`);
            }
          } catch (e) {
            // Ignore partial buffer errors — streaming responses may not buffer cleanly
          }
        } else {
            log.info(`   CDP ignored ${mediaType} response with low/wrong status: ${status} [URL: ...${url.slice(-30)}]`);
        }
      }
    };
    workPage.on('response', responseHandler);

    // ──── STEP 10: Inject prompt ────
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

    // ──── STEP 11: Submit ────
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
    } else {
      await workPage.keyboard.press('Enter');
    }

    // ──── STEP 12: Wait for generation ────
    log.info(`   ⏳ Waiting up to ${timeout / 1000}s for ${mediaType} generation...`);
    const start = Date.now();
    let fallbackMedias = [];
    const expectedCount = Math.max(1, parseInt(String(variantCount || '1').replace(/[^0-9]/g, '')) || 1);

    // STEP 11.5: Verify Submission (Improves observability)
    log.info('   Verifying submission state...');
    const submitSuccess = await workPage.evaluate(async () => {
      for (let i = 0; i < 8; i++) {
        const bodyText = document.body.innerText || '';
        if (bodyText.includes('Cancel') || bodyText.includes('Stop') || bodyText.includes('Generating') || bodyText.includes('%') || document.querySelector('mat-progress-bar, mat-spinner, [role="progressbar"]')) {
           return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return false;
    });
    if (!submitSuccess) {
       log.warn('   ⚠️ Could not visually confirm generation started. Submission may have failed or was instantaneous.');
    } else {
       log.success('   Generation visually confirmed started.');
    }

    while (capturedMedia.size < expectedCount && (Date.now() - start) < timeout) {
      if (mediaType === 'video') {
        const rawFallback = await workPage.evaluate(() => {
          const videos = Array.from(document.querySelectorAll('video'));
          return videos.map(video => {
            const source = video.querySelector('source');
            const src = source?.src || video?.currentSrc || video?.src || null;
            if (!src || src.startsWith('blob:')) return null;
            return {
              src,
              mime: source?.type || video?.getAttribute('type') || '',
            };
          }).filter(Boolean);
        }).catch(() => []);
        
        if (rawFallback.length > 0) {
          fallbackMedias = rawFallback;
        }

        if (fallbackMedias.length >= expectedCount) {
          log.info(`   Found ${fallbackMedias.length} DOM video(s), assuming generation is complete.`);
          break;
        }
      }

      await new Promise(r => setTimeout(r, 5000));

      // Log progress every 30s
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed % 30 === 0 && elapsed > 0) {
        log.info(`   Still waiting... ${elapsed}s elapsed (CDP: ${capturedMedia.size}/${expectedCount}, DOM: ${fallbackMedias.length}/${expectedCount})`);
      }
    }

    if (capturedMedia.size < expectedCount && mediaType === 'video' && fallbackMedias.length > 0) {
      log.warn(`   Missing CDP payload(s); attempting DOM media extraction for ${fallbackMedias.length} video(s)...`);
      for (const fallback of fallbackMedias) {
        if (capturedMedia.has(fallback.src) || Object.values(capturedMedia).some(c => c.url === fallback.src)) continue;
        
        try {
          const extracted = await workPage.evaluate(async ({ src, mime }) => {
            const res = await fetch(src);
            const blob = await res.blob();
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            return {
              base64: btoa(binary),
              mime: blob.type || mime || '',
            };
          }, fallback);

          if (extracted?.base64) {
            const buffer = Buffer.from(extracted.base64, 'base64');
            capturedMedia.set(fallback.src, { 
              buffer, 
              contentType: extracted.mime || 'video/mp4',
              url: fallback.src,
              size: buffer.length,
              timestamp: new Date().toISOString()
            });
            log.success(`   DOM media extraction recovered payload: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (err) {
          log.warn(`   DOM media extraction failed for ${fallback.src}: ${err.message}`);
        }
      }
    }

    // ──── STEP 13: Save captured media ────
    const artifacts = [];
    if (capturedMedia.size > 0) {
      const sortedCandidates = Array.from(capturedMedia.values())
        .sort((a, b) => b.buffer.length - a.buffer.length);

      // Heuristic: variantCount (e.g. x2, x4) tells us how many distinct outputs to expect.
      // If we see more payloads (e.g. previews or multiple attempts), we take the top N largest.
      // This is a heuristic capture — we cannot guarantee these are distinct variants without further metadata.
      const candidatesToSave = sortedCandidates.slice(0, expectedCount);
      const domVideoCount = await workPage.evaluate(() => document.querySelectorAll('video').length).catch(() => 0);
      const domImageCount = await workPage.evaluate(() => document.querySelectorAll('img[alt*="generated"], img[alt*="flow"]').length).catch(() => 0);

      for (let i = 0; i < candidatesToSave.length; i++) {
        const { buffer, contentType, url, size, timestamp } = candidatesToSave[i];
        const ext = contentType.includes('video/mp4') ? 'mp4'
          : contentType.includes('video/webm') ? 'webm'
            : contentType.includes('image/png') ? 'png'
              : contentType.includes('image/webp') ? 'webp'
                : contentType.includes('image/jpeg') ? 'jpg'
                  : mediaType === 'video' ? 'mp4' : 'png';

        const suffix = candidatesToSave.length > 1 ? `_v${i}` : '';
        const filename = `flow_${projectName}_${Date.now()}${suffix}.${ext}`;
        const savePath = path.resolve(outputDir, filename);
        fs.writeFileSync(savePath, buffer);
        
        artifacts.push({
          path: savePath,
          url,
          size,
          contentType,
          timestamp,
          captureIndex: i,
          isHeuristic: true,
          meta: {
            totalMediaHitsSeen,
            domVideoCount,
            domImageCount,
          }
        });
        
        log.success(`   Media saved (${i + 1}/${candidatesToSave.length}): ${savePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      }

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
      return artifacts;
    }

    workPage.off('response', responseHandler);
    throw new Error(`Flow ${mediaType} generation timed out after ${timeout / 1000}s. CDP interceptor captured no substantial media payload.`);
  } finally {
    if (workPage && !workPage.isClosed() && workPage !== page) await workPage.close();
    if (page && !page.isClosed()) await page.close();
  }
}

/**
 * Digital Citizenship: Delete a project from the Flow dashboard by name.
 * Prevents account clutter in shared workspaces.
 *
 * @param {string} projectName - Exact name of the project to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFlowProject(projectName) {
  if (!projectName) return false;
  
  // DOWNGRADE: Provider-side cleanup is currently too fragile/risky to enable.
  // The Google Flow dashboard at labs.google/fx/tools/flow no longer predictably
  // displays user-assigned project names, and video.google.com redirects elsewhere.
  // Deleting by name risks deleting other team members' projects in a shared account.
  // Until we capture the Flow session's internal Project UUID, this is unsafe.
  log.warn(`   Provider-side cleanup disabled: Cannot safely target project "${projectName}" on Flow dashboard.`);
  return false;
}

export default { generateFlowMedia, deleteFlowProject };
