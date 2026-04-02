import { log } from '../../../shared/logger.js';
import { generateMedia } from '../../../shared/chrome-ai.js';

/**
 * Stage 2: Nano Banana Image Generation
 * Replaces the original n8n Nano Banana webhook sequence
 */
export async function executeNanoBananaImage(config, geminiOutput) {
  if (!config?.enabled) {
    log.info('⏭️  Nano Banana image generation disabled in config.');
    return { status: 'skipped' };
  }

  if (geminiOutput?.status !== 'completed') {
    log.warn('⚠️  Nano Banana image generation skipped (requires Gemini Edit completion).');
    return { status: 'skipped_due_to_dependency' };
  }

  log.info(`🍌 [Nano Banana via Gemini] Requesting image generation...`);
  
  const prompt = `Generate a realistic 9:16 vertical image for this scene description: ${geminiOutput.result}. Do not add any text or explanation, just the image.`;
  
  const imageUrl = await generateMedia(prompt, { timeout: 120000, mediaType: 'image' });
  
  const output = {
    status: 'completed',
    imageUrl: imageUrl,
    timestamp: new Date().toISOString()
  };

  log.success('✅ [Nano Banana] complete');
  return output;
}
