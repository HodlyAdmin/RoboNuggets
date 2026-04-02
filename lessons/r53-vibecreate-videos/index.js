#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeVideoBrief } from './providers/video-brief.js';
import { executeAssetCollection } from './providers/asset-collector.js';
import { executeRemotionRender } from './providers/remotion-renderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R53 | Vibecreate Videos Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage 1: Video Brief
  runData.videoBrief = await executeVideoBrief(config.briefConfig, runData);

  // Stage 2: Asset Collection
  runData.assetCollection = await executeAssetCollection(config.assetConfig, runData.videoBrief);

  // Stage 3: Remotion Render
  runData.remotionRender = await executeRemotionRender(config.remotionConfig, runData.assetCollection);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 R53 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('R53 Pipeline Failed: ' + err.message);
  process.exit(1);
});
