import { deleteFlowProject, generateFlowMedia } from '../chrome-flow.js';
import { selectHero } from '../hero-selection.js';
import { rm } from 'fs/promises';
import {
  createFlowJobId,
  getFlowJobStatePath,
  logFlowUsage,
  readFlowJobState,
  removeFlowJobState,
  writeFlowJobState,
} from './state.js';

function buildRequest(prompt, config = {}) {
  return {
    prompt,
    mediaType: config.mediaType || 'video',
    model: config.model,
    aspectRatio: config.aspectRatio || null,
    projectName: config.projectName || `Flow_${Date.now()}`,
    timeout: config.timeout || 300000,
    outputDir: config.outputDir || process.cwd(),
    referenceImages: config.referenceImages || [],
    subMode: config.subMode || null,
    variantCount: config.variantCount || null,
    requireZeroCredits: Boolean(config.requireZeroCredits),
  };
}

function buildCandidate(artifact, index = 0) {
  const { path: pathname, ...meta } = artifact;
  return {
    index,
    path: pathname,
    role: 'primary',
    selected: false,
    meta: {
      ...meta,
      capturedAt: meta.timestamp || new Date().toISOString(),
    }
  };
}

/**
 * Start a Flow generation job with optional hero selection.
 *
 * @param {Object} params
 * @param {string} params.prompt - Creative prompt
 * @param {string} [params.selectionPolicy='first'] - Hero selection policy: 'first' | 'random' | 'judge' | 'manual'
 * @param {number} [params.confidenceThreshold=0.6] - Judge confidence threshold (routes to manual below this)
 * @param {boolean} [params.hasReferenceImages] - Whether references were used (auto-detected from referenceImages)
 * @param {...} params - All other params passed through to chrome-flow.js
 * @returns {Promise<Object>} Job state with heroSelection results
 */
export async function startFlowJob({ prompt, ...config } = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error('startFlowJob requires a non-empty prompt.');
  }

  const request = buildRequest(String(prompt).trim(), config);
  const selectionPolicy = config.selectionPolicy || 'first';
  const confidenceThreshold = config.confidenceThreshold ?? 0.6;
  const jobId = config.jobId || createFlowJobId(request.projectName);
  const statePath = getFlowJobStatePath(jobId, request.outputDir);
  const now = new Date().toISOString();

  let state = {
    jobId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    outputDir: request.outputDir,
    statePath,
    request,
    selectionPolicy,
    artifacts: [],
    candidates: [],
    heroSelection: null,
    cleanup: {
      providerProjectDeletion: false,
      candidatesPruned: false,
    },
  };

  await writeFlowJobState(state);

  state = {
    ...state,
    status: 'running',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFlowJobState(state);

  try {
    const rawCandidates = await generateFlowMedia(request.prompt, request);
    const enrichedCandidates = Array.isArray(rawCandidates) ? rawCandidates : [rawCandidates];
    const candidates = enrichedCandidates.map((art, index) => buildCandidate(art, index));
    const artifacts = enrichedCandidates.map(c => typeof c === 'string' ? c : c.path);

    // ── Hero Selection Gate ──
    const heroResult = await selectHero({
      candidates,
      prompt: request.prompt,
      policy: selectionPolicy,
      confidenceThreshold,
      hasReferenceImages: (request.referenceImages?.length || 0) > 0,
      mediaType: request.mediaType,
    });

    // Mark the winning candidate as selected
    if (heroResult.winner !== null && candidates[heroResult.winner]) {
      candidates[heroResult.winner].selected = true;
    }

    const needsReview = heroResult.needsManualReview || false;

    state = {
      ...state,
      status: needsReview ? 'needs-review' : 'completed',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      artifacts,
      candidates,
      heroSelection: {
        policy: heroResult.policy,
        winnerIndex: heroResult.winner,
        confidence: heroResult.confidence,
        reason: heroResult.reason,
        scores: heroResult.scores || null,
        needsManualReview: needsReview,
      },
    };
    
    await writeFlowJobState(state);
    await logFlowUsage(state);
    return state;
  } catch (error) {
    state = {
      ...state,
      status: 'failed',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: error.message,
    };
    await writeFlowJobState(state);
    await logFlowUsage(state);

    const wrappedError = new Error(error.message);
    wrappedError.jobId = jobId;
    wrappedError.statePath = statePath;
    throw wrappedError;
  }
}

/**
 * Run hero selection on an existing completed or reviewing job's candidates.
 * Useful for re-judging after adding more candidates or changing policy.
 *
 * @param {string} jobId - Job ID to re-evaluate
 * @param {Object} [config]
 * @param {string} [config.outputDir] - Output directory where state lives
 * @param {string} [config.policy='judge'] - Selection policy for re-evaluation
 * @param {number} [config.confidenceThreshold=0.6]
 * @returns {Promise<Object|null>} Updated heroSelection result, or null if job not found
 */
export async function selectHeroForJob(jobId, config = {}) {
  const state = await readFlowJobState(jobId, config.outputDir);
  if (!state) return null;
  if (!['completed', 'needs-review'].includes(state.status) || !state.candidates?.length) return null;

  const policy = config.policy || 'judge';
  const confidenceThreshold = config.confidenceThreshold ?? 0.6;

  const heroResult = await selectHero({
    candidates: state.candidates,
    prompt: state.request?.prompt || '',
    policy,
    confidenceThreshold,
    hasReferenceImages: (state.request?.referenceImages?.length || 0) > 0,
    mediaType: state.request?.mediaType || 'image',
  });

  // Update candidate selection flags
  for (const c of state.candidates) {
    c.selected = c.index === heroResult.winner;
  }

  const needsReview = heroResult.needsManualReview || false;

  state.status = needsReview ? 'needs-review' : 'completed';
  state.heroSelection = {
    policy: heroResult.policy,
    winnerIndex: heroResult.winner,
    confidence: heroResult.confidence,
    reason: heroResult.reason,
    scores: heroResult.scores || null,
    needsManualReview: needsReview,
  };
  state.updatedAt = new Date().toISOString();

  await writeFlowJobState(state);
  return state.heroSelection;
}

export async function getFlowJobStatus(jobId, config = {}) {
  const state = await readFlowJobState(jobId, config.outputDir);
  if (!state) return null;
  return {
    jobId: state.jobId,
    status: state.status,
    createdAt: state.createdAt,
    startedAt: state.startedAt || null,
    completedAt: state.completedAt || null,
    statePath: state.statePath,
  };
}

export async function getFlowJobArtifacts(jobId, config = {}) {
  const state = await readFlowJobState(jobId, config.outputDir);
  return state?.artifacts || [];
}

export async function getFlowJobCandidates(jobId, config = {}) {
  const state = await readFlowJobState(jobId, config.outputDir);
  return state?.candidates || [];
}

/**
 * Perform a full cleanup for a Flow job.
 * 
 * @param {string} jobId 
 * @param {Object} config 
 * @param {boolean} [config.deleteProviderProject=true] - Remove project from Flow dashboard (Digital Citizenship)
 * @param {boolean} [config.pruneUnselectedCandidates=true] - Remove unselected local media variants
 * @param {boolean} [config.removeLocalState=false] - Remove the .flows-job state file
 */
export async function cleanupFlowJob(jobId, config = {}) {
  const state = await readFlowJobState(jobId, config.outputDir);
  if (!state) {
    return { jobId, status: 'missing' };
  }

  const deleteProvider = config.deleteProviderProject !== false;
  const pruneLocal = config.pruneUnselectedCandidates !== false;
  const removeState = config.removeLocalState === true;

  let providerDeleted = false;
  let candidatesPruned = 0;

  // 1. Digital Citizenship: Remove project from provider dashboard
  if (deleteProvider && state.request?.projectName) {
    providerDeleted = await deleteFlowProject(state.request.projectName);
  }

  // 2. Local Cleanup: Prune unselected variants
  if (pruneLocal && state.candidates?.length > 1) {
    for (const candidate of state.candidates) {
      if (!candidate.selected && candidate.path) {
        try {
          await rm(candidate.path, { force: true });
          candidatesPruned++;
        } catch (e) {}
      }
    }
  }

  // 3. Update state file if we're keeping it
  state.cleanup = {
    providerProjectDeletion: providerDeleted,
    candidatesPruned: candidatesPruned > 0,
    prunedCount: candidatesPruned,
    cleanedAt: new Date().toISOString(),
  };

  if (removeState) {
    await removeFlowJobState(jobId, config.outputDir);
    return { jobId, providerDeleted, candidatesPruned, stateRemoved: true };
  } else {
    await writeFlowJobState(state);
    return { jobId, providerDeleted, candidatesPruned, stateRemoved: false };
  }
}

export default {
  startFlowJob,
  selectHeroForJob,
  getFlowJobStatus,
  getFlowJobArtifacts,
  getFlowJobCandidates,
  cleanupFlowJob,
};
