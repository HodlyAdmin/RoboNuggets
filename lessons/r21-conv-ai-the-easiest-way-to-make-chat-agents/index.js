#!/usr/bin/env node
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { log } from '../../shared/logger.js';
import { saveManifest } from './manifest.js';
import { executeinboundWebhook } from './providers/ghlwebhook.js';
import { executeconversationAi } from './providers/openaiapi.js';
import { executeoutboundMessage } from './providers/gohighlevelapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const CONFIG_PATH = join(__dirname, 'config.example.json');

async function main() {
  log.step('R21 | R21 | Conv AI: The Easiest Way to Make Chat Agents Pipeline');

  if (!existsSync(CONFIG_PATH)) {
    log.error('Missing config.example.json. Please create one based on the example.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const runDir = join(OUTPUT_DIR, `${config.projectName}_${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const runData = { outputDir: runDir, projectName: config.projectName };

  // Stage: Receive Customer Message
  runData.inboundWebhook = await executeinboundWebhook(config.inboundWebhookConfig, runData);

  // Stage: Generate Agent Response
  runData.conversationAi = await executeconversationAi(config.conversationAiConfig, runData.inboundWebhook);

  // Stage: Send Reply via GHL
  runData.outboundMessage = await executeoutboundMessage(config.outboundMessageConfig, runData.conversationAi);

  // Output State Tracking
  await saveManifest(runData);

  log.success(`\n🎉 Pipeline complete. Outputs saved in ${runDir}`);
}

main().catch(err => {
  log.error('Pipeline Failed: ' + err.message);
  process.exit(1);
});
