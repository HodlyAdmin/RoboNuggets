#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeaiAgentRouting } from './providers/openrouter.js';
import { executeleadScraping } from './providers/apifymcp.js';
import { executedataFormatting } from './providers/n8nnode.js';
import { executecloudStorage } from './providers/googledrive.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R27 | R27 | Make Money with MCP - AI\'s Next Frontier Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: AI Model Routing
  runData.aiAgentRouting = await executeaiAgentRouting(config.aiAgentRoutingConfig, runData);

  // Stage: Google Maps Lead Scraping
  runData.leadScraping = await executeleadScraping(config.leadScrapingConfig, runData.aiAgentRouting);

  // Stage: Format Leads to CSV
  runData.dataFormatting = await executedataFormatting(config.dataFormattingConfig, runData.leadScraping);

  // Stage: Upload to Cloud Storage
  runData.cloudStorage = await executecloudStorage(config.cloudStorageConfig, runData.dataFormatting);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
