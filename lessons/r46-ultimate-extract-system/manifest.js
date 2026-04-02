import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { log } from '../../shared/logger.js';

async function writeText(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, value);
}

export async function saveManifest({
  outputDir,
  lessonName,
  templatePath,
  config,
  formData,
  plan,
  results,
  sinkArtifacts,
}) {
  const manifestPath = join(outputDir, 'manifest.json');
  const blockers = results
    .filter(result => result.status !== 'completed')
    .map(result => ({
      platformId: result.platform.id,
      status: result.status,
      notes: result.notes || [],
    }));

  const manifest = {
    version: '1.0',
    lesson: lessonName,
    createdAt: new Date().toISOString(),
    templatePath,
    config,
    formData,
    plan,
    results: results.map(result => ({
      platformId: result.platform.id,
      platformLabel: result.platform.label,
      provider: result.provider,
      status: result.status,
      rawCount: result.rawItems?.length || 0,
      normalizedCount: result.normalizedItems?.length || 0,
      notes: result.notes || [],
      artifacts: result.artifacts || null,
    })),
    sinkArtifacts,
    blockers,
  };

  await writeText(manifestPath, JSON.stringify(manifest, null, 2));
  log.success(`📋 Manifest saved: ${manifestPath}`);
  return manifestPath;
}

export async function saveRunReport({
  outputDir,
  lessonName,
  formData,
  results,
  sinkArtifacts,
}) {
  const reportPath = join(outputDir, 'report.md');
  const lines = [
    `# ${lessonName}`,
    '',
    `- Search term: ${formData['Search for...']}`,
    `- Max items requested: ${formData['How many items to scrape']}`,
    `- Selected platforms: ${(formData['Which platforms'] || []).join(', ') || 'None'}`,
    '',
    '## Platform Results',
    '',
  ];

  for (const result of results) {
    lines.push(`### ${result.platform.label}`);
    lines.push(`- Provider: ${result.provider}`);
    lines.push(`- Status: ${result.status}`);
    lines.push(`- Raw items: ${result.rawItems?.length || 0}`);
    lines.push(`- Normalized items: ${result.normalizedItems?.length || 0}`);
    if (result.notes?.length) {
      lines.push(`- Notes: ${result.notes.join(' | ')}`);
    }
    if (result.artifacts) {
      lines.push(`- Raw output: ${result.artifacts.rawPath}`);
      lines.push(`- Normalized output: ${result.artifacts.normalizedPath}`);
      if (result.artifacts.csvPath) {
        lines.push(`- CSV output: ${result.artifacts.csvPath}`);
      }
    }
    lines.push('');
  }

  if (sinkArtifacts?.combinedPath) {
    lines.push('## Combined Output');
    lines.push('');
    lines.push(`- ${sinkArtifacts.combinedPath}`);
    lines.push('');
  }

  await writeText(reportPath, `${lines.join('\n')}\n`);
  return reportPath;
}
