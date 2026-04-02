import { log } from '../../logger.js';
import { startFlowJob } from '../../flow-wrapper/index.js';
import { existsSync } from 'fs';
import { resolve, join, basename } from 'path';

/**
 * Resolve which generated image to use as the video start frame.
 *
 * Priority:
 *   1. Explicit preferredImage index (1-based) from config
 *   2. Hero-selected candidate from image stage
 *   3. First candidate from image stage
 *   4. null (no generated image available)
 */
function resolvePreferredGeneratedImage(config, runData) {
  const imgResult = runData.imageGeneration;
  if (!imgResult || imgResult.status !== 'completed') return null;

  const candidates = imgResult.flowCandidates || [];
  if (candidates.length === 0) return null;

  // Explicit preferredImage from config (1-based index)
  if (config.preferredImage && Number.isInteger(config.preferredImage)) {
    const idx = config.preferredImage - 1; // Convert to 0-based
    if (idx >= 0 && idx < candidates.length) {
      const preferred = candidates[idx];
      if (preferred?.path && existsSync(preferred.path)) {
        log.info(`🎯 Using preferred generated image (candidate ${config.preferredImage}/${candidates.length}): ${basename(preferred.path)}`);
        return {
          path: preferred.path,
          source: `preferred-image-${config.preferredImage}`,
          candidateIndex: idx,
        };
      }
      log.warn(`⚠️  preferredImage=${config.preferredImage} specified but candidate file missing. Falling back to hero-selected.`);
    } else {
      log.warn(`⚠️  preferredImage=${config.preferredImage} is out of range (${candidates.length} candidates). Falling back to hero-selected.`);
    }
  }

  // Hero-selected candidate
  const heroIdx = imgResult.heroSelection?.winnerIndex;
  if (typeof heroIdx === 'number' && candidates[heroIdx]?.path && existsSync(candidates[heroIdx].path)) {
    log.info(`🏆 Using hero-selected generated image (candidate ${heroIdx}): ${basename(candidates[heroIdx].path)}`);
    return {
      path: candidates[heroIdx].path,
      source: `hero-selected-${heroIdx}`,
      candidateIndex: heroIdx,
    };
  }

  // Fallback: first candidate
  const first = candidates[0];
  if (first?.path && existsSync(first.path)) {
    log.info(`📷 Using first generated image as fallback: ${basename(first.path)}`);
    return {
      path: first.path,
      source: 'first-candidate-fallback',
      candidateIndex: 0,
    };
  }

  return null;
}

export async function executeVideoGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Video Generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🎬 [Video Generator via Flow/Veo] Requesting ${config.duration || 5}s video...`);

  // Resolve reference images — prefer generated image from Stage 1
  let referenceImages = config.referenceImages ? [...config.referenceImages] : [];
  let preferredGeneratedImage = null;

  if (config.useGeneratedImage !== false) {
    preferredGeneratedImage = resolvePreferredGeneratedImage(config, runData);
    if (preferredGeneratedImage) {
      referenceImages = [preferredGeneratedImage.path];
    }
  }

  const videoPrompt = config.prompt || 'Slow cinematic pan across this scene, camera moving right to left with gentle parallax, atmospheric lighting, filmic grain';

  try {
    const job = await startFlowJob({
      prompt: videoPrompt,
      mediaType: 'video',
      model: config.model || 'Veo 3.1 - Fast [Lower Priority]',
      aspectRatio: config.aspectRatio || '9:16',
      variantCount: config.variantCount || null,
      subMode: config.subMode || 'Frames',
      requireZeroCredits: config.requireZeroCredits ?? true,
      projectName: `CE_${runData.projectName}_${Date.now()}`,
      timeout: config.timeout || 900000,
      outputDir: runData.outputDir,
      referenceImages,
      selectionPolicy: config.selectionPolicy || 'first',
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
    });

    const winner = job.candidates.find(c => c.selected);
    const videoPath = winner?.path || job.artifacts[0] || null;

    const output = {
      status: job.status,
      videoUrl: videoPath,
      model: config.model || 'Veo 3.1 - Fast [Lower Priority]',
      aspectRatio: config.aspectRatio || '9:16',
      subMode: config.subMode || 'Frames',
      variantCount: config.variantCount || null,
      requireZeroCredits: config.requireZeroCredits ?? true,
      timeoutMs: config.timeout || 900000,
      referenceImages,
      preferredImage: config.preferredImage || null,
      preferredGeneratedImageSource: preferredGeneratedImage?.source || null,
      preferredGeneratedImageCandidateIndex: preferredGeneratedImage?.candidateIndex ?? null,
      prompt: videoPrompt,
      flowJobId: job.jobId,
      flowStatePath: job.statePath,
      flowCandidates: job.candidates,
      heroSelection: job.heroSelection,
      timestamp: new Date().toISOString(),
    };

    if (job.heroSelection?.needsManualReview) {
      log.warn('⚠️  [Video Generator] Hero selection routed to manual review — confidence below threshold.');
    }

    log.success('✅ [Video Generator] complete');
    return output;
  } catch (err) {
    log.error(`❌ [Video Generator] failed: ${err.message}`);
    return { status: 'failed', error: err.message };
  }
}
