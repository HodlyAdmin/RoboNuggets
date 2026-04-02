#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executetelegramInput } from './providers/telegrambot.js';
import { executeimageAnalysis } from './providers/openaivision.js';
import { executepromptSplitter } from './providers/openaigpt.js';
import { executesheetExport } from './providers/googlesheets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R39 | R39 | 100 Ads in 1 Minute -  🍌 Split AI System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Telegram Image Webhook
  runData.telegramInput = await executetelegramInput(config.telegramInputConfig, runData);

  // Stage: Analyze and Describe Image
  runData.imageAnalysis = await executeimageAnalysis(config.imageAnalysisConfig, runData.telegramInput);

  // Stage: Agent Prompt Splitter
  runData.promptSplitter = await executepromptSplitter(config.promptSplitterConfig, runData.imageAnalysis);

  // Stage: Export Data to Sheets
  runData.sheetExport = await executesheetExport(config.sheetExportConfig, runData.promptSplitter);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
