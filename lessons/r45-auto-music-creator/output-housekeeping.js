import { mkdir, readdir, readFile, rename, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../../shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_RETENTION = {
  keepSuccessfulRuns: 2,
  keepConceptRuns: 2,
  keepFailedRuns: 1,
  keepIncompleteRuns: 1,
  pruneArchiveDays: 30,
  archiveDirName: '.archive',
};

function toCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeRetention(retention = {}) {
  return {
    keepSuccessfulRuns: toCount(retention.keepSuccessfulRuns, DEFAULT_RETENTION.keepSuccessfulRuns),
    keepConceptRuns: toCount(retention.keepConceptRuns, DEFAULT_RETENTION.keepConceptRuns),
    keepFailedRuns: toCount(retention.keepFailedRuns, DEFAULT_RETENTION.keepFailedRuns),
    keepIncompleteRuns: toCount(retention.keepIncompleteRuns, DEFAULT_RETENTION.keepIncompleteRuns),
    pruneArchiveDays: toCount(retention.pruneArchiveDays, DEFAULT_RETENTION.pruneArchiveDays),
    archiveDirName: retention.archiveDirName || DEFAULT_RETENTION.archiveDirName,
  };
}

function parseRunDateFromName(name) {
  const match = name.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$/);
  if (!match) return null;

  const [datePart, timePart] = match[1].split('T');
  const candidate = new Date(`${datePart}T${timePart.replace(/-/g, ':')}Z`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function parseRunDateFromManifest(manifest) {
  const candidate = manifest?.completedAt || manifest?.createdAt;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removeNoiseFiles(rootPath, removedFiles = []) {
  const entries = await readdir(rootPath, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);

    if (entry.name === '.DS_Store') {
      await rm(entryPath, { force: true }).catch(() => {});
      removedFiles.push(entryPath);
      continue;
    }

    if (entry.isDirectory()) {
      await removeNoiseFiles(entryPath, removedFiles);
    }
  }

  return removedFiles;
}

async function pruneEmptyDirectories(rootPath, { preserveRoot = true } = {}, removedDirs = []) {
  const entries = await readdir(rootPath, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await pruneEmptyDirectories(join(rootPath, entry.name), { preserveRoot: false }, removedDirs);
  }

  const remainingEntries = (await readdir(rootPath, { withFileTypes: true }).catch(() => []))
    .filter(entry => entry.name !== '.DS_Store');

  if (!preserveRoot && remainingEntries.length === 0) {
    await rm(rootPath, { recursive: true, force: true }).catch(() => {});
    removedDirs.push(rootPath);
  }

  return removedDirs;
}

function classifyManifest(manifest) {
  const songs = Array.isArray(manifest?.songs) ? manifest.songs : [];
  const tracks = songs.map(song => song?.track).filter(Boolean);
  const completed = Number.isFinite(manifest?.summary?.completed)
    ? manifest.summary.completed
    : tracks.filter(track => track.status === 'completed').length;
  const failed = Number.isFinite(manifest?.summary?.failed)
    ? manifest.summary.failed
    : tracks.filter(track => track.status === 'failed').length;
  const pending = Number.isFinite(manifest?.summary?.pending)
    ? manifest.summary.pending
    : tracks.filter(track => String(track?.status || '').includes('pending')).length;

  if (completed > 0 || manifest?.video?.path || tracks.some(track => track.status === 'completed')) {
    return 'success';
  }

  if (failed > 0 || tracks.some(track => track.status === 'failed')) {
    return 'failed';
  }

  if (pending > 0 || tracks.some(track => String(track?.status || '').includes('pending'))) {
    return 'incomplete';
  }

  if (songs.length > 0) {
    return 'concept';
  }

  return 'incomplete';
}

async function inspectRunDirectory(outputRoot, entryName) {
  const runPath = join(outputRoot, entryName);
  const manifestPath = join(runPath, 'manifest.json');
  const manifestExists = await pathExists(manifestPath);
  const entryStat = await stat(runPath).catch(() => null);

  if (!manifestExists) {
    const createdAt = parseRunDateFromName(entryName) || entryStat?.mtime || new Date(0);
    return {
      name: entryName,
      path: runPath,
      manifestPath: null,
      type: 'orphan',
      createdAt,
    };
  }

  let manifest = null;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  } catch {
    manifest = null;
  }

  const createdAt = parseRunDateFromManifest(manifest)
    || parseRunDateFromName(entryName)
    || entryStat?.mtime
    || new Date(0);

  return {
    name: entryName,
    path: runPath,
    manifestPath,
    manifest,
    type: manifest ? classifyManifest(manifest) : 'orphan',
    createdAt,
  };
}

function getKeepLimit(entryType, retention) {
  if (entryType === 'success') return retention.keepSuccessfulRuns;
  if (entryType === 'concept') return retention.keepConceptRuns;
  if (entryType === 'failed') return retention.keepFailedRuns;
  if (entryType === 'incomplete') return retention.keepIncompleteRuns;
  return 0;
}

async function uniqueArchivePath(archiveRoot, entryName) {
  let candidate = join(archiveRoot, entryName);
  if (!(await pathExists(candidate))) {
    return candidate;
  }

  let suffix = 1;
  while (await pathExists(candidate)) {
    candidate = join(archiveRoot, `${entryName}__${suffix}`);
    suffix += 1;
  }

  return candidate;
}

async function pruneArchive(archiveRoot, pruneArchiveDays) {
  if (pruneArchiveDays <= 0 || !existsSync(archiveRoot)) {
    return [];
  }

  const thresholdMs = pruneArchiveDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const archivedEntries = await readdir(archiveRoot, { withFileTypes: true }).catch(() => []);
  const removed = [];

  for (const entry of archivedEntries) {
    const entryPath = join(archiveRoot, entry.name);
    const entryStat = await stat(entryPath).catch(() => null);
    if (!entryStat) continue;

    if ((now - entryStat.mtimeMs) < thresholdMs) {
      continue;
    }

    await rm(entryPath, { recursive: true, force: true }).catch(() => {});
    removed.push(entryPath);
  }

  return removed;
}

export async function housekeepOutputDirectory({
  outputRoot = join(__dirname, 'output'),
  retention = {},
} = {}) {
  const resolvedOutputRoot = resolve(outputRoot);
  const normalizedRetention = normalizeRetention(retention);

  if (!existsSync(resolvedOutputRoot)) {
    await mkdir(resolvedOutputRoot, { recursive: true });
  }

  const removedNoiseFiles = await removeNoiseFiles(resolvedOutputRoot);
  const removedEmptyDirs = await pruneEmptyDirectories(resolvedOutputRoot, { preserveRoot: true });

  const archiveRoot = join(resolvedOutputRoot, normalizedRetention.archiveDirName);
  const topLevelEntries = (await readdir(resolvedOutputRoot, { withFileTypes: true }).catch(() => []))
    .filter(entry => entry.isDirectory() && entry.name !== normalizedRetention.archiveDirName);

  const inspectedRuns = [];
  for (const entry of topLevelEntries) {
    inspectedRuns.push(await inspectRunDirectory(resolvedOutputRoot, entry.name));
  }

  inspectedRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const keptRuns = [];
  const archivedRuns = [];
  const seenByType = new Map();

  for (const run of inspectedRuns) {
    const keepLimit = getKeepLimit(run.type, normalizedRetention);
    const seen = seenByType.get(run.type) || 0;

    if (run.type !== 'orphan' && seen < keepLimit) {
      keptRuns.push(run);
      seenByType.set(run.type, seen + 1);
      continue;
    }

    await mkdir(archiveRoot, { recursive: true });
    const archivePath = await uniqueArchivePath(archiveRoot, run.name);
    await rename(run.path, archivePath);
    archivedRuns.push({
      ...run,
      archivePath,
    });
  }

  const prunedArchiveEntries = await pruneArchive(archiveRoot, normalizedRetention.pruneArchiveDays);

  return {
    outputRoot: resolvedOutputRoot,
    archiveRoot,
    retention: normalizedRetention,
    inspectedRuns,
    keptRuns,
    archivedRuns,
    removedNoiseFiles,
    removedEmptyDirs,
    prunedArchiveEntries,
  };
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const config = {
    outputRoot: join(__dirname, 'output'),
    retention: {},
  };

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputRoot = resolve(args[outputIndex + 1]);
  }

  const mapping = new Map([
    ['--keep-success', 'keepSuccessfulRuns'],
    ['--keep-concepts', 'keepConceptRuns'],
    ['--keep-failed', 'keepFailedRuns'],
    ['--keep-incomplete', 'keepIncompleteRuns'],
    ['--prune-archive-days', 'pruneArchiveDays'],
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const key = mapping.get(args[index]);
    if (!key || !args[index + 1]) continue;
    config.retention[key] = args[index + 1];
  }

  return config;
}

async function main() {
  const cliConfig = parseCliArgs();
  log.header('R45 Output Housekeeping');
  const summary = await housekeepOutputDirectory(cliConfig);

  const visibleRuns = summary.keptRuns
    .map(run => `${run.name} (${run.type})`);
  const archivedRuns = summary.archivedRuns
    .map(run => `${run.name} -> ${run.archivePath}`);

  log.success(`Visible runs kept: ${summary.keptRuns.length}`);
  visibleRuns.forEach(entry => log.info(`  • ${entry}`));

  if (summary.archivedRuns.length > 0) {
    log.success(`Archived runs: ${summary.archivedRuns.length}`);
    archivedRuns.forEach(entry => log.info(`  • ${entry}`));
  } else {
    log.info('No stale runs needed archiving.');
  }

  if (summary.removedEmptyDirs.length > 0) {
    log.success(`Removed empty directories: ${summary.removedEmptyDirs.length}`);
  }

  if (summary.removedNoiseFiles.length > 0) {
    log.success(`Removed noise files: ${summary.removedNoiseFiles.length}`);
  }

  if (summary.prunedArchiveEntries.length > 0) {
    log.success(`Pruned archived entries: ${summary.prunedArchiveEntries.length}`);
  }

  log.info(`Output root: ${summary.outputRoot}`);
  log.info(`Hidden archive: ${summary.archiveRoot}`);
}

if (resolve(process.argv[1] || '') === __filename) {
  main().catch((error) => {
    log.error(`R45 output housekeeping failed: ${error.message}`);
    process.exit(1);
  });
}
