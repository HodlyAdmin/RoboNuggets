import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getAudioDuration } from '../../../shared/ffmpeg.js';

const FFMPEG = ffmpegInstaller.path;

function wrapText(text, maxLineLength) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const proposal = current ? `${current} ${word}` : word;
    if (proposal.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = proposal;
    }
  }

  if (current) lines.push(current);
  return lines.join('\n');
}

function formatTimestamp(seconds) {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const hours = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  const ms = String(totalMs % 1000).padStart(3, '0');
  return `${hours}:${minutes}:${secs},${ms}`;
}

function buildSrtText(record, durationSeconds, maxLineLength) {
  const wrapped = wrapText(record.quote, maxLineLength);
  return [
    '1',
    `${formatTimestamp(0)} --> ${formatTimestamp(durationSeconds)}`,
    wrapped,
    '',
  ].join('\n');
}

function buildSubtitleFilter(subtitlePath, config) {
  const escapedPath = subtitlePath.replace(/'/g, "\\'");
  const style = [
    `FontName=${config.fontName || 'Arial'}`,
    `FontSize=${config.fontSize || 20}`,
    `PrimaryColour=&H00FFFFFF`,
    `OutlineColour=&H00000000`,
    `BackColour=&H64000000`,
    `BorderStyle=3`,
    `Outline=${config.outline || 2}`,
    `Shadow=0`,
    `Alignment=${config.alignment || 5}`,
    `MarginV=${config.marginV || 360}`,
  ].join(',');

  return `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles='${escapedPath}':force_style='${style}'`;
}

export async function renderLocalShort({ record, audioArtifact, backgroundVideoPath, outputPath, subtitlesConfig = {} }) {
  if (!existsSync(backgroundVideoPath)) {
    throw new Error(`Background video not found: ${backgroundVideoPath}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const durationSeconds = await getAudioDuration(audioArtifact.path);
  const subtitlePath = outputPath.replace(/\.mp4$/i, '.srt');
  const subtitleText = buildSrtText(record, durationSeconds, subtitlesConfig.maxLineLength || 22);
  await writeFile(subtitlePath, subtitleText);

  const filter = buildSubtitleFilter(subtitlePath, subtitlesConfig);
  const args = [
    '-stream_loop', '-1',
    '-i', backgroundVideoPath,
    '-i', audioArtifact.path,
    '-vf', filter,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];

  await new Promise((resolve, reject) => {
    const process = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg failed with code ${code}: ${stderr.slice(-800)}`));
    });

    process.on('error', reject);
  });

  return {
    index: record.index,
    renderer: 'local-ffmpeg',
    path: outputPath,
    subtitlePath,
    durationSeconds,
    status: 'rendered',
  };
}
