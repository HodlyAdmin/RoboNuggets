import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

function buildQueueDraft({ platform, accountSelector, text, linkUrl, imagePath, record, drafts, config }) {
  const post = {
    accountId: accountSelector?.accountId ? String(accountSelector.accountId) : '<set-account-id>',
    content: {
      platform,
      text,
    },
    target: {
      targetType: platform,
    },
  };

  if (platform === 'instagram') {
    post.content.mediaUrls = ['<upload-via-blotato-media>'];
    if (config.blotato.targets.instagram.shareToFeed !== null && config.blotato.targets.instagram.shareToFeed !== undefined) {
      post.target.shareToFeed = Boolean(config.blotato.targets.instagram.shareToFeed);
    }
  }

  return {
    platform,
    accountSelector,
    mediaFilePath: imagePath || null,
    linkUrl,
    sourceRecord: {
      index: record.index,
      articleUrl: record.articleUrl || null,
      articleTitle: record.articleTitle,
    },
    summary: drafts.articleSummary,
    post,
  };
}

export async function publishLocalQueue({ records, draftsByIndex, imageArtifacts, outputDir, config }) {
  const queueDir = join(outputDir, 'queue');
  await mkdir(queueDir, { recursive: true });

  const imageByIndex = new Map(imageArtifacts.map((artifact) => [artifact.index, artifact]));
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

    const recordDir = join(queueDir, `${String(record.index).padStart(3, '0')}-${record.slug}`);
    await mkdir(recordDir, { recursive: true });
    const imageArtifact = imageByIndex.get(record.index);

    const platformSpecs = [
      ['twitter', draft.twitterPost, config.blotato.targets.twitter],
      ['linkedin', draft.linkedinPost, config.blotato.targets.linkedin],
      ['facebook', draft.facebookPost, config.blotato.targets.facebook],
      ['instagram', draft.instagramCaption, config.blotato.targets.instagram],
    ];

    for (const [platform, text, selector] of platformSpecs) {
      const platformDir = join(recordDir, platform);
      const postPath = join(platformDir, 'post.json');
      await mkdir(platformDir, { recursive: true });

      const payload = buildQueueDraft({
        platform,
        accountSelector: selector,
        text,
        linkUrl: draft.linkUrl,
        imagePath: platform === 'instagram' ? imageArtifact?.path || null : null,
        record,
        drafts: draft,
        config,
      });

      await writeFile(postPath, JSON.stringify(payload, null, 2));

      items.push({
        index: record.index,
        platform,
        status: 'queued',
        postPath,
        mediaFilePath: payload.mediaFilePath || null,
      });
    }
  }

  return {
    publisher: 'local-queue',
    status: items.every((item) => item.status === 'queued') ? 'queued' : 'partial',
    items,
    notes: [
      'Live publishing was skipped. Queue items contain Blotato-ready per-platform draft payloads.',
    ],
  };
}
