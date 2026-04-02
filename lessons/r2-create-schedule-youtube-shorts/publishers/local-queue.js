import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

function truncate(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function buildDraft(record, videoArtifact, config) {
  return {
    accountSelector: {
      platform: 'youtube',
      accountId: config.blotato.accountId || null,
      accountFullName: config.blotato.accountFullName || null,
    },
    mediaFilePath: videoArtifact.path,
    scheduledTime: config.blotato.scheduledTime || null,
    useNextFreeSlot: Boolean(config.blotato.useNextFreeSlot),
    post: {
      accountId: config.blotato.accountId ? String(config.blotato.accountId) : '<set-account-id>',
      content: {
        platform: 'youtube',
        text: truncate(record.youtubeDescription || record.title, 5000),
        mediaUrls: ['<upload-via-blotato-media>'],
      },
      target: {
        targetType: 'youtube',
        title: truncate(record.youtubeTitle || record.title, 100),
        privacyStatus: config.blotato.privacyStatus,
        notifySubscribers: Boolean(config.blotato.notifySubscribers),
        selfDeclaredMadeForKids: Boolean(config.blotato.selfDeclaredMadeForKids),
        containsSyntheticMedia: Boolean(config.blotato.containsSyntheticMedia),
      },
    },
  };
}

export async function publishLocalQueue({ records, videoArtifacts, outputDir, config }) {
  const queueDir = join(outputDir, 'queue');
  await mkdir(queueDir, { recursive: true });

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

    const itemDir = join(queueDir, `${String(record.index).padStart(3, '0')}-${record.slug}`);
    const postPath = join(itemDir, 'post.json');
    const draft = buildDraft(record, videoArtifact, config);

    await mkdir(itemDir, { recursive: true });
    await writeFile(postPath, JSON.stringify(draft, null, 2));

    items.push({
      index: record.index,
      status: 'queued',
      queueDir: itemDir,
      postPath,
      mediaFilePath: videoArtifact.path,
    });
  }

  return {
    publisher: 'local-queue',
    status: items.every((item) => item.status === 'queued') ? 'queued' : 'partial',
    items,
    notes: [
      'Live publishing was skipped. Queue items contain Blotato-ready draft payloads and the rendered local media path.',
    ],
  };
}
