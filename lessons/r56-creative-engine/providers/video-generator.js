import { log } from '../../../shared/logger.js';
import { startFlowJob } from '../../../shared/flow-wrapper/index.js';

function getGeneratedImageCandidates(runData) {
  return Array.isArray(runData.imageGeneration?.flowCandidates)
    ? runData.imageGeneration.flowCandidates.filter(candidate => candidate?.path)
    : [];
}

function resolvePreferredGeneratedImage(runData, config) {
  const candidates = getGeneratedImageCandidates(runData);
  if (candidates.length === 0) {
    return { imagePath: runData.imageGeneration?.imagePath || null, source: 'generated-default' };
  }

  const preferredImage = config.preferredImage;
  if (preferredImage !== undefined && preferredImage !== null) {
    const preferredOneBased = Number.parseInt(String(preferredImage), 10);
    if (Number.isInteger(preferredOneBased) && preferredOneBased > 0) {
      const chosen = candidates[preferredOneBased - 1];
      if (chosen?.path) {
        return {
          imagePath: chosen.path,
          source: `preferred-image-${preferredOneBased}`,
          candidateIndex: chosen.index,
        };
      }
      log.warn(`⚠️  [Video Generator] preferredImage=${preferredImage} did not match an available generated image. Falling back to selected hero/default.`);
    } else {
      log.warn(`⚠️  [Video Generator] preferredImage must be a positive integer (1-based). Received: ${preferredImage}. Falling back to selected hero/default.`);
    }
  }

  const selected = candidates.find(candidate => candidate.selected);
  if (selected?.path) {
    return {
      imagePath: selected.path,
      source: 'hero-selection',
      candidateIndex: selected.index,
    };
  }

  return {
    imagePath: runData.imageGeneration?.imagePath || candidates[0]?.path || null,
    source: 'generated-default',
    candidateIndex: candidates[0]?.index ?? null,
  };
}

export async function executeVideoGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Video Generation disabled in config.');
    return { status: 'skipped' };
  }

  const hasImage = runData.imageGeneration?.status === 'completed';
  const preferredGeneratedImage = hasImage ? resolvePreferredGeneratedImage(runData, config) : { imagePath: null, source: null, candidateIndex: null };
  const generatedImagePath = preferredGeneratedImage.imagePath;
  const shouldUseGeneratedImage = config.useGeneratedImageAsReference !== false && Boolean(generatedImagePath);
  const referenceImages = [
    ...(config.referenceImages || []),
    ...(shouldUseGeneratedImage ? [generatedImagePath] : []),
  ];
  
  log.info(`🎬 [Video Generator via Flow/Veo] Requesting 5s video...`);

  const basePrompt = config.prompt || 'Cinematic slow-motion camera push through a neon-lit cyberpunk alley at night';
  const imageContext = shouldUseGeneratedImage
    ? ' Use the uploaded image as the start frame and preserve the same subject, product, setting, and framing.'
    : referenceImages.length > 0
      ? ' Use the uploaded reference image(s) as the visual grounding for this shot.'
      : hasImage
        ? ' Extend this scene matching the generated image context.'
        : '';
  
  const videoPrompt = `${basePrompt}${imageContext}`;
    
  try {
    const requireZeroCredits = Boolean(config.requireZeroCredits);
    const timeoutMs = config.timeout || (requireZeroCredits ? 600000 : 300000);
    const selectedModel = config.model || (requireZeroCredits ? 'Veo 3.1 - Fast [Lower Priority]' : 'Veo 3.1 - Fast');
    const selectedAspectRatio = config.aspectRatio || null;
    const selectedSubMode = config.subMode || null;
    const selectedVariantCount = config.variantCount || null;
    const job = await startFlowJob({
      prompt: videoPrompt,
      mediaType: config.mediaType || 'video', 
      model: selectedModel,
      aspectRatio: selectedAspectRatio,
      projectName: `R56_${runData.projectName}_${Date.now()}`,
      outputDir: runData.outputDir,
      timeout: timeoutMs,
      referenceImages,
      subMode: selectedSubMode,
      variantCount: selectedVariantCount,
      requireZeroCredits,
      selectionPolicy: config.selectionPolicy || 'first',
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
    });
    const winner = job.candidates.find(c => c.selected);
    const result = winner?.path || job.artifacts[0] || null;
  
    const output = {
      status: job.status,
      videoUrl: result,
      model: selectedModel,
      aspectRatio: selectedAspectRatio,
      subMode: selectedSubMode,
      variantCount: selectedVariantCount,
      requireZeroCredits,
      timeoutMs,
      referenceImages,
      preferredImage: config.preferredImage ?? null,
      preferredGeneratedImageSource: preferredGeneratedImage.source,
      preferredGeneratedImageCandidateIndex: preferredGeneratedImage.candidateIndex ?? null,
      prompt: videoPrompt,
      flowJobId: job.jobId,
      flowStatePath: job.statePath,
      flowCandidates: job.candidates,
      heroSelection: job.heroSelection,
      timestamp: new Date().toISOString()
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
