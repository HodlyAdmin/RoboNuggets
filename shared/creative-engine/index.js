import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { log } from '../logger.js';
import { loadConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = resolve(__dirname, '../../lessons/r56-creative-engine/output');

/**
 * Create a Creative Engine instance.
 *
 * @param {Object} [options]
 * @param {number} [options.chromePort=9333] - Chrome CDP port
 * @param {string} [options.outputDir] - Base output directory for all runs
 * @returns {Object} Engine with generate(), review(), resume() methods
 *
 * @example
 *   import { createEngine } from '@antigravity/creative-engine';
 *   const engine = createEngine({ outputDir: './output' });
 *   const result = await engine.generate({ projectName: 'my-campaign', imageConfig: { enabled: true, prompt: '...' } });
 */
export function createEngine(options = {}) {
  const {
    chromePort = 9333,
    outputDir = DEFAULT_OUTPUT_DIR,
  } = options;

  return {
    /**
     * Run the creative generation pipeline.
     * Accepts a config object or path to a JSON config file.
     * 
     * @param {Object|string} configInput 
     * @param {Object} [options]
     * @param {string} [options.resumeDir] - Use existing run directory
     * @param {Object} [options.skipStages] - Map of { image: boolean, video: boolean, audio: boolean }
     * @param {Object} [options.previousManifest] - Previous manifest to copy from when skipping
     */
    async generate(configInput, options = {}) {
      const { valid, errors, config } = loadConfig(configInput);
      if (!valid) {
        throw new Error(`Invalid config: ${errors.join(', ')}`);
      }

      const { resumeDir, skipStages = {}, previousManifest = null } = options;
      const resolvedOutputDir = config.outputDir ? resolve(config.outputDir) : outputDir;
      const runDir = resumeDir || join(resolvedOutputDir, `${config.projectName}_${Date.now()}`);

      log.step('═══════════════════════════════════════════');
      log.step(`  Creative Engine | ${config.projectName}${resumeDir ? ' (RESUME)' : ''}`);
      log.step('═══════════════════════════════════════════');
      log.info(`Output directory: ${runDir}`);

      if (!resumeDir) {
        mkdirSync(runDir, { recursive: true });
      }

      const runData = {
        outputDir: runDir,
        projectName: config.projectName,
        startedAt: previousManifest?.createdAt || new Date().toISOString(),
        status: 'in-progress',
      };

      // Stage 1: Image Generation
      if (skipStages.image && previousManifest) {
        log.info('⏭️  Skipping Stage 1 (Image): Already completed/skipped.');
        runData.imageGeneration = previousManifest.stages?.imageGeneration;
      } else {
        try {
          const { executeImageGeneration } = await import('./providers/image-generator.js');
          runData.imageGeneration = await executeImageGeneration(config.imageConfig, runData);
        } catch (err) {
          log.error(`Stage 1 (Image) failed: ${err.message}`);
          runData.imageGeneration = { status: 'failed', error: err.message };
        }
      }

      // Stage 2: Video Generation
      if (skipStages.video && previousManifest) {
        log.info('⏭️  Skipping Stage 2 (Video): Already completed/skipped.');
        runData.videoGeneration = previousManifest.stages?.videoGeneration;
      } else {
        try {
          const { executeVideoGeneration } = await import('./providers/video-generator.js');
          runData.videoGeneration = await executeVideoGeneration(config.videoConfig, runData);
        } catch (err) {
          log.error(`Stage 2 (Video) failed: ${err.message}`);
          runData.videoGeneration = { status: 'failed', error: err.message };
        }
      }

      // Stage 3: Audio Generation
      if (skipStages.audio && previousManifest) {
        log.info('⏭️  Skipping Stage 3 (Audio): Already completed/skipped.');
        runData.audioGeneration = previousManifest.stages?.audioGeneration;
      } else {
        try {
          const { executeAudioGeneration } = await import('./providers/audio-generator.js');
          runData.audioGeneration = await executeAudioGeneration(config.audioConfig, runData);
        } catch (err) {
          log.error(`Stage 3 (Audio) failed: ${err.message}`);
          runData.audioGeneration = { status: 'failed', error: err.message };
        }
      }

      // Finalize
      runData.completedAt = new Date().toISOString();
      runData.status = (runData.imageGeneration?.status === 'failed'
        || runData.videoGeneration?.status === 'failed'
        || runData.audioGeneration?.status === 'failed')
        ? 'partial'
        : 'completed';

      // Save manifest (in-place for resume)
      const { saveManifest } = await import('./manifest.js');
      await saveManifest(runData);

      // Summary
      const stages = [
        ['Image', runData.imageGeneration],
        ['Video', runData.videoGeneration],
        ['Audio', runData.audioGeneration],
      ];

      log.step('');
      log.step('═══════════════════════════════════════════');
      log.step('  CREATIVE ENGINE RESULTS');
      log.step('═══════════════════════════════════════════');
      for (const [name, result] of stages) {
        const icon = result?.status === 'completed' ? '✅'
          : result?.status === 'skipped' ? '⏭️'
          : result?.status === 'needs-review' ? '⚠️'
          : '❌';
        log.info(`   ${icon} ${name}: ${result?.status || 'unknown'}`);
      }
      log.step('');
      log.success(`🎉 Creative Engine complete. Outputs: ${runDir}`);

      return runData;
    },

    /**
     * Run a multi-concept batch campaign.
     * @param {Object} campaignConfig
     */
    async batch(campaignConfig) {
      const { runBatch } = await import('./batch.js');
      return runBatch(this, campaignConfig);
    },

    /**
     * Launch the local review gallery server.
     * @param {Object} [opts]
     * @param {number} [opts.port=3456] - Server port
     */
    async review(opts = {}) {
      const { startReviewServer } = await import('./review/server.js');
      return startReviewServer({ 
        outputDir: resolve(outputDir),
        port: opts.port || 3456 
      });
    },

    /**
     * Resume a previously failed or incomplete run.
     * @param {string} runOutputDir - Path to the run's output directory
     */
    async resume(runOutputDir) {
      const { resumeRun } = await import('./resume.js');
      return resumeRun(this, runOutputDir);
    },

  };
}
