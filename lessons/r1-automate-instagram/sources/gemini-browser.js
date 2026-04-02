import { generateText } from '../../../shared/chrome-ai.js';

function stripCodeFences(value) {
  const trimmed = String(value || '').trim();
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
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

function buildPrompt({ startIndex, count, author, theme }) {
  return [
    'Return only valid JSON.',
    '',
    `Create ${count} Instagram quote-post records starting at index ${startIndex}.`,
    `Target author/theme: ${author}.`,
    `Themes: ${theme}.`,
    '',
    'Important:',
    '- If you are unsure a quote is verbatim, rewrite it as an original paraphrase.',
    '- Keep quote text under 280 characters.',
    '- Write a concise Instagram caption with exactly 1 emoji and 2 hashtags.',
    '- Status should be "planned".',
    '',
    'Return an array of objects with this exact shape:',
    '[{"index":1,"title":"Short title","quote":"Quote text","instagramCaption":"Caption text","status":"planned","sourceType":"verbatim_or_inspired"}]',
  ].join('\n');
}

export async function generateGeminiRecords({ config, startIndex }) {
  const count = Math.max(1, Number(config.gemini.count) || config.batchSize || 1);
  const prompt = buildPrompt({
    startIndex,
    count,
    author: config.gemini.author,
    theme: config.gemini.theme,
  });

  const rawResponse = await generateText(prompt, {
    timeout: Number(config.gemini.timeoutMs) || 120000,
  });

  const records = extractJsonArray(rawResponse);
  if (!Array.isArray(records)) {
    throw new Error('Gemini response parsed successfully but was not an array.');
  }

  return {
    provider: 'gemini-browser',
    sourcePath: null,
    baseDir: config.configBaseDir,
    format: 'json',
    prompt,
    rawResponse,
    records,
    notes: [
      `Generated ${records.length} draft record(s) in Gemini via Chrome.`,
      'Review generated quotes before posting, especially if you need verbatim attribution.',
    ],
  };
}
