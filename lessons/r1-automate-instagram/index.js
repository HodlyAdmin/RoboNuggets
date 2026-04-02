import { existsSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../../shared/logger.js';
import { buildTemplateModel, inferProjectName, sanitizeSlug } from './template.js';
import { loadLocalRecords } from './sources/local-files.js';
import { generateGeminiRecords } from './sources/gemini-browser.js';
import { advanceState, loadState, normalizeRecords, saveState, selectRecords, summarizeDataset } from './records.js';
import { renderQuoteCard } from './renderers/card.js';
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
  const projectName = `${inferProjectName(templateModel) || 'r1-automate-instagram'}-365`;

  return {
    projectName,
    datasetProvider: 'local-files',
    datasetPath: './inputs/sample-quotes.json',
    batchSize: 1,
    startIndex: null,
    advanceState: true,
    statePath: './state/state.json',
    publisher: 'blotato',
    card: {
      width: 1080,
      height: 1350,
      handle: templateModel.instagram.handle || '@navalism101',
      footerLabel: 'R1 Blotato publish candidate',
      backgroundStart: '#0f172a',
      backgroundEnd: '#312e81',
      accent: '#f59e0b',
      text: '#f8fafc',
      secondaryText: '#cbd5e1',
    },
    gemini: {
      count: 12,
      author: 'Naval Ravikant',
      theme: 'wealth, leverage, compounding, peace of mind',
      timeoutMs: 120000,
    },
    blotato: {
      apiKeyEnvVar: 'BLOTATO_API_KEY',
      envPath: null,
      baseUrl: 'https://backend.blotato.com/v2',
      platform: 'instagram',
      accountId: null,
      accountUsername: (templateModel.instagram.handle || '@navalism101').replace(/^@/, ''),
      mediaType: null,
      shareToFeed: true,
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
    card: {
      ...defaults.card,
      ...(userConfig?.card || {}),
    },
    gemini: {
      ...defaults.gemini,
      ...(userConfig?.gemini || {}),
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
    statePath: resolve(configBaseDir, merged.statePath),
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
      dropbox: templateModel.dropbox,
      instagram: templateModel.instagram,
    },
    localReplacements: [
      {
        original: 'util:FunctionIncrement',
        local: 'Persistent JSON state cursor',
      },
      {
        original: 'google-sheets:filterRows',
        local: `${config.datasetProvider} dataset provider`,
      },
      {
        original: 'dropbox:createShareLink',
        local: 'Local image reuse or Chrome-rendered card PNG',
      },
      {
        original: 'instagram-business:CreatePostPhoto',
        local: `${config.publisher} publisher adapter`,
      },
    ],
    run: {
      datasetProvider: config.datasetProvider,
      datasetPath: config.datasetPath,
      publisher: config.publisher,
      batchSize: config.batchSize,
      nextIndex: stateBefore.nextIndex,
      datasetSummary,
      selectedRecordIndices: selectedRecords.map((record) => record.index),
    },
  };
}

async function loadRecordsForRun({ args, config, stateBefore }) {
  if (config.datasetProvider === 'gemini-browser') {
    if (args.dryRun) {
      return {
        provider: 'gemini-browser',
        sourcePath: null,
        baseDir: config.configBaseDir,
        format: 'json',
        records: [],
        notes: [
          `Dry run only: Gemini would generate ${config.gemini.count} draft record(s) starting at index ${config.startIndex ?? stateBefore.nextIndex}.`,
        ],
      };
    }

    return generateGeminiRecords({
      config,
      startIndex: config.startIndex ?? stateBefore.nextIndex,
    });
  }

  return loadLocalRecords({
    datasetPath: config.datasetPath,
  });
}

function resolveImagePath(record, sourceResult, config) {
  if (!record.imagePath) return null;

  const candidate = record.imagePath.startsWith('/')
    ? record.imagePath
    : resolve(sourceResult.baseDir || config.configBaseDir, record.imagePath);

  return existsSync(candidate) ? candidate : null;
}

async function createImageArtifacts({ records, sourceResult, config, outputDir }) {
  const cardsDir = join(outputDir, 'cards');
  const artifacts = [];

  for (const record of records) {
    const existingImagePath = resolveImagePath(record, sourceResult, config);
    if (existingImagePath) {
      artifacts.push({
        index: record.index,
        path: existingImagePath,
        renderer: 'existing-file',
        status: 'reused',
      });
      continue;
    }

    const outputPath = join(cardsDir, `${String(record.index).padStart(3, '0')}-${record.slug}.png`);
    const artifact = await renderQuoteCard({
      record,
      outputPath,
      cardConfig: config.card,
    });
    artifacts.push(artifact);
  }

  return artifacts;
}

async function runPublisher({ config, records, imageArtifacts, outputDir, templateModel }) {
  switch (config.publisher) {
    case 'blotato':
      return publishBlotato({ records, imageArtifacts, outputDir, templateModel, config });
    case 'local-queue':
    default:
      return publishLocalQueue({ records, imageArtifacts, outputDir, templateModel, config });
  }
}

function shouldAdvanceState(config, publisherResult) {
  if (!config.advanceState) return false;
  return ['prepared', 'queued', 'completed', 'published', 'scheduled', 'submitted'].includes(publisherResult.status);
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
    artifacts.rawResponsePath = join(dataDir, 'gemini-response.txt');
    await writeFile(artifacts.rawResponsePath, `${sourceResult.rawResponse}\n`);
  }

  return artifacts;
}

async function run() {
  const args = parseArgs();
  const templateModel = await buildTemplateModel();
  const userConfig = await loadUserConfig(args.configPath);
  const configBaseDir = args.configPath ? dirname(args.configPath) : __dirname;
  const config = normalizeConfig(userConfig, templateModel, configBaseDir);
  const stateBefore = await loadState(config.statePath, config.startIndex || 1);
  const outputDir = join(
    __dirname,
    'output',
    `${sanitizeSlug(config.projectName)}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  );

  log.header(templateModel.lessonName);
  log.info(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`);
  log.info(`Dataset provider: ${config.datasetProvider}`);
  log.info(`Publisher: ${config.publisher}`);
  log.info(`Batch size: ${config.batchSize}`);
  log.info(`Next index: ${stateBefore.nextIndex}`);
  log.info(`Output: ${outputDir}`);

  const sourceResult = await loadRecordsForRun({
    args,
    config,
    stateBefore,
  });
  const normalizedRecords = normalizeRecords(sourceResult.records || []);
  const datasetSummary = summarizeDataset(normalizedRecords);
  const selectedRecords = selectRecords(normalizedRecords, stateBefore, config);
  const plan = buildPlan({
    templateModel,
    config,
    stateBefore,
    datasetSummary,
    selectedRecords,
  });

  const planPath = await savePlan(outputDir, plan);
  log.success(`Plan saved: ${planPath}`);

  let dataArtifacts = null;
  let imageArtifacts = [];
  let publisherResult = {
    publisher: config.publisher,
    status: args.dryRun ? 'planned' : 'skipped',
    items: [],
    notes: [],
  };

  if (!args.dryRun) {
    dataArtifacts = await saveDataArtifacts({
      outputDir,
      sourceResult,
      normalizedRecords,
      selectedRecords,
    });

    if (selectedRecords.length) {
      log.step(1, `Preparing ${selectedRecords.length} record(s)`);
      imageArtifacts = await createImageArtifacts({
        records: selectedRecords,
        sourceResult,
        config,
        outputDir,
      });

      log.step(2, `Running ${config.publisher} publisher`);
      publisherResult = await runPublisher({
        config,
        records: selectedRecords,
        imageArtifacts,
        outputDir,
        templateModel,
      });
    } else {
      publisherResult = {
        publisher: config.publisher,
        status: 'skipped',
        items: [],
        notes: [
          datasetSummary.totalRecords
            ? 'No eligible records were available at or after the current state cursor.'
            : 'No records were loaded, so the run ended without preparing posts.',
        ],
      };
      log.warn(publisherResult.notes[0]);
    }
  } else if (config.datasetProvider === 'local-files') {
    log.info(`Local dataset inspection: ${datasetSummary.totalRecords} record(s) found.`);
  }

  const stateAfter = advanceState({
    state: stateBefore,
    selectedRecords,
    outputDir,
    publisherResult,
    shouldAdvance: shouldAdvanceState(config, publisherResult),
  });

  if (!args.dryRun) {
    const statePath = await saveState(config.statePath, stateAfter);
    log.success(`State saved: ${statePath}`);
  }

  const manifestPath = await saveManifest({
    outputDir,
    templateModel,
    config,
    sourceResult,
    datasetSummary,
    selectedRecords,
    imageArtifacts,
    publisherResult,
    stateBefore,
    stateAfter,
    dataArtifacts,
  });

  const reportPath = await saveReport({
    outputDir,
    mode: args.dryRun ? 'dry-run' : 'live',
    templateModel,
    config,
    sourceResult,
    datasetSummary,
    selectedRecords,
    publisherResult,
    stateBefore,
    stateAfter,
  });

  log.success(`Manifest saved: ${manifestPath}`);
  log.success(`Report saved: ${reportPath}`);
}

run().catch((error) => {
  log.error(error.stack || error.message);
  process.exitCode = 1;
});
