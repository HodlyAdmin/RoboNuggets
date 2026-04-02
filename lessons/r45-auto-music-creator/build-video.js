/**
 * R45 Video Builder — Reads manifest.json and assembles the album video.
 *
 * Usage:
 *   npm run r45:build -- <output-dir>
 *   node lessons/r45-auto-music-creator/build-video.js <output-dir>
 *
 * If no output-dir is given, defaults to ./output/ and uses the first
 * manifest.json it finds.
 */
import { createAlbumVideo, getAudioDuration } from '../../shared/ffmpeg.js';
import { loadManifest } from './manifest.js';
import { log } from '../../shared/logger.js';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  log.header('R45 Video Builder');

  // Resolve the output directory from CLI arg or search for one
  let outputDir = process.argv[2];

  if (!outputDir) {
    // Try to find the most recent album output dir
    const baseOutput = join(__dirname, 'output');
    if (existsSync(baseOutput)) {
      const candidates = readdirSync(baseOutput, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'video')
        .map(d => d.name)
        .sort()
        .reverse();

      if (candidates.length > 0) {
        outputDir = join(baseOutput, candidates[0]);
        log.info(`Auto-detected output dir: ${outputDir}`);
      }
    }
  }

  if (!outputDir || !existsSync(outputDir)) {
    // Fall back to legacy flat layout (track1/, track2/, etc.)
    const legacyOutput = join(__dirname, 'output');
    const track1 = join(legacyOutput, 'track1', 'audio');
    if (existsSync(track1)) {
      log.info('Using legacy flat track layout');
      outputDir = legacyOutput;
    } else {
      log.error('No output directory found. Run the pipeline first or pass a directory:');
      log.info('  npm run r45:build -- ./lessons/r45-auto-music-creator/output/<album-dir>');
      process.exit(1);
    }
  }

  outputDir = resolve(outputDir);
  log.info(`Output dir: ${outputDir}`);

  // Try to load manifest
  const manifest = await loadManifest(outputDir);

  let tracks = [];
  let albumTitle = 'Lofi Album';
  let coverPath = null;
  let videoResolution = '1280:720';

  if (manifest) {
    log.info(`Loaded manifest: ${manifest.songs?.length || 0} songs`);
    albumTitle = manifest.config?.theme || albumTitle;
    videoResolution = manifest.config?.videoResolution || videoResolution;

    // Collect track paths from manifest
    for (const song of manifest.songs || []) {
      if (song.track?.path && existsSync(song.track.path)) {
        tracks.push({ title: song.title, path: song.track.path });
      }
    }
  }

  // If no tracks from manifest, scan for audio files
  if (tracks.length === 0) {
    log.info('No tracks in manifest — scanning output directory for audio files...');
    const audioDir = join(outputDir, 'audio');
    const trackDirs = ['track1', 'track2', 'track3', 'track4', 'track5'];

    // Try per-track subdirectories first (legacy layout)
    for (const td of trackDirs) {
      const candidates = [
        join(outputDir, td, 'audio', 'track.mp3'),
        join(outputDir, td, 'audio', 'track.mp4'),
        join(outputDir, td, 'audio', `lyria_${td}.mp3`),
        join(outputDir, td, 'audio', `lyria_${td}.mp4`),
      ];
      for (const c of candidates) {
        if (existsSync(c)) {
          tracks.push({ title: td, path: c });
          break;
        }
      }
    }

    // Try flat audio directory
    if (tracks.length === 0 && existsSync(audioDir)) {
      const files = readdirSync(audioDir)
        .filter(f => ['.mp3', '.mp4', '.m4a'].some(ext => f.endsWith(ext)))
        .sort();
      tracks = files.map(f => ({ title: f.replace(/\.(mp3|mp4|m4a)$/i, ''), path: join(audioDir, f) }));
    }
  }

  if (tracks.length === 0) {
    log.error('No audio tracks found. Nothing to assemble.');
    process.exit(1);
  }

  log.info(`Found ${tracks.length} tracks`);

  // Find cover image
  const coverCandidates = [
    join(outputDir, 'cover.png'),
    join(outputDir, '..', 'cover.png'),
    join(__dirname, 'assets', 'cover.png'),
    join(__dirname, 'output', 'cover.png'),
  ];
  for (const c of coverCandidates) {
    if (existsSync(c)) { coverPath = c; break; }
  }

  if (!coverPath) {
    log.error('No cover image found. Place cover.png in the output directory or assets/');
    process.exit(1);
  }

  // Probe real durations
  for (const track of tracks) {
    try {
      track.duration = await getAudioDuration(track.path);
      const mm = Math.floor(track.duration / 60);
      const ss = Math.floor(track.duration % 60).toString().padStart(2, '0');
      log.info(`   ${track.title}: ${mm}:${ss}`);
    } catch (err) {
      log.warn(`   Could not probe "${track.title}": ${err.message}`);
      track.duration = 120;
    }
  }

  const total = tracks.reduce((s, t) => s + t.duration, 0);
  const tm = Math.floor(total / 60);
  const ts = Math.floor(total % 60).toString().padStart(2, '0');
  log.info(`⏱️  Total duration: ${tm}:${ts}`);

  // Build video
  const videoDir = join(outputDir, 'video');
  const slug = albumTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);
  const videoPath = join(videoDir, `${slug}.mp4`);

  await createAlbumVideo({
    imagePath: coverPath,
    audioPaths: tracks.map(t => t.path),
    outputPath: videoPath,
    videoResolution,
    metadata: { title: albumTitle, artist: 'AI Music Creator (R45)', album: albumTitle },
  });

  log.info(`\n🎬 Video: ${videoPath}`);
}

run().catch(err => {
  log.error(`Build failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
