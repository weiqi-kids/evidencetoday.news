// 修復成分縮圖的 Wikimedia 熱連結 — 供 Actions runner 執行（CCR 沙箱打不到 wikimedia）。
//
// 背景（2026-07-22 事故）：Commons 縮圖已改為「只供應固定桶值寬度」（要 480 會回 500px URL），
// 手改成 /1024px- 的熱連結全數 404 → 前台縮圖全破。教訓：**縮圖 URL 一律以 API 回傳的
// thumburl 為準，不可自行改寫寬度**。
//
// 行為：掃 src/content/ingredients/*.mdx 的 upload.wikimedia.org coverImage，逐一 HEAD 驗證；
// 非 200 者以檔名向 Commons API 要 iiurlwidth=1024 的合法 thumburl（API 會自行吸附桶值），
// 再 HEAD 驗證 200 後改寫 frontmatter。結尾任何一篇仍壞 → exit 1。

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/ingredients';
const UA = { 'User-Agent': 'evidencetoday-thumb-fix/1.0 (https://evidencetoday.news; editorial cover sourcing)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, opts = {}, tries = 3) {
  for (let t = 1; ; t++) {
    const res = await fetch(url, { ...opts, headers: UA });
    if (res.status !== 429 || t >= tries) return res;
    const wait = Number(res.headers.get('retry-after')) * 1000 || 6000;
    await sleep(wait);
  }
}
const headStatus = async (url) => (await fetchRetry(url, { method: 'HEAD', redirect: 'follow' })).status;

let broken = 0, fixed = 0, ok = 0;
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.mdx'))) {
  const path = join(DIR, f);
  let text = readFileSync(path, 'utf8');
  const m = text.match(/^coverImage: "(https:\/\/upload\.wikimedia\.org[^"]+)"/m);
  if (!m) continue;
  const url = m[1];
  const st = await headStatus(url);
  if (st === 200) { ok++; console.log(`✓ ${f}: 200`); await sleep(300); continue; }
  console.log(`✗ ${f}: HTTP ${st} → 重取合法縮圖 URL`);

  // thumb URL 形如 .../thumb/a/ab/<FILE>/1024px-<FILE>；倒數第二段即原始檔名
  const parts = url.split('/');
  const isThumb = url.includes('/thumb/');
  const file = decodeURIComponent(isThumb ? parts[parts.length - 2] : parts[parts.length - 1]);
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=url|size&iiurlwidth=1024`;
  const j = await (await fetchRetry(api)).json();
  const ii = j.query?.pages?.[0]?.imageinfo?.[0];
  const candidates = [ii?.thumburl, ii?.url].filter(Boolean);
  let done = false;
  for (const nu of candidates) {
    const nst = await headStatus(nu);
    if (nst === 200) {
      text = text.replace(m[0], `coverImage: "${nu}"`);
      writeFileSync(path, text);
      fixed++; done = true;
      console.log(`  ↳ 換成 ${nu}（HEAD 200）`);
      break;
    }
    console.log(`  ↳ 候補 ${nu} 仍 ${nst}`);
  }
  if (!done) { broken++; console.error(`  ✗ ${f}: 無可用 URL（API 候補皆非 200）`); }
  await sleep(400);
}
console.log(`\ndone — ok=${ok} fixed=${fixed} still-broken=${broken}`);
if (broken > 0) process.exit(1);
