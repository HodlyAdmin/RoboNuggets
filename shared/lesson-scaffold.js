import { cp, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, dirname, join, relative, resolve } from 'path';
import { log } from './logger.js';

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
    .slice(0, 64);
}

async function loadConfig(configPath, defaultConfig, moduleDir) {
  if (!configPath) return { ...defaultConfig };
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);

  return {
    ...defaultConfig,
    ...config,
    configBaseDir: dirname(configPath) || moduleDir,
  };
}

async function walkFiles(rootPath, currentPath = rootPath, files = []) {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(rootPath, absolutePath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(rootPath, absolutePath));
    }
  }

  return files;
}

async function inspectAsset(asset) {
  if (!existsSync(asset.path)) {
    return {
      ...asset,
      exists: false,
    };
  }

  const assetStat = await stat(asset.path);

  if (assetStat.isDirectory()) {
    const files = await walkFiles(asset.path);
    return {
      ...asset,
      exists: true,
      type: 'directory',
      fileCount: files.length,
      sampleFiles: files.slice(0, 15),
    };
  }

  return {
    ...asset,
    exists: true,
    type: 'file',
    sizeBytes: assetStat.size,
    fileName: basename(asset.path),
  };
}

async function seedWorkspace(outputDir, seeds) {
  const workspaceDir = join(outputDir, 'workspace');
  const copiedSeeds = [];

  for (const seed of seeds) {
    if (!existsSync(seed.path)) {
      copiedSeeds.push({
        ...seed,
        status: 'missing',
      });
      continue;
    }

    const destinationPath = join(workspaceDir, seed.destination || basename(seed.path));
    await mkdir(dirname(destinationPath), { recursive: true });
    const seedStat = await stat(seed.path);

    if (seedStat.isDirectory()) {
      await cp(seed.path, destinationPath, { recursive: true });
    } else {
      await copyFile(seed.path, destinationPath);
    }

    copiedSeeds.push({
      ...seed,
      status: 'copied',
      destinationPath,
    });
  }

  return {
    workspaceDir,
    copiedSeeds,
  };
}

function renderReport({ lesson, config, assetInventory, seededWorkspace, args }) {
  const workflowLines = lesson.workflow.map((step, index) =>
    `${index + 1}. ${step.label} — ${step.status}\n   ${step.details}`
  );

  const integrationLines = lesson.integrations.map((integration) =>
    `- ${integration.label}: ${integration.status} — ${integration.details}`
  );

  const assetLines = assetInventory.map((asset) => {
    if (asset.exists === false) {
      return `- ${asset.label}: missing (${asset.path})`;
    }

    if (asset.type === 'directory') {
      const sample = asset.sampleFiles?.length
        ? ` Sample: ${asset.sampleFiles.slice(0, 3).join(', ')}`
        : '';
      return `- ${asset.label}: directory with ${asset.fileCount} files (${asset.path}).${sample}`;
    }

    return `- ${asset.label}: file ${asset.fileName} (${asset.sizeBytes} bytes) at ${asset.path}`;
  });

  const workspaceLines = seededWorkspace
    ? seededWorkspace.copiedSeeds.map((seed) =>
        `- ${seed.label}: ${seed.status}${seed.destinationPath ? ` → ${seed.destinationPath}` : ''}`
      )
    : ['- No workspace seeded in dry-run mode'];

  const blockerLines = lesson.blockers.map((blocker) => `- ${blocker}`);

  return [
    `# ${lesson.title}`,
    '',
    lesson.summary,
    '',
    `Mode: ${args.dryRun ? 'dry-run' : 'live scaffold'}`,
    `Project name: ${config.projectName}`,
    '',
    '## Workflow',
    ...workflowLines,
    '',
    '## Integrations',
    ...integrationLines,
    '',
    '## Assets',
    ...assetLines,
    '',
    '## Workspace',
    ...workspaceLines,
    '',
    '## Blockers',
    ...blockerLines,
    '',
  ].join('\n');
}

export async function runLessonScaffold({ moduleDir, lesson }) {
  const args = parseArgs();
  const config = await loadConfig(args.configPath, lesson.defaultConfig, moduleDir);
  const outputDir = join(
    moduleDir,
    'output',
    `${sanitizeSlug(config.projectName || lesson.id)}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  );

  log.header(lesson.title);
  log.info(`Mode: ${args.dryRun ? '🏜️  DRY RUN' : '🚀 LIVE SCAFFOLD'}`);
  log.info(`Project name: ${config.projectName}`);
  log.info(`Output: ${outputDir}`);

  await mkdir(outputDir, { recursive: true });

  const assetInventory = [];
  for (const asset of lesson.assets) {
    assetInventory.push(await inspectAsset(asset));
  }

  const plan = {
    workflow: lesson.workflow,
    integrations: lesson.integrations,
    blockers: lesson.blockers,
  };

  let seededWorkspace = null;
  if (args.dryRun === false && lesson.workspaceSeeds?.length) {
    seededWorkspace = await seedWorkspace(outputDir, lesson.workspaceSeeds);
  }

  const manifest = {
    lessonId: lesson.id,
    title: lesson.title,
    summary: lesson.summary,
    config,
    plan,
    assets: assetInventory,
    seededWorkspace,
    generatedAt: new Date().toISOString(),
  };

  const planPath = join(outputDir, 'plan.json');
  const manifestPath = join(outputDir, 'manifest.json');
  const reportPath = join(outputDir, 'report.md');

  await writeFile(planPath, JSON.stringify(plan, null, 2));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(reportPath, renderReport({ lesson, config, assetInventory, seededWorkspace, args }));

  log.success(`🗺️  Plan saved: ${planPath}`);
  log.success(`📦 Manifest saved: ${manifestPath}`);
  log.success(`📝 Report saved: ${reportPath}`);

  return {
    outputDir,
    planPath,
    manifestPath,
    reportPath,
    seededWorkspace,
  };
}
