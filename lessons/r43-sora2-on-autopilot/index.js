#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executebrandAgnosticConcept } from './providers/geminiapi.js';
import { executestoryboardSystemization } from './providers/n8nnode.js';
import { executeautopilotVideoGen } from './providers/sora2api.js';
import { executefinalProductAssembly } from './providers/antigravityapp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R43 | R43 - Sora2 on Autopilot Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Brand Agnostic Concept Generation
  runData.brandAgnosticConcept = await executebrandAgnosticConcept(config.brandAgnosticConceptConfig, runData);

  // Stage: Storyboard Systemization
  runData.storyboardSystemization = await executestoryboardSystemization(config.storyboardSystemizationConfig, runData.brandAgnosticConcept);

  // Stage: Autopilot Video Generation
  runData.autopilotVideoGen = await executeautopilotVideoGen(config.autopilotVideoGenConfig, runData.storyboardSystemization);

  // Stage: Final Product Assembly
  runData.finalProductAssembly = await executefinalProductAssembly(config.finalProductAssemblyConfig, runData.autopilotVideoGen);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
