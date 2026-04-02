#!/usr/bin/env node
/**
 * Creative Engine CLI
 * 
 * Usage:
 *   node shared/creative-engine/cli.js --config <path> [--dry-run]
 *   node shared/creative-engine/cli.js --review [--port <number>]
 *   node shared/creative-engine/cli.js --resume <dir>
 */
import { createEngine } from './index.js';
import { loadConfig } from './config.js';
import { log } from '../logger.js';
import { resolve } from 'path';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
Usage: creative-engine [options]

Options:
  --config <path>    Path to config file (JSON)
  --batch            Force batch mode (auto-detected if concepts array exists)
  --dry-run          Validate config and print plan without executing
  --review           Launch review server
  --resume <dir>     Resume a failed run from the specified output directory
  --port <number>    Port for review server (default: 3456)
  --help             Print this help message
`);
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    return;
  }

  const configPath = args.indexOf('--config') !== -1 ? args[args.indexOf('--config') + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const isReview = args.includes('--review');
  const isBatch = args.includes('--batch');
  const resumeDir = args.indexOf('--resume') !== -1 ? args[args.indexOf('--resume') + 1] : null;
  const port = args.indexOf('--port') !== -1 ? parseInt(args[args.indexOf('--port') + 1]) : 3456;

  const engine = createEngine();

  if (isReview) {
    await engine.review({ port });
    return;
  }

  if (resumeDir) {
    if (isDryRun) {
      log.header('CREATIVE ENGINE | RESUME DRY RUN');
      log.info(`Would resume run in: ${resumeDir}`);
      log.success('Resume logic would skip completed stages and retry failures.');
      return;
    }
    await engine.resume(resumeDir);
    return;
  }

  if (configPath) {
    const fullConfigPath = resolve(configPath);
    const { valid, errors, config } = loadConfig(fullConfigPath);
    
    // Auto-detect batch if the config has a concepts array
    const shouldRunBatch = isBatch || (config && Array.isArray(config.concepts));

    if (isDryRun) {
      log.header('CREATIVE ENGINE | DRY RUN');
      if (!valid) {
        log.error('Config validation failed:');
        errors.forEach(err => log.info(` - ${err}`));
        process.exit(1);
      }
      log.success('Config is valid.');
      
      if (shouldRunBatch) {
        log.info(`Campaign: ${config.campaign || 'unnamed-campaign'}`);
        log.info(`Batch Mode: ${config.concepts.length} concepts`);
        config.concepts.forEach((c, idx) => {
          log.info(` - Concept ${idx + 1}: ${c.name || 'unnamed'}`);
        });
      } else {
        log.info(`Project: ${config.projectName}`);
        log.info('Plan:');
        log.info(` - Image: ${config.imageConfig?.enabled ? `✅ ${config.imageConfig.model}` : '⏭️  Disabled'}`);
        log.info(` - Video: ${config.videoConfig?.enabled ? `✅ ${config.videoConfig.model}` : '⏭️  Disabled'}`);
        log.info(` - Audio: ${config.audioConfig?.enabled ? `✅ ${config.audioConfig.provider || 'lyria'}` : '⏭️  Disabled'}`);
      }
      log.success('Dry run complete. No resources consumed.');
    } else {
      if (shouldRunBatch) {
        await engine.batch(config);
      } else {
        await engine.generate(config);
      }
    }
  } else {
    log.error('No config provided. Use --config <path>');
    printHelp();
  }
}

run().catch(err => {
  log.error(`CLI Error: ${err.message}`);
  process.exit(1);
});
