import { existsSync } from 'fs';
import { appendFile, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

function slugify(value = 'flow-job') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'flow-job';
}

export function createFlowJobId(projectName = 'flow-job') {
  return `${slugify(projectName)}_${Date.now()}`;
}

export function getFlowJobStateDir(outputDir = process.cwd()) {
  return join(resolve(outputDir), '.flow-jobs');
}

export function getFlowJobStatePath(jobId, outputDir = process.cwd()) {
  return join(getFlowJobStateDir(outputDir), `${jobId}.state.json`);
}

export async function writeFlowJobState(state) {
  const stateDir = getFlowJobStateDir(state.outputDir);
  await mkdir(stateDir, { recursive: true });
  await writeFile(state.statePath, JSON.stringify(state, null, 2));
  return state.statePath;
}

export async function logFlowUsage(state) {
  const stateDir = getFlowJobStateDir(state.outputDir);
  const usageLogPath = join(stateDir, '.flow-usage.log');
  const entry = {
    timestamp: new Date().toISOString(),
    jobId: state.jobId,
    projectName: state.request?.projectName,
    prompt: state.request?.prompt,
    mediaType: state.request?.mediaType,
    status: state.status,
    artifacts: state.artifacts?.length || 0,
    winner: state.heroSelection?.winnerIndex,
  };
  await appendFile(usageLogPath, JSON.stringify(entry) + '\n');
}

export async function readFlowJobState(jobId, outputDir = process.cwd()) {
  const statePath = getFlowJobStatePath(jobId, outputDir);
  if (!existsSync(statePath)) return null;
  const raw = await readFile(statePath, 'utf-8');
  return JSON.parse(raw);
}

export async function removeFlowJobState(jobId, outputDir = process.cwd()) {
  const statePath = getFlowJobStatePath(jobId, outputDir);
  if (!existsSync(statePath)) return false;
  await rm(statePath, { force: true });
  return true;
}
