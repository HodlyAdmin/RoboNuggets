import { readFile } from 'fs/promises';
import { extname } from 'path';
import { resolveEnvValue } from './env.js';

const DEFAULT_BASE_URL = 'https://backend.blotato.com/v2';

function buildHeaders(apiKey, extra = {}) {
  return {
    'blotato-api-key': apiKey,
    ...extra,
  };
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function inferMimeType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'image/png';
  }
}

async function parseJsonResponse(response, label) {
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return body;
}

export async function resolveBlotatoApiKey({ envPath = null, envVar = 'BLOTATO_API_KEY' } = {}) {
  return resolveEnvValue({
    key: envVar,
    envPath,
  });
}

export async function listBlotatoAccounts({ apiKey, platform, baseUrl = DEFAULT_BASE_URL }) {
  const url = new URL(`${baseUrl}/users/me/accounts`);
  if (platform) {
    url.searchParams.set('platform', platform);
  }

  const response = await fetch(url, {
    headers: buildHeaders(apiKey),
  });
  const body = await parseJsonResponse(response, 'Blotato account lookup');

  return Array.isArray(body?.items) ? body.items : [];
}

export function findBlotatoAccount(accounts, { accountId = null, username = null } = {}) {
  if (accountId) {
    return accounts.find((account) => String(account.id) === String(accountId)) || null;
  }

  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  return accounts.find((account) => normalizeUsername(account.username) === normalizedUsername) || null;
}

export async function uploadBlotatoMedia({ apiKey, url, baseUrl = DEFAULT_BASE_URL }) {
  const response = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: buildHeaders(apiKey, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ url }),
  });

  return parseJsonResponse(response, 'Blotato media upload');
}

export async function uploadBlotatoMediaFromFile({ apiKey, filePath, baseUrl = DEFAULT_BASE_URL }) {
  const buffer = await readFile(filePath);
  const mimeType = inferMimeType(filePath);
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return uploadBlotatoMedia({
    apiKey,
    url: dataUrl,
    baseUrl,
  });
}

export async function createBlotatoPost({
  apiKey,
  post,
  scheduledTime = null,
  useNextFreeSlot = false,
  baseUrl = DEFAULT_BASE_URL,
}) {
  const body = { post };
  if (scheduledTime) {
    body.scheduledTime = scheduledTime;
  } else if (useNextFreeSlot) {
    body.useNextFreeSlot = true;
  }

  const response = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: buildHeaders(apiKey, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });

  return parseJsonResponse(response, 'Blotato post create');
}

export async function getBlotatoPostStatus({ apiKey, postSubmissionId, baseUrl = DEFAULT_BASE_URL }) {
  const response = await fetch(`${baseUrl}/posts/${postSubmissionId}`, {
    headers: buildHeaders(apiKey),
  });

  return parseJsonResponse(response, 'Blotato post status');
}

export async function pollBlotatoPostStatus({
  apiKey,
  postSubmissionId,
  baseUrl = DEFAULT_BASE_URL,
  pollIntervalMs = 2000,
  maxPolls = 12,
}) {
  let lastStatus = null;

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const status = await getBlotatoPostStatus({
      apiKey,
      postSubmissionId,
      baseUrl,
    });

    lastStatus = status;
    if (['published', 'failed', 'scheduled'].includes(status?.status)) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return lastStatus;
}
