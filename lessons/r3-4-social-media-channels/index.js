import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../../shared/logger.js';
import { buildTemplateModel, inferProjectName, sanitizeSlug } from './template.js';
import { loadLocalRecords } from './sources/local-files.js';
import { prepareArticleContext } from './sources/article-browser.js';
import { generateSocialDrafts } from './generation/gemini-browser.js';
import { advanceState, loadState, normalizeRecords, saveState, selectRecords, summarizeDataset } from './records.js';
import { renderSocialCard } from './renderers/social-card.js';
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
    datasetPath: './inputs/sample-articles.json',
    batchSize: 1,
    startIndex: null,
    advanceState: true,
    statePath: './state/state.json',
    generatorProvider: 'gemini-browser',
    publisher: 'local-queue',
    articleFetch: {
      maxArticleChars: 12000,
      navigationTimeoutMs: 120000,
      settleDelayMs: 2000,
    },
    generator: {
      timeoutMs: 120000,
    },
    card: {
      width: 1024,
      height: 1024,
      badgeLabel: 'R3 Social Draft',
    },
    blotato: {
      apiKeyEnvVar: 'BLOTATO_API_KEY',
      envPath: null,
      baseUrl: 'https://backend.blotato.com/v2',
      scheduledTime: null,
      useNextFreeSlot: false,
      pollStatus: true,
      pollIntervalMs: 2000,
      maxPolls: 12,
      targets: {
        twitter: {
          enabled: true,
          accountId: null,
          accountUsername: null,
          accountFullName: null,
        },
        linkedin: {
          enabled: true,
          accountId: null,
          accountUsername: null,
          accountFullName: null,
        },
        facebook: {
          enabled: true,
          accountId: null,
          accountUsername: null,
          accountFullName: null,
        },
        instagram: {
          enabled: true,
          accountId: null,
          accountUsername: null,
          accountFullName: null,
          shareToFeed: true,
        },
      },
    },
  };
}

function normalizeConfig(userConfig, templateModel, configBaseDir) {
  const defaults = buildDefaultConfig(templateModel);
  const merged = {
    ...defaults,
    ...userConfig,
    articleFetch: {
      ...defaults.articleFetch,
      ...(userConfig?.articleFetch || {}),
    },
    generator: {
      ...defaults.generator,
      ...(userConfig?.generator || {}),
    },
    card: {
      ...defaults.card,
      ...(userConfig?.card || {}),
    },
    blotato: {
      ...defaults.blotato,
      ...(userConfig?.blotato || {}),
      targets: {
        ...defaults.blotato.targets,
        ...(userConfig?.blotato?.targets || {}),
        twitter: {
          ...defaults.blotato.targets.twitter,
          ...(userConfig?.blotato?.targets?.twitter || {}),
        },
        linkedin: {
          ...defaults.blotato.targets.linkedin,
          ...(userConfig?.blotato?.targets?.linkedin || {}),
        },
        facebook: {
          ...defaults.blotato.targets.facebook,
          ...(userConfig?.blotato?.targets?.facebook || {}),
        },
        instagram: {
          ...defaults.blotato.targets.instagram,
          ...(userConfig?.blotato?.targets?.instagram || {}),
        },
      },
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
      sheet: templateModel.sheet,
      bitly: templateModel.bitly,
      research: templateModel.research,
      routes: templateModel.routes,
    },
    localReplacements: [
      {
        original: 'google-sheets:watchRows',
        local: 'Local dataset input plus persistent state cursor',
      },
      {
        original: 'bitly:shortenUrl',
        local: 'Passthrough link seam or record-provided short URL',
      },
      {
        original: 'Perplexity article summary',
        local: 'Browser-fetched article context plus Gemini browser generation',
      },
      {
        original: 'Direct X/LinkedIn/Facebook/Instagram Make publishers',
        local: `${config.publisher} publisher adapter with Blotato as the live sink`,
      },
    ],
    run: {
      datasetProvider: config.datasetProvider,
      datasetPath: config.datasetPath,
      generatorProvider: config.generatorProvider,
      publisher: config.publisher,
      batchSize: config.batchSize,
      nextIndex: stateBefore.nextIndex,
      datasetSummary,
      selectedRecordIndices: selectedRecords.map((record) => record.index),
    },
  };
}

function resolveLinkUrl(record) {
  return record.shortUrl || record.articleUrl || '';
}

function shouldAdvanceState(config, publisherResult) {
  if (!config.advanceState) return false;
  return ['queued', 'published', 'scheduled', 'submitted', 'partial'].includes(publisherResult.status);
}

async function saveDataArtifacts({ outputDir, sourceResult, normalizedRecords, selectedRecords, generatedArtifacts }) {
  const dataDir = join(outputDir, 'data');
  await mkdir(dataDir, { recursive: true });

  const artifacts = {
    normalizedRecordsPath: join(dataDir, 'records.json'),
    selectedRecordsPath: join(dataDir, 'selected-records.json'),
    generatedArtifactsPath: join(dataDir, 'generated-artifacts.json'),
  };

  await writeFile(artifacts.normalizedRecordsPath, JSON.stringify(normalizedRecords, null, 2));
  await writeFile(artifacts.selectedRecordsPath, JSON.stringify(selectedRecords, null, 2));
  await writeFile(artifacts.generatedArtifactsPath, JSON.stringify(generatedArtifacts, null, 2));

  if (sourceResult.prompt) {
    artifacts.promptPath = join(dataDir, 'gemini-prompt.txt');
    await writeFile(artifacts.promptPath, `${sourceResult.prompt}\n`);
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
  const sourceResult = await loadLocalRecords({ datasetPath: config.datasetPath });
  const normalizedRecords = normalizeRecords(sourceResult.records || []);
  const datasetSummary = summarizeDataset(normalizedRecords);
  const selectedRecords = selectRecords(normalizedRecords, stateBefore, config);
  const outputDir = join(
    __dirname,
    'output',
    `${sanitizeSlug(config.projectName || 'r3-social-agent')}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  );

  await mkdir(outputDir, { recursive: true });

  log.header(templateModel.lessonName);
  log.info(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE RUN'}`);
  log.info(`Dataset provider: ${config.datasetProvider}`);
  log.info(`Generator provider: ${config.generatorProvider}`);
  log.info(`Publisher: ${config.publisher}`);
  log.info(`Output: ${outputDir}`);

  const planPath = await savePlan(outputDir, buildPlan({
    templateModel,
    config,
    stateBefore,
    datasetSummary,
    selectedRecords,
  }));

  const articleContexts = [];
  const generatedDrafts = [];
  const imageArtifacts = [];
  let dataArtifacts = null;
  let publisherResult = {
    publisher: config.publisher,
    status: args.dryRun ? 'planned' : 'blocked',
    items: [],
    notes: args.dryRun
      ? ['Dry run only. Article fetching, generation, rendering, and publishing were skipped.']
      : ['No eligible records were selected.'],
  };

  if (selectedRecords.length && !args.dryRun) {
    for (const record of selectedRecords) {
      const article = await prepareArticleContext({
        record,
        config: config.articleFetch,
      });
      articleContexts.push(article);

      const linkUrl = resolveLinkUrl(record);
      const generation = await generateSocialDrafts({
        article,
        linkUrl,
        timeoutMs: config.generator.timeoutMs,
      });
      generatedDrafts.push({
        index: record.index,
        articleTitle: article.articleTitle,
        linkUrl,
        ...generation.drafts,
        prompt: generation.prompt,
      });

      const imageArtifact = await renderSocialCard({
        record,
        article,
        drafts: generation.drafts,
        outputPath: join(outputDir, 'images', `${String(record.index).padStart(3, '0')}-${record.slug}.png`),
        cardConfig: config.card,
      });
      imageArtifacts.push(imageArtifact);
    }

    const draftsByIndex = new Map(generatedDrafts.map((draft) => [draft.index, draft]));

    publisherResult = config.publisher === 'blotato'
      ? await publishBlotato({ records: selectedRecords, draftsByIndex, imageArtifacts, config })
      : await publishLocalQueue({ records: selectedRecords, draftsByIndex, imageArtifacts, outputDir, config });

    dataArtifacts = await saveDataArtifacts({
      outputDir,
      sourceResult,
      normalizedRecords,
      selectedRecords,
      generatedArtifacts: {
        articleContexts,
        generatedDrafts,
        imageArtifacts,
      },
    });
  } else if (selectedRecords.length && args.dryRun) {
    dataArtifacts = await saveDataArtifacts({
      outputDir,
      sourceResult,
      normalizedRecords,
      selectedRecords,
      generatedArtifacts: {
        articleContexts,
        generatedDrafts,
        imageArtifacts,
      },
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
    articleContexts,
    generatedDrafts,
    imageArtifacts,
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
