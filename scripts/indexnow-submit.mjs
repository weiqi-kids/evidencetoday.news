#!/usr/bin/env node
// IndexNow 通知：把本次 deploy「異動到的內容頁」即時推送給 Bing/Yandex/Seznam/Naver/DuckDuckGo。
// ChatGPT 搜尋接地走 Bing 索引，故這條主要加速 /news 等時效內容進入 ChatGPT search 的可被引用範圍。
// 注意：Google 不支援 IndexNow，Google/Gemini 一路仍靠 sitemap + GSC。
//
// 用法：deploy.yml 用 git diff 算出異動檔清單，從 stdin（每行一個檔案路徑）餵進來。
//   只送「真的存在於 build 後 sitemap」的 URL（自動排除 draft / 轉址 / slug 不符），並去重。
//
// 環境變數：
//   INDEXNOW_KEY  公開金鑰（非機密），需與 public/<KEY>.txt 檔名與內容一致。
//   INDEXNOW_DRY_RUN=1  只印出要送的 URL，不實際 POST（本機測試用）。

import { readFileSync } from 'node:fs';

const HOST = 'evidencetoday.news';
const ORIGIN = `https://${HOST}`;
const SITEMAP = 'dist/sitemap-0.xml';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// 內容集合目錄名 == 前台路由前綴；slug == 檔名去副檔名（含 podcasts，見 stripPodcastSlug）。
const COLLECTIONS = new Set(['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news']);

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function sitemapUrls() {
  let xml = '';
  try {
    xml = readFileSync(SITEMAP, 'utf8');
  } catch {
    console.error(`[indexnow] 找不到 ${SITEMAP}，跳過。`);
    return null;
  }
  const set = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    set.add(m[1].trim().replace(/\/$/, ''));
  }
  return set;
}

function changedFilesToUrls(files) {
  const urls = new Set();
  for (const raw of files) {
    const file = raw.trim();
    // 形如 src/content/<collection>/<slug>.md|mdx
    const match = file.match(/^src\/content\/([^/]+)\/(.+)\.(md|mdx)$/);
    if (!match) continue;
    const [, collection, slug] = match;
    if (!COLLECTIONS.has(collection)) continue;
    urls.add(`${ORIGIN}/${collection}/${slug}`);
  }
  return urls;
}

async function main() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.error('[indexnow] 未設定 INDEXNOW_KEY，跳過。');
    return;
  }

  const files = readStdin().split('\n').filter(Boolean);
  if (files.length === 0) {
    console.log('[indexnow] 無異動檔，跳過。');
    return;
  }

  const candidates = changedFilesToUrls(files);
  if (candidates.size === 0) {
    console.log('[indexnow] 異動檔不含內容頁，跳過。');
    return;
  }

  const live = sitemapUrls();
  if (live === null) return;

  // 只送真的存在於 sitemap 的 URL（draft / 轉址 / slug 不符自動排除）。
  const urlList = [...candidates]
    .filter((u) => live.has(u))
    .map((u) => `${u}/`);

  if (urlList.length === 0) {
    console.log('[indexnow] 異動頁皆不在 sitemap（可能是 draft），跳過。');
    return;
  }

  console.log(`[indexnow] 準備送出 ${urlList.length} 個 URL：`);
  for (const u of urlList) console.log(`  - ${u}`);

  if (process.env.INDEXNOW_DRY_RUN === '1') {
    console.log('[indexnow] DRY_RUN，不實際送出。');
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `${ORIGIN}/${key}.txt`,
      urlList,
    }),
  });

  // IndexNow 成功回 200 或 202；其他狀態印出但不讓 deploy 失敗。
  console.log(`[indexnow] 回應狀態：${res.status} ${res.statusText}`);
  if (res.status !== 200 && res.status !== 202) {
    console.error('[indexnow] 非預期狀態，請查 key 是否已上線、URL 是否同網域。');
  }
}

main().catch((err) => {
  console.error('[indexnow] 例外（不阻擋 deploy）：', err.message);
});
