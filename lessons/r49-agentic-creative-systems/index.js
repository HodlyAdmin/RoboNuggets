#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executebrandAgnosticIngestion } from './providers/geminiapi.js';
import { executesystemGuidelineApplication } from './providers/geminiapi.js';
import { executestoryboardSystemization } from './providers/geminiapi.js';
import { executevideoGeneration } from './providers/veoapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R49 | R49 | Agentic Creative Systems Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Brand Book Prompt Ingestion
  runData.brandAgnosticIngestion = await executebrandAgnosticIngestion(config.brandAgnosticIngestionConfig, runData);

  // Stage: Apply Agentic Guidelines
  runData.systemGuidelineApplication = await executesystemGuidelineApplication(config.systemGuidelineApplicationConfig, runData.brandAgnosticIngestion);

  // Stage: Storyboard Systemization
  runData.storyboardSystemization = await executestoryboardSystemization(config.storyboardSystemizationConfig, runData.systemGuidelineApplication);

  // Stage: Advertising Video Creation
  runData.videoGeneration = await executevideoGeneration(config.videoGenerationConfig, runData.storyboardSystemization);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
