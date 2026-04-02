#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executepromptGeneration } from './providers/chatgptapi.js';
import { executemusicGeneration } from './providers/sunopiapi.js';
import { executeaudioRetrieval } from './providers/n8nwebhook.js';
import { executeyoutubeUpload } from './providers/youtubeapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R18 | R18 | Music Creator AI Agent Toolkit v2.0 Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Song Prompt
  runData.promptGeneration = await executepromptGeneration(config.promptGenerationConfig, runData);

  // Stage: Generate AI Music
  runData.musicGeneration = await executemusicGeneration(config.musicGenerationConfig, runData.promptGeneration);

  // Stage: Receive Audio Webhook
  runData.audioRetrieval = await executeaudioRetrieval(config.audioRetrievalConfig, runData.musicGeneration);

  // Stage: Publish Lofi Video
  runData.youtubeUpload = await executeyoutubeUpload(config.youtubeUploadConfig, runData.audioRetrieval);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
