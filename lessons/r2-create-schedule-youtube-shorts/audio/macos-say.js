import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function cleanSpeechText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateSayAudio({ record, outputPath, config }) {
  const speech = cleanSpeechText(record.quote);
  await mkdir(dirname(outputPath), { recursive: true });

  await execFileAsync('say', [
    '-v',
    config.sayVoice || 'Samantha',
    '-r',
    String(config.rateWpm || 185),
    '-o',
    outputPath,
    speech,
  ]);

  return {
    index: record.index,
    provider: 'macos-say',
    path: outputPath,
    voice: config.sayVoice || 'Samantha',
    status: 'generated',
  };
}
