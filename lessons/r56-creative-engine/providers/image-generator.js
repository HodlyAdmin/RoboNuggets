import { log } from '../../../shared/logger.js';
import { generateFlowMedia } from '../../../shared/chrome-flow.js';

export async function executeImageGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Image Generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🎨 [Image Generator via Flow/Imagen] Requesting image generation...`);

  const imagePrompt = config.prompt || 'A highly cinematic, photorealistic 9:16 vertical shot of a futuristic cyberpunk cafe at night, neon lights reflecting on wet pavement';

  try {
    const imagePath = await generateFlowMedia(imagePrompt, {
      mediaType: 'image',
      model: config.model || 'Imagen 4',
      aspectRatio: config.aspectRatio || '9:16',
      projectName: `R56_img_${runData.projectName}_${Date.now()}`,
      timeout: config.timeout || 120000,
    });

    const output = {
      status: 'completed',
      imagePath,
      prompt: imagePrompt,
      timestamp: new Date().toISOString()
    };

    log.success('✅ [Image Generator] complete');
    return output;
  } catch (err) {
    log.error(`❌ [Image Generator] failed: ${err.message}`);
    return { status: 'failed', error: err.message };
  }
}
