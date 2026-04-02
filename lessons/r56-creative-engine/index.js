#!/usr/bin/env node
/**
 * R56 | The Antigravity Creative Engine
 * 
 * A complete CDP-first creative media pipeline:
 *   Stage 1: Image Generation (Google Flow / Nano Banana 2 via CDP)
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
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { housekeepOutputDirectory } from './output-housekeeping.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const BASELINE_PATH = join(__dirname, 'config.source-baseline.json');
const EXAMPLE_PATH = join(__dirname, 'config.example.json');
const getArgValue = (flag) => {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
};
const CONFIG_OVERRIDE = getArgValue('--config');
const CONFIG_PATH = CONFIG_OVERRIDE
  ? resolve(CONFIG_OVERRIDE)
  : existsSync(BASELINE_PATH) ? BASELINE_PATH : EXAMPLE_PATH;
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  log.step('═══════════════════════════════════════════');
  log.step('  R56 | Creative Engine Pipeline');
  log.step(`  Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🚀 LIVE'}`);
  log.step('═══════════════════════════════════════════');

  if (!existsSync(CONFIG_PATH)) {
    log.error(`Missing config file: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);

  if (config.cleanupOutput !== false) {
    try {
      const housekeeping = await housekeepOutputDirectory({
        outputRoot: OUTPUT_DIR,
        retention: config.outputRetention || {},
      });
      const cleanedItems = housekeeping.archivedRuns.length
        + housekeeping.removedEmptyDirs.length
        + housekeeping.removedNoiseFiles.length
        + housekeeping.prunedArchiveEntries.length;

      if (cleanedItems > 0) {
        log.info(
          `Output housekeeping archived ${housekeeping.archivedRuns.length} stale run(s), removed ${housekeeping.removedEmptyDirs.length} empty folder(s), and scrubbed ${housekeeping.removedNoiseFiles.length} noise file(s).`
        );
        log.info(`Hidden archive: ${housekeeping.archiveRoot}`);
      } else {
        log.info(`Output housekeeping checked ${housekeeping.keptRuns.length} visible run(s); no cleanup needed.`);
      }
    } catch (error) {
      log.warn(`Output housekeeping skipped: ${error.message}`);
    }
  } else {
    log.info('Output housekeeping disabled by config.cleanupOutput=false');
  }

  const runData = { 
    outputDir: runDir, 
    projectName: config.projectName,
    configPath: CONFIG_PATH,
    command: [process.execPath, ...process.argv.slice(1)].join(' '),
    dryRun: DRY_RUN,
    startedAt: new Date().toISOString()
  };

  if (DRY_RUN) {
    log.info('');
    log.info('📋 DRY RUN PLAN:');
    log.info(`   Config:  ${CONFIG_PATH}`);
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

  mkdirSync(runDir, { recursive: true });

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
