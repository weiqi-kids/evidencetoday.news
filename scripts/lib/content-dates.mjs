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

/** 取「不在未來」的那幾個裡最新的。全部都在未來就回 undefined（寧可沒有，也不要給假的）。 */
function newestPast(...values) {
  const now = new Date().toISOString();
  const past = values.filter((v) => v && v <= now).sort();
  return past.length ? past[past.length - 1] : undefined;
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
  let skippedFuture = 0;
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
      // 🔴 lastmod 不得是未來時間。sitemap 出現未來的 lastmod，Google 會判定這個欄位
      //    不可信而**整份忽略**——那會讓全站的 lastmod 一起失效。
      //    2026-08-22 實測：97 篇的 updatedDate、60 篇的 publishDate 落在未來，
      //    產出的 sitemap 有 50 個網址帶未來 lastmod。
      //    規則：取「不在未來」的那幾個裡最新的；兩個都在未來就不給（不猜、也不用今天填）。
      const lastmod = newestPast(toIsoDate(fm.updatedDate), toIsoDate(fm.publishDate));
      if (!lastmod) { skippedFuture += 1; continue; }
      const slug = file.replace(/\.(md|mdx)$/i, '');
      map.set(`/${collection}/${slug}/`, lastmod);
    }
  }
  if (skippedFuture) {
    console.warn(`[lastmod] ⚠️ ${skippedFuture} 篇內容的 publishDate 與 updatedDate 都在未來，沒有給 lastmod。`
      + '那是內容資料的問題（排程稿或填錯日期），不是 sitemap 的問題——修 frontmatter 才會有值。');
  }
  return map;
}

/**
 * 每篇公開內容的「歸屬判斷所需欄位 ＋ lastmod」。給主題彙整頁（/topics/<slug>/）算 lastmod 用。
 *
 * 為什麼要這一支、而不是在這裡直接算主題：主題歸屬的判準是 src/data/topics.ts 的
 * `matchesTopic`（比對 title + tags 是否含 topic.matchKeywords）。**那份判準只能有一個實作**
 * ——在這裡照抄一份，改判準時就會有一邊忘了同步，而且不會報錯，只會讓主題頁的 lastmod
 * 悄悄對不上它實際收錄的內容。所以這裡只吐原料（title / tags / lastmod），
 * 由 astro.config 用真正的 matchesTopic 去配對。
 *
 * ⚠️ tags 要把各集合的變體都收進來：myths 有 topicTags、其餘用 tags，
 *    與 src/pages/topics/[slug].astro 傳給 matchesTopic 的內容一致。
 */
export function buildEntryMeta() {
  const out = [];
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
      // 🔴 排除「排程中、尚未發布」的內容。buildLastmodMap 不必過濾是因為那些內容
      //    根本不會被 getStaticPaths 產頁、不會進 sitemap；但**彙整頁會被它們汙染**
      //    ——主題頁取的是收錄內容裡最新的一筆，把未來的算進來就會產出未來的 lastmod。
      //    2026-08-22 實測：不過濾的話 16 個主題頁全部拿到 2026-09～10 的日期，
      //    而 sitemap 的 lastmod 是未來時間，Google 會直接不信這個欄位。
      const lastmod = newestPast(toIsoDate(fm.updatedDate), toIsoDate(fm.publishDate));
      if (!lastmod) continue;
      out.push({
        title: typeof fm.title === 'string' ? fm.title : '',
        tags: [...(Array.isArray(fm.tags) ? fm.tags : []), ...(Array.isArray(fm.topicTags) ? fm.topicTags : [])],
        lastmod,
      });
    }
  }
  return out;
}
