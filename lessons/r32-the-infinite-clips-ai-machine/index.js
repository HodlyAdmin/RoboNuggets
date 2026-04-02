#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executegetLongform } from './providers/googlesheets.js';
import { executeanalyzeLongform } from './providers/klapapi.js';
import { executeproduceShorts } from './providers/klapapi.js';
import { executepublishShorts } from './providers/blotato.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R32 | R32 | The Infinite Clips AI Machine Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Get Longform Video
  runData.getLongform = await executegetLongform(config.getLongformConfig, runData);

  // Stage: Analyze Video for Shorts
  runData.analyzeLongform = await executeanalyzeLongform(config.analyzeLongformConfig, runData.getLongform);

  // Stage: Produce and Export Shorts
  runData.produceShorts = await executeproduceShorts(config.produceShortsConfig, runData.analyzeLongform);

  // Stage: Publish Shorts
  runData.publishShorts = await executepublishShorts(config.publishShortsConfig, runData.produceShorts);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
