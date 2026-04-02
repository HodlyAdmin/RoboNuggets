#!/usr/bin/env node
/**
 * R56 | The Antigravity Creative Engine
 * 
 * A complete CDP-first creative media pipeline:
 *   Stage 1: Image Generation (Gemini via Chrome CDP)
 *   Stage 2: Video Generation (Google Flow / Veo 3.1 via Chrome CDP)
 *   Stage 3: Audio Generation (Lyria 3 Pro via Chrome CDP)
 *   Stage 4: Optional Airtable Review Sink
 * 
 * Zero API keys required — all generation via Google AI Ultra subscription.
 * Digital Citizenship: Auto-cleans all generated chats/projects from shared workspace.
 * 
 * Usage:
 *   npm run r56          # Full pipeline
 *   npm run r56:dry      # Dry run — logs plan without executing
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  log.step('═══════════════════════════════════════════');
  log.step('  R56 | Creative Engine Pipeline');
  log.step(`  Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🚀 LIVE'}`);
  log.step('═══════════════════════════════════════════');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json — create one from the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { 
    outputDir: runDir, 
    projectName: config.projectName,
    dryRun: DRY_RUN,
    startedAt: new Date().toISOString()
  };

  if (DRY_RUN) {
    log.info('');
    log.info('📋 DRY RUN PLAN:');
    log.info(`   Project: ${config.projectName}`);
    log.info(`   Output:  ${runDir}`);
    log.info('');
    log.info('   Stage 1 — Image:  ' + (config.imageConfig?.enabled ? `✅ ${config.imageConfig.provider}` : '⏭️  Disabled'));
    log.info('   Stage 2 — Video:  ' + (config.videoConfig?.enabled ? `✅ ${config.videoConfig.provider} (${config.videoConfig.model})` : '⏭️  Disabled'));
    log.info('   Stage 3 — Audio:  ' + (config.audioConfig?.enabled ? `✅ ${config.audioConfig.provider}` : '⏭️  Disabled'));
    log.info('   Stage 4 — Review: ' + (config.airtableConfig?.enabled ? '✅ Airtable' : '⏭️  Disabled'));
    log.info('');
    log.success('📋 Dry run complete. No resources consumed.');
    process.exit(0);
  }

  // ──── Stage 1: Image Generation ────
  try {
    const { executeImageGeneration } = await import('./providers/image-generator.js');
    runData.imageGeneration = await executeImageGeneration(config.imageConfig, runData);
  } catch (err) {
    log.error(`Stage 1 (Image) failed: ${err.message}`);
    runData.imageGeneration = { status: 'failed', error: err.message };
  }

  // ──── Stage 2: Video Generation ────
  try {
    const { executeVideoGeneration } = await import('./providers/video-generator.js');
    runData.videoGeneration = await executeVideoGeneration(config.videoConfig, runData);
  } catch (err) {
    log.error(`Stage 2 (Video) failed: ${err.message}`);
    runData.videoGeneration = { status: 'failed', error: err.message };
  }

  // ──── Stage 3: Audio Generation ────
  try {
    const { executeAudioGeneration } = await import('./providers/audio-generator.js');
    runData.audioGeneration = await executeAudioGeneration(config.audioConfig, runData);
  } catch (err) {
    log.error(`Stage 3 (Audio) failed: ${err.message}`);
    runData.audioGeneration = { status: 'failed', error: err.message };
  }

  // ──── Stage 4: Airtable Review Sink ────
  if (config.airtableConfig?.enabled) {
    try {
      const { executeAirtableSink } = await import('./sinks/airtable-review.js');
      runData.airtableReview = await executeAirtableSink(config.airtableConfig, {
        images: runData.imageGeneration,
        videos: runData.videoGeneration,
        audio: runData.audioGeneration
      });
    } catch (err) {
      log.error(`Stage 4 (Airtable) failed: ${err.message}`);
      runData.airtableReview = { status: 'failed', error: err.message };
    }
  } else {
    runData.airtableReview = { status: 'skipped' };
  }

  // ──── Output Manifest ────
  runData.completedAt = new Date().toISOString();
  await saveManifest(runData);

  // ──── Summary ────
  const stages = [
    ['Image', runData.imageGeneration],
    ['Video', runData.videoGeneration],
    ['Audio', runData.audioGeneration],
    ['Review', runData.airtableReview],
  ];

  log.step('');
  log.step('═══════════════════════════════════════════');
  log.step('  R56 PIPELINE RESULTS');
  log.step('═══════════════════════════════════════════');
  for (const [name, result] of stages) {
    const icon = result?.status === 'completed' ? '✅' : result?.status === 'skipped' ? '⏭️' : '❌';
    log.info(`   ${icon} ${name}: ${result?.status || 'unknown'}`);
  }
  log.step('');
  log.success(`🎉 R56 Pipeline complete. Outputs: ${runDir}`);
}

main().catch(err => {
  log.error('R56 Pipeline Fatal Error: ' + err.message);
  console.error(err);
  process.exit(1);
});
