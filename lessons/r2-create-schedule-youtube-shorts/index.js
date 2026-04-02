import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../../shared/logger.js';
import { buildTemplateModel, inferProjectName, sanitizeSlug } from './template.js';
import { loadLocalRecords } from './sources/local-files.js';
import { generateGeminiTranscriptRecords } from './sources/gemini-transcript.js';
import { advanceState, loadState, normalizeRecords, saveState, selectRecords, summarizeDataset } from './records.js';
import { generateSayAudio } from './audio/macos-say.js';
import { generateElevenLabsAudio } from './audio/elevenlabs.js';
import { renderLocalShort } from './renderers/local-ffmpeg.js';
import { renderJson2VideoShort } from './renderers/json2video.js';
import { publishLocalQueue } from './publishers/local-queue.js';
import { publishBlotato } from './publishers/blotato.js';
import { saveManifest, savePlan, saveReport } from './manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    configPath: null,
  };

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    options.configPath = resolve(args[configIndex + 1]);
  }

  return options;
}

async function loadUserConfig(configPath) {
  if (!configPath) return null;
  const raw = await readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

function toPositiveInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return null;
  return Math.floor(number);
}

function buildDefaultConfig(templateModel) {
  return {
    projectName: `${inferProjectName(templateModel)}-local`,
    datasetProvider: 'local-files',
    datasetPath: './inputs/sample-quotes.json',
    transcriptPath: './inputs/sample-transcript.txt',
    batchSize: 1,
    startIndex: null,
    advanceState: true,
    statePath: './state/state.json',
    ttsProvider: 'macos-say',
    videoRenderer: 'local-ffmpeg',
    publisher: 'local-queue',
    backgroundVideoPath: './assets/original/Sample video background for Json2Video.mp4',
    gemini: {
      count: 20,
      timeoutMs: 120000,
    },
    macosSay: {
      sayVoice: 'Samantha',
      rateWpm: 185,
    },
    subtitles: {
      maxLineLength: 22,
      fontName: 'Arial',
      fontSize: 18,
      outline: 2,
      alignment: 5,
      marginV: 360,
    },
    blotato: {
      apiKeyEnvVar: 'BLOTATO_API_KEY',
      envPath: null,
      baseUrl: 'https://backend.blotato.com/v2',
      accountId: null,
      accountUsername: null,
      accountFullName: null,
      privacyStatus: templateModel.youtube.privacyStatus || 'public',
      notifySubscribers: false,
      selfDeclaredMadeForKids: Boolean(templateModel.youtube.madeForKids),
      containsSyntheticMedia: true,
      scheduledTime: null,
      useNextFreeSlot: false,
      pollStatus: true,
      pollIntervalMs: 2000,
      maxPolls: 12,
    },
  };
}

function normalizeConfig(userConfig, templateModel, configBaseDir) {
  const defaults = buildDefaultConfig(templateModel);
  const merged = {
    ...defaults,
    ...userConfig,
    gemini: {
      ...defaults.gemini,
      ...(userConfig?.gemini || {}),
    },
    macosSay: {
      ...defaults.macosSay,
      ...(userConfig?.macosSay || {}),
    },
    subtitles: {
      ...defaults.subtitles,
      ...(userConfig?.subtitles || {}),
    },
    blotato: {
      ...defaults.blotato,
      ...(userConfig?.blotato || {}),
    },
  };

  return {
    ...merged,
    batchSize: Math.max(1, toPositiveInteger(merged.batchSize) || 1),
    startIndex: merged.startIndex === null || merged.startIndex === undefined
      ? null
      : Math.max(1, toPositiveInteger(merged.startIndex) || 1),
    datasetPath: resolve(configBaseDir, merged.datasetPath),
    transcriptPath: resolve(configBaseDir, merged.transcriptPath),
    statePath: resolve(configBaseDir, merged.statePath),
    backgroundVideoPath: resolve(configBaseDir, merged.backgroundVideoPath),
    configBaseDir,
  };
}

function buildPlan({ templateModel, config, stateBefore, datasetSummary, selectedRecords }) {
  return {
    lesson: templateModel.lessonName,
    blueprint: {
      templatePath: templateModel.templatePath,
      scenarioName: templateModel.scenarioName,
      flowModules: templateModel.flowModules,
      sheet: templateModel.sheet,
      audio: templateModel.audio,
      video: templateModel.video,
      youtube: templateModel.youtube,
      destinations: templateModel.originalDestinations,
    },
    localReplacements: [
      {
        original: 'google-sheets:filterRows / updateRow',
        local: 'Local dataset loading + persistent JSON cursor',
      },
      {
        original: 'elevenlabs:createTextToSpeech',
        local: `${config.ttsProvider} provider interface`,
      },
      {
        original: 'dropbox:uploadLargeFile + createShareLink',
        local: 'Local audio files on disk',
      },
      {
        original: 'json2video movie render',
        local: `${config.videoRenderer} local short renderer`,
      },
      {
        original: 'youtube:uploadVideo',
        local: `${config.publisher} publisher adapter (Blotato for live publish)`,
      },
    ],
    run: {
      datasetProvider: config.datasetProvider,
      datasetPath: config.datasetPath,
      transcriptPath: config.transcriptPath,
      publisher: config.publisher,
      batchSize: config.batchSize,
      nextIndex: stateBefore.nextIndex,
      datasetSummary,
      selectedRecordIndices: selectedRecords.map((record) => record.index),
    },
  };
}

async function loadRecordsForRun({ args, config, stateBefore }) {
  if (config.datasetProvider === 'gemini-transcript') {
    if (args.dryRun) {
      return {
        provider: 'gemini-transcript',
        sourcePath: config.transcriptPath,
        baseDir: config.configBaseDir,
        format: 'json',
        records: [],
        notes: [
          `Dry run only: Gemini would generate ${config.gemini.count} record(s) from ${config.transcriptPath}.`,
        ],
      };
    }

    return generateGeminiTranscriptRecords({
      config,
      startIndex: config.startIndex ?? stateBefore.nextIndex,
    });
  }

  return loadLocalRecords({
    datasetPath: config.datasetPath,
  });
}

function resolveBackgroundVideo(record, config, sourceResult) {
  const candidate = record.backgroundVideoPath
    ? resolve(sourceResult.baseDir || config.configBaseDir, record.backgroundVideoPath)
    : config.backgroundVideoPath;

  return candidate;
}

async function createAudioArtifacts({ records, config, outputDir }) {
  const audioDir = join(outputDir, 'audio');
  const artifacts = [];

  for (const record of records) {
    try {
      let artifact = null;
      const outputPath = join(audioDir, `${String(record.index).padStart(3, '0')}-${record.slug}.aiff`);

      switch (config.ttsProvider) {
        case 'elevenlabs':
          artifact = await generateElevenLabsAudio({
            record,
            outputPath,
            config,
          });
          break;
        case 'macos-say':
        default:
          artifact = await generateSayAudio({
            record,
            outputPath,
            config: config.macosSay,
          });
          break;
      }

      artifacts.push(artifact);
    } catch (error) {
      artifacts.push({
        index: record.index,
        provider: config.ttsProvider,
        path: null,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return artifacts;
}

async function createVideoArtifacts({ records, audioArtifacts, sourceResult, config, outputDir }) {
  const videoDir = join(outputDir, 'videos');
  const audioByIndex = new Map(audioArtifacts.map((artifact) => [artifact.index, artifact]));
  const artifacts = [];

  for (const record of records) {
    const audioArtifact = audioByIndex.get(record.index);
    if (!audioArtifact?.path) {
      artifacts.push({
        index: record.index,
        renderer: config.videoRenderer,
        path: null,
        status: 'blocked',
        error: 'Missing audio artifact.',
      });
      continue;
    }

    try {
      let artifact = null;
      const backgroundVideoPath = resolveBackgroundVideo(record, config, sourceResult);
      const outputPath = join(videoDir, `${String(record.index).padStart(3, '0')}-${record.slug}.mp4`);

      switch (config.videoRenderer) {
        case 'json2video':
          artifact = await renderJson2VideoShort({
            record,
            audioArtifact,
            backgroundVideoPath,
            outputPath,
            config,
          });
          break;
        case 'local-ffmpeg':
        default:
          artifact = await renderLocalShort({
            record,
            audioArtifact,
            backgroundVideoPath,
            outputPath,
            subtitlesConfig: config.subtitles,
          });
          break;
      }

      artifacts.push(artifact);
    } catch (error) {
      artifacts.push({
        index: record.index,
        renderer: config.videoRenderer,
        path: null,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return artifacts;
}

async function runPublisher({ config, records, videoArtifacts, outputDir }) {
  switch (config.publisher) {
    case 'blotato':
      return publishBlotato({ records, videoArtifacts, outputDir, config });
    case 'local-queue':
    default:
      return publishLocalQueue({ records, videoArtifacts, outputDir, config });
  }
}

function shouldAdvanceState(config, publisherResult) {
  if (!config.advanceState) return false;
  return ['queued', 'published', 'scheduled', 'submitted'].includes(publisherResult.status);
}

async function saveDataArtifacts({ outputDir, sourceResult, normalizedRecords, selectedRecords }) {
  const dataDir = join(outputDir, 'data');
  await mkdir(dataDir, { recursive: true });

  const artifacts = {
    normalizedRecordsPath: join(dataDir, 'records.json'),
    selectedRecordsPath: join(dataDir, 'selected-records.json'),
  };

  await writeFile(artifacts.normalizedRecordsPath, JSON.stringify(normalizedRecords, null, 2));
  await writeFile(artifacts.selectedRecordsPath, JSON.stringify(selectedRecords, null, 2));

  if (sourceResult.prompt) {
    artifacts.promptPath = join(dataDir, 'gemini-prompt.txt');
    await writeFile(artifacts.promptPath, `${sourceResult.prompt}\n`);
  }

  if (sourceResult.rawResponse) {
    artifacts.rawResponsePath = join(dataDir, 'gemini-raw-response.txt');
    await writeFile(artifacts.rawResponsePath, `${sourceResult.rawResponse}\n`);
  }

  return artifacts;
}

async function main() {
  const args = parseArgs();
  const templateModel = await buildTemplateModel();
  const userConfig = await loadUserConfig(args.configPath);
  const configBaseDir = args.configPath ? dirname(args.configPath) : __dirname;
  const config = normalizeConfig(userConfig, templateModel, configBaseDir);
  const stateBefore = await loadState(config.statePath, config.startIndex ?? 1);
  const sourceResult = await loadRecordsForRun({ args, config, stateBefore });
  const normalizedRecords = normalizeRecords(sourceResult.records || []);
  const datasetSummary = summarizeDataset(normalizedRecords);
  const selectedRecords = selectRecords(normalizedRecords, stateBefore, config);
  const outputDir = join(
    __dirname,
    'output',
    `${sanitizeSlug(config.projectName || 'r2-youtube-shorts')}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  );

  await mkdir(outputDir, { recursive: true });

  log.header(templateModel.lessonName);
  log.info(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE RUN'}`);
  log.info(`Dataset provider: ${config.datasetProvider}`);
  log.info(`TTS provider: ${config.ttsProvider}`);
  log.info(`Video renderer: ${config.videoRenderer}`);
  log.info(`Publisher: ${config.publisher}`);
  log.info(`Output: ${outputDir}`);

  const plan = buildPlan({
    templateModel,
    config,
    stateBefore,
    datasetSummary,
    selectedRecords,
  });
  const planPath = await savePlan(outputDir, plan);

  let dataArtifacts = null;
  let audioArtifacts = [];
  let videoArtifacts = [];
  let publisherResult = {
    publisher: config.publisher,
    status: args.dryRun ? 'planned' : 'blocked',
    items: [],
    notes: args.dryRun
      ? ['Dry run only. Audio generation, video rendering, and publishing were skipped.']
      : ['No eligible records were selected.'],
  };

  if (selectedRecords.length && !args.dryRun) {
    dataArtifacts = await saveDataArtifacts({
      outputDir,
      sourceResult,
      normalizedRecords,
      selectedRecords,
    });

    audioArtifacts = await createAudioArtifacts({
      records: selectedRecords,
      config,
      outputDir,
    });

    videoArtifacts = await createVideoArtifacts({
      records: selectedRecords,
      audioArtifacts,
      sourceResult,
      config,
      outputDir,
    });

    publisherResult = await runPublisher({
      config,
      records: selectedRecords,
      videoArtifacts,
      outputDir,
    });
  } else if (selectedRecords.length && args.dryRun) {
    dataArtifacts = await saveDataArtifacts({
      outputDir,
      sourceResult,
      normalizedRecords,
      selectedRecords,
    });
  }

  const stateAfter = advanceState({
    state: stateBefore,
    selectedRecords,
    outputDir,
    publisherResult,
    shouldAdvance: shouldAdvanceState(config, publisherResult),
  });

  if (!args.dryRun && shouldAdvanceState(config, publisherResult)) {
    await saveState(config.statePath, stateAfter);
  }

  const manifestPath = await saveManifest({
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
  });

  const reportPath = await saveReport({
    outputDir,
    mode: args.dryRun ? 'dry-run' : 'live-run',
    templateModel,
    config,
    sourceResult,
    datasetSummary,
    selectedRecords,
    publisherResult,
    stateBefore,
    stateAfter,
  });

  log.success(`Plan saved: ${planPath}`);
  log.success(`Manifest saved: ${manifestPath}`);
  log.success(`Report saved: ${reportPath}`);
}

main().catch((error) => {
  log.error(error.stack || error.message);
  process.exitCode = 1;
});
