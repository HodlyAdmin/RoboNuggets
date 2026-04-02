import { readFile } from 'fs/promises';
import { basename, dirname, extname } from 'path';

function parseDelimitedText(content, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => String(cell || '').trim()));
}

function rowsToObjects(rows) {
  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((value) => String(value || '').trim());

  return dataRows.map((row) => {
    const record = {};
    headers.forEach((header, columnIndex) => {
      record[header || `column_${columnIndex + 1}`] = row[columnIndex] ?? '';
    });
    return record;
  });
}

export async function loadLocalRecords({ datasetPath }) {
  const raw = await readFile(datasetPath, 'utf8');
  const extension = extname(datasetPath).toLowerCase();
  let records = [];

  if (extension === '.json') {
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.records)
        ? parsed.records
        : [parsed];
  } else if (extension === '.csv') {
    records = rowsToObjects(parseDelimitedText(raw, ','));
  } else if (extension === '.tsv') {
    records = rowsToObjects(parseDelimitedText(raw, '\t'));
  } else {
    throw new Error(`Unsupported dataset file format: ${extension || 'unknown'}. Use .json, .csv, or .tsv.`);
  }

  return {
    provider: 'local-files',
    sourcePath: datasetPath,
    baseDir: dirname(datasetPath),
    format: extension.replace(/^\./, '') || 'unknown',
    records,
    notes: [
      `Loaded ${records.length} record(s) from ${basename(datasetPath)}.`,
    ],
  };
}
