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
    lesson: 'R39 | R39 | 100 Ads in 1 Minute -  🍌 Split AI System',
    createdAt: new Date().toISOString(),
    config: { projectName: data.projectName },
    stages: {
      telegramInput: data.telegramInput || null,
      imageAnalysis: data.imageAnalysis || null,
      promptSplitter: data.promptSplitter || null,
      sheetExport: data.sheetExport || null,
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
