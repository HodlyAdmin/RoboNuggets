import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { generateText } from '../../../shared/chrome-ai.js';

function stripCodeFences(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractJsonArray(value) {
  const cleaned = stripCodeFences(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Gemini response did not include a JSON array.');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function buildPrompt({ transcript, count, startIndex }) {
  return [
    'Return only valid JSON.',
    '',
    'Use this transcript to create YouTube Shorts quote records.',
    `Generate ${count} records starting at index ${startIndex}.`,
    '',
    'Follow the original lesson intent:',
    '- Find the most viral or memorable quotes.',
    '- Keep each quote to 2-3 sentences max.',
    '- Create a short, punchy title.',
    '- Write a YouTube description that can be used as the post text.',
    '- Set status to "Not Posted".',
    '',
    'Return an array of objects with this exact shape:',
    '[{"index":1,"title":"Short title","quote":"Quote text","description":"YouTube description","status":"Not Posted","tags":["quote","shorts"]}]',
    '',
    'Transcript:',
    transcript,
  ].join('\n');
}

export async function generateGeminiTranscriptRecords({ config, startIndex }) {
  const transcriptPath = resolve(config.transcriptPath);
  const transcript = await readFile(transcriptPath, 'utf8');
  const count = Math.max(1, Number(config.gemini.count) || config.batchSize || 1);
  const prompt = buildPrompt({
    transcript,
    count,
    startIndex,
  });

  const rawResponse = await generateText(prompt, {
    timeout: Number(config.gemini.timeoutMs) || 120000,
  });

  const records = extractJsonArray(rawResponse);
  if (!Array.isArray(records)) {
    throw new Error('Gemini transcript response parsed successfully but was not an array.');
  }

  return {
    provider: 'gemini-transcript',
    sourcePath: transcriptPath,
    baseDir: config.configBaseDir,
    format: 'json',
    prompt,
    rawResponse,
    records,
    notes: [
      `Generated ${records.length} quote record(s) from transcript via Gemini in Chrome.`,
      'Review the generated titles and quotes before live publishing.',
    ],
  };
}
