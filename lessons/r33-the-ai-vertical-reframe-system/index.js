#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executereadAssetData } from './providers/googlesheets.js';
import { executefetchSourceMedia } from './providers/googledrive.js';
import { executeaiVerticalReframe } from './providers/falai.js';
import { executesaveOutputMedia } from './providers/googledrive.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R33 | R33 | The AI Vertical Reframe System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Read Asset Metadata
  runData.readAssetData = await executereadAssetData(config.readAssetDataConfig, runData);

  // Stage: Fetch Horizontal Media
  runData.fetchSourceMedia = await executefetchSourceMedia(config.fetchSourceMediaConfig, runData.readAssetData);

  // Stage: AI Vertical Reframe
  runData.aiVerticalReframe = await executeaiVerticalReframe(config.aiVerticalReframeConfig, runData.fetchSourceMedia);

  // Stage: Save Reframed Media
  runData.saveOutputMedia = await executesaveOutputMedia(config.saveOutputMediaConfig, runData.aiVerticalReframe);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
