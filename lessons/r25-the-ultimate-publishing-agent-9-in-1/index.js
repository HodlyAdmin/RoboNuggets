#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executefetchContent } from './providers/googlesheets.js';
import { executeuploadMedia } from './providers/blotatoapi.js';
import { executepublishToSocials } from './providers/blotatoapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R25 | R25 | The Ultimate Publishing Agent (9-in-1!) Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Fetch Content Data
  runData.fetchContent = await executefetchContent(config.fetchContentConfig, runData);

  // Stage: Upload Media Asset
  runData.uploadMedia = await executeuploadMedia(config.uploadMediaConfig, runData.fetchContent);

  // Stage: Publish to Social Platforms
  runData.publishToSocials = await executepublishToSocials(config.publishToSocialsConfig, runData.uploadMedia);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
