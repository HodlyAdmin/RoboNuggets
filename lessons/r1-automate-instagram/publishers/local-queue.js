import { copyFile, mkdir, writeFile } from 'fs/promises';
import { basename, join } from 'path';

function padIndex(value) {
  return String(value).padStart(3, '0');
}

export async function publishLocalQueue({ records, imageArtifacts, outputDir }) {
  const queueDir = join(outputDir, 'queue');
  const imagesByIndex = new Map(imageArtifacts.map((artifact) => [artifact.index, artifact]));
  const items = [];

  for (const record of records) {
    const image = imagesByIndex.get(record.index);
    const packageDir = join(queueDir, `${padIndex(record.index)}-${record.slug}`);
    const imageDestination = image ? join(packageDir, basename(image.path)) : null;

    await mkdir(packageDir, { recursive: true });

    if (image && image.path !== imageDestination) {
      await copyFile(image.path, imageDestination);
    }

    await writeFile(join(packageDir, 'caption.txt'), `${record.instagramCaption}\n`);
    await writeFile(join(packageDir, 'quote.txt'), `${record.quote}\n`);
    await writeFile(join(packageDir, 'post.json'), JSON.stringify({
      index: record.index,
      title: record.title,
      quote: record.quote,
      instagramCaption: record.instagramCaption,
      sourceType: record.sourceType,
      imagePath: imageDestination || image?.path || null,
      preparedAt: new Date().toISOString(),
    }, null, 2));

    items.push({
      index: record.index,
      packageDir,
      imagePath: imageDestination || image?.path || null,
      status: 'prepared',
    });
  }

  return {
    publisher: 'local-queue',
    status: 'prepared',
    items,
    notes: [
      `Prepared ${items.length} post package(s) in ${queueDir}.`,
      'Each package contains the image, caption.txt, quote.txt, and post.json for manual review or downstream automation.',
    ],
  };
}
