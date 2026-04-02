import {
  createBlotatoPost,
  listBlotatoAccounts,
  pollBlotatoPostStatus,
  resolveBlotatoApiKey,
  uploadBlotatoMediaFromFile,
} from '../../../shared/blotato.js';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function truncate(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function summarizeAccounts(accounts) {
  if (!accounts.length) return 'none';
  return accounts
    .map((account) => account.fullname || account.username || account.id)
    .join(', ');
}

function findYouTubeAccount(accounts, config) {
  if (config.blotato.accountId) {
    return accounts.find((account) => String(account.id) === String(config.blotato.accountId)) || null;
  }

  if (config.blotato.accountFullName) {
    const target = normalizeText(config.blotato.accountFullName);
    return accounts.find((account) => normalizeText(account.fullname) === target) || null;
  }

  if (config.blotato.accountUsername) {
    const target = normalizeText(config.blotato.accountUsername);
    return accounts.find((account) => normalizeText(account.username) === target) || null;
  }

  return null;
}

function buildPostPayload({ record, account, uploadUrl, config }) {
  return {
    accountId: String(account.id),
    content: {
      platform: 'youtube',
      text: truncate(record.youtubeDescription || record.title, 5000),
      mediaUrls: [uploadUrl],
    },
    target: {
      targetType: 'youtube',
      title: truncate(record.youtubeTitle || record.title, 100),
      privacyStatus: config.blotato.privacyStatus,
      notifySubscribers: Boolean(config.blotato.notifySubscribers),
      selfDeclaredMadeForKids: Boolean(config.blotato.selfDeclaredMadeForKids),
      containsSyntheticMedia: Boolean(config.blotato.containsSyntheticMedia),
    },
  };
}

export async function publishBlotato({ records, videoArtifacts, config }) {
  const notes = [];
  const { value: apiKey, source: apiKeySource } = await resolveBlotatoApiKey({
    envPath: config.blotato.envPath,
    envVar: config.blotato.apiKeyEnvVar,
  });

  if (!apiKey) {
    return {
      publisher: 'blotato',
      status: 'blocked',
      items: records.map((record) => ({
        index: record.index,
        status: 'blocked',
      })),
      notes: [
        `Missing ${config.blotato.apiKeyEnvVar}. Set it in the environment or provide blotato.envPath.`,
      ],
    };
  }

  notes.push(`Resolved Blotato API key from ${apiKeySource}.`);

  const accounts = await listBlotatoAccounts({
    apiKey,
    platform: 'youtube',
    baseUrl: config.blotato.baseUrl,
  });
  const account = findYouTubeAccount(accounts, config);

  if (!account) {
    return {
      publisher: 'blotato',
      status: 'blocked',
      items: records.map((record) => ({
        index: record.index,
        status: 'blocked',
      })),
      notes: [
        ...notes,
        'No connected Blotato YouTube account matched the configured account selector.',
        `Connected YouTube accounts on this key: ${summarizeAccounts(accounts)}.`,
      ],
    };
  }

  notes.push(`Resolved Blotato YouTube account ${account.fullname || account.id}.`);

  const videoByIndex = new Map(videoArtifacts.map((artifact) => [artifact.index, artifact]));
  const items = [];

  for (const record of records) {
    const videoArtifact = videoByIndex.get(record.index);
    if (!videoArtifact?.path) {
      items.push({
        index: record.index,
        status: 'blocked',
        error: 'Missing video artifact.',
      });
      continue;
    }

    try {
      const upload = await uploadBlotatoMediaFromFile({
        apiKey,
        filePath: videoArtifact.path,
        baseUrl: config.blotato.baseUrl,
      });

      const submission = await createBlotatoPost({
        apiKey,
        baseUrl: config.blotato.baseUrl,
        post: buildPostPayload({
          record,
          account,
          uploadUrl: upload.url,
          config,
        }),
        scheduledTime: config.blotato.scheduledTime,
        useNextFreeSlot: config.blotato.useNextFreeSlot,
      });

      const status = config.blotato.pollStatus
        ? await pollBlotatoPostStatus({
            apiKey,
            postSubmissionId: submission.postSubmissionId,
            baseUrl: config.blotato.baseUrl,
            pollIntervalMs: config.blotato.pollIntervalMs,
            maxPolls: config.blotato.maxPolls,
          })
        : null;

      items.push({
        index: record.index,
        status: status?.status || 'submitted',
        uploadUrl: upload.url,
        postSubmissionId: submission.postSubmissionId,
        publicUrl: status?.publicUrl || null,
        scheduledTime: status?.scheduledTime || config.blotato.scheduledTime || null,
      });
    } catch (error) {
      items.push({
        index: record.index,
        status: 'failed',
        error: error.message,
      });
    }
  }

  const failed = items.filter((item) => item.status === 'failed').length;
  const blocked = items.filter((item) => item.status === 'blocked').length;
  const successful = items.filter((item) => ['published', 'scheduled', 'submitted'].includes(item.status)).length;

  let status = 'failed';
  if (failed === 0 && blocked === 0 && successful === items.length) {
    status = items.some((item) => item.status === 'scheduled') ? 'scheduled' : 'published';
  } else if (successful > 0) {
    status = 'partial';
  } else if (blocked > 0 && failed === 0) {
    status = 'blocked';
  }

  return {
    publisher: 'blotato',
    status,
    account: {
      id: account.id,
      username: account.username || null,
      fullname: account.fullname || null,
    },
    items,
    notes,
  };
}
