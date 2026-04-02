/**
 * R45 | Auto Music Creator — Production Pipeline Orchestrator
 *
 * Supervised local album production with hybrid provider integrations.
 * Generates song concepts via Gemini or local intake, creates tracks via the
 * local Suno hybrid wrapper by default, assembles album video via ffmpeg, and
 * optionally generates YouTube metadata.
 *
 * Usage:
 *   npm run r45               # Full album generation (default config)
 *   npm run r45:dry           # Dry run — generate or load concepts only
 *   npm run r45 -- --validate # Pre-flight check (config + wrapper + toolchain)
 *   npm run r45 -- --config path/to/config.json
 *   npm run r45:build         # Re-assemble video from existing audio + manifest
 *
 * Engines (set in config.json):
 *   suno-api — Local Suno hybrid wrapper (STANDARD)
 *   lyria    — Chrome/CDP-based Google music generation
 *   suno     — Direct suno.com browser fallback
 *   suno-cdn — Direct CDN download by song ID
 */
import { readFile, open, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import http from 'node:http';
import https from 'node:https';
import { isChromeAvailable, connectToChrome, disconnectChrome } from '../../shared/chrome-ai.js';
import { generateSongConcepts, generateTimestamps } from './prompt-generator.js';
import { generateAlbum } from './music-generator.js';
import { assembleAlbumVideo } from './video-assembler.js';
import { saveManifest } from './manifest.js';
import { housekeepOutputDirectory } from './output-housekeeping.js';
import { log } from '../../shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_LOCK_PATH = join(__dirname, '.r45-run.lock');

// ═══════════════════════════════════════════════════
//  PARSE CLI ARGUMENTS
// ═══════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    validate: args.includes('--validate'),
    configPath: null,
  };

  const configIdx = args.indexOf('--config');
  if (configIdx !== -1 && args[configIdx + 1]) {
    options.configPath = resolve(args[configIdx + 1]);
  }

  return options;
}

// ═══════════════════════════════════════════════════
//  CONFIG LOADER
// ═══════════════════════════════════════════════════

async function loadConfig(configPath) {
  // If explicit --config flag, use that file
  if (configPath) {
    if (!existsSync(configPath)) {
      log.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    log.info(`Config loaded: ${configPath}`);
    return config;
  }

  // Auto-load config.example.json from lesson directory if present
  const defaultConfigPath = join(__dirname, 'config.example.json');
  if (existsSync(defaultConfigPath)) {
    const raw = await readFile(defaultConfigPath, 'utf-8');
    // Strip JSON comments (lines starting with _comment_)
    const config = JSON.parse(raw);
    // Remove comment keys
    for (const key of Object.keys(config)) {
      if (key.startsWith('_comment_')) delete config[key];
    }
    return config;
  }

  // Absolute fallback if no config file exists at all
  return {
    theme: 'Lofi Chill Beats for Studying',
    musicStyle: 'lofi hip hop, chill, ambient',
    numSongs: 3,
    instrumental: true,
    engine: 'suno-api',
    songLengthHint: '',
    videoResolution: '1280:720',
  };
}

async function isHttpServiceReachable(url) {
  const httpFallback = () => new Promise((resolvePromise) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const request = client.request(parsedUrl, { method: 'GET' }, (response) => {
        response.resume();
        resolvePromise(Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300));
      });

      request.setTimeout(3000, () => {
        request.destroy();
        resolvePromise(false);
      });

      request.on('error', () => resolvePromise(false));
      request.end();
    } catch {
      resolvePromise(false);
    }
  });

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return httpFallback();
  }
}

function engineNeedsChrome(config) {
  return config.engine === 'lyria' || config.engine === 'suno';
}

function getConceptProvider(config) {
  return config.conceptProvider || 'auto';
}

function shouldUseSavedSongConcepts(config) {
  return getConceptProvider(config) !== 'gemini' && Boolean(config.songConceptsPath);
}

function hasLocalIdeaIntake(config) {
  return getConceptProvider(config) !== 'gemini' && (
    Boolean(config.ideaIntakePath) ||
    (Array.isArray(config.ideaSeeds) && config.ideaSeeds.length > 0)
  );
}

function shouldGenerateTimestamps(config) {
  return config.skipTimestamps !== true;
}

function needsGemini(config) {
  const conceptProvider = getConceptProvider(config);
  const conceptGenerationNeedsGemini =
    conceptProvider === 'gemini' ||
    (conceptProvider === 'auto' && !shouldUseSavedSongConcepts(config) && !hasLocalIdeaIntake(config));

  return conceptGenerationNeedsGemini || shouldGenerateTimestamps(config);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

async function acquireRunLock(lockPath, config) {
  const payload = JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    theme: config.theme,
    engine: config.engine,
  }, null, 2);

  try {
    const handle = await open(lockPath, 'wx');
    await handle.writeFile(payload);
    await handle.close();
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw error;
    }

    let existingLock = null;
    try {
      existingLock = JSON.parse(await readFile(lockPath, 'utf-8'));
    } catch {
      existingLock = null;
    }

    if (existingLock?.pid && isProcessAlive(existingLock.pid)) {
      throw new Error(
        `Another R45 run is already active (PID ${existingLock.pid}, started ${existingLock.startedAt || 'unknown'}). Wait for it to finish before starting a new live run.`
      );
    }

    await unlink(lockPath).catch(() => {});
    const handle = await open(lockPath, 'wx');
    await handle.writeFile(payload);
    await handle.close();
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await unlink(lockPath).catch(() => {});
  };
}

// ═══════════════════════════════════════════════════
//  VALIDATE (pre-flight check)
// ═══════════════════════════════════════════════════

async function validate(config) {
  log.header('Pre-Flight Validation');
  let allPassed = true;
  const savedSongConceptsEnabled = shouldUseSavedSongConcepts(config);
  const localIdeaIntakeEnabled = hasLocalIdeaIntake(config);
  const timestampsEnabled = shouldGenerateTimestamps(config);
  const geminiRequired = needsGemini(config);
  const conceptProvider = getConceptProvider(config);

  // 1. Gemini API key
  if (process.env.GEMINI_API_KEY) {
    if (geminiRequired) {
      log.success('✅ GEMINI_API_KEY is present');
    } else {
      log.info('GEMINI_API_KEY is present but optional for this config');
    }
  } else {
    if (geminiRequired) {
      log.error('❌ GEMINI_API_KEY is missing');
      log.info('   Add GEMINI_API_KEY to your .env file when generating new concepts or YouTube timestamps.');
      allPassed = false;
    } else {
      log.success('✅ GEMINI_API_KEY is optional for this config (local concept source + timestamps skipped)');
    }
  }

  // 2. Config valid?
  const validEngines = ['lyria', 'suno', 'suno-api', 'suno-cdn'];
  const validConceptProviders = ['auto', 'gemini', 'saved-concepts', 'local-intake'];
  if (validEngines.includes(config.engine)) {
    log.success(`✅ Engine: ${config.engine}`);
  } else {
    log.error(`❌ Invalid engine: "${config.engine}" (must be one of: ${validEngines.join(', ')})`);
    allPassed = false;
  }

  if (config.numSongs > 0 && config.numSongs <= 20) {
    log.success(`✅ Song count: ${config.numSongs}`);
  } else {
    log.error(`❌ Invalid numSongs: ${config.numSongs} (must be 1-20)`);
    allPassed = false;
  }

  if (config.theme && config.theme.length > 0) {
    log.success(`✅ Theme: "${config.theme}"`);
  } else {
    log.error('❌ Missing theme');
    allPassed = false;
  }

  if (config.songLengthHint) {
    log.success(`✅ Song length hint: ${config.songLengthHint}`);
  }

  if (validConceptProviders.includes(conceptProvider)) {
    log.success(`✅ Concept provider: ${conceptProvider}`);
  } else {
    log.error(`❌ Invalid conceptProvider: "${conceptProvider}" (must be one of: ${validConceptProviders.join(', ')})`);
    allPassed = false;
  }

  if (conceptProvider === 'saved-concepts') {
    const conceptsPath = config.songConceptsPath ? resolve(config.songConceptsPath) : null;
    if (conceptsPath && existsSync(conceptsPath)) {
      log.success(`✅ Saved song concepts: ${conceptsPath}`);
    } else {
      log.error('❌ conceptProvider "saved-concepts" requires a valid songConceptsPath');
      allPassed = false;
    }
  } else if (savedSongConceptsEnabled) {
    const conceptsPath = resolve(config.songConceptsPath);
    if (existsSync(conceptsPath)) {
      log.success(`✅ Saved song concepts: ${conceptsPath}`);
    } else {
      log.error(`❌ songConceptsPath not found: ${conceptsPath}`);
      allPassed = false;
    }
  } else if (conceptProvider === 'local-intake') {
    if (config.ideaIntakePath) {
      const intakePath = resolve(config.ideaIntakePath);
      if (existsSync(intakePath)) {
        log.success(`✅ Local idea intake file: ${intakePath}`);
      } else {
        log.error(`❌ ideaIntakePath not found: ${intakePath}`);
        allPassed = false;
      }
    } else if (Array.isArray(config.ideaSeeds) && config.ideaSeeds.length > 0) {
      log.success(`✅ Inline idea seeds: ${config.ideaSeeds.length}`);
    } else {
      log.error('❌ conceptProvider "local-intake" requires ideaIntakePath or ideaSeeds');
      allPassed = false;
    }
  } else {
    if (config.ideaIntakePath) {
      const intakePath = resolve(config.ideaIntakePath);
      if (existsSync(intakePath)) {
        log.success(`✅ Local idea intake file: ${intakePath}`);
      } else {
        log.error(`❌ ideaIntakePath not found: ${intakePath}`);
        allPassed = false;
      }
    } else if (Array.isArray(config.ideaSeeds) && config.ideaSeeds.length > 0) {
      log.success(`✅ Inline idea seeds: ${config.ideaSeeds.length}`);
    } else {
      log.info('Song concepts will be generated via Gemini');
    }
  }

  if (!savedSongConceptsEnabled && !localIdeaIntakeEnabled && !process.env.GEMINI_API_KEY && conceptProvider !== 'saved-concepts' && conceptProvider !== 'local-intake') {
    log.error('❌ No concept source available');
    log.info('   Provide GEMINI_API_KEY, songConceptsPath, ideaIntakePath, or ideaSeeds.');
    allPassed = false;
  }

  if (timestampsEnabled) {
    log.info('YouTube timestamps will be generated via Gemini');
  } else {
    log.success('✅ YouTube timestamp generation is disabled for this run');
  }

  // 3. suno-cdn requires song IDs
  if (config.engine === 'suno-cdn') {
    if (config.sunoSongIds && config.sunoSongIds.length >= config.numSongs) {
      log.success(`✅ Suno CDN song IDs: ${config.sunoSongIds.length} provided`);
    } else {
      log.error(`❌ Engine 'suno-cdn' requires ${config.numSongs} sunoSongIds in config`);
      allPassed = false;
    }
  }

  if (config.engine === 'suno-api') {
    if (config.sunoApiBaseUrl) {
      log.success(`✅ Suno API base URL: ${config.sunoApiBaseUrl}`);
      if (config.sunoModel) {
        log.success(`✅ Suno model override: ${config.sunoModel}`);
      } else {
        log.info('Suno model override not set; wrapper default will be used');
      }

      const wrapperUp = await isHttpServiceReachable(`${config.sunoApiBaseUrl.replace(/\/$/, '')}/api/get_limit`);
      if (wrapperUp) {
        log.success('✅ Suno wrapper API is reachable');
      } else {
        log.error(`❌ Suno wrapper API is not reachable at ${config.sunoApiBaseUrl}`);
        log.info('   Start it with:');
        log.info('   npm run suno-wrapper:dev');
        allPassed = false;
      }
    } else {
      log.error(`❌ Engine 'suno-api' requires config.sunoApiBaseUrl`);
      allPassed = false;
    }
  }

  if (engineNeedsChrome(config)) {
    const chromeUp = await isChromeAvailable();
    if (chromeUp) {
      log.success('✅ Chrome is reachable on port 9333');
    } else {
      log.error('❌ Chrome is NOT running on port 9333');
      log.info('   Start Chrome with:');
      log.info('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
      log.info('     --remote-debugging-port=9333');
      allPassed = false;
    }
  } else {
    log.info(`Chrome debug port is optional for engine "${config.engine}"`);
  }

  // 4. Cover image present?
  const coverPath = config.coverImagePath
    ? resolve(config.coverImagePath)
    : join(__dirname, 'assets', 'cover.png');
  if (existsSync(coverPath)) {
    log.success(`✅ Cover image: ${coverPath}`);
  } else {
    log.warn(`⚠️  Cover image not found: ${coverPath} (video assembly will be skipped)`);
  }

  if (config.videoResolution) {
    if (/^\d{2,5}:\d{2,5}$/.test(config.videoResolution)) {
      log.success(`✅ Video resolution: ${config.videoResolution}`);
    } else {
      log.error(`❌ Invalid videoResolution: "${config.videoResolution}" (expected WIDTH:HEIGHT, e.g. 1280:720)`);
      allPassed = false;
    }
  }

  // 5. ffmpeg available?
  try {
    const { getAudioDuration } = await import('../../shared/ffmpeg.js');
    log.success('✅ ffmpeg/ffprobe binaries available');
  } catch (err) {
    log.error(`❌ ffmpeg not available: ${err.message}`);
    allPassed = false;
  }

  log.info('');
  if (allPassed) {
    log.success('🟢 All pre-flight checks passed. Ready for production.');
  } else {
    log.error('🔴 Pre-flight failed. Fix the above issues before running.');
  }

  return allPassed;
}

// ═══════════════════════════════════════════════════
//  MAIN PIPELINE
// ═══════════════════════════════════════════════════

async function run() {
  const pipelineStart = Date.now();
  const args = parseArgs();
  let releaseRunLock = async () => {};

  log.header('R45 | Auto Music Creator');
  log.info(`Mode: ${args.dryRun ? '🏜️  DRY RUN' : args.validate ? '🔍 VALIDATE' : '🚀 LIVE PRODUCTION'}`);

  // ─── Load Config ───
  const config = await loadConfig(args.configPath);
  const conceptProvider = getConceptProvider(config);

  log.info(`Theme:        "${config.theme}"`);
  log.info(`Style:        ${config.musicStyle}`);
  log.info(`Songs:        ${config.numSongs}`);
  log.info(`Engine:       ${config.engine}`);
  log.info(`Instrumental: ${config.instrumental}`);

  // ─── Validate-only mode ───
  if (args.validate) {
    const passed = await validate(config);
    process.exit(passed ? 0 : 1);
  }

  if (config.cleanupOutput !== false) {
    try {
      const housekeeping = await housekeepOutputDirectory({
        outputRoot: join(__dirname, 'output'),
        retention: config.outputRetention || {},
      });
      const cleanedItems = housekeeping.archivedRuns.length
        + housekeeping.removedEmptyDirs.length
        + housekeeping.removedNoiseFiles.length
        + housekeeping.prunedArchiveEntries.length;

      if (cleanedItems > 0) {
        log.info(
          `Output housekeeping archived ${housekeeping.archivedRuns.length} stale run(s), removed ${housekeeping.removedEmptyDirs.length} empty folder(s), and scrubbed ${housekeeping.removedNoiseFiles.length} noise file(s).`
        );
        log.info(`Hidden archive: ${housekeeping.archiveRoot}`);
      } else {
        log.info(`Output housekeeping checked ${housekeeping.keptRuns.length} visible run(s); no cleanup needed.`);
      }
    } catch (error) {
      log.warn(`Output housekeeping skipped: ${error.message}`);
    }
  } else {
    log.info('Output housekeeping disabled by config.cleanupOutput=false');
  }

  if (!args.dryRun) {
    releaseRunLock = await acquireRunLock(DEFAULT_LOCK_PATH, config);
    log.info(`Run lock acquired: ${DEFAULT_LOCK_PATH}`);
  }

  try {
    if (engineNeedsChrome(config)) {
      const chromeUp = await isChromeAvailable();
      if (!chromeUp) {
        log.error('Chrome is not running with remote debugging on port 9333.');
        log.info('');
        log.info('Start Chrome with:');
        log.info('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
        log.info('    --remote-debugging-port=9333');
        process.exitCode = 1;
        return;
      }

      try {
        await connectToChrome();
      } catch (err) {
        log.error(err.message);
        process.exitCode = 1;
        return;
      }
    }

    // ─── Output Directory ───
    const albumSlug = config.theme
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputDir = join(__dirname, 'output', `${albumSlug}_${timestamp}`);

    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    log.info(`Output: ${outputDir}`);

    // ═══════════════════════════════════════════════════
    //  STEP 1: Generate Song Concepts
    // ═══════════════════════════════════════════════════
    log.header('Step 1: Generate Song Concepts');
    const { songs, meta: conceptsMeta } = await generateSongConcepts({
      theme: config.theme,
      musicStyle: config.musicStyle,
      numSongs: config.numSongs,
      instrumental: config.instrumental,
      songLengthHint: config.songLengthHint || '',
      conceptProvider,
      songConceptsPath: config.songConceptsPath || null,
      ideaIntakePath: config.ideaIntakePath || null,
      ideaSeeds: Array.isArray(config.ideaSeeds) ? config.ideaSeeds : [],
    });

    if (conceptsMeta?.source) {
      log.info(`Concept source: ${conceptsMeta.source}`);
    }

    if (args.dryRun) {
      log.warn('DRY RUN — Skipping music generation and video assembly');
      log.info('Song concepts that would be generated:');
      songs.forEach((s, i) => {
        log.info(`  ${i + 1}. "${s.title}"`);
        log.debug(`     Prompt: ${s.prompt}`);
        log.debug(`     Style: ${s.style}`);
      });

      await saveManifest({
        outputDir, theme: config.theme, musicStyle: config.musicStyle,
        engine: config.engine, songs, tracks: [], video: null,
        timestamps: null, config, conceptsMeta,
      });
      log.header('Dry Run Complete');
      return;
    }

    // ═══════════════════════════════════════════════════
    //  STEP 2: Generate Music Tracks
    // ═══════════════════════════════════════════════════
    log.header('Step 2: Generate Music Tracks');
    const engineOptions = songs.map((_, index) => ({
      songId: config.sunoSongIds?.[index] || null,
      sunoApiBaseUrl: config.sunoApiBaseUrl || null,
      sunoModel: config.sunoModel || null,
    }));
    const tracks = await generateAlbum(songs, outputDir, config.engine, engineOptions);

    // Check results
    const completedTracks = tracks.filter(t => t.status === 'completed');
    const failedTracks = tracks.filter(t => t.status === 'failed');
    const pendingTracks = tracks.filter(t => t.status?.includes('pending'));

    if (completedTracks.length === 0 && pendingTracks.length === 0) {
      log.error('All tracks failed. Skipping video assembly.');
      log.info('Check Chrome console and Gemini for errors.');
      // Still save manifest so the failure is recorded
      await saveManifest({
        outputDir, theme: config.theme, musicStyle: config.musicStyle,
        engine: config.engine, songs, tracks, video: null,
        timestamps: null, config, conceptsMeta,
      });
      process.exitCode = 1;
      return;
    }

    // ═══════════════════════════════════════════════════
    //  STEP 3: Assemble Album Video
    // ═══════════════════════════════════════════════════
    log.header('Step 3: Assemble Album Video');
    let video = null;

    const coverPath = config.coverImagePath
      ? resolve(config.coverImagePath)
      : join(__dirname, 'assets', 'cover.png');

    if (!existsSync(coverPath)) {
      log.warn(`Cover image not found: ${coverPath}`);
      log.info('Skipping video assembly — provide a cover image in config.coverImagePath');
    } else if (completedTracks.length === 0) {
      log.warn('No completed tracks available for video assembly.');
    } else {
      try {
        video = await assembleAlbumVideo({
          coverImagePath: coverPath,
          tracks: completedTracks,
          outputDir,
          albumTitle: config.theme,
          videoResolution: config.videoResolution || '1280:720',
        });
      } catch (err) {
        log.error(`Video assembly failed: ${err.message}`);
        log.info('Tracks are still saved in the output directory.');
      }
    }

    // ═══════════════════════════════════════════════════
    //  STEP 4: Generate YouTube Timestamps
    // ═══════════════════════════════════════════════════
    log.header('Step 4: Generate YouTube Timestamps');
    const tracksWithDuration = completedTracks.filter(t => t.duration > 0);
    let timestamps = null;

    if (!shouldGenerateTimestamps(config)) {
      log.info('Skipping YouTube timestamps because config.skipTimestamps=true');
    } else if (tracksWithDuration.length > 0) {
      try {
        timestamps = await generateTimestamps(tracksWithDuration);
      } catch (err) {
        log.warn(`Timestamp generation failed: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════
    //  STEP 5: Save Manifest
    // ═══════════════════════════════════════════════════
    log.header('Step 5: Save Manifest');
    await saveManifest({
      outputDir, theme: config.theme, musicStyle: config.musicStyle,
      engine: config.engine, songs, tracks, video, timestamps, config, conceptsMeta,
    });

    // ═══════════════════════════════════════════════════
    //  FINAL SUMMARY
    // ═══════════════════════════════════════════════════
    const elapsed = ((Date.now() - pipelineStart) / 1000 / 60).toFixed(1);
    log.header('Pipeline Complete! 🎉');
    log.info(`📁 Output:     ${outputDir}`);
    log.info(`🎵 Tracks:     ${completedTracks.length}/${songs.length} completed`);
    if (failedTracks.length > 0) {
      log.warn(`⚠️  Failed:     ${failedTracks.length} track(s)`);
      failedTracks.forEach(t => log.info(`   ❌ "${t.title}": ${t.error}`));
    }
    if (pendingTracks.length > 0) {
      log.warn(`⏳ Pending:    ${pendingTracks.length} track(s) need manual browser completion`);
    }
    if (video) log.info(`🎬 Video:      ${video.videoPath}`);
    if (timestamps) {
      log.info(`⏱️  Timestamps: ready for YouTube`);
    } else if (!shouldGenerateTimestamps(config)) {
      log.info('⏭️  Timestamps: skipped by config');
    }
    log.info(`⏱️  Duration:   ${elapsed} minutes`);
  } finally {
    await disconnectChrome().catch(() => {});
    await releaseRunLock().catch(() => {});
  }
}

// Run the pipeline
run().catch(err => {
  log.error(`Pipeline failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
