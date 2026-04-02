import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

async function writeJson(path, data) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2));
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function writeCsv(path, columns, rows) {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows
    .map(row => columns.map(column => escapeCsvCell(row[column])).join(','))
    .join('\n');
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${header}\n${body}\n`);
}

export async function writePlatformArtifacts({ outputDir, platform, rawItems, normalizedItems }) {
  const rawPath = join(outputDir, 'raw', `${platform.id}.json`);
  const normalizedPath = join(outputDir, 'normalized', `${platform.id}.json`);
  const csvPath = join(outputDir, 'sheets', `${platform.id}.csv`);
  const csvRows = normalizedItems.map(record => record.fields || {});
  const csvColumns = platform.sink.schema?.length ? platform.sink.schema : Object.keys(csvRows[0] || {});

  await writeJson(rawPath, rawItems);
  await writeJson(normalizedPath, normalizedItems);
  if (csvColumns.length > 0) {
    await writeCsv(csvPath, csvColumns, csvRows);
  }

  return {
    rawPath,
    normalizedPath,
    csvPath: csvColumns.length > 0 ? csvPath : null,
  };
}

export async function writeCombinedArtifacts({ outputDir, normalizedRecords }) {
  const combinedPath = join(outputDir, 'combined', 'records.json');
  await writeJson(combinedPath, normalizedRecords);
  return { combinedPath };
}
