/**
 * Shared ffmpeg utilities for RoboNuggets modules
 * Uses direct child_process calls to the npm-bundled ffmpeg/ffprobe binaries.
 * No wrapper library needed — just the installers + spawn.
 */
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { execFile, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { log } from './logger.js';

const FFMPEG  = ffmpegInstaller.path;
const FFPROBE = ffprobeInstaller.path;

/**
 * Combine a cover image + multiple audio tracks into a single video.
 * @param {object} options
 * @param {string} options.imagePath  - Path to cover image
 * @param {string[]} options.audioPaths - Array of audio file paths (in order)
 * @param {string} options.outputPath  - Output video file path
 * @param {object} options.metadata    - Optional { title, artist, album }
 * @param {string} [options.videoResolution] - Optional WIDTH:HEIGHT target, e.g. 1280:720
 * @returns {Promise<string>} Path to output video
 */
export async function createAlbumVideo({ imagePath, audioPaths, outputPath, metadata = {}, videoResolution = '' }) {
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  log.info(`🎬 Creating album video with ${audioPaths.length} tracks`);
  log.info(`   Cover: ${imagePath}`);
  log.info(`   Output: ${outputPath}`);
  if (videoResolution) {
    log.info(`   Resolution: ${videoResolution}`);
  }

  // Build ffmpeg args
  const args = ['-loop', '1', '-i', imagePath];

  // Add each audio input
  for (const ap of audioPaths) args.push('-i', ap);

  // Always overwrite
  args.push('-y');

  const resolutionMatch = String(videoResolution || '').match(/^(\d{2,5}):(\d{2,5})$/);
  if (resolutionMatch) {
    const [, width, height] = resolutionMatch;
    const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
    args.push('-vf', videoFilter);
  }

  if (audioPaths.length === 1) {
    // Single audio — simple mux
    args.push(
      '-c:v', 'libx264', '-tune', 'stillimage',
      '-c:a', 'aac', '-b:a', '192k',
      '-pix_fmt', 'yuv420p', '-shortest',
      '-movflags', '+faststart',
    );
  } else {
    // Concat filter for multiple audio tracks
    const filterInputs = audioPaths.map((_, i) => `[${i + 1}:a]`).join('');
    const concatFilter = `${filterInputs}concat=n=${audioPaths.length}:v=0:a=1[outa]`;
    args.push(
      '-filter_complex', concatFilter,
      '-c:v', 'libx264', '-tune', 'stillimage',
      '-c:a', 'aac', '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-map', '0:v', '-map', '[outa]',
      '-shortest', '-movflags', '+faststart',
    );
  }

  // Metadata
  if (metadata.title)  args.push('-metadata', `title=${metadata.title}`);
  if (metadata.artist) args.push('-metadata', `artist=${metadata.artist}`);
  if (metadata.album)  args.push('-metadata', `album=${metadata.album}`);

  args.push(outputPath);

  log.debug(`   ffmpeg ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        log.success(`✅ Album video created: ${outputPath}`);
        resolve(outputPath);
      } else {
        log.error(`❌ ffmpeg exited with code ${code}`);
        reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

/**
 * Get duration of an audio file in seconds using ffprobe.
 * @param {string} audioPath
 * @returns {Promise<number>} Duration in seconds
 */
export async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    execFile(FFPROBE, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ], (err, stdout) => {
      if (err) return reject(err);
      const dur = parseFloat(stdout.trim());
      if (isNaN(dur)) return reject(new Error(`Could not parse duration from: ${stdout}`));
      resolve(dur);
    });
  });
}

export default { createAlbumVideo, getAudioDuration };
