import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { log } from '../../../shared/logger.js';

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJsonArray(path) {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.data)) return parsed.data;

  throw new Error(`Unsupported local JSON format in ${path}. Expected an array or an object with "items" or "data".`);
}

async function readJsonLines(path) {
  const raw = await readFile(path, 'utf8');
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

async function loadItemsFromInputDir(inputDir, platformId) {
  const candidates = [
    join(inputDir, `${platformId}.json`),
    join(inputDir, `${platformId}.jsonl`),
    join(inputDir, `${platformId}.ndjson`),
  ];

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) continue;
    if (candidate.endsWith('.json')) {
      return { path: candidate, items: await readJsonArray(candidate) };
    }
    return { path: candidate, items: await readJsonLines(candidate) };
  }

  return null;
}

export async function runLocalFilesPlatform({ platform, config }) {
  const loaded = await loadItemsFromInputDir(config.localFiles.inputDir, platform.id);
  if (!loaded) {
    const message = `No local input file found for ${platform.id} in ${config.localFiles.inputDir}`;
    if (config.localFiles.skipMissing) {
      log.warn(message);
      return {
        provider: 'local-files',
        status: 'blocked-missing-local-input',
        notes: [message],
        rawItems: [],
      };
    }

    throw new Error(message);
  }

  log.info(`📥 Loaded ${loaded.items.length} local records for ${platform.label}`);
  return {
    provider: 'local-files',
    status: 'completed',
    notes: [`Loaded from ${loaded.path}`],
    rawItems: loaded.items,
    sourcePath: loaded.path,
  };
}

