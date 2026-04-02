#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeideaGeneration } from './providers/chatgpt.js';
import { executeassetGeneration } from './providers/piapi.js';
import { executevideoAssembly } from './providers/json2video.js';
import { executesocialPublishing } from './providers/ayrshare.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R17 | R17 | The ZeroTouch Faceless Videos AI Agent v2.0 Pipeline');

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

  // Stage: Asset Generation
  runData.assetGeneration = await executeassetGeneration(config.assetGenerationConfig, runData.ideaGeneration);

  // Stage: Video Assembly
  runData.videoAssembly = await executevideoAssembly(config.videoAssemblyConfig, runData.assetGeneration);

  // Stage: Social Publishing
  runData.socialPublishing = await executesocialPublishing(config.socialPublishingConfig, runData.videoAssembly);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
