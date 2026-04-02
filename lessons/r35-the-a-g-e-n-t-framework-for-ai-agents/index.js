#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executereadSheet } from './providers/googlesheets.js';
import { executegatherResearch } from './providers/perplexityapi.js';
import { executeagentReasoning } from './providers/openaigpt4o.js';
import { executesendNotification } from './providers/slackapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R35 | R35 | The A.G.E.N.T. Framework for AI Agents Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Fetch Data from Google Sheets
  runData.readSheet = await executereadSheet(config.readSheetConfig, runData);

  // Stage: Gather Research
  runData.gatherResearch = await executegatherResearch(config.gatherResearchConfig, runData.readSheet);

  // Stage: A.G.E.N.T. Reasoning Phase
  runData.agentReasoning = await executeagentReasoning(config.agentReasoningConfig, runData.gatherResearch);

  // Stage: Send Notification
  runData.sendNotification = await executesendNotification(config.sendNotificationConfig, runData.agentReasoning);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
