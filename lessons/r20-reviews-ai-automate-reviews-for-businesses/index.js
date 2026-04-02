#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executefetchReviews } from './providers/gohighlevel.js';
import { executegenerateResponse } from './providers/openaiapi.js';
import { executepublishReply } from './providers/gohighlevel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R20 | R20 | Reviews AI: Automate reviews for businesses Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Fetch Customer Reviews
  runData.fetchReviews = await executefetchReviews(config.fetchReviewsConfig, runData);

  // Stage: Generate AI Response
  runData.generateResponse = await executegenerateResponse(config.generateResponseConfig, runData.fetchReviews);

  // Stage: Publish Review Reply
  runData.publishReply = await executepublishReply(config.publishReplyConfig, runData.generateResponse);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
