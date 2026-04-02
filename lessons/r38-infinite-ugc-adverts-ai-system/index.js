#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeinputSection } from './providers/n8n.js';
import { executeugcRoboAgent } from './providers/gptimage1.js';
import { executevideoGeneration } from './providers/veo3.js';
import { executeoutputSection } from './providers/n8n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R38 | R38 | Infinite UGC Adverts AI System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Input Data Collection
  runData.inputSection = await executeinputSection(config.inputSectionConfig, runData);

  // Stage: UGC-Robo AI Agent Orchestration
  runData.ugcRoboAgent = await executeugcRoboAgent(config.ugcRoboAgentConfig, runData.inputSection);

  // Stage: Cinematic Video Generation
  runData.videoGeneration = await executevideoGeneration(config.videoGenerationConfig, runData.ugcRoboAgent);

  // Stage: Output and Delivery
  runData.outputSection = await executeoutputSection(config.outputSectionConfig, runData.videoGeneration);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
