import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, join, resolve } from 'path';
import { log } from './logger.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    lessonDir: null,
    lessonId: null,
    lessonTitle: null,
    sourceUrl: '',
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };

  for (let i = 0; i < args.length; i++) {
    const value = args[i + 1];
    switch (args[i]) {
      case '--lesson-dir':
        options.lessonDir = value ? resolve(value) : null;
        break;
      case '--lesson-id':
        options.lessonId = value || null;
        break;
      case '--lesson-title':
        options.lessonTitle = value || null;
        break;
      case '--source-url':
        options.sourceUrl = value || '';
        break;
      default:
        break;
    }
  }

  return options;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/^r\d+-/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferLessonId(lessonDir) {
  const dirName = basename(lessonDir);
  const match = dirName.match(/^(r\d+(?:-\d+)?)/i);
  return match ? match[1].toUpperCase() : 'RXX';
}

function buildSetupNotes({ lessonId, lessonTitle, sourceUrl }) {
  return `# ${lessonId} Setup Notes

Source: ${sourceUrl || 'Add the Skool lesson URL here'}

## Lesson Snapshot

- Lesson title: \`${lessonTitle}\`
- Source platform: RoboNuggets / Skool
- Capture status: scaffolded, needs source review

## Tools Mentioned By The Lesson

- Add the original providers, APIs, templates, and external tools here.

## Referenced Resources

- Add links to the lesson video, GPT/Gem/Gemini resources, templates, sheets, docs, and attachments here.

## Key Notes

- Add the important lesson notes worth preserving from the Skool page.
- Include setup warnings, cost notes, version requirements, or account constraints.

## Local Rebuild Note

- Record which parts of the original lesson are being preserved exactly.
- Record which parts are being swapped for cheaper or more local alternatives.
`;
}

function buildTroubleshootingNotes({ lessonId }) {
  return `# ${lessonId} Troubleshooting Notes

Use this file to capture separate troubleshooting posts, comments, or lesson addenda that materially affect whether the rebuild works.

## Source

- Add the Skool troubleshooting module URL or note where these tips came from.

## Notes

- Add known failure modes from the original lesson here.
- Add fixes that came from Skool comments, follow-up posts, or video clarifications.
`;
}

function buildOriginalAssetsReadme({ lessonId, lessonTitle }) {
  return `# ${lessonId} Original Assets

Store the original downloaded lesson files for **${lessonTitle}** in this folder.

Guidelines:

- Preserve original filenames whenever possible.
- Keep raw exports, templates, screenshots, sheets, and media files here.
- Prefer adding notes about each file in \`../skool/setup-notes.md\` or \`../../FIDELITY.md\` instead of renaming the files.
`;
}

function buildFidelityAudit({ lessonId, lessonTitle }) {
  return `# ${lessonId} Fidelity Audit

Updated: ${new Date().toISOString().slice(0, 10)}

## Current Verdict

${lessonTitle} is scaffolded for source-fidelity work, but it has not yet been proven to be a source-faithful recreation.

## Source Coverage Used So Far

- Local lesson README
- \`assets/skool/setup-notes.md\`
- \`assets/skool/troubleshooting.md\` if applicable

Not yet captured:

- Original attachments or exported templates
- Full tutorial transcript or video-derived procedure notes
- Source-vs-rebuild behavioral comparison

## Original Workflow Shape

- Fill this in after inspecting the original lesson assets, templates, and walkthrough.

## Economic Adaptation Assessment

Keep:

- List the original tools or behaviors worth preserving exactly.

Swap:

- List the provider substitutions that improve cost leverage while preserving the lesson outcome.

Open questions:

- List anything where the rebuild may drift from the source lesson behavior.

## Source Baseline Plan

1. Download the original lesson assets into \`assets/original/\`.
2. Record source notes, resource links, and troubleshooting in \`assets/skool/\`.
3. Compare the original toolchain and prompt contract with the local rebuild.
4. Create a repeatable source baseline if the lesson has runtime inputs worth freezing for tests.
5. Run at least one verified local test and record the result here.

## Exit Criteria

- Original lesson assets preserved locally
- Source notes captured
- Important troubleshooting notes captured
- Fidelity audit updated from real source evidence
- Repeatable baseline defined where useful
- At least one verified run or scaffolded proof artifact saved locally
`;
}

async function ensureDir(path, dryRun) {
  if (dryRun) return;
  await mkdir(path, { recursive: true });
}

async function writeScaffoldFile(path, content, { dryRun, force }) {
  const exists = existsSync(path);
  if (exists && !force) {
    return { path, status: 'skipped' };
  }

  if (!dryRun) {
    await writeFile(path, content, 'utf8');
  }

  return { path, status: exists ? 'overwritten' : 'created' };
}

async function main() {
  const options = parseArgs();
  if (!options.lessonDir) {
    throw new Error('Missing required --lesson-dir argument');
  }

  const lessonId = options.lessonId || inferLessonId(options.lessonDir);
  const lessonTitle = options.lessonTitle || toTitleCase(basename(options.lessonDir));
  const lessonDir = options.lessonDir;

  log.header('Lesson Fidelity Scaffold');
  log.info(`Lesson dir: ${lessonDir}`);
  log.info(`Lesson ID: ${lessonId}`);
  log.info(`Lesson title: ${lessonTitle}`);
  log.info(`Mode: ${options.dryRun ? 'DRY RUN' : 'WRITE FILES'}`);

  const skoolDir = join(lessonDir, 'assets', 'skool');
  const originalDir = join(lessonDir, 'assets', 'original');

  await ensureDir(skoolDir, options.dryRun);
  await ensureDir(originalDir, options.dryRun);

  const files = [
    {
      path: join(skoolDir, 'setup-notes.md'),
      content: buildSetupNotes({ lessonId, lessonTitle, sourceUrl: options.sourceUrl }),
    },
    {
      path: join(skoolDir, 'troubleshooting.md'),
      content: buildTroubleshootingNotes({ lessonId }),
    },
    {
      path: join(originalDir, 'README.md'),
      content: buildOriginalAssetsReadme({ lessonId, lessonTitle }),
    },
    {
      path: join(lessonDir, 'FIDELITY.md'),
      content: buildFidelityAudit({ lessonId, lessonTitle }),
    },
  ];

  for (const file of files) {
    const result = await writeScaffoldFile(file.path, file.content, options);
    const label = result.status === 'skipped'
      ? 'Skipped existing'
      : result.status === 'overwritten'
        ? 'Overwrote'
        : 'Created';
    log.info(`${label}: ${result.path}`);
  }

  log.info('');
  log.info('Next steps:');
  log.info('1. Download original lesson assets into assets/original/');
  log.info('2. Fill in setup-notes.md from the real Skool lesson');
  log.info('3. Update FIDELITY.md after inspecting the source toolchain');
  log.info('4. Re-ingest memory when the notes are meaningful');
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
