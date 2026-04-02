#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeGeminiEdit } from './providers/gemini-edit.js';
import { executeNanoBananaImage } from './providers/nano-banana.js';
import { executeVeoVideo } from './providers/veo-video.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R48 | Vibecoding Masterclass Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage 1: Gemini Edit
  runData.geminiEdit = await executeGeminiEdit(config.geminiConfig, runData);

  // Stage 2: Nano Banana
  runData.nanoBananaImage = await executeNanoBananaImage(config.nanoBananaConfig, runData.geminiEdit);

  // Stage 3: Veo Video
  runData.veoVideo = await executeVeoVideo(config.veoConfig, runData);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 R48 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('R48 Pipeline Failed: ' + err.message);
  process.exit(1);
});
