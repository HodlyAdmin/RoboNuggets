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
  audioArtifacts,
  videoArtifacts,
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
      youtubeTitle: record.youtubeTitle,
    })),
    audioArtifacts,
    videoArtifacts,
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
    `TTS provider: ${config.ttsProvider}`,
    `Video renderer: ${config.videoRenderer}`,
    `Publisher: ${config.publisher}`,
    `Batch size: ${config.batchSize}`,
    '',
    '## Original Blueprint',
    `- Scenario name: ${templateModel.scenarioName}`,
    `- Sheet source: ${templateModel.sheet.spreadsheetId}`,
    `- Sheet tab: ${templateModel.sheet.sheetId}`,
    `- Quote status filter: ${templateModel.sheet.statusValue}`,
    `- Voice ID: ${templateModel.audio.voiceId}`,
    `- JSON2Video template src: ${templateModel.video.templateVideoSrc}`,
    `- YouTube privacy: ${templateModel.youtube.privacyStatus}`,
    '',
    '## Local Rebuild',
    '- Google Sheets is replaced by local JSON/CSV/TSV loading or Gemini transcript extraction.',
    '- ElevenLabs is replaced by a local macOS say provider by default, with a provider interface reserved for live TTS integrations.',
    '- Dropbox share links are replaced by local audio files and local ffmpeg composition.',
    '- JSON2Video is replaced by a local ffmpeg renderer that loops the background video and burns subtitles.',
    '- YouTube publishing is standardized on Blotato instead of direct YouTube API wiring inside the lesson module.',
    '',
    '## Dataset',
    `- Total records: ${datasetSummary.totalRecords}`,
    `- Valid records: ${datasetSummary.validRecords}`,
    `- Invalid records: ${datasetSummary.invalidRecords}`,
    `- Already posted: ${datasetSummary.postedRecords}`,
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
