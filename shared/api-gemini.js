import { log } from './logger.js';
import { readFileSync } from 'fs';
import { extname } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function parseRetryDelayMs(errorText) {
  try {
    const parsed = JSON.parse(errorText);
    const retryDelay = parsed?.error?.details?.find(detail => detail?.retryDelay)?.retryDelay;
    if (typeof retryDelay === 'string') {
      const seconds = parseFloat(retryDelay.replace(/s$/i, ''));
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.ceil(seconds * 1000);
      }
    }
  } catch {
    // Fall through to regex parsing below.
  }

  const match = errorText.match(/retry in\s+([\d.]+)s/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return null;
}

/**
 * Generate JSON response from Gemini REST API
 * Replaces the brittle chrome-ai.js Puppeteer UI scraper
 * 
 * @param {string} prompt 
 * @returns {any} Plaid parsed JSON out of the response
 */
export async function generateJSON(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in your .env file. Please create a .env file and add your Google AI Studio API key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  };

  // Plaid JSON parse safety
  // JSON trailing comma purifier
  const cleanJson = (str) => str.replace(/,\s*([}\]])/g, '$1');

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log.info(`🤖 Querying Gemini REST API... (attempt ${attempt}/${maxAttempts})`);
    const start = Date.now();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();

      if (res.status === 429 && attempt < maxAttempts) {
        const retryDelayMs = parseRetryDelayMs(errorText) ?? 30000;
        log.warn(`Gemini rate limited. Waiting ${Math.ceil(retryDelayMs / 1000)}s before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }

      throw new Error(`Gemini API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('No text returned from Gemini API candidates');
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log.success(`   Gemini JSON generated in ${duration}s`);

    try {
      return JSON.parse(cleanJson(textResponse.trim()));
    } catch (err) {
      const jsonMatch = textResponse.match(/[\{|\[][\s\S]*[\}|\]]/);
      if (jsonMatch) {
        try {
          return JSON.parse(cleanJson(jsonMatch[0]));
        } catch (e2) {
          log.error(`Raw invalid JSON from Gemini:\n${jsonMatch[0]}`);
          throw e2;
        }
      }
      log.error(`Raw completely invalid response from Gemini:\n${textResponse}`);
      throw new Error(`Failed to parse Gemini response to JSON: ${err.message}`);
    }
  }

  throw new Error('Gemini API exhausted all retry attempts without returning JSON.');
}

/**
 * Generate JSON from a multimodal Gemini request (text + images/video files).
 *
 * @param {string} prompt - Text prompt
 * @param {string[]} mediaPaths - Local file paths to images or video to include
 * @param {object} [options]
 * @param {string} [options.model] - Gemini model (default: gemini-2.5-flash)
 * @param {number} [options.temperature] - Temperature (default: 0.4 for judging)
 * @returns {any} Parsed JSON from Gemini response
 */
export async function generateMultimodalJSON(prompt, mediaPaths = [], options = {}) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in your .env file.');
  }

  const model = options.model || 'gemini-2.5-flash';
  const temperature = options.temperature ?? 0.4;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  // Build parts: media files first, then the text prompt
  const parts = [];

  for (const filePath of mediaPaths) {
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_MAP[ext];
    if (!mimeType) {
      log.warn(`Skipping unsupported media type for Gemini multimodal: ${ext} (${filePath})`);
      continue;
    }
    const fileData = readFileSync(filePath);
    const base64 = fileData.toString('base64');
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    });
  }

  parts.push({ text: prompt });

  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
    },
  };

  const cleanJson = (str) => str.replace(/,\s*([}\]])/g, '$1');
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log.info(`🤖 Querying Gemini multimodal API... (attempt ${attempt}/${maxAttempts}, ${mediaPaths.length} media files)`);
    const start = Date.now();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429 && attempt < maxAttempts) {
        const retryDelayMs = parseRetryDelayMs(errorText) ?? 30000;
        log.warn(`Gemini rate limited. Waiting ${Math.ceil(retryDelayMs / 1000)}s before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw new Error(`Gemini Multimodal API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('No text returned from Gemini multimodal API.');
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log.success(`   Gemini multimodal JSON generated in ${duration}s`);

    try {
      return JSON.parse(cleanJson(textResponse.trim()));
    } catch (err) {
      const jsonMatch = textResponse.match(/[\{|\[][	\s\S]*[\}|\]]/);
      if (jsonMatch) {
        try {
          return JSON.parse(cleanJson(jsonMatch[0]));
        } catch (e2) {
          log.error(`Raw invalid JSON from Gemini multimodal:\n${jsonMatch[0]}`);
          throw e2;
        }
      }
      log.error(`Raw invalid multimodal response:\n${textResponse}`);
      throw new Error(`Failed to parse Gemini multimodal response: ${err.message}`);
    }
  }

  throw new Error('Gemini multimodal API exhausted all retry attempts.');
}
