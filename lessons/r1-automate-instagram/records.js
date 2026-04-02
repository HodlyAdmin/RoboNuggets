import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

function canonicalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function toPositiveInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return null;
  return Math.floor(number);
}

function buildCanonicalMap(record) {
  const map = new Map();
  for (const [key, value] of Object.entries(record || {})) {
    map.set(canonicalizeKey(key), value);
  }
  return map;
}

function pickValue(map, candidates) {
  for (const candidate of candidates) {
    const value = map.get(canonicalizeKey(candidate));
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

export function normalizeRecord(record, position) {
  const fieldMap = buildCanonicalMap(record);
  const index = toPositiveInteger(
    pickValue(fieldMap, ['index', 'day', 'id', 'row', 'post number'])
  ) ?? (position + 1);
  const title = String(
    pickValue(fieldMap, ['title', 'headline', 'name']) || `Post ${index}`
  ).trim();
  const quote = String(
    pickValue(fieldMap, ['quote', 'body', 'text', 'content']) || ''
  ).trim();
  const instagramCaption = String(
    pickValue(fieldMap, [
      'instagram caption',
      'instagram caption summary',
      'instagramcaption',
      'caption',
      'description',
    ]) || ''
  ).trim();
  const status = String(
    pickValue(fieldMap, ['status']) || ''
  ).trim();
  const imagePath = pickValue(fieldMap, ['image path', 'image_path', 'image', 'image url', 'image_url']);
  const sourceType = pickValue(fieldMap, ['source type', 'source_type']) || null;
  const issues = [];

  if (!quote) issues.push('Missing quote field.');
  if (!instagramCaption) issues.push('Missing Instagram caption field.');

  return {
    index,
    title,
    quote,
    instagramCaption,
    status,
    imagePath: imagePath ? String(imagePath).trim() : null,
    sourceType: sourceType ? String(sourceType).trim() : null,
    slug: slugify(`${index}-${title}`),
    valid: issues.length === 0,
    issues,
    source: record,
  };
}

export function normalizeRecords(records) {
  return records
    .map((record, index) => normalizeRecord(record, index))
    .sort((left, right) => left.index - right.index);
}

export function summarizeDataset(records) {
  return {
    totalRecords: records.length,
    validRecords: records.filter((record) => record.valid).length,
    invalidRecords: records.filter((record) => !record.valid).length,
    firstIndex: records[0]?.index || null,
    lastIndex: records.at(-1)?.index || null,
  };
}

export function selectRecords(records, state, config) {
  const targetIndex = config.startIndex ?? state.nextIndex ?? 1;

  return records
    .filter((record) => record.valid && record.index >= targetIndex)
    .slice(0, config.batchSize);
}

export async function loadState(statePath, startIndex = 1) {
  if (!existsSync(statePath)) {
    return {
      nextIndex: startIndex,
      history: [],
      lastRun: null,
    };
  }

  const raw = await readFile(statePath, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    nextIndex: toPositiveInteger(parsed.nextIndex) ?? startIndex,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    lastRun: parsed.lastRun || null,
  };
}

export function advanceState({ state, selectedRecords, outputDir, publisherResult, shouldAdvance }) {
  const entry = {
    at: new Date().toISOString(),
    outputDir,
    publisher: publisherResult?.publisher || null,
    status: publisherResult?.status || 'unknown',
    selectedIndices: selectedRecords.map((record) => record.index),
  };

  const history = [...(state.history || []), entry].slice(-50);

  return {
    nextIndex: shouldAdvance && selectedRecords.length
      ? selectedRecords[selectedRecords.length - 1].index + 1
      : state.nextIndex,
    history,
    lastRun: entry,
  };
}

export async function saveState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2));
  return statePath;
}
