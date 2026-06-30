#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STRAPI_URL = (process.env.STRAPI_URL ?? "http://localhost:1337").replace(/\/$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DRY_RUN = process.env.DRY_RUN === "1";
const SINGLE_SLUG = process.env.SLUG;

if (!STRAPI_TOKEN) {
  console.error("Missing STRAPI_TOKEN. Create one in Strapi admin → Settings → API Tokens.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentBySlug = JSON.parse(
  readFileSync(join(__dirname, "articles-content.json"), "utf8"),
);

const headers = {
  Authorization: `Bearer ${STRAPI_TOKEN}`,
  "Content-Type": "application/json",
};

async function strapiFetch(path, options = {}) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, { ...options, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function mergeBlocks(existingBlocks = [], newTextBlocks = []) {
  const mediaBlocks = existingBlocks.filter(
    (b) => b.__component === "shared.media" || b.__component === "shared.slider",
  );

  const preservedMedia = mediaBlocks.map((block) => {
    if (block.__component === "shared.media" && block.file) {
      return {
        __component: "shared.media",
        file: block.file.id ?? block.file.documentId,
      };
    }
    if (block.__component === "shared.slider" && block.files?.length) {
      return {
        __component: "shared.slider",
        files: block.files.map((f) => f.id ?? f.documentId),
      };
    }
    return { __component: block.__component };
  });

  return [...newTextBlocks, ...preservedMedia];
}

async function updateArticle(slug, payload) {
  const list = await strapiFetch(
    `/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[blocks][on][shared.rich-text]=true&populate[blocks][on][shared.quote]=true&populate[blocks][on][shared.media][populate]=file&populate[blocks][on][shared.slider][populate]=files`,
  );

  const article = list.data?.[0];
  if (!article) {
    console.warn(`⚠ Skipped (not found): ${slug}`);
    return;
  }

  const mergedBlocks = mergeBlocks(article.blocks, payload.blocks);
  const body = {
    data: {
      description: payload.description,
      blocks: mergedBlocks,
    },
  };

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update: ${slug} (${article.documentId})`);
    return;
  }

  await strapiFetch(`/articles/${article.documentId}?status=published`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  console.log(`✓ Updated: ${slug}`);
}

async function main() {
  const slugs = SINGLE_SLUG ? [SINGLE_SLUG] : Object.keys(contentBySlug);

  console.log(`Target: ${STRAPI_URL}`);
  console.log(`Articles: ${slugs.length}${DRY_RUN ? " (dry run)" : ""}\n`);

  for (const slug of slugs) {
    await updateArticle(slug, contentBySlug[slug]);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});