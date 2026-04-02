/**
 * Chrome AI — Browser-based Google AI interaction for RoboNuggets
 *
 * Two modes of operation:
 *
 * 1. AGENT MODE (recommended): The AI agent uses Chrome DevTools MCP
 *    tools to control the user's Chrome directly. This module provides
 *    helper functions that the agent calls, which in turn use
 *    puppeteer-core as a fallback.
 *
 * 2. STANDALONE MODE: For running scripts directly (npm run r45),
 *    uses puppeteer-core to connect to Chrome via CDP.
 *
 * Chrome 144+ required.
 * All AI interactions go through the user's logged-in Chrome session.
 * No API keys needed.
 *
 * Connection methods (in priority order):
 *   1. puppeteer-core via CDP WebSocket — most reliable
 *   2. puppeteer-core via http://127.0.0.1:<CDP_PORT> — configurable debug port
 *
 * Set CDP_PORT env var to override the default port (9333).
 */
import puppeteer from 'puppeteer-core';
import { log } from './logger.js';
import { createCursor } from 'ghost-cursor';

/** Chrome DevTools Protocol port. Override with CDP_PORT env var. */
const CDP_PORT = parseInt(process.env.CDP_PORT, 10) || 9333;

let browser = null;

// ═══════════════════════════════════════════════════
//  CHROME CONNECTION
// ═══════════════════════════════════════════════════

/**
 * Quick pre-check that Chrome is reachable before attempting a full connection.
 * Returns true if the CDP port responds, false otherwise.
 */
export async function isChromeAvailable(port = CDP_PORT) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Connect to the user's running Chrome instance.
 * Performs a fast pre-check before attempting full puppeteer connection.
 * @param {object} options
 * @param {string} options.browserUrl - Chrome debugging URL
 * @param {string} options.wsEndpoint - WebSocket endpoint (from CDP)
 * @returns {Promise<Browser>}
 */
export async function connectToChrome(options = {}) {
  if (browser && browser.connected) return browser;

  // Fast pre-check — fail early with a clear message
  const available = await isChromeAvailable();
  if (!available) {
    const msg = [
      `Chrome is not reachable on port ${CDP_PORT}.`,
      '',
      'Start Chrome with remote debugging enabled:',
      '  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\',
      `    --remote-debugging-port=${CDP_PORT}`,
      '',
      'Or enable it in Chrome 144+ at: chrome://inspect/#remote-debugging',
      `(Override port with CDP_PORT env var. Current: ${CDP_PORT})`,
    ].join('\n');
    throw new Error(msg);
  }

  // Try WebSocket endpoint first (more reliable when CDP provides it)
  if (options.wsEndpoint) {
    try {
      log.info(`🌐 Connecting to Chrome via WebSocket...`);
      browser = await puppeteer.connect({
        browserWSEndpoint: options.wsEndpoint,
        defaultViewport: null,
      });
      log.success('Connected to Chrome via WebSocket');
      return browser;
    } catch (err) {
      log.warn(`WebSocket connection failed: ${err.message}`);
    }
  }

  // Try HTTP URL
  const urls = [
    options.browserUrl,
    `http://127.0.0.1:${CDP_PORT}`,
    `http://localhost:${CDP_PORT}`,
  ].filter(Boolean);

  for (const url of urls) {
    try {
      log.info(`🌐 Connecting to Chrome at ${url}...`);
      browser = await puppeteer.connect({
        browserURL: url,
        defaultViewport: null,
      });
      log.success(`Connected to Chrome at ${url}`);
      return browser;
    } catch (err) {
      log.debug(`   ${url}: ${err.message}`);
    }
  }

  throw new Error(`Chrome is reachable but puppeteer could not connect. Try restarting Chrome with --remote-debugging-port=${CDP_PORT}.`);
}

/**
 * Disconnect from Chrome (doesn't close the browser)
 */
export async function disconnectChrome() {
  if (browser) {
    browser.disconnect();
    browser = null;
    log.info('Disconnected from Chrome');
  }
}

// ═══════════════════════════════════════════════════
//  RETRY UTILITY
// ═══════════════════════════════════════════════════

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {object} options
 * @param {number} options.attempts - Max attempts (default: 3)
 * @param {number} options.delayMs - Initial delay in ms (default: 2000)
 * @param {string} options.label - Label for log messages
 * @returns {Promise<*>}
 */
export async function withRetry(fn, { attempts = 3, delayMs = 2000, label = 'operation' } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        log.warn(`${label} failed (attempt ${i}/${attempts}): ${err.message}`);
        log.info(`   Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════
//  SELF-HEALING DOM FINDER
// ═══════════════════════════════════════════════════

/**
 * Self-healing element finder with ranked fallback strategies.
 * Automatically tries each strategy in order until one resolves a visible element.
 * Logs which rank succeeded — giving observability into UI drift without crashing.
 *
 * Strategy types:
 *   'text'     — element where textContent.includes(value) (case-sensitive by default)
 *   'itext'    — element where textContent.toLowerCase().includes(value.toLowerCase())
 *   'aria'     — element where aria-label.includes(value)
 *   'selector' — standard CSS selector (first visible match)
 *   'role'     — element with matching [role] attribute
 *
 * @param {Page} page - Puppeteer page
 * @param {Array<{type: string, value: string}>} strategies - Ordered fallback list
 * @param {object} options
 * @param {number} options.timeout - Total timeout in ms (default: 10000)
 * @param {string} options.label - Human-readable name for this element (for logs)
 * @param {boolean} options.required - If true, throws when all strategies fail
 * @param {string[]} options.tags - Limit search to these tag names (default: all)
 * @returns {Promise<ElementHandle|null>}
 */
export async function domFind(page, strategies, options = {}) {
  const { timeout = 10000, label = 'element', required = false, tags = [] } = options;
  const tagSelector = tags.length ? tags.join(', ') : '*';
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (let rank = 0; rank < strategies.length; rank++) {
      const s = strategies[rank];

      const handle = await page.evaluateHandle((strat, tagSel) => {
        const isVisible = (el) => {
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return r.width > 0 && r.height > 0
            && cs.display !== 'none'
            && cs.visibility !== 'hidden'
            && cs.opacity !== '0'
            && el.closest('[aria-hidden="true"]') === null;
        };

        const all = Array.from(document.querySelectorAll(
          strat.type === 'selector' ? strat.value : tagSel
        ));

        let candidates;
        switch (strat.type) {
          case 'text':
            candidates = all.filter(el => el.textContent?.includes(strat.value));
            break;
          case 'itext':
            candidates = all.filter(el =>
              el.textContent?.toLowerCase().includes(strat.value.toLowerCase())
            );
            break;
          case 'aria':
            candidates = all.filter(el =>
              (el.getAttribute('aria-label') || '').toLowerCase().includes(strat.value.toLowerCase())
            );
            break;
          case 'role':
            candidates = all.filter(el => el.getAttribute('role') === strat.value);
            break;
          case 'selector':
            candidates = all;
            break;
          default:
            candidates = [];
        }

        return candidates.find(isVisible) || null;
      }, s, tagSelector);

      const isEl = await handle.evaluate(el => el instanceof Element);
      if (isEl) {
        log.debug(`   [domFind] "${label}" found via rank-${rank + 1} (${s.type}: "${s.value}")`);
        return handle;
      }
    }

    await new Promise(r => setTimeout(r, 600));
  }

  if (required) {
    throw new Error(
      `[domFind] Could not locate "${label}" after ${timeout}ms. ` +
      `Tried ${strategies.length} strategies: ${strategies.map(s => `${s.type}:"${s.value}"`).join(', ')}`
    );
  }

  log.warn(`   [domFind] "${label}" not found within ${timeout}ms — proceeding without it`);
  return null;
}

function geminiInputSelector() {
  return [
    'div.ql-editor[role="textbox"][aria-label*="prompt"]',
    'div[contenteditable="true"][role="textbox"][aria-label*="prompt"]',
    'rich-textarea',
    'textarea',
    '[aria-label="Enter a prompt here"]',
    '[aria-label="Enter a prompt for Gemini"]'
  ].join(', ');
}

function geminiSendButtonSelector() {
  return [
    'button.send-button',
    'button[aria-label="Send message"]',
    'button[title="Send message"]',
    'button[data-test-id="send-button"]'
  ].join(', ');
}

async function findVisibleHandle(page, selector, timeout = 15000) {
  await page.waitForFunction((candidateSelector) => {
    return [...document.querySelectorAll(candidateSelector)].some((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.closest('[aria-hidden="true"]') === null;
    });
  }, { timeout }, selector);

  const handles = await page.$$(selector);
  for (const handle of handles) {
    const isVisible = await handle.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.closest('[aria-hidden="true"]') === null;
    });

    if (isVisible) {
      return handle;
    }
  }

  return null;
}

async function findGeminiInput(page) {
  return findVisibleHandle(page, geminiInputSelector(), 15000);
}

async function findGeminiSendButton(page) {
  return findVisibleHandle(page, geminiSendButtonSelector(), 15000);
}

// ═══════════════════════════════════════════════════
//  GEMINI WEB UI INTERACTION
// ═══════════════════════════════════════════════════

/**
 * Generate text using Gemini via the web UI (gemini.google.com)
 * @param {string} prompt - The prompt to send
 * @param {object} options
 * @param {number} options.timeout - Max wait in ms (default: 90000)
 * @returns {Promise<string>} Generated response text
 */
export async function generateText(prompt, options = {}) {
  const { timeout = 90000 } = options;
  const b = await connectToChrome();

  log.info('🤖 Opening Gemini in Chrome...');

  const page = await b.newPage();
  const cursor = createCursor(page);

  try {
    await page.goto('https://gemini.google.com/app', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 2000));

    const inputEl = await findGeminiInput(page);

    if (!inputEl) throw new Error('Could not find Gemini input field');

    await cursor.click(inputEl);
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));

    const setPromptResult = await inputEl.evaluate((el, text) => {
      const dispatchInput = (target, value, inputType) => {
        target.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: value,
          inputType,
        }));
      };

      const editable = el.matches?.('[contenteditable="true"]')
        ? el
        : el.querySelector?.('[contenteditable="true"]') || el;

      editable.focus();

      if (editable.isContentEditable) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editable);
        selection.removeAllRanges();
        selection.addRange(range);

        const usedExecCommand = typeof document.execCommand === 'function'
          && document.execCommand('insertText', false, text);

        if (!usedExecCommand) {
          editable.textContent = text;
          dispatchInput(editable, text, 'insertText');
        }

        selection.removeAllRanges();
        return {
          method: usedExecCommand ? 'execCommand' : 'textContent',
          characters: editable.textContent?.length || 0,
        };
      }

      if ('value' in editable) {
        editable.value = text;
        dispatchInput(editable, text, 'insertText');
        editable.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          method: 'value',
          characters: editable.value?.length || 0,
        };
      }

      editable.textContent = text;
      dispatchInput(editable, text, 'insertText');
      return {
        method: 'fallback',
        characters: editable.textContent?.length || 0,
      };
    }, prompt);

    log.info(`   Prompt injected via ${setPromptResult.method} (${setPromptResult.characters} chars)`);

    await new Promise(r => setTimeout(r, 500));
    await page.waitForFunction((selector) => {
      const button = document.querySelector(selector);
      return Boolean(button && !button.disabled);
    }, { timeout: 10000 }, geminiSendButtonSelector());

    const sendButton = await findGeminiSendButton(page);
    if (!sendButton) {
      throw new Error('Could not find Gemini send button');
    }
    await new Promise(r => setTimeout(r, Math.random() * 300 + 200));
    await cursor.click(sendButton);

    log.info('   Waiting for response...');
    await new Promise(r => setTimeout(r, 5000));

    let lastText = '';
    let stableCount = 0;
    const start = Date.now();

    while (stableCount < 3 && (Date.now() - start) < timeout) {
      const current = await page.evaluate(() => {
        // 1. Try structured DOM
        const msgs = document.querySelectorAll(
          '[data-message-author-role="model"], .model-response-text, .response-container .markdown, message-content, div[class*="content"] > div[class*="markdown"]'
        );
        const last = msgs[msgs.length - 1];
        if (last && last.textContent.trim().length > 0) return last.textContent.trim();
        
        // 2. Self-healing fallback: just dump entire page text and let Node parse it!
        return document.body.innerText || '';
      });

      if (current.length > 0 && current === lastText) {
        // Wait, if it's the whole page text, it might stabilize early. 
        // Let's ensure we actually see JSON braces/brackets before incrementing stability.
        if (current.includes('{') || current.includes('[')) {
          stableCount++;
        } else {
          // Keep waiting if we don't see any sign of JSON structure
          await new Promise(r => setTimeout(r, 1000));
        }
      } else {
        stableCount = 0;
        lastText = current;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    if (!lastText) throw new Error('No response received from Gemini');

    log.success(`   Response raw length: ${lastText.length} chars (will extract JSON block natively)`);
    return lastText;
  } finally {
    await page.close();
  }
}

/**
 * Generate media (image or video) using Gemini via the web UI.
 * @param {string} prompt - The prompt to send (e.g. "Generate an image of...")
 * @param {object} options
 * @param {number} options.timeout - Max wait in ms (default: 300000 / 5 mins)
 * @param {string} options.mediaType - 'image', 'video', or 'any'
 * @returns {Promise<string>} Extracted media URL
 */
export async function generateMedia(prompt, options = {}) {
  const { timeout = 300000, mediaType = 'any' } = options;
  const b = await connectToChrome();

  log.info(`🤖 Opening Gemini in Chrome for MEDIA generation (${mediaType})...`);

  const page = await b.newPage();
  const cursor = createCursor(page);

  try {
    await page.goto('https://gemini.google.com/app', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 2000));

    const inputEl = await findGeminiInput(page);
    if (!inputEl) throw new Error('Could not find Gemini input field');

    await cursor.click(inputEl);
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));

    // Inject prompt using same robust method as generateText
    const setPromptResult = await inputEl.evaluate((el, text) => {
      const dispatchInput = (target, value, inputType) => {
        target.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType }));
      };
      const editable = el.matches?.('[contenteditable="true"]') ? el : el.querySelector?.('[contenteditable="true"]') || el;
      editable.focus();

      if (editable.isContentEditable) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editable);
        selection.removeAllRanges();
        selection.addRange(range);
        const usedExecCommand = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
        if (!usedExecCommand) {
          editable.textContent = text;
          dispatchInput(editable, text, 'insertText');
        }
        selection.removeAllRanges();
        return { method: usedExecCommand ? 'execCommand' : 'textContent', characters: editable.textContent?.length || 0 };
      }

      if ('value' in editable) {
        editable.value = text;
        dispatchInput(editable, text, 'insertText');
        editable.dispatchEvent(new Event('change', { bubbles: true }));
        return { method: 'value', characters: editable.value?.length || 0 };
      }

      editable.textContent = text;
      dispatchInput(editable, text, 'insertText');
      return { method: 'fallback', characters: editable.textContent?.length || 0 };
    }, prompt);

    log.info(`   Prompt injected via ${setPromptResult.method} (${setPromptResult.characters} chars)`);

    await new Promise(r => setTimeout(r, 500));
    await page.waitForFunction((selector) => {
      const button = document.querySelector(selector);
      return Boolean(button && !button.disabled);
    }, { timeout: 10000 }, geminiSendButtonSelector());

    const sendButton = await findGeminiSendButton(page);
    if (!sendButton) throw new Error('Could not find Gemini send button');

    await new Promise(r => setTimeout(r, Math.random() * 300 + 200));
    await cursor.click(sendButton);

    log.info(`   Waiting up to ${timeout / 1000}s for ${mediaType} response...`);

    const start = Date.now();
    let foundMediaUrl = null;

    while (!foundMediaUrl && (Date.now() - start) < timeout) {
      foundMediaUrl = await page.evaluate((type) => {
        const msgs = document.querySelectorAll('[data-message-author-role="model"], .model-response-text, .response-container .markdown, message-content');
        if (!msgs.length) return null;

        // Only look in the very last response block
        const last = msgs[msgs.length - 1];

        if (type === 'image' || type === 'any') {
          // Find standard images but exclude UI avatars/icons
          const imgs = Array.from(last.querySelectorAll('img'));
          for (const img of imgs) {
            // Usually generated images have specific classes or blob URLs
            if (img.src && !img.src.includes('avatar') && !img.src.includes('favicon') && img.width > 100) {
              return img.src;
            }
          }
        }

        if (type === 'video' || type === 'any') {
          // Find video elements built by Veo in the DOM
          const video = last.querySelector('video source, video');
          if (video && video.src) return video.src;
        }

        return null;
      }, mediaType);

      if (!foundMediaUrl) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!foundMediaUrl) throw new Error(`No ${mediaType} found in response within timeout.`);

    log.success(`   Media extracted: ${foundMediaUrl.substring(0, 60)}...`);
    return foundMediaUrl;
  } finally {
    await page.close();
  }
}

/**
 * Generate structured JSON using Gemini via the web UI.
 * Automatically retries up to 3 times on failure.
 * @param {string} prompt - The prompt (should request JSON)
 * @param {object} options
 * @returns {Promise<object>} Parsed JSON
 */
export async function generateJSON(prompt, options = {}) {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown code fences, no explanation, no extra text. Just raw JSON.`;

  return withRetry(async () => {
    const response = await generateText(jsonPrompt, options);

    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
      if (match) return JSON.parse(match[0]);
      throw new Error(`Could not parse JSON from response: ${cleaned.substring(0, 200)}`);
    }
  }, { label: 'generateJSON', attempts: 3 });
}

export default { connectToChrome, disconnectChrome, isChromeAvailable, withRetry, domFind, generateText, generateJSON, generateMedia };
