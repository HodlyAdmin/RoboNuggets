#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executescrapeVideos } from './providers/apify.js';
import { executefetchTranscripts } from './providers/apify.js';
import { executecleanTranscripts } from './providers/customscript.js';
import { executestoreEmbeddings } from './providers/pinecone.js';
import { executeragGeneration } from './providers/openai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R26 | R26 | The RAG AI Agent Auto-Builder (n8n no-code) Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Scrape YouTube Channel Videos
  runData.scrapeVideos = await executescrapeVideos(config.scrapeVideosConfig, runData);

  // Stage: Fetch Video Transcripts
  runData.fetchTranscripts = await executefetchTranscripts(config.fetchTranscriptsConfig, runData.scrapeVideos);

  // Stage: Clean and Format Transcripts
  runData.cleanTranscripts = await executecleanTranscripts(config.cleanTranscriptsConfig, runData.fetchTranscripts);

  // Stage: Store Vectors in Database
  runData.storeEmbeddings = await executestoreEmbeddings(config.storeEmbeddingsConfig, runData.cleanTranscripts);

  // Stage: RAG Agent Generation
  runData.ragGeneration = await executeragGeneration(config.ragGenerationConfig, runData.storeEmbeddings);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
