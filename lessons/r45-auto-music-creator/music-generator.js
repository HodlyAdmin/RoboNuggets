/**
 * R45 Music Generator — Autonomous Chrome-Based Music Production
 *
 * Generation engines (in priority order):
 *   1. Suno API Wrapper — standard local hybrid API engine
 *   2. Lyria 3 Pro      — via chrome-lyria.js CDP interceptor
 *   3. Suno Browser     — via suno.com automation in Chrome
 *   4. Suno CDN Direct  — wget/curl a known song ID (fastest for re-downloads)
 *
 * The stable contract for lessons is `suno-api`. Browser drivers remain
 * available as fallbacks and internal experimentation paths.
 */
import { mkdir, rename, copyFile, unlink, writeFile } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import https from 'https';
import { withRetry } from '../../shared/chrome-ai.js';
import { generateLyriaTrack } from '../../shared/chrome-lyria.js';
import { generateSunoTrack as generateSunoBrowserTrack } from '../../shared/chrome-suno.js';
import { generateSunoTrack as generateSunoApiTrack } from '../../shared/api-suno.js';
import { getAudioDuration } from '../../shared/ffmpeg.js';
import { log } from '../../shared/logger.js';

/** Cooldown between consecutive Lyria generations (ms) */
const INTER_TRACK_COOLDOWN_MS = 15000;

/** Max retries per individual track */
const MAX_TRACK_RETRIES = 2;

/** Conservative ceiling for Suno description-style prompts */
const SUNO_DESCRIPTION_MAX_CHARS = 180;

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

/**
 * Sanitize a string for safe use as a filename.
 */
function sanitizeFilename(name) {
  return (name || 'track')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .trim() || 'track';
}

function fitSunoPrompt(prompt, instrumental) {
  const normalized = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!normalized || instrumental === false || normalized.length <= SUNO_DESCRIPTION_MAX_CHARS) {
    return normalized;
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const parts = [];

  for (const sentence of sentences) {
    const separator = parts.length > 0 ? ' ' : '';
    const current = parts.join(' ');
    const nextLength = current.length + separator.length + sentence.length;

    if (nextLength <= SUNO_DESCRIPTION_MAX_CHARS) {
      parts.push(sentence);
      continue;
    }

    const remaining = SUNO_DESCRIPTION_MAX_CHARS - current.length - separator.length;
    if (remaining >= 24) {
      parts.push(sentence.slice(0, remaining - 1).trim().replace(/[.,;:]+$/g, '') + '…');
    }
    break;
  }

  const compact = parts.join(' ').trim();
  return compact || normalized.slice(0, SUNO_DESCRIPTION_MAX_CHARS - 1).trim() + '…';
}

/**
 * Build a well-structured music prompt for Lyria 3 Pro.
 * Lyria responds best to structured format with style + mood descriptions.
 */
function buildLyriaPrompt(song) {
  const parts = [];

  if (song.style) {
    parts.push(`Style: ${song.style}`);
  }

  if (song.prompt) {
    parts.push(song.prompt);
  }

  if (song.title && !song.prompt?.includes(song.title)) {
    parts.push(`Title: ${song.title}`);
  }

  if (song.instrumental !== false) {
    parts.push('Instrumental only, no vocals.');
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════
//  SUNO CDN DIRECT DOWNLOAD (Most Reliable for known IDs)
// ═══════════════════════════════════════════════════

/**
 * Download an MP3 directly from Suno's CDN using a known song ID.
 * @param {string} songId - Suno song UUID
 * @param {string} outputPath - Full path to save the downloaded .mp3
 * @returns {Promise<string>} The output path on success
 */
export async function downloadFromSuno(songId, outputPath) {
  const url = `https://cdn1.suno.ai/${songId}.mp3`;
  log.info(`⬇️  Downloading from Suno CDN: ${songId}`);
  log.debug(`   URL: ${url}`);
  log.debug(`   Output: ${outputPath}`);

  const dir = dirname(outputPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`CDN returned HTTP ${response.statusCode} for song ID: ${songId}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        log.success(`✅ Downloaded: ${outputPath}`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      file.close();
      reject(err);
    });
  });
}

/**
 * Download multiple Suno tracks by song ID.
 */
export async function downloadSunoAlbum(tracks, baseOutputDir) {
  log.header(`Downloading ${tracks.length} Suno tracks via CDN`);
  const results = [];

  for (let i = 0; i < tracks.length; i++) {
    const { songId, title } = tracks[i];
    const trackDir = join(baseOutputDir, `track${i + 1}`, 'audio');
    const outputPath = join(trackDir, 'track.mp3');
    log.step(i + 1, `"${title}" (${songId})`);

    try {
      const path = await withRetry(
        () => downloadFromSuno(songId, outputPath),
        { label: `Download "${title}"`, attempts: 3 }
      );
      results.push({ title, path, songId, engine: 'suno-cdn', status: 'completed' });
    } catch (err) {
      log.error(`Failed to download "${title}": ${err.message}`);
      results.push({ title, path: null, songId, engine: 'suno-cdn', status: 'failed', error: err.message });
    }
  }

  const completed = results.filter(r => r.path).length;
  log.success(`Downloaded ${completed}/${tracks.length} tracks`);
  return results;
}

// ═══════════════════════════════════════════════════
//  SUNO BROWSER ENGINE (Browser automation)
// ═══════════════════════════════════════════════════

/**
 * Generate a track using Suno via the chrome-suno.js CDP driver.
 * This is FULLY AUTONOMOUS.
 *
 * @param {object} song - Song concept from prompt-generator
 * @param {string} outputDir - Directory to save the audio file
 * @returns {Promise<object>}
 */
async function generateWithSunoBrowser(song, outputDir) {
  log.info(`🎵 [Suno Browser] Generating: "${song.title}"`);

  if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

  const result = await generateSunoBrowserTrack(song, outputDir);
  let duration = result.duration || song.estimatedDuration || 120;

  try {
    duration = await getAudioDuration(result.diskPath);
    log.info(`   Duration: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`);
  } catch (err) {
    log.warn(`   Could not probe duration: ${err.message}. Using estimate: ${duration}s`);
  }

  log.success(`   ✅ Track saved: ${result.diskPath}`);

  return {
    path: result.diskPath,
    duration,
    engine: 'suno-browser',
    title: song.title,
    prompt: song.prompt,
    style: song.style,
    instrumental: song.instrumental,
    status: 'completed',
  };
}

// ═══════════════════════════════════════════════════
//  LYRIA 3 PRO ENGINE (Primary — FULLY AUTONOMOUS)
// ═══════════════════════════════════════════════════

/**
 * Generate a track using Lyria 3 Pro via the chrome-lyria.js CDP driver.
 * This is FULLY AUTONOMOUS — no human intervention needed.
 *
 * @param {object} song - Song concept from prompt-generator
 * @param {string} outputDir - Directory to save the audio file
 * @returns {Promise<object>} Track result with path, duration, status
 */
async function generateWithLyria(song, outputDir) {
  log.info(`🎵 [Lyria 3 Pro] Generating: "${song.title}"`);

  if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

  // Build the structured prompt for Lyria
  const musicPrompt = buildLyriaPrompt(song);
  log.debug(`   Prompt:\n${musicPrompt}`);

  // Call the REAL Lyria CDP driver — this does everything:
  // Opens Gemini → Tools → Create Music → injects prompt → CDP intercepts audio → saves file
  const downloadedPath = await generateLyriaTrack(musicPrompt, {
    timeout: 300000, // 5 min per track
  });

  // Move the downloaded file from cwd to our output directory
  const safeName = sanitizeFilename(song.title);
  const finalPath = join(outputDir, `${safeName}.mp4`);

  try {
    // Try rename first (same filesystem = instant)
    await rename(downloadedPath, finalPath);
  } catch {
    // Cross-device: copy + delete source
    await copyFile(downloadedPath, finalPath);
    await unlink(downloadedPath).catch(() => {});
  }

  // Probe real duration from the actual file
  let duration = song.estimatedDuration || 120;
  try {
    duration = await getAudioDuration(finalPath);
    log.info(`   Duration: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`);
  } catch (err) {
    log.warn(`   Could not probe duration: ${err.message}. Using estimate: ${duration}s`);
  }

  log.success(`   ✅ Track saved: ${finalPath}`);

  return {
    path: finalPath,
    duration,
    engine: 'lyria-3-pro',
    title: song.title,
    prompt: musicPrompt,
    status: 'completed',
  };
}

// ═══════════════════════════════════════════════════
//  SUNO API WRAPPER ENGINE (Standard)
// ═══════════════════════════════════════════════════

/**
 * Generate a track using a local Suno wrapper HTTP API.
 */
async function generateWithSunoApi(song, outputDir, engineOptions = {}) {
  log.info(`🎵 [Suno API] Generating: "${song.title}"`);

  if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

  const sunoPrompt = fitSunoPrompt(song.prompt, song.instrumental !== false);
  if (sunoPrompt !== song.prompt) {
    log.info(`   Trimmed Suno description from ${song.prompt.length} to ${sunoPrompt.length} chars`);
  }

  const results = await generateSunoApiTrack({
    prompt: sunoPrompt,
    tags: song.style,
    title: song.title,
    make_instrumental: song.instrumental !== false,
    baseUrl: engineOptions.sunoApiBaseUrl || 'http://localhost:3000',
    model: engineOptions.sunoModel || null,
  });

  const primaryResult = results[0];
  if (!primaryResult?.audio_url) {
    throw new Error(`No audio_url returned for "${song.title}" from Suno API wrapper.`);
  }

  log.info(
    `   Selected Suno clip: ${primaryResult.id} (${primaryResult.type || 'default'}, ${primaryResult.model_name || 'unknown-model'})`
  );

  const safeName = sanitizeFilename(song.title);
  const finalPath = join(outputDir, `${safeName}.mp3`);

  log.info(`   Downloading generated MP3 to ${finalPath}...`);
  const response = await fetch(primaryResult.audio_url);
  if (!response.ok) {
    throw new Error(`Failed to download audio from ${primaryResult.audio_url}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(finalPath, Buffer.from(buffer));
  log.success(`   ✅ Track saved: ${finalPath}`);

  let duration = song.estimatedDuration || 120;
  try {
    duration = await getAudioDuration(finalPath);
  } catch {
    // Keep estimated duration if probing fails.
  }

  return {
    path: finalPath,
    duration,
    engine: 'suno-api',
    title: song.title,
    prompt: sunoPrompt,
    style: song.style,
    instrumental: song.instrumental,
    status: 'completed',
    songId: primaryResult.id || null,
    modelName: primaryResult.model_name || null,
    clipType: primaryResult.type || null,
  };
}

// ═══════════════════════════════════════════════════
//  MAIN GENERATOR (Routes to correct engine)
// ═══════════════════════════════════════════════════

/**
 * Generate a music track using the specified engine.
 * @param {object} song - Song concept from prompt-generator
 * @param {string} outputDir - Directory to save audio
 * @param {'suno-api'|'lyria'|'suno'|'suno-cdn'} engine - Generation engine
 * @param {object} [engineOptions] - Extra options (e.g. songId for suno-cdn)
 * @returns {Promise<object>} Generation result
 */
export async function generateTrack(song, outputDir, engine = 'suno-api', engineOptions = {}) {
  switch (engine) {
    case 'suno-cdn': {
      if (!engineOptions.songId) throw new Error('suno-cdn engine requires engineOptions.songId');
      const outputPath = join(outputDir, `${sanitizeFilename(song.title)}.mp3`);
      const path = await withRetry(
        () => downloadFromSuno(engineOptions.songId, outputPath),
        { label: `CDN download "${song.title}"`, attempts: 3 }
      );
      return {
        path,
        duration: song.estimatedDuration || 120,
        engine: 'suno-cdn',
        title: song.title,
        status: 'completed',
        songId: engineOptions.songId,
      };
    }

    case 'suno':
      return generateWithSunoBrowser(song, outputDir);

    case 'suno-api':
      return generateWithSunoApi(song, outputDir, engineOptions);

    case 'lyria':
      return generateWithLyria(song, outputDir);

    default:
      throw new Error(`Unsupported engine "${engine}"`);
  }
}

/**
 * Generate all tracks for an album with per-track error isolation and retries.
 * @param {Array} songs - Array of song concepts
 * @param {string} outputDir - Base output directory
 * @param {'suno-api'|'lyria'|'suno'|'suno-cdn'} engine
 * @param {Array<object>} [engineOptionsPerSong] - Per-song options
 * @returns {Promise<Array>} Array of generation results
 */
export async function generateAlbum(songs, outputDir, engine = 'suno-api', engineOptionsPerSong = []) {
  log.header(`Generating ${songs.length} tracks [engine: ${engine}]`);

  const audioDir = join(outputDir, 'audio');
  const results = [];

  for (let i = 0; i < songs.length; i++) {
    log.step(i + 1, `Track ${i + 1}/${songs.length}: "${songs[i].title}"`);

    let result = null;
    let lastError = null;

    // Per-track retry loop
    for (let attempt = 1; attempt <= MAX_TRACK_RETRIES + 1; attempt++) {
      try {
        result = await generateTrack(songs[i], audioDir, engine, engineOptionsPerSong[i] || {});
        break; // Success — exit retry loop
      } catch (err) {
        lastError = err;
        if (attempt <= MAX_TRACK_RETRIES) {
          log.warn(`   Track "${songs[i].title}" failed (attempt ${attempt}/${MAX_TRACK_RETRIES + 1}): ${err.message}`);
          log.info(`   Retrying in ${INTER_TRACK_COOLDOWN_MS / 1000}s...`);
          await new Promise(r => setTimeout(r, INTER_TRACK_COOLDOWN_MS));
        }
      }
    }

    if (!result) {
      // All retries exhausted — mark failed but don't crash the album
      log.error(`   ❌ Track "${songs[i].title}" failed after ${MAX_TRACK_RETRIES + 1} attempts: ${lastError.message}`);
      result = {
        path: null,
        duration: 0,
        engine,
        title: songs[i].title,
        status: 'failed',
        error: lastError.message,
        attempts: MAX_TRACK_RETRIES + 1,
      };
    }

    results.push(result);

    // Cooldown between tracks (avoid rate-limiting on Gemini)
    if (i < songs.length - 1 && result.status === 'completed') {
      log.info(`   ⏸️  Cooldown ${INTER_TRACK_COOLDOWN_MS / 1000}s before next track...`);
      await new Promise(r => setTimeout(r, INTER_TRACK_COOLDOWN_MS));
    }
  }

  const completed = results.filter(r => r.status === 'completed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const pending = results.filter(r => r.status?.includes('pending')).length;

  log.success(`Album generation complete: ${completed} done, ${failed} failed, ${pending} pending`);
  return results;
}

export default { generateTrack, generateAlbum, downloadFromSuno, downloadSunoAlbum };
