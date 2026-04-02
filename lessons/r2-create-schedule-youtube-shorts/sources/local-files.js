import { readFile } from 'fs/promises';
import { dirname, extname, resolve } from 'path';

function splitRow(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseDelimitedText(raw, delimiter) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const headers = splitRow(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = splitRow(line, delimiter);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });
}

function parseJson(raw) {
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.items)) return data.items;
  throw new Error('JSON input must be an array or contain a records/items array.');
}

export async function loadLocalRecords({ datasetPath }) {
  const resolvedPath = resolve(datasetPath);
  const extension = extname(resolvedPath).toLowerCase();
  const raw = await readFile(resolvedPath, 'utf8');

  let records = [];
  let format = extension.replace(/^\./, '') || 'json';

  if (extension === '.json') {
    records = parseJson(raw);
  } else if (extension === '.csv') {
    records = parseDelimitedText(raw, ',');
  } else if (extension === '.tsv' || extension === '.txt') {
    records = parseDelimitedText(raw, '\t');
  } else {
    throw new Error(`Unsupported dataset format: ${extension}`);
  }

  return {
    provider: 'local-files',
    sourcePath: resolvedPath,
    baseDir: dirname(resolvedPath),
    format,
    records,
    notes: [
      `Loaded ${records.length} record(s) from ${resolvedPath}.`,
    ],
  };
}
