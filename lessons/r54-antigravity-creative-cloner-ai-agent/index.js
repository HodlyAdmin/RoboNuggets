#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executepromptIngestion } from './providers/antigravityinput.js';
import { executestoryboardGeneration } from './providers/geminiapi.js';
import { executevideoCreation } from './providers/veoapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R54 | R54 | Antigravity Creative Cloner AI Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Ingest Brand Agnostic Prompts
  runData.promptIngestion = await executepromptIngestion(config.promptIngestionConfig, runData);

  // Stage: Generate Advertising Storyboards
  runData.storyboardGeneration = await executestoryboardGeneration(config.storyboardGenerationConfig, runData.promptIngestion);

  // Stage: Automated Video Ad Cloning
  runData.videoCreation = await executevideoCreation(config.videoCreationConfig, runData.storyboardGeneration);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
