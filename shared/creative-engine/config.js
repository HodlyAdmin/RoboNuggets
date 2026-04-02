import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { log } from '../logger.js';

export const DEFAULTS = {
  projectName: 'unnamed-project',
  cleanupOutput: true,
  outputRetention: { keepSuccessfulRuns: 2 },
  imageConfig: {
    enabled: false,
    provider: 'flow-image-cdp',
    model: 'Nano Banana 2',
    aspectRatio: '9:16',
    variantCount: 'x1',
    selectionPolicy: 'first',
    referenceImages: []
  },
  videoConfig: {
    enabled: false,
    provider: 'flow-veo-cdp',
    model: 'Veo 3.1 - Fast [Lower Priority]',
    aspectRatio: '9:16',
    variantCount: 'x1',
    subMode: 'Frames',
    requireZeroCredits: true,
    selectionPolicy: 'first'
  },
  audioConfig: {
    enabled: false,
    provider: 'lyria-3-pro-cdp'
  },
  airtableConfig: {
    enabled: false
  }
};

export const KnownModels = {
  image: ['Nano Banana 2', 'Imagen 3', 'Imagen 4'],
  video: ['Veo 3.1', 'Veo 3.1 - Fast [Lower Priority]']
};

export function validateConfig(config) {
  const errors = [];
  const validAspectRatios = ['9:16', '16:9', '1:1'];
  const validVariantCounts = ['x1', 'x2', 'x3', 'x4'];

  if (!config.projectName || typeof config.projectName !== 'string') {
    errors.push('projectName is required and must be a string');
  } else if (!/^[a-z0-9-_]+$/i.test(config.projectName)) {
    errors.push('projectName must be a valid slug (alphanumeric, dashes, underscores)');
  }

  if (config.imageConfig?.enabled) {
    if (!KnownModels.image.includes(config.imageConfig.model)) {
      errors.push(`Invalid image model: ${config.imageConfig.model}. Expected one of: ${KnownModels.image.join(', ')}`);
    }
    if (!validVariantCounts.includes(config.imageConfig.variantCount)) {
      errors.push(`Invalid image variantCount: ${config.imageConfig.variantCount}. Expected one of: ${validVariantCounts.join(', ')}`);
    }
    if (config.imageConfig.referenceImages) {
      for (const path of config.imageConfig.referenceImages) {
        if (!existsSync(resolve(path))) {
          log.warn(`Reference image path does not exist: ${path}`);
        }
      }
    }
  }

  if (config.videoConfig?.enabled) {
    if (!KnownModels.video.includes(config.videoConfig.model)) {
      errors.push(`Invalid video model: ${config.videoConfig.model}. Expected one of: ${KnownModels.video.join(', ')}`);
    }
    if (!validAspectRatios.includes(config.videoConfig.aspectRatio)) {
      errors.push(`Invalid video aspectRatio: ${config.videoConfig.aspectRatio}. Expected one of: ${validAspectRatios.join(', ')}`);
    }
    if (config.videoConfig.preferredImage !== undefined) {
      if (!Number.isInteger(config.videoConfig.preferredImage) || config.videoConfig.preferredImage < 1) {
        errors.push('videoConfig.preferredImage must be a positive integer');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    config
  };
}

export function loadConfig(pathOrObject) {
  let config = {};
  if (typeof pathOrObject === 'string') {
    const fullPath = resolve(pathOrObject);
    if (!existsSync(fullPath)) {
      throw new Error(`Config file not found: ${fullPath}`);
    }
    config = JSON.parse(readFileSync(fullPath, 'utf-8'));
  } else {
    config = pathOrObject;
  }

  // Deep merge defaults (simple version)
  const merged = { ...DEFAULTS, ...config };
  if (config.imageConfig) merged.imageConfig = { ...DEFAULTS.imageConfig, ...config.imageConfig };
  if (config.videoConfig) merged.videoConfig = { ...DEFAULTS.videoConfig, ...config.videoConfig };
  if (config.audioConfig) merged.audioConfig = { ...DEFAULTS.audioConfig, ...config.audioConfig };
  if (config.airtableConfig) merged.airtableConfig = { ...DEFAULTS.airtableConfig, ...config.airtableConfig };

  return validateConfig(merged);
}
