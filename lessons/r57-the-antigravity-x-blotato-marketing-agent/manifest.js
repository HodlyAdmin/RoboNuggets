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
    lesson: 'R57 | R57 | The Antigravity x Blotato Marketing Agent',
    createdAt: new Date().toISOString(),
    config: { projectName: data.projectName },
    stages: {
      contentStrategy: data.contentStrategy || null,
      mediaGeneration: data.mediaGeneration || null,
      dataSync: data.dataSync || null,
      campaignScheduling: data.campaignScheduling || null,
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
