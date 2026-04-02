/**
 * R45 Video Assembler — Local ffmpeg album video builder
 * Combines cover image + audio tracks into a single album video.
 *
 * Handles both .mp3 (Suno) and .mp4 (Lyria) audio containers.
 */
import { createAlbumVideo, getAudioDuration } from '../../shared/ffmpeg.js';
import { log } from '../../shared/logger.js';
import { join } from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Assemble an album video from generated tracks
 * @param {object} options
 * @param {string} options.coverImagePath - Path to cover image
 * @param {Array<{path: string, title: string}>} options.tracks - Generated track results
 * @param {string} options.outputDir - Output directory
 * @param {string} options.albumTitle - Album title for metadata
 * @param {string} [options.videoResolution] - Target output size WIDTH:HEIGHT
 * @returns {Promise<{videoPath: string, totalDuration: number}|null>}
 */
export async function assembleAlbumVideo({ coverImagePath, tracks, outputDir, albumTitle, videoResolution = '1280:720' }) {
  log.header('Assembling Album Video');

  // Filter to only tracks with actual, existing audio files
  const availableTracks = tracks.filter(t => {
    if (!t.path) return false;
    if (!existsSync(t.path)) {
      log.warn(`   Track "${t.title}" path does not exist: ${t.path}`);
      return false;
    }
    // Verify file is not empty
    try {
      const stats = statSync(t.path);
      if (stats.size < 1000) {
        log.warn(`   Track "${t.title}" file is too small (${stats.size} bytes) — skipping`);
        return false;
      }
    } catch {
      return false;
    }
    return true;
  });

  if (availableTracks.length === 0) {
    log.warn('No valid audio tracks available for video assembly');
    return null;
  }

  log.info(`📀 Album: "${albumTitle}"`);
  log.info(`🖼️  Cover: ${coverImagePath}`);
  log.info(`🎵 Tracks: ${availableTracks.length}`);
  log.info(`📐 Video: ${videoResolution}`);

  // Get actual durations for each track
  const tracksWithDuration = [];
  for (const track of availableTracks) {
    try {
      const duration = await getAudioDuration(track.path);
      tracksWithDuration.push({ ...track, duration });
      log.info(`   ${track.title}: ${formatDuration(duration)} (${extof(track.path)})`);
    } catch (err) {
      log.warn(`   Could not probe duration for "${track.title}": ${err.message}`);
      tracksWithDuration.push({ ...track, duration: track.duration || 120 });
    }
  }

  const totalDuration = tracksWithDuration.reduce((sum, t) => sum + t.duration, 0);
  log.info(`⏱️  Total duration: ${formatDuration(totalDuration)}`);

  // Build the video
  const videoDir = join(outputDir, 'video');
  const videoFilename = `${sanitizeFilename(albumTitle)}.mp4`;
  const videoPath = join(videoDir, videoFilename);

  const audioPaths = tracksWithDuration.map(t => t.path);

  await createAlbumVideo({
    imagePath: coverImagePath,
    audioPaths,
    outputPath: videoPath,
    videoResolution,
    metadata: {
      title: albumTitle,
      artist: 'AI Music Creator (R45)',
      album: albumTitle,
    },
  });

  return {
    videoPath,
    totalDuration,
    tracks: tracksWithDuration,
  };
}

/**
 * Get file extension
 */
function extof(filepath) {
  return filepath.split('.').pop() || '?';
}

/**
 * Format seconds to MM:SS
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);
}

export default { assembleAlbumVideo };
