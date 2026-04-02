#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeLeadSource } from './providers/lead-source.js';
import { executeQualifyScreenshot } from './providers/qualify-screenshot.js';
import { executeRedesignGenerator } from './providers/redesign-generator.js';
import { executeVercelDeploy } from './sinks/vercel-deploy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R59 | Beautiful Websites Agent Kit Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage 1: Lead Source Extraction
  runData.leadSource = await executeLeadSource(config.leadConfig, runData);

  // Stage 2: Qualify Screenshot
  runData.qualifyScreenshot = await executeQualifyScreenshot(config.qualifyConfig, runData.leadSource);

  // Stage 3: Redesign Generator
  runData.redesignGenerator = await executeRedesignGenerator(config.redesignConfig, runData.qualifyScreenshot);

  // Stage 4: Vercel Deploy Output
  runData.vercelDeploy = await executeVercelDeploy(config.deployConfig, runData.redesignGenerator);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 R59 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('R59 Pipeline Failed: ' + err.message);
  process.exit(1);
});
