'use strict';

const fs = require('fs-extra');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');

function getLocalPathFromUrl(url) {
  const pathname = url.replace(/^https?:\/\/[^/]+/, '');
  return path.join(process.cwd(), 'public', pathname);
}

function isLocalFileUrl(url) {
  if (!url) {
    return false;
  }

  return url.startsWith('/uploads/') || url.includes('/uploads/');
}

async function migrateUploadsToCloudinary() {
  if (!process.env.CLOUDINARY_NAME) {
    throw new Error(
      'CLOUDINARY_NAME is required. Set Cloudinary credentials in .env before running.'
    );
  }

  const uploadService = strapi.plugin('upload').service('upload');
  const files = await strapi.db.query('plugin::upload.file').findMany({
    orderBy: { id: 'asc' },
  });

  const localFiles = files.filter(
    (file) =>
      file.url &&
      isLocalFileUrl(file.url) &&
      !file.url.includes('res.cloudinary.com')
  );

  if (localFiles.length === 0) {
    console.log('No local upload files found to migrate.');
    return;
  }

  console.log(`Found ${localFiles.length} file(s) to migrate.`);

  if (isDryRun) {
    for (const file of localFiles) {
      const localPath = getLocalPathFromUrl(file.url);
      const exists = await fs.pathExists(localPath);
      console.log(
        `${exists ? '[ok]' : '[missing]'} #${file.id} ${file.name} -> ${localPath}`
      );
    }
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of localFiles) {
    const localPath = getLocalPathFromUrl(file.url);

    if (!(await fs.pathExists(localPath))) {
      console.warn(`Skip #${file.id} ${file.name}: file not found at ${localPath}`);
      skipped += 1;
      continue;
    }

    const stats = await fs.stat(localPath);

    try {
      await uploadService.replace(file.id, {
        data: {
          fileInfo: {
            name: file.name,
            alternativeText: file.alternativeText,
            caption: file.caption,
          },
        },
        file: {
          filepath: localPath,
          originalFilename: `${file.hash}${file.ext}`,
          mimetype: file.mime,
          size: stats.size,
        },
      });

      migrated += 1;
      console.log(`Migrated #${file.id} ${file.name}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed #${file.id} ${file.name}:`, error.message);
    }
  }

  console.log(
    `Done. migrated=${migrated} skipped=${skipped} failed=${failed} total=${localFiles.length}`
  );
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  try {
    await migrateUploadsToCloudinary();
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
