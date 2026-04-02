import { log } from '../../../shared/logger.js';
import { generateFlowMedia } from '../../../shared/chrome-flow.js';

export async function executeVideoGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Video Generation disabled in config.');
    return { status: 'skipped' };
  }

  // Video depends on image generation having completed — use the generated image as reference
  const hasImage = runData.imageGeneration?.status === 'completed';
  
  log.info(`🎬 [Video Generator via Flow/Veo] Requesting 5s video...`);

  // Build the prompt from config or fall back to a sensible default
  const basePrompt = config.prompt || 'Cinematic slow-motion camera push through a neon-lit cyberpunk alley at night';
  const imageContext = hasImage 
    ? ` Extend this scene matching the generated image context.` 
    : '';
  
  const videoPrompt = `${basePrompt}${imageContext}`;
    
  try {
    const result = await generateFlowMedia(videoPrompt, { 
      mediaType: config.mediaType || 'video', 
      model: config.model || 'Veo 3.1 Fast',
      aspectRatio: config.aspectRatio || '9:16',
      projectName: `R56_${runData.projectName}_${Date.now()}`
    });
  
    const output = {
      status: 'completed',
      videoUrl: result,
      prompt: videoPrompt,
      timestamp: new Date().toISOString()
    };

    log.success('✅ [Video Generator] complete');
    return output;
  } catch (err) {
    log.error(`❌ [Video Generator] failed: ${err.message}`);
    return { status: 'failed', error: err.message };
  }
}
