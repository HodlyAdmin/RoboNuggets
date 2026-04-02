import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export async function loadEnvFile(envPath) {
  if (!envPath || !existsSync(envPath)) {
    return {};
  }

  const raw = await readFile(envPath, 'utf8');
  const entries = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
    entries[key] = value;
  }

  return entries;
}

export async function resolveEnvValue({ key, envPath = null }) {
  if (process.env[key]) {
    return {
      value: process.env[key],
      source: `process.env.${key}`,
    };
  }

  if (envPath && existsSync(envPath)) {
    const entries = await loadEnvFile(envPath);
    if (entries[key]) {
      return {
        value: entries[key],
        source: envPath,
      };
    }
  }

  return {
    value: null,
    source: null,
  };
}
