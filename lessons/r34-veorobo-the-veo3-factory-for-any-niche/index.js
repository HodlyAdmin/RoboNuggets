#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executepromptGen } from './providers/openrouter.js';
import { executeclipGen } from './providers/veo3fast.js';
import { executecombineVideo } from './providers/ffmpeg.js';
import { executeautoPublish } from './providers/socialmediaapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R34 | R34 | VeoRobo - the Veo3 Factory for any Niche Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Prompts and Metadata
  runData.promptGen = await executepromptGen(config.promptGenConfig, runData);

  // Stage: Generate Clips
  runData.clipGen = await executeclipGen(config.clipGenConfig, runData.promptGen);

  // Stage: Combine to Final Video
  runData.combineVideo = await executecombineVideo(config.combineVideoConfig, runData.clipGen);

  // Stage: Auto Publish
  runData.autoPublish = await executeautoPublish(config.autoPublishConfig, runData.combineVideo);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
