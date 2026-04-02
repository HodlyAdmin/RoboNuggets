#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executecontentStrategy } from './providers/googleaistudio.js';
import { executemediaGeneration } from './providers/wavespeedai.js';
import { executedataSync } from './providers/airtable.js';
import { executecampaignScheduling } from './providers/blotatomcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R57 | R57 | The Antigravity x Blotato Marketing Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: AI Content Strategy
  runData.contentStrategy = await executecontentStrategy(config.contentStrategyConfig, runData);

  // Stage: Image & Video Generation
  runData.mediaGeneration = await executemediaGeneration(config.mediaGenerationConfig, runData.contentStrategy);

  // Stage: Database Sync & QA
  runData.dataSync = await executedataSync(config.dataSyncConfig, runData.mediaGeneration);

  // Stage: Campaign Scheduling
  runData.campaignScheduling = await executecampaignScheduling(config.campaignSchedulingConfig, runData.dataSync);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
