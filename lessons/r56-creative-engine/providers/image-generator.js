import { log } from '../../../shared/logger.js';
import { startFlowJob } from '../../../shared/flow-wrapper/index.js';

export async function executeImageGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Image Generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🎨 [Image Generator via Flow/Nano Banana] Requesting image generation...`);

  const imagePrompt = config.prompt || 'A highly cinematic, photorealistic 9:16 vertical shot of a futuristic cyberpunk cafe at night, neon lights reflecting on wet pavement';

  try {
    const job = await startFlowJob({
      prompt: imagePrompt,
      mediaType: 'image',
      model: config.model || 'Nano Banana 2',
      aspectRatio: config.aspectRatio || '9:16',
      variantCount: config.variantCount || null,
      projectName: `R56_img_${runData.projectName}_${Date.now()}`,
      timeout: config.timeout || 120000,
      outputDir: runData.outputDir,
      referenceImages: config.referenceImages || [],
      selectionPolicy: config.selectionPolicy || 'first',
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
    });
    const winner = job.candidates.find(c => c.selected);
    const imagePath = winner?.path || job.artifacts[0] || null;

    const output = {
      status: job.status,
      imagePath,
      model: config.model || 'Nano Banana 2',
      variantCount: config.variantCount || null,
      referenceImages: config.referenceImages || [],
      prompt: imagePrompt,
      flowJobId: job.jobId,
      flowStatePath: job.statePath,
      flowCandidates: job.candidates,
      heroSelection: job.heroSelection,
      timestamp: new Date().toISOString()
    };

    if (job.heroSelection?.needsManualReview) {
      log.warn('⚠️  [Image Generator] Hero selection routed to manual review — confidence below threshold.');
    }

    log.success('✅ [Image Generator] complete');
    return output;
  } catch (err) {
    log.error(`❌ [Image Generator] failed: ${err.message}`);
    return { status: 'failed', error: err.message };
  }
}
