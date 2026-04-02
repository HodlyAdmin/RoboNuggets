#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executefetchInputData } from './providers/googlesheets.js';
import { executegeneratePrompt } from './providers/openai.js';
import { executeanimateLogo } from './providers/kieai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R37 | R37 | LogoRobo - Logo Animator AI Agent Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Fetch Input Data
  runData.fetchInputData = await executefetchInputData(config.fetchInputDataConfig, runData);

  // Stage: Generate Animation Prompt
  runData.generatePrompt = await executegeneratePrompt(config.generatePromptConfig, runData.fetchInputData);

  // Stage: Animate Logo
  runData.animateLogo = await executeanimateLogo(config.animateLogoConfig, runData.generatePrompt);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
