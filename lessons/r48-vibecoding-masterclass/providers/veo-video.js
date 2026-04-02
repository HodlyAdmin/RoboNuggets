import { log } from '../../../shared/logger.js';
import { generateFlowMedia } from '../../../shared/chrome-flow.js';

/**
 * Stage 3: Veo 3.1 Video Generation via Gemini UI
 * Replaces the original n8n Veo 3.1 final generation webhook
 */
export async function executeVeoVideo(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Veo Video generation disabled in config.');
    return { status: 'skipped' };
  }

  if (runData.nanoBananaImage?.status !== 'completed') {
    log.warn('⚠️  Veo Video generation skipped (requires Nano Banana image completion).');
    return { status: 'skipped_due_to_dependency' };
  }

  log.info(`🎥 [Veo Video via Gemini] Requesting Veo video generation...`);
  
  const videoPrompt = `Animate this subject in a high-fidelity cinematic style: ${runData.storyboard.heroImageDescription}`;
  
  const result = await generateFlowMedia(videoPrompt, { 
    mediaType: 'video', 
    model: 'Veo 3.1 Fast',
    aspectRatio: '16:9',
    projectName: `R48_${Date.now()}`
  });
  
  const finalVideoUrl = typeof result === 'string' ? result : (result.videoUrl || result.url);

  const output = {
    status: 'completed',
    videoUrl: finalVideoUrl,
    timestamp: new Date().toISOString()
  };

  log.success('✅ [Veo Video] complete');
  return output;
}
