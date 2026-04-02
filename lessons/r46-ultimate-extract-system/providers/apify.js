/**
 * Apify provider scaffold.
 *
 * This keeps Apify behind a provider interface so the lesson architecture stays local-first.
 * The REST shape below follows Apify's common public API conventions, but it is intentionally
 * isolated here so it can be refined later without changing the module surface.
 */
import { log } from '../../../shared/logger.js';

function getNestedRun(payload) {
  return payload?.data || payload;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function pollRunStatus({ baseUrl, runId, token, pollIntervalMs, maxPolls }) {
  const runUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/actor-runs/${runId}`);
  runUrl.searchParams.set('token', token);

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const payload = await fetchJson(runUrl);
    const run = getNestedRun(payload);
    if (run?.defaultDatasetId) return run;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for Apify run ${runId} to expose a dataset ID.`);
}

async function fetchDatasetItems({ baseUrl, datasetId, token }) {
  const datasetUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/datasets/${datasetId}/items`);
  datasetUrl.searchParams.set('token', token);
  datasetUrl.searchParams.set('clean', 'true');
  datasetUrl.searchParams.set('format', 'json');
  return fetchJson(datasetUrl);
}

export async function runApifyPlatform({ platform, formData, config }) {
  const tokenEnvVar = config.apify.tokenEnvVar;
  const token = process.env[tokenEnvVar];

  if (!token) {
    return {
      provider: 'apify',
      status: 'blocked-missing-token',
      notes: [`Set ${tokenEnvVar} to enable the Apify provider for ${platform.label}.`],
      rawItems: [],
    };
  }

  const actorInput = platform.buildActorInput(formData);
  log.info(`☁️  Running Apify actor for ${platform.label}: ${platform.actor.actorId}`);

  const runUrl = new URL(`${config.apify.baseUrl.replace(/\/+$/, '')}/acts/${platform.actor.actorId}/runs`);
  runUrl.searchParams.set('token', token);
  runUrl.searchParams.set('waitForFinish', String(config.apify.waitForFinishSeconds));
  if (platform.actor.memoryMb) {
    runUrl.searchParams.set('memory', String(platform.actor.memoryMb));
  }

  const runResponse = await fetchJson(runUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(actorInput),
  });

  let run = getNestedRun(runResponse);
  if (!run?.defaultDatasetId && run?.id) {
    log.warn(`Apify run ${run.id} returned without a dataset ID. Polling for completion...`);
    run = await pollRunStatus({
      baseUrl: config.apify.baseUrl,
      runId: run.id,
      token,
      pollIntervalMs: config.apify.pollIntervalMs,
      maxPolls: config.apify.maxPolls,
    });
  }

  if (!run?.defaultDatasetId) {
    return {
      provider: 'apify',
      status: 'blocked-missing-dataset',
      notes: ['Apify run completed without a dataset ID. Revisit the provider adapter before relying on this path.'],
      rawItems: [],
      actorInput,
      run,
    };
  }

  const rawItems = await fetchDatasetItems({
    baseUrl: config.apify.baseUrl,
    datasetId: run.defaultDatasetId,
    token,
  });

  return {
    provider: 'apify',
    status: 'completed',
    notes: [`Apify dataset ${run.defaultDatasetId}`],
    rawItems: Array.isArray(rawItems) ? rawItems : [],
    actorInput,
    runId: run.id || null,
    datasetId: run.defaultDatasetId,
  };
}

