// 內容 frontmatter 日期掃描 —— 供 astro.config 的 sitemap serialize 對每篇公開內容輸出 lastmod。
//
// lastmod 規則（與前台 freshness 對齊）：優先用 updatedDate，沒有才退回 publishDate。
// 未來 publishDate 的內容不會被 getStaticPaths 產頁，因此不會進 sitemap，這裡不需重複過濾。
// 純 Node（build 階段 devDependencies 可用 js-yaml），不依賴 astro:content 虛擬模組。

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const CONTENT_DIR = fileURLToPath(new URL('../../src/content/', import.meta.url));
const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * 掃描所有內容集合，回傳 Map：pathname（含前後斜線，例 "/articles/<slug>/"）→ lastmod（ISO 字串）。
 */
export function buildLastmodMap() {
  const map = new Map();
  for (const collection of COLLECTIONS) {
    let files;
    try {
      files = readdirSync(join(CONTENT_DIR, collection));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(md|mdx)$/i.test(file)) continue;
      const fm = parseFrontmatter(readFileSync(join(CONTENT_DIR, collection, file), 'utf8'));
      if (!fm) continue;
      const lastmod = toIsoDate(fm.updatedDate ?? fm.publishDate);
      if (!lastmod) continue;
      const slug = file.replace(/\.(md|mdx)$/i, '');
      map.set(`/${collection}/${slug}/`, lastmod);
    }
  }
  return map;
}
