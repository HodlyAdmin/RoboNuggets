#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeaudioGen } from './providers/elevenlabs.js';
import { executeimageGen } from './providers/nanobanana.js';
import { executevideoGen } from './providers/seedance.js';
import { executecombineMedia } from './providers/ffmpeg.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R40 | R40 | The Hyperconsistent AI Storymaker (🍌) Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Create Voice
  runData.audioGen = await executeaudioGen(config.audioGenConfig, runData);

  // Stage: Create Image
  runData.imageGen = await executeimageGen(config.imageGenConfig, runData.audioGen);

  // Stage: Create Video
  runData.videoGen = await executevideoGen(config.videoGenConfig, runData.imageGen);

  // Stage: Combine All
  runData.combineMedia = await executecombineMedia(config.combineMediaConfig, runData.videoGen);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
