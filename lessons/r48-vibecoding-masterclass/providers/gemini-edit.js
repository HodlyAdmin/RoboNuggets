import { log } from '../../../shared/logger.js';
import { generateText } from '../../../shared/chrome-ai.js';

/**
 * Stage 1: Gemini Edit
 * Replaces the original n8n webhook call to Gemini
 */
export async function executeGeminiEdit(config, inputData) {
  if (!config?.enabled) {
    log.info('⏭️  Gemini Edit generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🧠 [Gemini Edit] Requesting prompt from Gemini Web UI in Chrome...`);
  
  const prompt = config.prompt || "Write a highly detailed, moody cinematic prompt for a 5-second video clip of a cyberpunk city. Do not include introductory text, just the raw visual prompt.";
  
  const resultText = await generateText(prompt, { timeout: 90000 });
  
  const output = {
    status: 'completed',
    result: resultText,
    timestamp: new Date().toISOString()
  };

  log.success('✅ [Gemini Edit] complete');
  return output;
}
