/**
 * Hero Selection Gate — Pluggable quality gate for creative media candidates
 *
 * Policies:
 *   - 'first'  → Select the first candidate (current behavior, no regression)
 *   - 'random' → Random selection from candidates
 *   - 'judge'  → Multimodal Gemini evaluation against prompt intent
 *   - 'manual' → Always route to manual review (returns null hero)
 *
 * The judge policy evaluates each candidate on:
 *   1. Prompt Adherence — does the output match what was requested?
 *   2. Reference Fidelity — does it preserve reference content (labels, identity)?
 *   3. Technical Quality — resolution, artifacts, coherence
 *   4. Text Accuracy — product labels, text preservation
 *   5. Authenticity — does it feel like genuine UGC, not synthetic?
 *
 * If the judge returns confidence below the threshold, the result is downgraded
 * to 'manual' so a human can review.
 *
 * Usage:
 *   import { selectHero } from './hero-selection.js';
 *
 *   const result = await selectHero({
 *     candidates: [{ index: 0, path: '/path/to/img1.jpg' }, { index: 1, path: '/path/to/img2.jpg' }],
 *     prompt: 'A young woman holding a serum bottle...',
 *     policy: 'judge',
 *     confidenceThreshold: 0.6,
 *     hasReferenceImages: true,
 *   });
 *   // → { winner: 0, confidence: 0.82, policy: 'judge', reason: '...', scores: [...] }
 */

import { log } from './logger.js';
import { generateMultimodalJSON } from './api-gemini.js';
import { existsSync } from 'fs';

/**
 * @typedef {Object} Candidate
 * @property {number} index - 0-based candidate index
 * @property {string} path - Absolute path to the media file
 * @property {string} [role] - 'primary' | 'variant'
 * @property {boolean} [selected] - Pre-existing selection flag
 */

/**
 * @typedef {Object} HeroSelectionResult
 * @property {number|null} winner - Index of winning candidate (null if manual review)
 * @property {string} policy - Policy that was applied
 * @property {number|null} confidence - 0.0–1.0 (null for non-judge policies)
 * @property {string} reason - Human-readable explanation
 * @property {Object[]|null} scores - Per-candidate scores (judge only)
 * @property {boolean} needsManualReview - True if routed to human review
 */

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Select the hero candidate from a list of creative media candidates.
 *
 * @param {Object} params
 * @param {Candidate[]} params.candidates - Array of candidate objects with { index, path }
 * @param {string} params.prompt - The original generation prompt (for judge comparison)
 * @param {string} [params.policy='first'] - Selection policy
 * @param {number} [params.confidenceThreshold=0.6] - Below this, route to manual
 * @param {boolean} [params.hasReferenceImages=false] - Whether reference images were used
 * @param {string} [params.mediaType='image'] - 'image' or 'video'
 * @returns {Promise<HeroSelectionResult>}
 */
export async function selectHero({
  candidates = [],
  prompt = '',
  policy = 'first',
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  hasReferenceImages = false,
  mediaType = 'image',
} = {}) {
  if (!candidates || candidates.length === 0) {
    return {
      winner: null,
      policy,
      confidence: null,
      reason: 'No candidates provided.',
      scores: null,
      needsManualReview: true,
    };
  }

  if (policy === 'manual') {
    return {
      winner: null,
      policy: 'manual',
      confidence: null,
      reason: 'Manual review requested by policy.',
      scores: null,
      needsManualReview: true,
    };
  }

  // Single candidate — short-circuit regardless of policy
  if (candidates.length === 1) {
    return {
      winner: 0,
      policy: 'first',
      confidence: 1.0,
      reason: 'Only one candidate — selected by default.',
      scores: null,
      needsManualReview: false,
    };
  }

  switch (policy) {
    case 'first':
      return selectFirst(candidates);
    case 'random':
      return selectRandom(candidates);
    case 'judge':
      return selectByJudge(candidates, { prompt, confidenceThreshold, hasReferenceImages, mediaType });

    default:
      log.warn(`Unknown hero selection policy '${policy}', falling back to 'first'.`);
      return selectFirst(candidates);
  }
}

function selectFirst(candidates) {
  return {
    winner: 0,
    policy: 'first',
    confidence: null,
    reason: 'Selected first candidate by policy.',
    scores: null,
    needsManualReview: false,
  };
}

function selectRandom(candidates) {
  const winner = Math.floor(Math.random() * candidates.length);
  return {
    winner,
    policy: 'random',
    confidence: null,
    reason: `Randomly selected candidate ${winner} of ${candidates.length}.`,
    scores: null,
    needsManualReview: false,
  };
}

/**
 * Judge candidates using Gemini multimodal evaluation.
 */
async function selectByJudge(candidates, { prompt, confidenceThreshold, hasReferenceImages, mediaType }) {
  // Validate that candidate files exist
  const validCandidates = candidates.filter(c => {
    if (!c.path || !existsSync(c.path)) {
      log.warn(`Hero judge: candidate ${c.index} file not found: ${c.path}`);
      return false;
    }
    return true;
  });

  if (validCandidates.length === 0) {
    return {
      winner: null,
      policy: 'judge',
      confidence: null,
      reason: 'No valid candidate files found for judging.',
      scores: null,
      needsManualReview: true,
    };
  }

  if (validCandidates.length === 1) {
    return {
      winner: validCandidates[0].index,
      policy: 'judge',
      confidence: 1.0,
      reason: 'Only one valid candidate file — selected by default.',
      scores: null,
      needsManualReview: false,
    };
  }

  const mediaPaths = validCandidates.map(c => c.path);
  const evaluationPrompt = buildEvaluationPrompt(prompt, validCandidates.length, hasReferenceImages, mediaType);

  log.info(`🏆 [Hero Selection] Judging ${validCandidates.length} ${mediaType} candidates via Gemini...`);

  try {
    const result = await generateMultimodalJSON(evaluationPrompt, mediaPaths, {
      temperature: 0.3,
    });

    // Validate the response shape
    const winner = typeof result.winner === 'number' ? result.winner : 0;
    const confidence = typeof result.confidence === 'number'
      ? Math.max(0, Math.min(1, result.confidence))
      : 0.5;
    const reasoning = result.reasoning || result.reason || 'No reasoning provided.';
    const scores = Array.isArray(result.scores) ? result.scores : null;

    // Confidence threshold check
    if (confidence < confidenceThreshold) {
      log.warn(`🏆 [Hero Selection] Judge confidence ${confidence.toFixed(2)} < threshold ${confidenceThreshold}. Routing to manual review.`);
      return {
        winner,
        policy: 'judge',
        confidence,
        reason: `Judge chose candidate ${winner} but confidence (${confidence.toFixed(2)}) is below threshold (${confidenceThreshold}). Manual review recommended.`,
        scores,
        needsManualReview: true,
      };
    }

    log.success(`🏆 [Hero Selection] Judge selected candidate ${winner} with confidence ${confidence.toFixed(2)}`);
    return {
      winner,
      policy: 'judge',
      confidence,
      reason: reasoning,
      scores,
      needsManualReview: false,
    };
  } catch (err) {
    log.error(`🏆 [Hero Selection] Judge failed: ${err.message}. Falling back to 'first'.`);
    return {
      winner: 0,
      policy: 'judge',
      confidence: null,
      reason: `Judge evaluation failed (${err.message}). Fell back to first candidate.`,
      scores: null,
      needsManualReview: false,
    };
  }
}

function buildEvaluationPrompt(originalPrompt, candidateCount, hasReferenceImages, mediaType) {
  const mediaLabel = mediaType === 'video' ? 'video clip' : 'image';
  const referenceNote = hasReferenceImages
    ? 'Reference images WERE provided during generation. Evaluate whether the output preserves reference content (character identity, product labels, brand elements) faithfully.'
    : 'No reference images were used. Skip the Reference Fidelity criterion.';

  return `You are a creative director evaluating which AI-generated ${mediaLabel} candidate best matches the original generation prompt.

ORIGINAL PROMPT:
${originalPrompt}

REFERENCE IMAGES: ${hasReferenceImages ? 'Yes (provided during generation)' : 'No'}
${referenceNote}

NUMBER OF CANDIDATES: ${candidateCount}
The ${candidateCount} ${mediaLabel}(s) are attached in order (candidate 0, candidate 1, etc.).

For each candidate, evaluate on a 0–10 scale:
1. **Prompt Adherence**: Does the output match what was described in the prompt? Are the requested elements present?
2. **Reference Fidelity**: ${hasReferenceImages ? 'Does it preserve the identity, product details, and visual elements from the reference images?' : 'N/A — skip this criterion.'}
3. **Technical Quality**: Resolution sharpness, absence of artifacts, visual coherence, realistic lighting.
4. **Text Accuracy**: Are any product labels, brand names, or text elements rendered correctly and legibly?
5. **Authenticity**: Does the output feel like genuine UGC (user-generated content) with a natural, casual feel — not overly polished or synthetic?

Return a JSON object with this exact structure:
{
  "winner": <0-indexed candidate number that is the best overall>,
  "confidence": <0.0 to 1.0 — how confident are you in this selection? 1.0 = clearly the best, 0.5 = close call>,
  "reasoning": "<one paragraph explaining why this candidate won>",
  "scores": [
    {
      "candidate": 0,
      "promptAdherence": <0-10>,
      "referenceFidelity": <0-10>,
      "technicalQuality": <0-10>,
      "textAccuracy": <0-10>,
      "authenticity": <0-10>,
      "total": <sum of applicable scores>
    }
  ]
}

Be specific and decisive. If candidates are nearly identical, still pick a winner and note the close call in your reasoning.`;
}

export default { selectHero };
