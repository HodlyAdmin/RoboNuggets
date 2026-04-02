#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executescriptGen } from './providers/geminiapi.js';
import { executeimageGen } from './providers/midjourneyapi.js';
import { executevoiceGen } from './providers/elevenlabsapi.js';
import { executevideoGen } from './providers/heygenapi.js';
import { executepublishSocial } from './providers/n8nwebhook.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R44 | R44 - The AI Influencer Toolkit Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Content Script
  runData.scriptGen = await executescriptGen(config.scriptGenConfig, runData);

  // Stage: Generate Avatar Image
  runData.imageGen = await executeimageGen(config.imageGenConfig, runData.scriptGen);

  // Stage: Synthesize Voiceover
  runData.voiceGen = await executevoiceGen(config.voiceGenConfig, runData.imageGen);

  // Stage: Animate Influencer Video
  runData.videoGen = await executevideoGen(config.videoGenConfig, runData.voiceGen);

  // Stage: Publish to Socials
  runData.publishSocial = await executepublishSocial(config.publishSocialConfig, runData.videoGen);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
