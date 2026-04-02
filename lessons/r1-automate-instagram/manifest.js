import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function savePlan(outputDir, plan) {
  const planPath = join(outputDir, 'plan.json');
  await mkdir(outputDir, { recursive: true });
  await writeFile(planPath, JSON.stringify(plan, null, 2));
  return planPath;
}

export async function saveManifest({
  outputDir,
  templateModel,
  config,
  sourceResult,
  datasetSummary,
  selectedRecords,
  imageArtifacts,
  publisherResult,
  stateBefore,
  stateAfter,
  dataArtifacts,
}) {
  const manifestPath = join(outputDir, 'manifest.json');
  const manifest = {
    version: '1.0',
    lesson: templateModel.lessonName,
    generatedAt: new Date().toISOString(),
    template: templateModel,
    config,
    source: {
      provider: sourceResult.provider,
      sourcePath: sourceResult.sourcePath,
      format: sourceResult.format,
      notes: sourceResult.notes || [],
    },
    dataset: datasetSummary,
    dataArtifacts,
    selectedRecords: selectedRecords.map((record) => ({
      index: record.index,
      title: record.title,
      slug: record.slug,
      status: record.status,
      sourceType: record.sourceType,
    })),
    imageArtifacts,
    publisher: publisherResult,
    state: {
      before: stateBefore,
      after: stateAfter,
    },
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

function renderSelectedRecords(selectedRecords) {
  if (!selectedRecords.length) {
    return '- No eligible records were selected for this run.';
  }

  return selectedRecords
    .map((record) => `- ${record.index}: ${record.title}`)
    .join('\n');
}

function renderNotes(notes) {
  if (!notes.length) {
    return '- No additional notes.';
  }

  return notes.map((note) => `- ${note}`).join('\n');
}

export async function saveReport({
  outputDir,
  mode,
  templateModel,
  config,
  sourceResult,
  datasetSummary,
  selectedRecords,
  publisherResult,
  stateBefore,
  stateAfter,
}) {
  const reportPath = join(outputDir, 'report.md');
  const notes = [...(sourceResult.notes || []), ...(publisherResult.notes || [])];

  const report = [
    `# ${templateModel.lessonName}`,
    '',
    `Mode: ${mode}`,
    `Dataset provider: ${config.datasetProvider}`,
    `Publisher: ${config.publisher}`,
    `Batch size: ${config.batchSize}`,
    '',
    '## Original Blueprint',
    `- Scenario name: ${templateModel.scenarioName}`,
    `- Counter reset: ${templateModel.counter.reset}`,
    `- Sheet source: ${templateModel.sheet.spreadsheetLabel || templateModel.sheet.spreadsheetId}`,
    `- Sheet tab: ${templateModel.sheet.sheetId}`,
    `- Caption field: ${templateModel.sheet.captionFieldId}`,
    `- Image path template: ${templateModel.dropbox.pathTemplate}`,
    `- Instagram target: ${templateModel.instagram.accountLabel || templateModel.instagram.accountId}`,
    '',
    '## Local Rebuild',
    '- Day counter is replaced by a local persistent state file.',
    '- Google Sheets is replaced by JSON/CSV/TSV dataset loading or Gemini draft generation.',
    '- Dropbox image links are replaced by local card rendering or local image reuse, then optional Blotato media hosting.',
    '- Instagram publishing is routed through the Blotato provider instead of direct Instagram APIs or browser automation.',
    '',
    '## Dataset',
    `- Total records: ${datasetSummary.totalRecords}`,
    `- Valid records: ${datasetSummary.validRecords}`,
    `- Invalid records: ${datasetSummary.invalidRecords}`,
    `- Range: ${datasetSummary.firstIndex || 'n/a'} to ${datasetSummary.lastIndex || 'n/a'}`,
    '',
    '## Selected Records',
    renderSelectedRecords(selectedRecords),
    '',
    '## Publisher Result',
    `- Status: ${publisherResult.status}`,
    `- Output items: ${(publisherResult.items || []).length}`,
    '',
    '## State',
    `- Before next index: ${stateBefore.nextIndex}`,
    `- After next index: ${stateAfter.nextIndex}`,
    '',
    '## Notes',
    renderNotes(notes),
    '',
  ].join('\n');

  await writeFile(reportPath, report);
  return reportPath;
}
