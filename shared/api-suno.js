import { log } from './logger.js';
import dotenv from 'dotenv';
dotenv.config();

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeType(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parseDuration(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreCompletedTrack(track, requestedModel, indexById) {
  const type = normalizeType(track?.type);
  const requestedModelKey = normalizeText(requestedModel);
  const modelKey = normalizeText(track?.model_name);

  let score = 0;

  if (type === 'gen') {
    score += 1000;
  } else if (type === 'extend' || type === 'continue') {
    score += 900;
  } else if (type === 'preview') {
    score += 100;
  } else {
    score += 500;
  }

  if (requestedModelKey && modelKey) {
    if (modelKey === requestedModelKey) {
      score += 100;
    } else if (modelKey.includes(requestedModelKey) || requestedModelKey.includes(modelKey)) {
      score += 50;
    }
  }

  score += Math.round(parseDuration(track?.duration));

  const kickoffIndex = indexById.get(track?.id);
  if (Number.isInteger(kickoffIndex)) {
    score -= kickoffIndex;
  }

  return score;
}

function rankCompletedTracks(tracks, requestedModel, kickoffIds) {
  const indexById = new Map(kickoffIds.map((id, index) => [id, index]));

  return tracks
    .filter(track => track?.status === 'complete' && track?.audio_url)
    .sort((left, right) => {
      const scoreDiff =
        scoreCompletedTrack(right, requestedModel, indexById) -
        scoreCompletedTrack(left, requestedModel, indexById);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (indexById.get(left?.id) ?? Number.MAX_SAFE_INTEGER) -
        (indexById.get(right?.id) ?? Number.MAX_SAFE_INTEGER);
    });
}

function isPreferredPrimaryTrack(track) {
  const type = normalizeType(track?.type);
  return type !== 'preview';
}

/**
 * Trigger generation via the local Suno hybrid API wrapper.
 * Assumes a local suno-wrapper service running at http://localhost:3000.
 * 
 * @param {object} params
 * @param {string} params.prompt      Lyric payload or description
 * @param {string} params.tags        Style tags (e.g. lofi hip hop)
 * @param {string} params.title       Song title
 * @param {boolean} params.make_instrumental True if instrumental
 * @param {string} params.baseUrl     Base URL of the Suno wrapper API
 * @param {string} params.model       Optional Suno model identifier
 * @returns {Array<{id, audio_url, title}>} Array of generated tracks
 */
export async function generateSunoTrack(params) {
  const { prompt, tags, title, make_instrumental, baseUrl = 'http://localhost:3000', model = null } = params;
  
  log.info(`🎵 API Request to ${baseUrl}/api/custom_generate`);
  log.info(`   Title: ${title} | Tags: ${tags}`);

  const payload = {
    prompt: prompt || '',
    tags: tags || '',
    title: title || '',
    make_instrumental: make_instrumental === true,
    wait_audio: false // We will poll manually so we get logs
  };

  if (model) {
    payload.model = model;
    log.info(`   Model: ${model}`);
  }

  const start = Date.now();
  let res;
  try {
    res = await fetch(`${baseUrl}/api/custom_generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new Error(`Failed to connect to Suno API Wrapper at ${baseUrl}. Ensure the local wrapper is running. (${err.message})`);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Suno API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const tracks = data || [];
  
  if (tracks.length === 0) {
    throw new Error('Suno API returned no tracks in the job kickoff response.');
  }

  // The tracks returned are usually two IDs representing the job
  const trackIds = tracks.map(t => t.id).filter(id => id);
  log.success(`   Job accepted. Task IDs: ${trackIds.join(', ')}`);

  // Start polling
  log.info('   Polling for MP3 generation (this takes ~1-3 minutes)...');
  
  const timeoutMs = 5 * 60 * 1000; // 5 minutes max
  let completedTracks = [];
  let fallbackSelectionDeadline = null;
  
  while ((Date.now() - start) < timeoutMs) {
    // Wait 10 seconds between polls
    await new Promise(r => setTimeout(r, 10000));
    
    try {
      const pollRes = await fetch(`${baseUrl}/api/get?ids=${trackIds.join(',')}`);
      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();

      const finished = rankCompletedTracks(pollData, model, trackIds);
      const preferredFinished = finished.filter(isPreferredPrimaryTrack);
      const pending = pollData.filter(t => !['complete', 'error'].includes(t.status));
      const allTerminal = pending.length === 0;

      if (preferredFinished.length > 0) {
        const primaryTrack = preferredFinished[0];
        log.success(`   ✅ Preferred MP3 selected: ${primaryTrack.id} (${primaryTrack.type || 'default'})`);
        completedTracks = finished;
        break;
      }

      if (finished.length > 0) {
        if (!fallbackSelectionDeadline) {
          fallbackSelectionDeadline = Date.now() + 45000;
          log.info('   A preview/secondary clip finished first. Waiting up to 45s for a preferred full generation...');
        }

        if (allTerminal || Date.now() >= fallbackSelectionDeadline) {
          log.success(`   ✅ Fallback MP3 selected: ${finished[0].id} (${finished[0].type || 'default'})`);
          completedTracks = finished;
          break;
        }
      }
      
      // Print heartbeat
      log.info(`   ...still generating (${Math.round((Date.now() - start)/1000)}s elapsed)`);
      
      // Detect specific errors inside the task payload
      const errors = pollData.filter(t => t.status === 'error');
      if (errors.length > 0 && allTerminal && finished.length === 0) {
        throw new Error(`Task failed in Suno backend for ID: ${errors[0].id}. Check Suno account credits/cookie.`);
      }

    } catch (pollErr) {
      log.warn(`   Polling network drop (ignoring): ${pollErr.message}`);
    }
  }

  if (completedTracks.length === 0) {
    throw new Error('Timed out waiting for Suno MP3 generation (exceeded 5 minutes)');
  }

  return completedTracks;
}
