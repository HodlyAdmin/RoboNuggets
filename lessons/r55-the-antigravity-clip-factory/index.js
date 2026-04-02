#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executetelegramTrigger } from './providers/telegrambot.js';
import { executegenerateClips } from './providers/vizardai.js';
import { executequeueForReview } from './providers/airtable.js';
import { executeschedulePost } from './providers/blotato.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R55 | R55 | The Antigravity Clip Factory Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Receive Video Command
  runData.telegramTrigger = await executetelegramTrigger(config.telegramTriggerConfig, runData);

  // Stage: Generate Short Clips
  runData.generateClips = await executegenerateClips(config.generateClipsConfig, runData.telegramTrigger);

  // Stage: Add to Review Queue
  runData.queueForReview = await executequeueForReview(config.queueForReviewConfig, runData.generateClips);

  // Stage: Schedule Social Post
  runData.schedulePost = await executeschedulePost(config.schedulePostConfig, runData.queueForReview);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
