import { join, resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { log } from '../logger.js';

/**
 * Run a multi-concept campaign sequentially.
 * 
 * @param {Object} engine - Creative Engine instance
 * @param {Object} campaignConfig - Campaign configuration
 * @returns {Promise<Object>} Campaign result
 */
export async function runBatch(engine, campaignConfig) {
  const { 
    campaign, 
    concepts = [], 
    outputDir = 'output',
    imageConfig = {}, 
    videoConfig = {}, 
    audioConfig = {} 
  } = campaignConfig;

  if (!campaign) {
    throw new Error('Campaign name is required for batch runs.');
  }

  const timestamp = Date.now();
  const campaignOutputDir = resolve(outputDir, `${campaign}_${timestamp}`);
  mkdirSync(campaignOutputDir, { recursive: true });

  log.step('═══════════════════════════════════════════');
  log.step(`  Creative Engine Batch | ${campaign}`);
  log.step('═══════════════════════════════════════════');
  log.info(`Campaign output: ${campaignOutputDir}`);
  log.info(`Processing ${concepts.length} concepts...`);

  const results = {
    campaign,
    startedAt: new Date().toISOString(),
    outputDir: campaignOutputDir,
    concepts: []
  };

  for (const concept of concepts) {
    const conceptName = concept.name || `concept-${results.concepts.length + 1}`;
    log.header(`CONCEPT: ${conceptName}`);

    // Merge concept-level overrides with campaign-level defaults
    const mergedConfig = {
      ...campaignConfig,
      projectName: `${campaign}-${conceptName}`,
      outputDir: campaignOutputDir, // Ensure everything goes into the campaign folder
      imageConfig: concept.imageConfig ? { ...imageConfig, ...concept.imageConfig } : { ...imageConfig, prompt: concept.prompt, referenceImages: concept.referenceImages || [] },
      videoConfig: concept.videoConfig ? { ...videoConfig, ...concept.videoConfig } : { ...videoConfig, prompt: concept.prompt },
      audioConfig: concept.audioConfig ? { ...audioConfig, ...concept.audioConfig } : audioConfig,
    };

    // If concept has overrides for imageConfig but no prompt, use concept prompt
    if (concept.imageConfig && !concept.imageConfig.prompt) mergedConfig.imageConfig.prompt = concept.prompt;
    if (concept.videoConfig && !concept.videoConfig.prompt) mergedConfig.videoConfig.prompt = concept.prompt;

    try {
      const runData = await engine.generate(mergedConfig);
      results.concepts.push({
        name: conceptName,
        status: runData.status,
        outputDir: runData.outputDir,
        apiUsage: runData.apiUsage
      });
    } catch (err) {
      log.error(`Concept "${conceptName}" failed: ${err.message}`);
      results.concepts.push({
        name: conceptName,
        status: 'failed',
        error: err.message
      });
    }
  }

  results.completedAt = new Date().toISOString();

  // Aggregate API usage
  results.apiUsage = results.concepts.reduce((acc, c) => {
    if (!c.apiUsage) return acc;
    // This is a naive aggregation, assumes cost-tracker.summary() format
    // Real implementation would use cost-tracker properly
    return acc; // Placeholder for now, will refine if needed
  }, {});

  // Save campaign manifest
  const manifestPath = join(campaignOutputDir, 'campaign-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(results, null, 2));

  log.step('');
  log.step('═══════════════════════════════════════════');
  log.step('  CAMPAIGN COMPLETE');
  log.step('═══════════════════════════════════════════');
  log.success(`Campaign manifest: ${manifestPath}`);

  return results;
}
