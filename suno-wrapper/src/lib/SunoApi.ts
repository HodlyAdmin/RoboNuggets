import axios, { AxiosInstance } from 'axios';
import UserAgent from 'user-agents';
import pino from 'pino';
import yn from 'yn';
import { isPage, sleep, waitForRequests } from '@/lib/utils';
import * as cookie from 'cookie';
import { randomUUID } from 'node:crypto';
import { BrowserContext, Page, Locator, chromium, firefox } from 'rebrowser-playwright-core';
import { createCursor, Cursor } from 'ghost-cursor-playwright';
import { promises as fs } from 'fs';
import path from 'node:path';

// sunoApi instance caching
const globalForSunoApi = global as unknown as { sunoApiCache?: Map<string, SunoApi> };
const cache = globalForSunoApi.sunoApiCache || new Map<string, SunoApi>();
globalForSunoApi.sunoApiCache = cache;

const logger = pino();
export const DEFAULT_MODEL = '';

export interface AudioInfo {
  id: string; // Unique identifier for the audio
  title?: string; // Title of the audio
  image_url?: string; // URL of the image associated with the audio
  lyric?: string; // Lyrics of the audio
  audio_url?: string; // URL of the audio file
  video_url?: string; // URL of the video associated with the audio
  created_at: string; // Date and time when the audio was created
  model_name: string; // Name of the model used for audio generation
  gpt_description_prompt?: string; // Prompt for GPT description
  prompt?: string; // Prompt for audio generation
  status: string; // Status
  type?: string;
  tags?: string; // Genre of music.
  negative_tags?: string; // Negative tags of music.
  duration?: string; // Duration of the audio
  error_message?: string; // Error message if any
}

interface PersonaResponse {
  persona: {
    id: string;
    name: string;
    description: string;
    image_s3_id: string;
    root_clip_id: string;
    clip: any; // You can define a more specific type if needed
    user_display_name: string;
    user_handle: string;
    user_image_url: string;
    persona_clips: Array<{
      clip: any; // You can define a more specific type if needed
    }>;
    is_suno_persona: boolean;
    is_trashed: boolean;
    is_owned: boolean;
    is_public: boolean;
    is_public_approved: boolean;
    is_loved: boolean;
    upvote_count: number;
    clip_count: number;
  };
  total_results: number;
  current_page: number;
  is_following: boolean;
}

class SunoApi {
  private static BASE_URL: string = 'https://studio-api.prod.suno.com';
  private static CLERK_BASE_URL: string = 'https://auth.suno.com';
  private static CLERK_VERSION = '5.117.0';

  private readonly client: AxiosInstance;
  private sid?: string;
  private currentToken?: string;
  private deviceId?: string;
  private userAgent?: string;
  private cookies: Record<string, string | undefined>;
  private ghostCursorEnabled = yn(process.env.BROWSER_GHOST_CURSOR, { default: false });
  private cursor?: Cursor;

  constructor(cookies: string) {
    this.userAgent = new UserAgent(/Macintosh/).random().toString(); // Usually Mac systems get less amount of CAPTCHAs
    this.cookies = cookie.parse(cookies);
    this.deviceId = this.cookies.ajs_anonymous_id || randomUUID();
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Affiliate-Id': 'undefined',
        'Device-Id': `"${this.deviceId}"`,
        'x-suno-client': 'Android prerelease-4nt180t 1.0.42',
        'X-Requested-With': 'com.suno.android',
        'sec-ch-ua': '"Chromium";v="130", "Android WebView";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'User-Agent': this.userAgent
      }
    });
    this.client.interceptors.request.use(config => {
      if (this.currentToken && !config.headers.Authorization)
        config.headers.Authorization = `Bearer ${this.currentToken}`;
      const cookiesArray = Object.entries(this.cookies).map(([key, value]) => 
        cookie.serialize(key, value as string)
      );
      config.headers.Cookie = cookiesArray.join('; ');
      return config;
    });
    this.client.interceptors.response.use(resp => {
      const setCookieHeader = resp.headers['set-cookie'];
      if (Array.isArray(setCookieHeader)) {
        const newCookies = cookie.parse(setCookieHeader.join('; '));
        for (const [key, value] of Object.entries(newCookies)) {
          this.cookies[key] = value;
        }
      }
      return resp;
    })
  }

  public async init(): Promise<SunoApi> {
    //await this.getClerkLatestVersion();
    await this.getAuthToken();
    await this.keepAlive();
    return this;
  }

  /**
   * Get the clerk package latest version id.
   * This method is commented because we are now using a hard-coded Clerk version, hence this method is not needed.
   
  private async getClerkLatestVersion() {
    // URL to get clerk version ID
    const getClerkVersionUrl = `${SunoApi.JSDELIVR_BASE_URL}/v1/package/npm/@clerk/clerk-js`;
    // Get clerk version ID
    const versionListResponse = await this.client.get(getClerkVersionUrl);
    if (!versionListResponse?.data?.['tags']['latest']) {
      throw new Error(
        'Failed to get clerk version info, Please try again later'
      );
    }
    // Save clerk version ID for auth
    SunoApi.clerkVersion = versionListResponse?.data?.['tags']['latest'];
  }
  */

  /**
   * Get the session ID and save it for later use.
   */
  private async getAuthToken() {
    logger.info('Getting the session ID');
    // URL to get session ID
    const getSessionUrl = `${SunoApi.CLERK_BASE_URL}/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=${SunoApi.CLERK_VERSION}`;
    // Get session ID
    const sessionResponse = await this.client.get(getSessionUrl, {
      headers: { Authorization: this.cookies.__client }
    });
    if (!sessionResponse?.data?.response?.last_active_session_id) {
      throw new Error(
        'Failed to get session id, you may need to update the SUNO_COOKIE'
      );
    }
    // Save session ID for later use
    this.sid = sessionResponse.data.response.last_active_session_id;
  }

  /**
   * Keep the session alive.
   * @param isWait Indicates if the method should wait for the session to be fully renewed before returning.
   */
  public async keepAlive(isWait?: boolean): Promise<void> {
    if (!this.sid) {
      throw new Error('Session ID is not set. Cannot renew token.');
    }
    // URL to renew session token
    const renewUrl = `${SunoApi.CLERK_BASE_URL}/v1/client/sessions/${this.sid}/tokens?__clerk_api_version=2025-11-10&_clerk_js_version=${SunoApi.CLERK_VERSION}`;
    // Renew session token
    logger.info('KeepAlive...\n');
    const renewResponse = await this.client.post(renewUrl, {}, {
      headers: { Authorization: this.cookies.__client }
    });
    if (isWait) {
      await sleep(1, 2);
    }
    const newToken = renewResponse.data.jwt;
    // Update Authorization field in request header with the new JWT token
    this.currentToken = newToken;
  }

  /**
   * Get the session token (not to be confused with session ID) and save it for later use.
   */
  private async getSessionToken() {
    const tokenResponse = await this.client.post(
      `${SunoApi.BASE_URL}/api/user/create_session_id/`,
      {
        session_properties: JSON.stringify({ deviceId: this.deviceId }),
        session_type: 1
      }
    );
    return tokenResponse.data.session_id;
  }

  private async captchaRequired(): Promise<boolean> {
    const resp = await this.client.post(`${SunoApi.BASE_URL}/api/c/check`, {
      ctype: 'generation'
    });
    logger.info(resp.data);
    return resp.data.required;
  }

  /**
   * Clicks on a locator or XY vector. This method is made because of the difference between ghost-cursor-playwright and Playwright methods
   */
  private async click(target: Locator|Page, position?: { x: number, y: number }): Promise<void> {
    if (false && this.ghostCursorEnabled) {
      if (!isPage(target)) {
        const loc = target as Locator;
        await loc.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await loc.scrollIntoViewIfNeeded().catch(() => {});
      }
      let pos: any = isPage(target) ? { x: 0, y: 0 } : await (target as Locator).boundingBox();
      
      if (!pos && !isPage(target)) {
        logger.warn('Could not get bounding box for target. Falling back to native click.');
        return (target as Locator).click({ force: true, position });
      }

      if (position) 
        pos = {
          ...pos,
          x: pos.x + position!.x,
          y: pos.y + position!.y,
          width: null,
          height: null,
        };
      return this.cursor?.actions.click({
        target: pos
      });
    } else {
      if (isPage(target))
        return target.mouse.click(position?.x ?? 0, position?.y ?? 0);
      else
        return (target as Locator).click({ force: true, position });
    }
  }

  /**
   * Get the BrowserType from the `BROWSER` environment variable.
   * @returns {BrowserType} chromium, firefox or webkit. Default is chromium
   */
  private getBrowserType() {
    const browser = process.env.BROWSER?.toLowerCase();
    switch (browser) {
      case 'firefox':
        return firefox;
      /*case 'webkit': ** doesn't work with rebrowser-patches
      case 'safari':
        return webkit;*/
      default:
        return chromium;
    }
  }

  /**
   * Launches a browser with the necessary cookies
   * @returns {BrowserContext}
   */
  private async launchBrowser(): Promise<BrowserContext> {
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=site-per-process',
      '--disable-features=IsolateOrigins',
      '--disable-extensions',
      '--disable-infobars'
    ];
    // Check for GPU acceleration, as it is recommended to turn it off for Docker
    if (yn(process.env.BROWSER_DISABLE_GPU, { default: false }))
      args.push('--enable-unsafe-swiftshader',
        '--disable-gpu',
        '--disable-setuid-sandbox');
        
    const userDataDir = path.join(process.cwd(), '.suno-browser-profile');
    const context = await this.getBrowserType().launchPersistentContext(userDataDir, {
      args,
      headless: yn(process.env.BROWSER_HEADLESS, { default: true }), // For manual Wingman fallback, set to false in .env
      userAgent: this.userAgent,
      locale: process.env.BROWSER_LOCALE,
      viewport: null
    });
    
    const contextCookies = await context.cookies();
    const hasSession = contextCookies.some((c: any) => c.name === '__session');
    
    if (!hasSession) {
      const cookies: any = [];
      const lax: 'Lax' | 'Strict' | 'None' = 'Lax';
      cookies.push({
        name: '__session',
        value: this.currentToken+'',
        domain: '.suno.com',
        path: '/',
        sameSite: lax
      });
      for (const key in this.cookies) {
        cookies.push({
          name: key,
          value: this.cookies[key]+'',
          domain: '.suno.com',
          path: '/',
          sameSite: lax
        })
      }
      await context.addCookies(cookies);
    }
    return context;
  }

  /**
   * Checks for CAPTCHA verification and solves the CAPTCHA if needed
   * @returns {string|null} hCaptcha token. If no verification is required, returns null
   */
  public async getCaptcha(): Promise<string|null> {
    if (!await this.captchaRequired())
      return null;

    logger.info('CAPTCHA required. Launching browser...')
    const browser = await this.launchBrowser();
    const page = await browser.newPage();
    await page.goto('https://suno.com/create', { referer: 'https://www.google.com/', waitUntil: 'domcontentloaded', timeout: 0 });

    logger.info('Waiting for Suno interface to load');
    await page.waitForTimeout(3000).catch(() => {}); // Removed API project wait as it fails if logged out

    if (this.ghostCursorEnabled)
      this.cursor = await createCursor(page);

    // Set up route FIRST to avoid race condition where request completes before interceptor is ready
    const tokenPromise = new Promise<string>((resolve, reject) => {
      page.route('**/api/generate/**', async (route: any) => {
        try {
          logger.info('API generation token successfully hitched. Closing browser');
          route.abort(); // Intercept and block
          await browser.close();
          const request = route.request();
          this.currentToken = request.headers().authorization?.split('Bearer ').pop();
          resolve(request.postDataJSON()?.token);
        } catch(err) {
          reject(err);
        }
      });
    });

    // Handle Wingman mode for Logged Out users
    const isLoggedOut = await page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).isVisible().catch(() => false);
    if (isLoggedOut || page.url() === 'https://suno.com/') {
      logger.info('User is logged out natively. Attempting autonomous Google Login via Clerk...');
      try {
        const signInBtn = page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).first();
        if (await signInBtn.isVisible()) {
          await signInBtn.click({ timeout: 5000 });
          logger.info('Clicked Sign In button, waiting for Clerk modal...');
          
          const googleBtn = page.getByRole('button', { name: /Continue with Google/i }).first();
          await googleBtn.waitFor({ state: 'visible', timeout: 8000 });
          logger.info('Clerk Google Auth located. Clicking "Continue with Google"...');
          
          await googleBtn.click();
          await page.waitForTimeout(6000); // Wait for popup auth flow auto-redirect and react state
          
          logger.info('Validating autonomous login resolution...');
          // Give Suno's React state time to navigate and purge the Sign In button
          await page.waitForTimeout(3000);
          const stillLoggedOut = await page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).isVisible().catch(() => false);
          if (stillLoggedOut || !page.url().includes('suno.com')) {
              throw new Error('Google Auth requires manual security intervention.');
          }
          
          logger.info('Autonomous Google Login SUCCESSFUL!');
          if (!page.url().includes('/create')) {
              await page.goto('https://suno.com/create', { waitUntil: 'load' });
              await page.waitForTimeout(3000);
          }
        } else {
          throw new Error('Could not find Sign In button locally.');
        }
      } catch (e: any) {
        logger.warn('========================================================================');
        logger.warn('AUTONOMOUS LOGIN FAILED / MANUAL INTERVENTION REQUIRED.');
        logger.warn('Please switch to the Chromium window and log in manually!');
        logger.warn('After logging in, type a dummy prompt and click [Create song] natively!');
        logger.warn('========================================================================');
        process.stdout.write('\x07');
        await page.bringToFront().catch(() => {});
        return tokenPromise;
      }
    }

    logger.info('Triggering the CAPTCHA');
    try {
      await page.getByLabel('Close').click({ timeout: 2000 }); // close all popups
    } catch(e) {}

    try {
      const acceptCookies = page.getByRole('button', { name: /Accept All Cookies|Accept All/i }).first();
      if (await acceptCookies.isVisible().catch(() => false)) {
        logger.info('Action: accepting cookie banner');
        await acceptCookies.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    } catch (e) {}
    
    logger.info('Action: finding visible input fields');
    let inputField: Locator | null = null;
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count().catch(() => 0);

    for (let i = 0; i < textareaCount; i++) {
      const candidate = textareas.nth(i);
      const isVisible = await candidate.isVisible().catch(() => false);
      if (!isVisible) continue;

      const placeholder = (await candidate.getAttribute('placeholder').catch(() => '')) || '';
      const ariaLabel = (await candidate.getAttribute('aria-label').catch(() => '')) || '';

      if (/search/i.test(placeholder) || /search/i.test(ariaLabel)) continue;

      inputField = candidate;
      logger.info(`Using textarea with placeholder: ${placeholder || '<none>'}`);
      break;
    }

    if (!inputField) {
      const descriptionInputs = page.locator('input[placeholder*="description" i], [contenteditable="true"]');
      const inputCount = await descriptionInputs.count().catch(() => 0);

      for (let i = 0; i < inputCount; i++) {
        const candidate = descriptionInputs.nth(i);
        const isVisible = await candidate.isVisible().catch(() => false);
        if (!isVisible) continue;
        inputField = candidate;
        logger.info('Using fallback visible description input');
        break;
      }
    }

    if (inputField) {
        logger.info('Action: typing prompt to enable Create button natively');
        await inputField.click();

        if (await inputField.evaluate((el: any) => el.tagName === 'TEXTAREA' || typeof el.value === 'string').catch(() => false)) {
          await inputField.fill('').catch(() => {});
          await inputField.pressSequentially('A futuristic cyberpunk track with heavy bass, synth pads, and a driving rhythm about an autonomous AI script taking over the matrix.', { delay: 20 });
        } else {
          await inputField.fill?.('').catch(() => {});
          await inputField.type?.('A futuristic cyberpunk track with heavy bass, synth pads, and a driving rhythm about an autonomous AI script taking over the matrix.', { delay: 20 }).catch(() => {});
        }

        await page.waitForTimeout(1200);
    } else {
        logger.info('WARNING: Could not find any textarea or description input fields!');
    }
    
    await page.waitForTimeout(1000);
    logger.info('Action: locating Create song button');
    const buttonCandidates = [
      page.getByRole('button', { name: /^Create song$/i }).first(),
      page.getByRole('button', { name: /^Create$/i }).first(),
      page.locator('button[aria-label="Create song"]').first(),
      page.locator('button[type="submit"]').first(),
    ];

    let button: Locator | null = null;
    for (const candidate of buttonCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        button = candidate;
        break;
      }
    }

    if (!button) {
      throw new Error('Could not find a visible Create button on Suno.');
    }

    const isBtnDisabled = await button.isDisabled().catch(() => false);
    logger.info('IS BUTTON DISABLED? ' + isBtnDisabled);

    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); }).catch(() => {});
    await page.waitForTimeout(500);

    await this.click(button).catch(e => logger.warn(e));
    await page.waitForTimeout(500);

    logger.info('Action: Wait complete, triggering programmatic click in case native click was ignored');
    await button.evaluate((b: HTMLElement) => {
      b.click();
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
      b.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    }).catch(e => logger.warn(e));
    
    await page.waitForTimeout(3000);
    
    const challenge = page.locator('iframe[title*="hCaptcha"]').first();
    challenge.waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
      logger.info('========================================================================');
      logger.info('CAPTCHA DETECTED! WINGMAN MODE ACTIVATED.');
      logger.info('Please switch to the Chromium window and solve the CAPTCHA manually!');
      logger.info('========================================================================');
      process.stdout.write('\x07');
      await page.bringToFront().catch(() => {});
    }).catch(() => {
      logger.info('No visible CAPTCHA frame found, or it vanished autonomously.');
    });

    page.locator('.toast, [role="alert"], text="Generation failed"').first().waitFor({ state: 'visible', timeout: 5000 }).then(async () => {
       logger.warn('========================================================================');
       logger.warn('SUNO NATIVE GENERATION REJECTION. WINGMAN MODE ACTIVATED.');
       logger.warn('Please switch to the Chromium window. Solve credits/prompt issues natively.');
       logger.warn('========================================================================');
       process.stdout.write('\x07');
       await page.bringToFront().catch(() => {});
    }).catch(() => {});

    return tokenPromise;
  }

  /**
   * Imitates Cloudflare Turnstile loading error. Unused right now, left for future
   */
  private async getTurnstile() {
    return this.client.post(
      `https://clerk.suno.com/v1/client?__clerk_api_version=2021-02-05&_clerk_js_version=${SunoApi.CLERK_VERSION}&_method=PATCH`,
      { captcha_error: '300030,300030,300030' },
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  }

  /**
   * Generate a song based on the prompt.
   * @param prompt The text prompt to generate audio from.
   * @param make_instrumental Indicates if the generated audio should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @returns
   */
  public async generate(
    prompt: string,
    make_instrumental: boolean = false,
    model?: string,
    wait_audio: boolean = false
  ): Promise<AudioInfo[]> {
    await this.keepAlive(false);
    const startTime = Date.now();
    const audios = await this.generateSongs(
      prompt,
      false,
      undefined,
      undefined,
      make_instrumental,
      model,
      wait_audio
    );
    const costTime = Date.now() - startTime;
    logger.info('Generate Response:\n' + JSON.stringify(audios, null, 2));
    logger.info('Cost time: ' + costTime);
    return audios;
  }

  /**
   * Calls the concatenate endpoint for a clip to generate the whole song.
   * @param clip_id The ID of the audio clip to concatenate.
   * @returns A promise that resolves to an AudioInfo object representing the concatenated audio.
   * @throws Error if the response status is not 200.
   */
  public async concatenate(clip_id: string): Promise<AudioInfo> {
    await this.keepAlive(false);
    const payload: any = { clip_id: clip_id };

    const response = await this.client.post(
      `${SunoApi.BASE_URL}/api/generate/concat/v2/`,
      payload,
      {
        timeout: 10000 // 10 seconds timeout
      }
    );
    if (response.status !== 200) {
      throw new Error('Error response:' + response.statusText);
    }
    return response.data;
  }

  /**
   * Generates custom audio based on provided parameters.
   *
   * @param prompt The text prompt to generate audio from.
   * @param tags Tags to categorize the generated audio.
   * @param title The title for the generated audio.
   * @param make_instrumental Indicates if the generated audio should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @param negative_tags Negative tags that should not be included in the generated audio.
   * @returns A promise that resolves to an array of AudioInfo objects representing the generated audios.
   */
  public async custom_generate(
    prompt: string,
    tags: string,
    title: string,
    make_instrumental: boolean = false,
    model?: string,
    wait_audio: boolean = false,
    negative_tags?: string
  ): Promise<AudioInfo[]> {
    const startTime = Date.now();
    const audios = await this.generateSongs(
      prompt,
      true,
      tags,
      title,
      make_instrumental,
      model,
      wait_audio,
      negative_tags
    );
    const costTime = Date.now() - startTime;
    logger.info(
      'Custom Generate Response:\n' + JSON.stringify(audios, null, 2)
    );
    logger.info('Cost time: ' + costTime);
    return audios;
  }

  private mapClipToAudioInfo(audio: any): AudioInfo {
    return {
      id: audio.id,
      title: audio.title,
      image_url: audio.image_url,
      lyric: audio.metadata?.prompt,
      audio_url: audio.audio_url,
      video_url: audio.video_url,
      created_at: audio.created_at,
      model_name: audio.model_name,
      status: audio.status,
      gpt_description_prompt: audio.metadata?.gpt_description_prompt,
      prompt: audio.metadata?.prompt,
      type: audio.metadata?.type,
      tags: audio.metadata?.tags,
      negative_tags: audio.metadata?.negative_tags,
      duration: audio.metadata?.duration
    };
  }

  private extractRunningClipIds(payload: unknown): string[] {
    const tryParse = (value: unknown): any => {
      if (typeof value !== 'string') {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const candidates = [payload];
    let index = 0;

    while (index < candidates.length) {
      const current = tryParse(candidates[index]);
      index += 1;

      if (!current || typeof current !== 'object') {
        continue;
      }

      const runningClipIds = (current as any).running_clip_ids;
      if (Array.isArray(runningClipIds) && runningClipIds.length > 0) {
        return runningClipIds.filter((id: unknown) => typeof id === 'string');
      }

      if ('detail' in (current as any)) {
        candidates.push((current as any).detail);
      }

      if ('error' in (current as any)) {
        candidates.push((current as any).error);
      }
    }

    return [];
  }

  private async waitForSongIds(
    songIds: string[],
    wait_audio: boolean = false,
    timeoutMs: number = 100000
  ): Promise<AudioInfo[]> {
    if (!songIds.length) {
      return [];
    }

    if (!wait_audio) {
      return this.get(songIds);
    }

    const startTime = Date.now();
    let lastResponse: AudioInfo[] = [];
    await sleep(5, 5);

    while (Date.now() - startTime < timeoutMs) {
      const pollResponse = await this.get(songIds);
      const allCompleted = pollResponse.every(
        (audio) => audio.status === 'streaming' || audio.status === 'complete'
      );
      const allError = pollResponse.every((audio) => audio.status === 'error');
      if (allCompleted || allError) {
        return pollResponse;
      }
      lastResponse = pollResponse;
      await sleep(3, 6);
      await this.keepAlive(true);
    }

    return lastResponse;
  }

  private buildBrowserPrompt(
    prompt: string,
    title?: string,
    tags?: string,
    make_instrumental?: boolean,
    negative_tags?: string
  ): string {
    const parts = [
      title ? `Title: ${title}` : '',
      tags ? `Style: ${tags}` : '',
      prompt,
      make_instrumental ? 'Instrumental only. No vocals.' : '',
      negative_tags ? `Avoid: ${negative_tags}` : ''
    ].filter(Boolean);

    return parts.join('\n');
  }

  private shouldKeepBrowserOpen(): boolean {
    return yn(process.env.BROWSER_KEEP_OPEN, { default: false });
  }

  private async generateSongsViaBrowser(
    prompt: string,
    isCustom: boolean,
    tags?: string,
    title?: string,
    make_instrumental?: boolean,
    wait_audio: boolean = false,
    negative_tags?: string
  ): Promise<AudioInfo[]> {
    logger.warn('Direct API generation was rejected. Falling back to native browser generation.');

    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    try {
      await page.goto('https://suno.com/create', {
        referer: 'https://www.google.com/',
        waitUntil: 'domcontentloaded',
        timeout: 0
      });

      await page.waitForTimeout(3000).catch(() => {});

      const isLoggedOut = await page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).isVisible().catch(() => false);
      if (isLoggedOut || page.url() === 'https://suno.com/') {
        logger.info('Native browser fallback landed on a logged-out page. Attempting autonomous Google Login via Clerk...');
        try {
          const signInBtn = page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).first();
          if (await signInBtn.isVisible()) {
            await signInBtn.click({ timeout: 5000 });

            const googleBtn = page.getByRole('button', { name: /Continue with Google/i }).first();
            await googleBtn.waitFor({ state: 'visible', timeout: 8000 });
            await googleBtn.click();
            await page.waitForTimeout(6000);
            await page.waitForTimeout(3000);

            const stillLoggedOut = await page.getByRole('button', { name: /(Sign In|Sign Up|Sign in to create)/i }).isVisible().catch(() => false);
            if (stillLoggedOut || !page.url().includes('suno.com')) {
              throw new Error('Google Auth requires manual security intervention.');
            }

            if (!page.url().includes('/create')) {
              await page.goto('https://suno.com/create', { waitUntil: 'load', timeout: 0 });
              await page.waitForTimeout(3000);
            }
          } else {
            throw new Error('Could not find Sign In button locally.');
          }
        } catch (error: any) {
          logger.warn('========================================================================');
          logger.warn('NATIVE BROWSER GENERATION REQUIRES MANUAL LOGIN / INTERVENTION.');
          logger.warn('Please switch to the Chromium window and complete Suno login manually.');
          logger.warn('========================================================================');
          process.stdout.write('\x07');
          await page.bringToFront().catch(() => {});
          throw error;
        }
      }

      const acceptCookies = page.getByRole('button', { name: /Accept All Cookies|Accept All/i }).first();
      if (await acceptCookies.isVisible().catch(() => false)) {
        await acceptCookies.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500).catch(() => {});
      }

      const browserPrompt = this.buildBrowserPrompt(
        prompt,
        title,
        isCustom ? tags : undefined,
        make_instrumental,
        negative_tags
      );

      let inputField: Locator | null = null;
      const textareas = page.locator('textarea');
      const textareaCount = await textareas.count().catch(() => 0);

      for (let i = 0; i < textareaCount; i++) {
        const candidate = textareas.nth(i);
        const isVisible = await candidate.isVisible().catch(() => false);
        if (!isVisible) continue;

        const placeholder = (await candidate.getAttribute('placeholder').catch(() => '')) || '';
        const ariaLabel = (await candidate.getAttribute('aria-label').catch(() => '')) || '';

        if (/search/i.test(placeholder) || /search/i.test(ariaLabel)) continue;

        inputField = candidate;
        break;
      }

      if (!inputField) {
        logger.warn(`Native browser generation page URL: ${page.url()}`);
        throw new Error('Could not find a visible Suno prompt input for native browser generation.');
      }

      await inputField.click();
      await inputField.fill('').catch(() => {});
      await inputField.pressSequentially(browserPrompt, { delay: 20 });
      await page.waitForTimeout(1200).catch(() => {});

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/generate') &&
          response.request().method() === 'POST',
        { timeout: 120000 }
      );

      const buttonCandidates = [
        page.getByRole('button', { name: /^Create song$/i }).first(),
        page.getByRole('button', { name: /^Create$/i }).first(),
        page.locator('button[aria-label="Create song"]').first(),
        page.locator('button[type="submit"]').first(),
      ];

      let button: Locator | null = null;
      for (const candidate of buttonCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          button = candidate;
          break;
        }
      }

      if (!button) {
        throw new Error('Could not find a visible Create button for native browser generation.');
      }

      await this.click(button).catch(() => {});
      await page.waitForTimeout(500).catch(() => {});

      await button.evaluate((el: HTMLElement) => {
        el.click();
      }).catch(() => {});

      const response = await responsePromise;
      const responseBody = await response.text();

      if (!response.ok()) {
        const runningClipIds = this.extractRunningClipIds(responseBody);
        if (response.status() === 429 && runningClipIds.length > 0) {
          logger.warn(
            `Native browser generation is waiting on existing clips. Polling: ${runningClipIds.join(', ')}`
          );
          return this.waitForSongIds(runningClipIds, wait_audio);
        }

        throw new Error(`Native browser generation failed (${response.status()}): ${responseBody}`);
      }

      const data = JSON.parse(responseBody);
      const runningClipIds = this.extractRunningClipIds(data);
      if (runningClipIds.length > 0) {
        logger.warn(
          `Native browser generation returned running clips instead of fresh clips. Polling: ${runningClipIds.join(', ')}`
        );
        return this.waitForSongIds(runningClipIds, wait_audio);
      }

      const clips = Array.isArray(data?.clips)
        ? data.clips.map((audio: any) => this.mapClipToAudioInfo(audio))
        : [];

      if (clips.length === 0) {
        throw new Error('Native browser generation returned no clips.');
      }

      if (wait_audio) {
        const songIds = clips.map((audio: AudioInfo) => audio.id);
        return this.waitForSongIds(songIds, true);
      }

      return clips;
    } finally {
      if (this.shouldKeepBrowserOpen()) {
        logger.info(
          'Leaving the native Suno browser open because BROWSER_KEEP_OPEN=true. Close it manually before the next run to release the profile lock.'
        );
      } else {
        logger.info('Closing native Suno browser to release the persistent profile lock.');
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Generates songs based on the provided parameters.
   *
   * @param prompt The text prompt to generate songs from.
   * @param isCustom Indicates if the generation should consider custom parameters like tags and title.
   * @param tags Optional tags to categorize the song, used only if isCustom is true.
   * @param title Optional title for the song, used only if isCustom is true.
   * @param make_instrumental Indicates if the generated song should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @param negative_tags Negative tags that should not be included in the generated audio.
   * @param task Optional indication of what to do. Enter 'extend' if extending an audio, otherwise specify null.
   * @param continue_clip_id 
   * @returns A promise that resolves to an array of AudioInfo objects representing the generated songs.
   */
  private async generateSongs(
    prompt: string,
    isCustom: boolean,
    tags?: string,
    title?: string,
    make_instrumental?: boolean,
    model?: string,
    wait_audio: boolean = false,
    negative_tags?: string,
    task?: string,
    continue_clip_id?: string,
    continue_at?: number
  ): Promise<AudioInfo[]> {
    await this.keepAlive();
    const captchaNeeded = await this.captchaRequired().catch(() => false);
    if (captchaNeeded) {
      logger.warn('CAPTCHA check returned required=true. Using native browser generation path.');
      return this.generateSongsViaBrowser(
        prompt,
        isCustom,
        tags,
        title,
        make_instrumental,
        wait_audio,
        negative_tags
      );
    }

    const payload: any = {
      make_instrumental: make_instrumental,
      mv: model || DEFAULT_MODEL,
      prompt: '',
      generation_type: 'TEXT',
      continue_at: continue_at,
      continue_clip_id: continue_clip_id,
      task: task,
      token: null
    };
    if (!payload.mv) delete payload.mv;
    if (isCustom) {
      payload.tags = tags;
      payload.title = title;
      payload.negative_tags = negative_tags;
      payload.prompt = prompt;
    } else {
      payload.gpt_description_prompt = prompt;
    }
    logger.info(
      'generateSongs payload:\n' +
        JSON.stringify(
          {
            prompt: prompt,
            isCustom: isCustom,
            tags: tags,
            title: title,
            make_instrumental: make_instrumental,
            wait_audio: wait_audio,
            negative_tags: negative_tags,
            payload: payload
          },
          null,
          2
        )
    );
    let response;
    try {
      response = await this.client.post(
        `${SunoApi.BASE_URL}/api/generate/v2/`,
        payload,
        {
          timeout: 10000 // 10 seconds timeout
        }
      );
    } catch (error: any) {
      const errorDetail = error?.response?.data?.detail || error?.response?.data?.error || error?.message || '';
      const shouldFallbackToBrowser =
        error?.response?.status === 403 &&
        /access to this model/i.test(String(errorDetail));

      if (!shouldFallbackToBrowser) {
        throw error;
      }

      return this.generateSongsViaBrowser(
        prompt,
        isCustom,
        tags,
        title,
        make_instrumental,
        wait_audio,
        negative_tags
      );
    }
    if (response.status !== 200) {
      throw new Error('Error response:' + response.statusText);
    }
    const songIds = response.data.clips.map((audio: any) => audio.id);
    //Want to wait for music file generation
    if (wait_audio) {
      return this.waitForSongIds(songIds, true);
    } else {
      return response.data.clips.map((audio: any) => this.mapClipToAudioInfo(audio));
    }
  }

  /**
   * Generates lyrics based on a given prompt.
   * @param prompt The prompt for generating lyrics.
   * @returns The generated lyrics text.
   */
  public async generateLyrics(prompt: string): Promise<string> {
    await this.keepAlive(false);
    // Initiate lyrics generation
    const generateResponse = await this.client.post(
      `${SunoApi.BASE_URL}/api/generate/lyrics/`,
      { prompt }
    );
    const generateId = generateResponse.data.id;

    // Poll for lyrics completion
    let lyricsResponse = await this.client.get(
      `${SunoApi.BASE_URL}/api/generate/lyrics/${generateId}`
    );
    while (lyricsResponse?.data?.status !== 'complete') {
      await sleep(2); // Wait for 2 seconds before polling again
      lyricsResponse = await this.client.get(
        `${SunoApi.BASE_URL}/api/generate/lyrics/${generateId}`
      );
    }

    // Return the generated lyrics text
    return lyricsResponse.data;
  }

  /**
   * Extends an existing audio clip by generating additional content based on the provided prompt.
   *
   * @param audioId The ID of the audio clip to extend.
   * @param prompt The prompt for generating additional content.
   * @param continueAt Extend a new clip from a song at mm:ss(e.g. 00:30). Default extends from the end of the song.
   * @param tags Style of Music.
   * @param title Title of the song.
   * @returns A promise that resolves to an AudioInfo object representing the extended audio clip.
   */
  public async extendAudio(
    audioId: string,
    prompt: string = '',
    continueAt: number,
    tags: string = '',
    negative_tags: string = '',
    title: string = '',
    model?: string,
    wait_audio?: boolean
  ): Promise<AudioInfo[]> {
    return this.generateSongs(prompt, true, tags, title, false, model, wait_audio, negative_tags, 'extend', audioId, continueAt);
  }

  /**
   * Generate stems for a song.
   * @param song_id The ID of the song to generate stems for.
   * @returns A promise that resolves to an AudioInfo object representing the generated stems.
   */
  public async generateStems(song_id: string): Promise<AudioInfo[]> {
    await this.keepAlive(false);
    const response = await this.client.post(
      `${SunoApi.BASE_URL}/api/edit/stems/${song_id}`, {}
    );

    console.log('generateStems response:\n', response?.data);
    return response.data.clips.map((clip: any) => ({
      id: clip.id,
      status: clip.status,
      created_at: clip.created_at,
      title: clip.title,
      stem_from_id: clip.metadata.stem_from_id,
      duration: clip.metadata.duration
    }));
  }


  /**
   * Get the lyric alignment for a song.
   * @param song_id The ID of the song to get the lyric alignment for.
   * @returns A promise that resolves to an object containing the lyric alignment.
   */
  public async getLyricAlignment(song_id: string): Promise<object> {
    await this.keepAlive(false);
    const response = await this.client.get(`${SunoApi.BASE_URL}/api/gen/${song_id}/aligned_lyrics/v2/`);

    console.log(`getLyricAlignment ~ response:`, response.data);
    return response.data?.aligned_words.map((transcribedWord: any) => ({
      word: transcribedWord.word,
      start_s: transcribedWord.start_s,
      end_s: transcribedWord.end_s,
      success: transcribedWord.success,
      p_align: transcribedWord.p_align
    }));
  }

  /**
   * Processes the lyrics (prompt) from the audio metadata into a more readable format.
   * @param prompt The original lyrics text.
   * @returns The processed lyrics text.
   */
  private parseLyrics(prompt: string): string {
    // Assuming the original lyrics are separated by a specific delimiter (e.g., newline), we can convert it into a more readable format.
    // The implementation here can be adjusted according to the actual lyrics format.
    // For example, if the lyrics exist as continuous text, it might be necessary to split them based on specific markers (such as periods, commas, etc.).
    // The following implementation assumes that the lyrics are already separated by newlines.

    // Split the lyrics using newline and ensure to remove empty lines.
    const lines = prompt.split('\n').filter((line) => line.trim() !== '');

    // Reassemble the processed lyrics lines into a single string, separated by newlines between each line.
    // Additional formatting logic can be added here, such as adding specific markers or handling special lines.
    return lines.join('\n');
  }

  /**
   * Retrieves audio information for the given song IDs.
   * @param songIds An optional array of song IDs to retrieve information for.
   * @param page An optional page number to retrieve audio information from.
   * @returns A promise that resolves to an array of AudioInfo objects.
   */
  public async get(
    songIds?: string[],
    page?: string | null
  ): Promise<AudioInfo[]> {
    await this.keepAlive(false);
    let url = new URL(`${SunoApi.BASE_URL}/api/feed/v2`);
    if (songIds) {
      url.searchParams.append('ids', songIds.join(','));
    }
    if (page) {
      url.searchParams.append('page', page);
    }
    logger.info('Get audio status: ' + url.href);
    const response = await this.client.get(url.href, {
      // 10 seconds timeout
      timeout: 10000
    });

    const audios = response.data.clips;

    return audios.map((audio: any) => ({
      id: audio.id,
      title: audio.title,
      image_url: audio.image_url,
      lyric: audio.metadata.prompt
        ? this.parseLyrics(audio.metadata.prompt)
        : '',
      audio_url: audio.audio_url,
      video_url: audio.video_url,
      created_at: audio.created_at,
      model_name: audio.model_name,
      status: audio.status,
      gpt_description_prompt: audio.metadata.gpt_description_prompt,
      prompt: audio.metadata.prompt,
      type: audio.metadata.type,
      tags: audio.metadata.tags,
      duration: audio.metadata.duration,
      error_message: audio.metadata.error_message
    }));
  }

  /**
   * Retrieves information for a specific audio clip.
   * @param clipId The ID of the audio clip to retrieve information for.
   * @returns A promise that resolves to an object containing the audio clip information.
   */
  public async getClip(clipId: string): Promise<object> {
    await this.keepAlive(false);
    const response = await this.client.get(
      `${SunoApi.BASE_URL}/api/clip/${clipId}`
    );
    return response.data;
  }

  public async get_credits(): Promise<object> {
    await this.keepAlive(false);
    const response = await this.client.get(
      `${SunoApi.BASE_URL}/api/billing/info/`
    );
    return {
      credits_left: response.data.total_credits_left,
      period: response.data.period,
      monthly_limit: response.data.monthly_limit,
      monthly_usage: response.data.monthly_usage
    };
  }

  public async getPersonaPaginated(personaId: string, page: number = 1): Promise<PersonaResponse> {
    await this.keepAlive(false);
    
    const url = `${SunoApi.BASE_URL}/api/persona/get-persona-paginated/${personaId}/?page=${page}`;
    
    logger.info(`Fetching persona data: ${url}`);
    
    const response = await this.client.get(url, {
      timeout: 10000 // 10 seconds timeout
    });

    if (response.status !== 200) {
      throw new Error('Error response: ' + response.statusText);
    }

    return response.data;
  }
}

export const sunoApi = async (cookie?: string) => {
  const resolvedCookie = cookie && cookie.includes('__client') ? cookie : process.env.SUNO_COOKIE; // Check for bad `Cookie` header (It's too expensive to actually parse the cookies *here*)
  if (!resolvedCookie) {
    logger.info('No cookie provided! Aborting...\nPlease provide a cookie either in the .env file or in the Cookie header of your request.')
    throw new Error('Please provide a cookie either in the .env file or in the Cookie header of your request.');
  }

  // Check if the instance for this cookie already exists in the cache
  const cachedInstance = cache.get(resolvedCookie);
  if (cachedInstance)
    return cachedInstance;

  // If not, create a new instance and initialize it
  const instance = await new SunoApi(resolvedCookie).init();
  // Cache the initialized instance
  cache.set(resolvedCookie, instance);

  return instance;
};
