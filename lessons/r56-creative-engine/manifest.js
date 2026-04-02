import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { log } from '../../shared/logger.js';

export async function saveManifest(data) {
  const manifestPath = join(data.outputDir, 'manifest.json');
  const dir = dirname(manifestPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const manifest = {
    version: '1.0',
    lesson: 'R56 | Creative Engine',
    createdAt: data.startedAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
    command: data.command || null,
    outputDir: data.outputDir || null,
    config: {
      projectName: data.projectName,
      configPath: data.configPath || null,
      dryRun: Boolean(data.dryRun),
    },
    stages: {
      imageGeneration: data.imageGeneration || null,
      videoGeneration: data.videoGeneration || null,
      audioGeneration: data.audioGeneration || null,
      airtableReview: data.airtableReview || null,
    }
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  log.success(`📋 Manifest saved: ${manifestPath}`);
  return manifestPath;
}

export async function loadManifest(outputDir) {
  const manifestPath = join(outputDir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  const raw = await readFile(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

export default { saveManifest, loadManifest };
