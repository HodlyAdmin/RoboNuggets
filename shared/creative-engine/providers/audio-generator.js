import { log } from '../../logger.js';
import { generateLyriaTrack } from '../../chrome-lyria.js';

export async function executeAudioGeneration(config, runData) {
  if (!config?.enabled) {
    log.info('⏭️  Audio Generation disabled in config.');
    return { status: 'skipped' };
  }

  log.info(`🎧 [Audio Generator via Lyria 3 Pro] Requesting AI music synthesis...`);
  
  const audioPrompt = config.prompt || `Cinematic Hans Zimmer style orchestral building tension into an epic drop`;
    
  try {
    const downloadedAssetPath = await generateLyriaTrack(audioPrompt, {
      outputDir: runData.outputDir,
      timeout: config.timeout || 300000,
    });
    
    const output = {
      status: 'completed',
      audioPath: downloadedAssetPath,
      timeoutMs: config.timeout || 300000,
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
