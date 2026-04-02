/**
 * R45 Manifest — JSON logging for all run data
 * Replaces Google Sheets logging from the original n8n workflow.
 * Tracks engine used, retry history, timing, and all output paths.
 */
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { log } from '../../shared/logger.js';

/**
 * Create or update a manifest for an album run
 */
export async function saveManifest(data) {
  const manifestPath = join(data.outputDir, 'manifest.json');

  const dir = dirname(manifestPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const manifest = {
    version: '2.0',
    lesson: 'R45 | Auto Music Creator',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    config: {
      theme: data.theme,
      musicStyle: data.musicStyle,
      engine: data.engine,
      numSongs: data.songs?.length || 0,
      songLengthHint: data.config?.songLengthHint || null,
      videoResolution: data.config?.videoResolution || '1280:720',
      conceptProvider: data.config?.conceptProvider || 'auto',
      sunoModel: data.config?.sunoModel || null,
      songConceptsPath: data.config?.songConceptsPath || null,
      ideaIntakePath: data.config?.ideaIntakePath || null,
      ideaSeedsCount: Array.isArray(data.config?.ideaSeeds) ? data.config.ideaSeeds.length : 0,
      skipTimestamps: data.config?.skipTimestamps === true,
    },
    concepts: data.conceptsMeta ? {
      source: data.conceptsMeta.source || null,
      sourcePath: data.conceptsMeta.sourcePath || null,
      requestedSongs: data.conceptsMeta.requestedSongs || null,
      generatedSongs: data.conceptsMeta.generatedSongs || null,
      loadedSongs: data.conceptsMeta.loadedSongs || null,
      seedCount: data.conceptsMeta.seedCount || null,
    } : null,
    summary: {
      totalTracks: data.songs?.length || 0,
      completed: (data.tracks || []).filter(t => t?.status === 'completed').length,
      failed: (data.tracks || []).filter(t => t?.status === 'failed').length,
      pending: (data.tracks || []).filter(t => t?.status?.includes('pending')).length,
    },
    songs: (data.songs || []).map((song, i) => ({
      index: i + 1,
      title: song.title,
      prompt: song.prompt,
      style: song.style,
      instrumental: song.instrumental,
      track: data.tracks?.[i] ? {
        path: data.tracks[i].path,
        duration: data.tracks[i].duration,
        engine: data.tracks[i].engine,
        status: data.tracks[i].status || 'completed',
        error: data.tracks[i].error || null,
        attempts: data.tracks[i].attempts || 1,
        // Suno-specific: persist the song ID for future re-downloads
        songId: data.tracks[i].songId || null,
        modelName: data.tracks[i].modelName || null,
        clipType: data.tracks[i].clipType || null,
        sunoUrl: data.tracks[i].songId
          ? `https://suno.com/song/${data.tracks[i].songId}`
          : null,
      } : null,
    })),
    video: data.video ? {
      path: data.video.videoPath,
      totalDuration: data.video.totalDuration,
      trackCount: data.video.tracks?.length || 0,
    } : null,
    youtube: data.timestamps ? {
      timestamps: data.timestamps.timestamps,
      description: data.timestamps.description,
    } : null,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  log.success(`📋 Manifest saved: ${manifestPath}`);

  return manifestPath;
}

/**
 * Load an existing manifest
 * @param {string} outputDir - Album output directory
 * @returns {Promise<object|null>}
 */
export async function loadManifest(outputDir) {
  const manifestPath = join(outputDir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  const raw = await readFile(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

export default { saveManifest, loadManifest };
