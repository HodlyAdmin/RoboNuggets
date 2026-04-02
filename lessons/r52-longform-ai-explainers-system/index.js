#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executedataIngestion } from './providers/apifyscraper.js';
import { executeframeworkStructuring } from './providers/geminiapi.js';
import { executelongformDrafting } from './providers/geminiapi.js';
import { executevoiceoverGeneration } from './providers/elevenlabstts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R52 | R52 | Longform AI Explainers System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Data & Source Ingestion
  runData.dataIngestion = await executedataIngestion(config.dataIngestionConfig, runData);

  // Stage: SEALCaM Structuring
  runData.frameworkStructuring = await executeframeworkStructuring(config.frameworkStructuringConfig, runData.dataIngestion);

  // Stage: Longform Explainer Drafting
  runData.longformDrafting = await executelongformDrafting(config.longformDraftingConfig, runData.frameworkStructuring);

  // Stage: Voiceover Generation
  runData.voiceoverGeneration = await executevoiceoverGeneration(config.voiceoverGenerationConfig, runData.longformDrafting);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
