#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executekeywordResearch } from './providers/openaiapi.js';
import { executeyoutubeScraper } from './providers/apifyyoutubescraper.js';
import { executecontentCuration } from './providers/geminiapi.js';
import { executenotificationDelivery } from './providers/telegrambotapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R23 | R23 | YouTube Curator AI Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Live Keyword & Trend Search
  runData.keywordResearch = await executekeywordResearch(config.keywordResearchConfig, runData);

  // Stage: YouTube Video Extraction
  runData.youtubeScraper = await executeyoutubeScraper(config.youtubeScraperConfig, runData.keywordResearch);

  // Stage: AI Filtering & Twist Generation
  runData.contentCuration = await executecontentCuration(config.contentCurationConfig, runData.youtubeScraper);

  // Stage: Telegram Results Delivery
  runData.notificationDelivery = await executenotificationDelivery(config.notificationDeliveryConfig, runData.contentCuration);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
