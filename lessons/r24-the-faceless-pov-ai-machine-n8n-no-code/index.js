#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executecontentGeneration } from './providers/openai.js';
import { executeaudioGeneration } from './providers/elevenlabs.js';
import { executeimageGeneration } from './providers/piapi.js';
import { executevideoAssembly } from './providers/creatomate.js';
import { executepublishing } from './providers/youtube.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R24 | R24 | The Faceless POV AI Machine (n8n no-code) Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Ideas and Scripts
  runData.contentGeneration = await executecontentGeneration(config.contentGenerationConfig, runData);

  // Stage: Generate Voiceover
  runData.audioGeneration = await executeaudioGeneration(config.audioGenerationConfig, runData.contentGeneration);

  // Stage: Generate POV Visuals
  runData.imageGeneration = await executeimageGeneration(config.imageGenerationConfig, runData.audioGeneration);

  // Stage: Assemble Video with Captions
  runData.videoAssembly = await executevideoAssembly(config.videoAssemblyConfig, runData.imageGeneration);

  // Stage: Publish to YouTube
  runData.publishing = await executepublishing(config.publishingConfig, runData.videoAssembly);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
