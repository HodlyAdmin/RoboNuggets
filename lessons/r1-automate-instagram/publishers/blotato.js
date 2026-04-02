import {
  createBlotatoPost,
  findBlotatoAccount,
  listBlotatoAccounts,
  pollBlotatoPostStatus,
  resolveBlotatoApiKey,
  uploadBlotatoMediaFromFile,
} from '../../../shared/blotato.js';

function truncate(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function connectedAccountsSummary(accounts) {
  if (!accounts.length) return 'none';
  return accounts
    .map((account) => account.username || account.fullname || account.id)
    .join(', ');
}

function buildAltText(record) {
  const parts = [record.title, record.quote].filter(Boolean);
  return truncate(parts.join(' - '), 1000);
}

export async function publishBlotato({ records, imageArtifacts, config }) {
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
    platform: config.blotato.platform,
    baseUrl: config.blotato.baseUrl,
  });

  const account = findBlotatoAccount(accounts, {
    accountId: config.blotato.accountId,
    username: config.blotato.accountUsername,
  });

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
        `No connected Blotato ${config.blotato.platform} account matched ${config.blotato.accountId ? `account ID ${config.blotato.accountId}` : `username ${config.blotato.accountUsername}`}.`,
        `Connected ${config.blotato.platform} accounts on this key: ${connectedAccountsSummary(accounts)}.`,
      ],
    };
  }

  notes.push(`Resolved Blotato ${config.blotato.platform} account ${account.username || account.id}.`);

  const imageByIndex = new Map(imageArtifacts.map((artifact) => [artifact.index, artifact]));
  const items = [];

  for (const record of records) {
    const imageArtifact = imageByIndex.get(record.index);
    if (!imageArtifact?.path) {
      items.push({
        index: record.index,
        status: 'blocked',
        error: 'Missing image artifact.',
      });
      continue;
    }

    try {
      const upload = await uploadBlotatoMediaFromFile({
        apiKey,
        filePath: imageArtifact.path,
        baseUrl: config.blotato.baseUrl,
      });

      const postPayload = {
        accountId: String(account.id),
        content: {
          text: record.instagramCaption,
          mediaUrls: [upload.url],
          platform: config.blotato.platform,
        },
        target: {
          targetType: config.blotato.platform,
        },
      };

      if (config.blotato.shareToFeed !== null && config.blotato.shareToFeed !== undefined) {
        postPayload.target.shareToFeed = config.blotato.shareToFeed;
      }

      if (config.blotato.mediaType) {
        postPayload.target.mediaType = config.blotato.mediaType;
      }

      const altText = buildAltText(record);
      if (altText) {
        postPayload.target.altText = altText;
      }

      const submission = await createBlotatoPost({
        apiKey,
        post: postPayload,
        scheduledTime: config.blotato.scheduledTime,
        useNextFreeSlot: config.blotato.useNextFreeSlot,
        baseUrl: config.blotato.baseUrl,
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
