#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executetelegramWebhook } from './providers/telegramapi.js';
import { executeproductVisionAnalysis } from './providers/openaivision.js';
import { executecreativePromptGeneration } from './providers/openaigpt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R36 | R36 | The Ad Creator AI Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Receive Telegram Brief
  runData.telegramWebhook = await executetelegramWebhook(config.telegramWebhookConfig, runData);

  // Stage: Analyze Product Image
  runData.productVisionAnalysis = await executeproductVisionAnalysis(config.productVisionAnalysisConfig, runData.telegramWebhook);

  // Stage: Generate Creative Prompts
  runData.creativePromptGeneration = await executecreativePromptGeneration(config.creativePromptGenerationConfig, runData.productVisionAnalysis);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
