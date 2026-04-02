/**
 * R46 | Ultimate Extract System
 *
 * Local, agent-operated rebuild of the lesson's n8n workflow.
 * The original Skool template remains in assets/original/, but execution happens through
 * local providers and sinks so n8n is not required at runtime.
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../../shared/logger.js';
import { buildTemplateModel, buildFormData, normalizePlatformId } from './template.js';
import { runLocalFilesPlatform } from './providers/local-files.js';
import { runApifyPlatform } from './providers/apify.js';
import { writePlatformArtifacts, writeCombinedArtifacts } from './sinks/local-json.js';
import { writeGoogleSheetsPlaceholder } from './sinks/google-sheets.js';
import { saveManifest, saveRunReport } from './manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CONFIG = {
  searchTerm: 'ai automation',
  maxItems: 10,
  provider: 'local-files',
  providerByPlatform: {},
  sinks: ['local-json'],
  localFiles: {
    inputDir: './inputs',
    skipMissing: true,
  },
  apify: {
    tokenEnvVar: 'APIFY_TOKEN',
    baseUrl: 'https://api.apify.com/v2',
    waitForFinishSeconds: 120,
    pollIntervalMs: 5000,
    maxPolls: 24,
  },
};

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

function sanitizeSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function loadUserConfig(configPath) {
  if (!configPath) return null;
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const raw = await readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

function normalizeConfig(userConfig, templateModel, configBaseDir) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    localFiles: {
      ...DEFAULT_CONFIG.localFiles,
      ...(userConfig?.localFiles || {}),
    },
    apify: {
      ...DEFAULT_CONFIG.apify,
      ...(userConfig?.apify || {}),
    },
  };

  const allPlatformIds = templateModel.platforms.map(platform => platform.id);
  const selectedPlatformIds = (userConfig?.platforms?.length ? userConfig.platforms : allPlatformIds)
    .map(normalizePlatformId)
    .filter((value, index, array) => array.indexOf(value) === index);

  return {
    ...merged,
    maxItems: Number(merged.maxItems),
    platforms: selectedPlatformIds,
    localFiles: {
      ...merged.localFiles,
      inputDir: resolve(configBaseDir, merged.localFiles.inputDir),
    },
  };
}

function resolveProviderName(config, platformId) {
  return config.providerByPlatform?.[platformId] || config.provider;
}

function selectPlatforms(templateModel, config) {
  const platformMap = new Map(templateModel.platforms.map(platform => [platform.id, platform]));
  return config.platforms.map(platformId => {
    const platform = platformMap.get(platformId);
    if (!platform) {
      throw new Error(`Unknown platform in config: ${platformId}`);
    }
    return platform;
  });
}

function buildExecutionPlan({ selectedPlatforms, formData, config }) {
  return selectedPlatforms.map(platform => ({
    platformId: platform.id,
    platformLabel: platform.label,
    provider: resolveProviderName(config, platform.id),
    sinks: config.sinks,
    actorId: platform.actor.actorId,
    actorStoreUrl: platform.actor.actorStoreUrl,
    actorInputPreview: platform.buildActorInput(formData),
    sink: platform.sink,
  }));
}

async function runProvider({ providerName, platform, formData, config }) {
  switch (providerName) {
    case 'apify':
      return runApifyPlatform({ platform, formData, config });
    case 'local-files':
    default:
      return runLocalFilesPlatform({ platform, formData, config });
  }
}

async function runSinks({ sinks, platform, outputDir, rawItems, normalizedItems }) {
  const sinkNotes = [];
  let artifacts = null;

  if (sinks.includes('local-json')) {
    artifacts = await writePlatformArtifacts({
      outputDir,
      platform,
      rawItems,
      normalizedItems,
    });
  }

  if (sinks.includes('google-sheets')) {
    const sheetResult = await writeGoogleSheetsPlaceholder({ platform });
    sinkNotes.push(...sheetResult.notes);
  }

  return { artifacts, sinkNotes };
}

async function writePlan(outputDir, plan) {
  const planPath = join(outputDir, 'plan.json');
  await mkdir(outputDir, { recursive: true });
  await writeFile(planPath, JSON.stringify(plan, null, 2));
  return planPath;
}

async function run() {
  const args = parseArgs();
  const templateModel = await buildTemplateModel();
  const userConfig = await loadUserConfig(args.configPath);
  const configBaseDir = args.configPath ? dirname(args.configPath) : __dirname;
  const config = normalizeConfig(userConfig, templateModel, configBaseDir);
  const formData = buildFormData(config, templateModel);
  const selectedPlatforms = selectPlatforms(templateModel, config);
  const plan = buildExecutionPlan({ selectedPlatforms, formData, config });

  const outputDir = join(
    __dirname,
    'output',
    `${sanitizeSlug(config.searchTerm)}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  );

  log.header('R46 | Ultimate Extract System');
  log.info(`Mode: ${args.dryRun ? '🏜️  DRY RUN' : '🚀 LIVE'}`);
  log.info(`Search term: ${config.searchTerm}`);
  log.info(`Max items:   ${config.maxItems}`);
  log.info(`Platforms:   ${selectedPlatforms.map(platform => platform.label).join(', ')}`);
  log.info(`Provider:    ${config.provider}`);
  log.info(`Sinks:       ${config.sinks.join(', ')}`);
  log.info(`Output:      ${outputDir}`);

  const planPath = await writePlan(outputDir, plan);
  log.success(`🗺️  Plan saved: ${planPath}`);

  const results = [];
  let sinkArtifacts = {};

  if (!args.dryRun) {
    for (const platform of selectedPlatforms) {
      log.step(platform.label, `Running ${resolveProviderName(config, platform.id)} provider`);

      const providerName = resolveProviderName(config, platform.id);
      const providerResult = await runProvider({
        providerName,
        platform,
        formData,
        config,
      });

      const normalizedItems = (providerResult.rawItems || []).map(item =>
        platform.normalizeItem(item, formData)
      );

      const sinkResult = await runSinks({
        sinks: config.sinks,
        platform,
        outputDir,
        rawItems: providerResult.rawItems || [],
        normalizedItems,
      });

      results.push({
        ...providerResult,
        platform,
        normalizedItems,
        artifacts: sinkResult.artifacts,
        notes: [...(providerResult.notes || []), ...sinkResult.sinkNotes],
      });
    }

    const combinedRecords = results.flatMap(result => result.normalizedItems || []);
    sinkArtifacts = await writeCombinedArtifacts({ outputDir, normalizedRecords: combinedRecords });
  } else {
    for (const platform of selectedPlatforms) {
      results.push({
        provider: resolveProviderName(config, platform.id),
        status: 'planned',
        platform,
        rawItems: [],
        normalizedItems: [],
        notes: [
          `Actor ${platform.actor.actorId}`,
          `Output target ${platform.sink.documentName} / ${platform.sink.sheetName}`,
        ],
        artifacts: null,
      });
    }
  }

  const manifestPath = await saveManifest({
    outputDir,
    lessonName: templateModel.lessonName,
    templatePath: templateModel.templatePath,
    config,
    formData,
    plan,
    results,
    sinkArtifacts,
  });

  const reportPath = await saveRunReport({
    outputDir,
    lessonName: templateModel.lessonName,
    formData,
    results,
    sinkArtifacts,
  });

  log.success(`📝 Report saved: ${reportPath}`);
}

run().catch(error => {
  log.error(`Pipeline failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
