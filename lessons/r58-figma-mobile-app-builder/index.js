#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeFigmaToCode, executeCodeToFigma } from './providers/figma-mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R58 | Figma Mobile App Builder Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage 1: Figma to Code Extraction
  runData.figmaToCode = await executeFigmaToCode(config.figmaConfig, runData);

  // Stage 2: Code to Figma Sync
  runData.codeToFigma = await executeCodeToFigma(config.figmaConfig, runData.figmaToCode);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 R58 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('R58 Pipeline Failed: ' + err.message);
  process.exit(1);
});
