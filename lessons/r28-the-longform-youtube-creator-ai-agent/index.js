#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeideaGeneration } from './providers/openai.js';
import { executescriptAndPromptGen } from './providers/openai.js';
import { executevoiceoverGen } from './providers/elevenlabs.js';
import { executevideoAssembly } from './providers/json2video.js';
import { executeyoutubePublishing } from './providers/youtubeapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R28 | R28 | The Longform YouTube Creator AI Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Idea Generation
  runData.ideaGeneration = await executeideaGeneration(config.ideaGenerationConfig, runData);

  // Stage: Script and Visual Prompts
  runData.scriptAndPromptGen = await executescriptAndPromptGen(config.scriptAndPromptGenConfig, runData.ideaGeneration);

  // Stage: Voiceover Generation
  runData.voiceoverGen = await executevoiceoverGen(config.voiceoverGenConfig, runData.scriptAndPromptGen);

  // Stage: Video Assembly and Editing
  runData.videoAssembly = await executevideoAssembly(config.videoAssemblyConfig, runData.voiceoverGen);

  // Stage: Publish to YouTube
  runData.youtubePublishing = await executeyoutubePublishing(config.youtubePublishingConfig, runData.videoAssembly);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
