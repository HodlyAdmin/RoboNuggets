import { log } from '../../../shared/logger.js';
import { generateLyriaTrack } from '../../../shared/chrome-lyria.js';

export async function executeAudioGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Audio Generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🎧 [Audio Generator via Lyria 3 Pro] Requesting AI music synthesis...`);
  
  const audioPrompt = config.prompt || `Cinematic Hans Zimmer style orchestral building tension into an epic drop`;
    
  try {
    // CDP Network Intercept captures the raw 48kHz payload from the browser
    const downloadedAssetPath = await generateLyriaTrack(audioPrompt);
    
    const output = {
      status: 'completed',
      audioPath: downloadedAssetPath,
      prompt: audioPrompt,
      timestamp: new Date().toISOString()
    };
    
    log.success(`✅ [Audio Generator] complete: ${downloadedAssetPath}`);
    return output;
  } catch (err) {
    log.error(`❌ [Audio Generator] failed: ${err.message}`);
    return { status: 'failed', error: err.message };
  }
}
