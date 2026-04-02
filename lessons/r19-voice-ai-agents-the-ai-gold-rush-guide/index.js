#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executebusinessDataIngestion } from './providers/apifyscraper.js';
import { executeagentPromptGeneration } from './providers/geminiapi.js';
import { executevoiceDeployment } from './providers/blandai.js';
import { executecrmSync } from './providers/gohighlevel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R19 | R19 | Voice AI Agents: The AI Gold Rush Guide! Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Ingest Business Context
  runData.businessDataIngestion = await executebusinessDataIngestion(config.businessDataIngestionConfig, runData);

  // Stage: Generate Voice Agent Instructions
  runData.agentPromptGeneration = await executeagentPromptGeneration(config.agentPromptGenerationConfig, runData.businessDataIngestion);

  // Stage: Deploy Voice AI Model
  runData.voiceDeployment = await executevoiceDeployment(config.voiceDeploymentConfig, runData.agentPromptGeneration);

  // Stage: Sync Leads to CRM
  runData.crmSync = await executecrmSync(config.crmSyncConfig, runData.voiceDeployment);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
