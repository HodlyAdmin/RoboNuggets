#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executestoryboardCreation } from './providers/geminiapi.js';
import { executemotionGraphicsGen } from './providers/seedreamapi.js';
import { executeworkflowOrchestration } from './providers/n8n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R41 | R41 | AI Motion Graphics (with Seedream 4.0) Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Storyboard Generation
  runData.storyboardCreation = await executestoryboardCreation(config.storyboardCreationConfig, runData);

  // Stage: AI Motion Graphics
  runData.motionGraphicsGen = await executemotionGraphicsGen(config.motionGraphicsGenConfig, runData.storyboardCreation);

  // Stage: Workflow Automation
  runData.workflowOrchestration = await executeworkflowOrchestration(config.workflowOrchestrationConfig, runData.motionGraphicsGen);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
