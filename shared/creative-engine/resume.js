import { resolve } from 'path';
import { log } from '../logger.js';
import { loadManifest } from './manifest.js';

/**
 * Resume a previously failed or incomplete run.
 * 
 * @param {Object} engine - Creative Engine instance
 * @param {string} runOutputDir - Path to the run's output directory
 * @returns {Promise<Object>} Execution result
 */
export async function resumeRun(engine, runOutputDir) {
  const absolutePath = resolve(runOutputDir);
  const manifest = await loadManifest(absolutePath);

  if (!manifest) {
    throw new Error(`No manifest found in: ${absolutePath}`);
  }

  log.header(`RESUMING RUN: ${manifest.config?.projectName || 'unknown'}`);
  log.info(`Directory: ${absolutePath}`);

  // 1. Determine skip status based on previous manifest
  const skipStages = {
    image: manifest.stages?.imageGeneration?.status === 'completed' || manifest.stages?.imageGeneration?.status === 'skipped',
    video: manifest.stages?.videoGeneration?.status === 'completed' || manifest.stages?.videoGeneration?.status === 'skipped',
    audio: manifest.stages?.audioGeneration?.status === 'completed' || manifest.stages?.audioGeneration?.status === 'skipped'
  };

  log.info('Stage Analysis:');
  log.info(` - Image: ${skipStages.image ? '⏭️  Skipping (completed/skipped)' : '🔄 Re-running'}`);
  log.info(` - Video: ${skipStages.video ? '⏭️  Skipping (completed/skipped)' : '🔄 Re-running'}`);
  log.info(` - Audio: ${skipStages.audio ? '⏭️  Skipping (completed/skipped)' : '🔄 Re-running'}`);

  // 2. Reconstruct config from manifest data
  // We reconstruct just enough to run the missing stages
  const config = {
    projectName: manifest.config?.projectName,
    imageConfig: {
      enabled: manifest.stages?.imageGeneration?.status !== 'skipped',
      model: manifest.stages?.imageGeneration?.model,
      variantCount: manifest.stages?.imageGeneration?.variantCount,
      prompt: manifest.stages?.imageGeneration?.prompt,
      referenceImages: manifest.stages?.imageGeneration?.referenceImages || []
    },
    videoConfig: {
      enabled: manifest.stages?.videoGeneration?.status !== 'skipped',
      model: manifest.stages?.videoGeneration?.model,
      aspectRatio: manifest.stages?.videoGeneration?.aspectRatio,
      variantCount: manifest.stages?.videoGeneration?.variantCount,
      prompt: manifest.stages?.videoGeneration?.prompt,
      preferredImage: manifest.stages?.videoGeneration?.preferredImage
    },
    audioConfig: {
      enabled: manifest.stages?.audioGeneration?.status !== 'skipped'
    }
  };

  // 3. Trigger generation with resume context
  return engine.generate(config, {
    resumeDir: absolutePath,
    skipStages,
    previousManifest: manifest
  });
}
