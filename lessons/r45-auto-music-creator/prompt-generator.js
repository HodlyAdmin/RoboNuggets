/**
 * R45 Prompt Generator — Song Concept & Timestamp Creator
 * Replaces the "Ideator and Timestamp GPT for R45" custom ChatGPT
 * Supports Gemini plus local non-Gemini intake sources.
 */
import { readFile } from 'fs/promises';
import { generateJSON } from '../../shared/api-gemini.js';
import { log } from '../../shared/logger.js';

const SUNO_INSTRUMENTAL_PROMPT_MAX_CHARS = 180;

const SONG_CONCEPT_PROMPT = `You are a professional music producer and creative director. Given a theme and style, generate detailed song concepts for an AI music album.

For each song, provide:
- title: A creative, evocative song title (prefer 6 words or fewer)
- prompt: A detailed music generation prompt describing the mood, instruments, tempo, and feel
- style: Genre/style tags (comma-separated)
- instrumental: Whether the song should be instrumental (true/false)
- estimatedDuration: Estimated duration in seconds (90-180)

Return a JSON array of song objects. Be creative and varied — each song should feel distinct while fitting the overall album theme.

Important behavior from the original R45 workflow:
- If instrumental is false, the prompt should be the lyrics of the song itself, with no extra commentary.
- Do not label sections with words like Verse, Chorus, Bridge, or Intro.
- If the user requests a target song length, reflect that in the lyrics length for vocal songs.
- If the song is instrumental and a target length is requested, include that duration request naturally inside the prompt.
- Enrich the user's style/description meaningfully, but keep all fields non-empty and music-industry appropriate.

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.`;

function normalizeSong(song, fallbackStyle, fallbackInstrumental, index) {
  const estimatedDuration = Number(song?.estimatedDuration);

  return {
    title: (song?.title || `Track ${index + 1}`).trim(),
    prompt: (song?.prompt || `Create an original ${fallbackStyle} track.`).trim(),
    style: (song?.style || fallbackStyle).trim(),
    instrumental: typeof song?.instrumental === 'boolean'
      ? song.instrumental
      : fallbackInstrumental,
    estimatedDuration: Number.isFinite(estimatedDuration)
      ? Math.min(180, Math.max(90, Math.round(estimatedDuration)))
      : 120,
  };
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function clipText(value, maxLength = 80) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function cleanPromptFragment(value, maxLength = 80) {
  return clipText(value, maxLength)
    .replace(/[.;:,]+$/g, '')
    .trim();
}

function joinPromptFragments(fragments, maxLength = SUNO_INSTRUMENTAL_PROMPT_MAX_CHARS) {
  const parts = [];

  for (const rawFragment of fragments) {
    const fragment = cleanPromptFragment(rawFragment, maxLength);
    if (!fragment) continue;

    const separator = parts.length > 0 ? '; ' : '';
    const current = parts.join('; ');
    const nextLength = current.length + separator.length + fragment.length;

    if (nextLength <= maxLength) {
      parts.push(fragment);
      continue;
    }

    const remaining = maxLength - current.length - separator.length;
    if (remaining >= 20) {
      parts.push(cleanPromptFragment(fragment, remaining));
    }
    break;
  }

  return parts.join('; ');
}

function extractIdeaEntries(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  return Array.isArray(parsed.ideas)
    ? parsed.ideas
    : Array.isArray(parsed.ideaSeeds)
      ? parsed.ideaSeeds
      : Array.isArray(parsed.seeds)
        ? parsed.seeds
        : Array.isArray(parsed.concepts)
          ? parsed.concepts
          : Array.isArray(parsed.songs)
            ? parsed.songs
            : null;
}

function normalizeIdeaSeed(seed, index) {
  if (typeof seed === 'string') {
    return { idea: seed.trim(), _seedIndex: index };
  }

  if (seed && typeof seed === 'object') {
    return { ...seed, _seedIndex: index };
  }

  return { idea: `Track ${index + 1}`, _seedIndex: index };
}

function buildPromptFromIdea({ theme, musicStyle, instrumental, seed, variationLabel, songLengthHint }) {
  const focus = clipText(
    seed.prompt ||
    seed.idea ||
    seed.concept ||
    seed.focus ||
    seed.hook ||
    seed.scene ||
    seed.title ||
    `Track ${seed._seedIndex + 1}`,
    120
  );

  if (instrumental) {
    return joinPromptFragments([
      `${clipText(musicStyle, 70)} instrumental`,
      focus,
      seed.mood ? `mood ${clipText(seed.mood, 32)}` : '',
      seed.scene ? clipText(seed.scene, 52) : '',
      seed.instruments ? clipText(seed.instruments, 56) : '',
      seed.tempo ? `${clipText(seed.tempo, 18)}` : '',
      seed.energy ? `${clipText(seed.energy, 18)} energy` : '',
      songLengthHint ? `${clipText(songLengthHint, 24)}` : '',
      variationLabel ? variationLabel : '',
      'no vocals'
    ]);
  }

  const details = [
    `Create an original ${musicStyle} track for the album theme "${theme}".`,
    `Creative focus: ${focus}.`,
    seed.mood ? `Mood: ${clipText(seed.mood, 60)}.` : '',
    seed.scene ? `Scene: ${clipText(seed.scene, 80)}.` : '',
    seed.instruments ? `Feature these instruments or textures: ${clipText(seed.instruments, 80)}.` : '',
    seed.tempo ? `Tempo target: ${clipText(seed.tempo, 30)}.` : '',
    seed.energy ? `Energy level: ${clipText(seed.energy, 30)}.` : '',
    songLengthHint ? `Target song length: ${clipText(songLengthHint, 40)}.` : '',
    variationLabel ? `Distinct variation: ${variationLabel}.` : '',
    instrumental
      ? 'Instrumental only. No vocals.'
      : 'Write complete original singable lyrics only. Do not add section labels or extra commentary.'
  ].filter(Boolean);

  return details.join(' ');
}

function buildSongsFromIdeaSeeds(ideaSeeds, theme, musicStyle, instrumental, numSongs, songLengthHint = '') {
  const normalizedSeeds = ideaSeeds
    .map((seed, index) => normalizeIdeaSeed(seed, index))
    .filter(seed => {
      const hasSignal = [
        seed.prompt,
        seed.idea,
        seed.concept,
        seed.focus,
        seed.hook,
        seed.scene,
        seed.title
      ].some(value => String(value || '').trim().length > 0);

      return hasSignal;
    });

  if (normalizedSeeds.length === 0) {
    throw new Error('No usable idea seeds were found for local concept generation.');
  }

  const variationLabels = [
    'After Hours',
    'Night Shift',
    'Warm Reprise',
    'Rain Edit',
    'Focus Mix',
    'Daybreak Version'
  ];

  return Array.from({ length: numSongs }, (_, index) => {
    const baseSeed = normalizedSeeds[index % normalizedSeeds.length];
    const cycle = Math.floor(index / normalizedSeeds.length);
    const variationLabel = cycle > 0
      ? variationLabels[(cycle - 1) % variationLabels.length]
      : '';

    const rawTitle =
      baseSeed.title ||
      baseSeed.idea ||
      baseSeed.concept ||
      baseSeed.focus ||
      baseSeed.hook ||
      `Track ${index + 1}`;

    const titleBase = clipText(toTitleCase(rawTitle), 60) || `Track ${index + 1}`;
    const title = variationLabel ? `${titleBase} (${variationLabel})` : titleBase;

    const prompt = baseSeed.prompt
      ? `${String(baseSeed.prompt).trim()}${variationLabel ? ` Distinct variation: ${variationLabel}.` : ''}`
      : buildPromptFromIdea({
          theme,
          musicStyle,
          instrumental: typeof baseSeed.instrumental === 'boolean' ? baseSeed.instrumental : instrumental,
          seed: baseSeed,
          variationLabel,
          songLengthHint,
        });

    return normalizeSong({
      ...baseSeed,
      title,
      prompt,
      style: baseSeed.style || musicStyle,
      instrumental: typeof baseSeed.instrumental === 'boolean' ? baseSeed.instrumental : instrumental,
      estimatedDuration: baseSeed.estimatedDuration,
    }, musicStyle, instrumental, index);
  });
}

async function loadSongsFromFile(songConceptsPath, fallbackStyle, fallbackInstrumental, numSongs) {
  const raw = await readFile(songConceptsPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const sourceSongs = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.songs)
      ? parsed.songs
      : Array.isArray(parsed?.concepts)
        ? parsed.concepts
        : null;

  if (!sourceSongs || sourceSongs.length === 0) {
    throw new Error(`No songs found in ${songConceptsPath}`);
  }

  return sourceSongs
    .slice(0, numSongs)
    .map((song, index) => normalizeSong(song, fallbackStyle, fallbackInstrumental, index));
}

async function loadIdeaSeedsFromFile(ideaIntakePath) {
  const raw = await readFile(ideaIntakePath, 'utf-8');
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error(`Idea intake file is empty: ${ideaIntakePath}`);
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    const entries = extractIdeaEntries(parsed);
    if (!entries || entries.length === 0) {
      throw new Error(`No ideas found in ${ideaIntakePath}`);
    }
    return entries;
  }

  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error(`No ideas found in ${ideaIntakePath}`);
  }

  return lines;
}

const TIMESTAMP_PROMPT = `You are a YouTube video description writer. Given an array of songs with their titles and durations, generate YouTube-ready timestamps.

Format each timestamp as: MM:SS Song Title

Start from 00:00 for the first song. Calculate subsequent timestamps by adding previous durations.

Return a JSON object with:
- timestamps: A string with all timestamps (one per line)
- description: A 2-3 sentence album description for YouTube

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Generate song concepts from a theme
 * @param {object} options
 * @param {string} options.theme - Album theme (e.g., "Lofi Chill Beats for Studying")
 * @param {string} options.musicStyle - Style description (e.g., "lofi hip hop, chill")
 * @param {number} options.numSongs - Number of songs to generate
 * @param {boolean} options.instrumental - Whether songs should be instrumental
 * @returns {{songs: Array<{title, prompt, style, instrumental, estimatedDuration}>, meta: object}}
 */
export async function generateSongConcepts({
  theme,
  musicStyle,
  numSongs = 5,
  instrumental = true,
  songLengthHint = '',
  conceptProvider = 'auto',
  songConceptsPath = null,
  ideaIntakePath = null,
  ideaSeeds = [],
}) {
  log.step(1, `Generating ${numSongs} song concepts for theme: "${theme}"`);

  const provider = conceptProvider || 'auto';

  if (provider === 'saved-concepts' && !songConceptsPath) {
    throw new Error('conceptProvider "saved-concepts" requires songConceptsPath.');
  }

  if (provider === 'local-intake' && !ideaIntakePath && (!Array.isArray(ideaSeeds) || ideaSeeds.length === 0)) {
    throw new Error('conceptProvider "local-intake" requires ideaIntakePath or ideaSeeds.');
  }

  if (provider !== 'gemini' && songConceptsPath) {
    log.info(`Using saved song concepts from: ${songConceptsPath}`);
    const songs = await loadSongsFromFile(songConceptsPath, musicStyle, instrumental, numSongs);
    log.success(`Loaded ${songs.length} saved song concepts:`);
    songs.forEach((s, i) => log.info(`  ${i + 1}. "${s.title}" — ${s.style}`));
    return {
      songs,
      meta: {
        source: 'saved-concepts',
        sourcePath: songConceptsPath,
        requestedSongs: numSongs,
        loadedSongs: songs.length,
      }
    };
  }

  if (provider === 'local-intake' || (provider !== 'gemini' && (ideaIntakePath || (Array.isArray(ideaSeeds) && ideaSeeds.length > 0)))) {
    const localIdeaSeeds = ideaIntakePath
      ? await loadIdeaSeedsFromFile(ideaIntakePath)
      : ideaSeeds;

    if (ideaIntakePath) {
      log.info(`Using local idea intake from: ${ideaIntakePath}`);
    } else {
      log.info('Using inline idea seeds from config');
    }

    const songs = buildSongsFromIdeaSeeds(localIdeaSeeds, theme, musicStyle, instrumental, numSongs, songLengthHint);
    log.success(`Built ${songs.length} song concepts from local intake:`);
    songs.forEach((s, i) => log.info(`  ${i + 1}. "${s.title}" — ${s.style}`));
    return {
      songs,
      meta: {
        source: ideaIntakePath ? 'idea-intake-file' : 'idea-intake-inline',
        sourcePath: ideaIntakePath || null,
        seedCount: localIdeaSeeds.length,
        generatedSongs: songs.length,
      }
    };
  }

  const userPrompt = `Theme: ${theme}
Style: ${musicStyle}
Number of songs: ${numSongs}
Instrumental: ${instrumental}
${songLengthHint ? `Song length hint: ${songLengthHint}` : ''}

Generate ${numSongs} unique song concepts for this album.`;

  const rawSongs = await generateJSON(`${SONG_CONCEPT_PROMPT}\n\n${userPrompt}`);
  const songList = Array.isArray(rawSongs)
    ? rawSongs
    : Array.isArray(rawSongs?.songs)
      ? rawSongs.songs
      : null;

  if (!songList || songList.length === 0) {
    throw new Error('Gemini returned no song concepts.');
  }

  const songs = songList
    .slice(0, numSongs)
    .map((song, index) => normalizeSong(song, musicStyle, instrumental, index));

  if (songs.length !== numSongs) {
    log.warn(`Gemini returned ${songs.length}/${numSongs} song concepts. Continuing with the available tracks.`);
  }

  log.success(`Generated ${songs.length} song concepts:`);
  songs.forEach((s, i) => log.info(`  ${i + 1}. "${s.title}" — ${s.style}`));

  return {
    songs,
    meta: {
      source: 'gemini',
      requestedSongs: numSongs,
      generatedSongs: songs.length,
    }
  };
}

/**
 * Generate YouTube timestamps from song data
 * @param {Array<{title: string, duration: number}>} songs - Songs with actual durations
 * @returns {{timestamps: string, description: string}}
 */
export async function generateTimestamps(songs) {
  log.step('T', 'Generating YouTube timestamps');

  const songData = songs.map(s => ({
    title: s.title,
    durationSeconds: Math.round(s.duration),
  }));

  const result = await generateJSON(
    `${TIMESTAMP_PROMPT}\n\nSongs:\n${JSON.stringify(songData, null, 2)}`
  );

  log.success('Timestamps generated');
  log.info(result.timestamps);

  return result;
}

// CLI test mode
if (process.argv.includes('--test')) {
  log.header('R45 Prompt Generator — Test Mode');
  const { songs: concepts } = await generateSongConcepts({
    theme: 'Cyberpunk Synthwave Night Drive',
    musicStyle: 'synthwave, retrowave, electronic, 80s',
    numSongs: 3,
    instrumental: true,
  });
  console.log(JSON.stringify(concepts, null, 2));
}

export default { generateSongConcepts, generateTimestamps };
