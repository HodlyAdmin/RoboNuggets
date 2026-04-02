#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executesourceScraper } from './providers/apifyscraper.js';
import { executeconceptAnalyzer } from './providers/geminivisionapi.js';
import { executescriptAdapter } from './providers/geminitextapi.js';
import { executevideoRenderer } from './providers/veoapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R51 | R51 | The Creative Cloner AI Agent System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Scrape Winning Creatives
  runData.sourceScraper = await executesourceScraper(config.sourceScraperConfig, runData);

  // Stage: Deconstruct Creative Elements
  runData.conceptAnalyzer = await executeconceptAnalyzer(config.conceptAnalyzerConfig, runData.sourceScraper);

  // Stage: Generate Cloned Script
  runData.scriptAdapter = await executescriptAdapter(config.scriptAdapterConfig, runData.conceptAnalyzer);

  // Stage: Render Final Video Asset
  runData.videoRenderer = await executevideoRenderer(config.videoRendererConfig, runData.scriptAdapter);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
