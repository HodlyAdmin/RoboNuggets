#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executevideoIngestion } from './providers/n8nwebhook.js';
import { executeframeExtraction } from './providers/ffmpegcore.js';
import { executeposeEstimation } from './providers/mediapipeapi.js';
import { executeanimationExport } from './providers/nodejstransformer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R47 | R47 | The AI Motion Capture System Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Ingest Source Video
  runData.videoIngestion = await executevideoIngestion(config.videoIngestionConfig, runData);

  // Stage: Extract Video Frames
  runData.frameExtraction = await executeframeExtraction(config.frameExtractionConfig, runData.videoIngestion);

  // Stage: AI Motion Extraction
  runData.poseEstimation = await executeposeEstimation(config.poseEstimationConfig, runData.frameExtraction);

  // Stage: Generate Animation File
  runData.animationExport = await executeanimationExport(config.animationExportConfig, runData.poseEstimation);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
