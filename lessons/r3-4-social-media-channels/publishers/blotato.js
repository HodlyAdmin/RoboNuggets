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

function summarizeAccounts(accounts) {
  if (!accounts.length) return 'none';
  return accounts
    .map((account) => account.fullname || account.username || account.id)
    .join(', ');
}

function findAccount(accounts, selector) {
  if (selector.accountId) {
    return accounts.find((account) => String(account.id) === String(selector.accountId)) || null;
  }

  if (selector.accountUsername) {
    const target = normalizeText(selector.accountUsername).replace(/^@/, '');
    return accounts.find((account) => normalizeText(account.username).replace(/^@/, '') === target) || null;
  }

  if (selector.accountFullName) {
    const target = normalizeText(selector.accountFullName);
    return accounts.find((account) => normalizeText(account.fullname) === target) || null;
  }

  return null;
}

function buildPostPayload({ platform, account, draft, uploadedMediaUrl, config }) {
  const post = {
    accountId: String(account.id),
    content: {
      platform,
      text: draft,
    },
    target: {
      targetType: platform,
    },
  };

  if (platform === 'instagram') {
    post.content.mediaUrls = [uploadedMediaUrl];
    post.target.shareToFeed = Boolean(config.blotato.targets.instagram.shareToFeed);
  }

  return post;
}

export async function publishBlotato({ records, draftsByIndex, imageArtifacts, config }) {
  const notes = [];
  const { value: apiKey, source: apiKeySource } = await resolveBlotatoApiKey({
    envPath: config.blotato.envPath,
    envVar: config.blotato.apiKeyEnvVar,
  });

  if (!apiKey) {
    return {
      publisher: 'blotato',
      status: 'blocked',
      items: [],
      notes: [
        `Missing ${config.blotato.apiKeyEnvVar}. Set it in the environment or provide blotato.envPath.`,
      ],
    };
  }

  notes.push(`Resolved Blotato API key from ${apiKeySource}.`);

  const imageByIndex = new Map(imageArtifacts.map((artifact) => [artifact.index, artifact]));
  const accountCache = new Map();
  const items = [];

  for (const record of records) {
    const draft = draftsByIndex.get(record.index);
    if (!draft) {
      items.push({
        index: record.index,
        status: 'blocked',
        error: 'Missing generated drafts.',
      });
      continue;
    }

    const platformSpecs = [
      ['twitter', draft.twitterPost, config.blotato.targets.twitter],
      ['linkedin', draft.linkedinPost, config.blotato.targets.linkedin],
      ['facebook', draft.facebookPost, config.blotato.targets.facebook],
      ['instagram', draft.instagramCaption, config.blotato.targets.instagram],
    ].filter(([, , selector]) => selector.enabled !== false);

    for (const [platform, text, selector] of platformSpecs) {
      try {
        if (!accountCache.has(platform)) {
          const accounts = await listBlotatoAccounts({
            apiKey,
            platform,
            baseUrl: config.blotato.baseUrl,
          });
          accountCache.set(platform, accounts);
        }

        const accounts = accountCache.get(platform);
        const account = findAccount(accounts, selector);
        if (!account) {
          items.push({
            index: record.index,
            platform,
            status: 'blocked',
            error: `No connected ${platform} account matched selector.`,
            connectedAccounts: summarizeAccounts(accounts),
          });
          continue;
        }

        let uploadedMediaUrl = null;
        if (platform === 'instagram') {
          const imageArtifact = imageByIndex.get(record.index);
          if (!imageArtifact?.path) {
            items.push({
              index: record.index,
              platform,
              status: 'blocked',
              error: 'Missing Instagram image artifact.',
            });
            continue;
          }

          const upload = await uploadBlotatoMediaFromFile({
            apiKey,
            filePath: imageArtifact.path,
            baseUrl: config.blotato.baseUrl,
          });
          uploadedMediaUrl = upload.url;
        }

        const submission = await createBlotatoPost({
          apiKey,
          baseUrl: config.blotato.baseUrl,
          post: buildPostPayload({
            platform,
            account,
            draft: text,
            uploadedMediaUrl,
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
          platform,
          status: status?.status || 'submitted',
          postSubmissionId: submission.postSubmissionId,
          publicUrl: status?.publicUrl || null,
          scheduledTime: status?.scheduledTime || config.blotato.scheduledTime || null,
        });
      } catch (error) {
        items.push({
          index: record.index,
          platform,
          status: 'failed',
          error: error.message,
        });
      }
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
    items,
    notes,
  };
}
