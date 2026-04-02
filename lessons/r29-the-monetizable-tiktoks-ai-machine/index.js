#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executepromptGen } from './providers/openai.js';
import { executeimageGen } from './providers/falai.js';
import { executevideoGen } from './providers/falai.js';
import { executesoundGen } from './providers/falai.js';
import { executevideoCompose } from './providers/ffmpegapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R29 | R29 | The Monetizable Tiktoks AI Machine Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Prompts
  runData.promptGen = await executepromptGen(config.promptGenConfig, runData);

  // Stage: Generate Images
  runData.imageGen = await executeimageGen(config.imageGenConfig, runData.promptGen);

  // Stage: Generate Videos
  runData.videoGen = await executevideoGen(config.videoGenConfig, runData.imageGen);

  // Stage: Generate Sounds
  runData.soundGen = await executesoundGen(config.soundGenConfig, runData.videoGen);

  // Stage: Compose Final Video
  runData.videoCompose = await executevideoCompose(config.videoComposeConfig, runData.soundGen);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
