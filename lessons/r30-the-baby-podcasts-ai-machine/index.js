#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executescrapeTiktokVideos } from './providers/apify.js';
import { executegenerateBabyImage } from './providers/imagegenapi.js';
import { executegenerateBabyVideo } from './providers/hedraapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R30 | R30 | The Baby Podcasts AI Machine Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Scrape TikTok Videos
  runData.scrapeTiktokVideos = await executescrapeTiktokVideos(config.scrapeTiktokVideosConfig, runData);

  // Stage: Generate Baby Avatar Image
  runData.generateBabyImage = await executegenerateBabyImage(config.generateBabyImageConfig, runData.scrapeTiktokVideos);

  // Stage: Generate Hedra AI Video
  runData.generateBabyVideo = await executegenerateBabyVideo(config.generateBabyVideoConfig, runData.generateBabyImage);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
