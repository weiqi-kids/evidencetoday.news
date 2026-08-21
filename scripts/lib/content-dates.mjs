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
 * 掃描所有內容集合，回傳 Map：pathname → **publishDate**（ISO 字串）。
 *
 * 跟 buildLastmodMap 的差別，以及為什麼一定要分開兩支：
 * lastmod 取的是 `updatedDate ?? publishDate`，那是 sitemap 該用的值——它要告訴 Google
 * 「這頁最後改過什麼時候」。但拿它做**批次分析**會得到假結論：任何一次批次編輯（補 seoTitle、
 * 收斂標籤、掛審閱署名）都會把一堆舊頁的 updatedDate 搬到當月，於是「舊批次表現差」這個訊號
 * 會整個消失，舊頁全被算成當月新頁。
 *
 * 2026-08-21 實測到這個錯：index-coverage 的「依發布月份索引率」用了 lastmod，印出
 * 「2026-08 共 225 頁」——但八月實際只發布 94 篇，多出來的是 8/11 那次批次改過 updatedDate
 * 的舊頁。要回答「是時間問題還是品質問題」，只能用 publishDate。
 */
export function buildPublishDateMap() {
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
      const published = toIsoDate(fm.publishDate);
      if (!published) continue;
      const slug = file.replace(/\.(md|mdx)$/i, '');
      map.set(`/${collection}/${slug}/`, published);
    }
  }
  return map;
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
