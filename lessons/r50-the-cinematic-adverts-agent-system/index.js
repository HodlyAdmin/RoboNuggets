#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executecoreConcept } from './providers/geminiapi.js';
import { executestoryboardCreation } from './providers/geminiapi.js';
import { executevideoGeneration } from './providers/veoapi.js';
import { executevideoAssembly } from './providers/ffmpeg.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R50 | R50 | The Cinematic Adverts Agent System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Generate Core Elements
  runData.coreConcept = await executecoreConcept(config.coreConceptConfig, runData);

  // Stage: Storyboard Development
  runData.storyboardCreation = await executestoryboardCreation(config.storyboardCreationConfig, runData.coreConcept);

  // Stage: Cinematic Video Generation
  runData.videoGeneration = await executevideoGeneration(config.videoGenerationConfig, runData.storyboardCreation);

  // Stage: Final Video Assembly
  runData.videoAssembly = await executevideoAssembly(config.videoAssemblyConfig, runData.videoGeneration);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
