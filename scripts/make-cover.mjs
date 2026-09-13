#!/usr/bin/env node
/**
 * 產生本地封面圖：抓圖庫原圖 → 裁成 1280×720 → 轉 webp → 存進 public/covers/<slug>.webp
 *
 * 為什麼要本地檔而不是外連圖庫網址：
 *   1. `check-spec.mjs` 對 `/` 開頭的路徑會 `existsSync` 驗檔案真的存在；外連網址它只看格式，
 *      連結哪天失效變破圖也不會有人知道。
 *   2. 外連圖床曾整批 403（見 docs/reminders.md 的 coverAlt 待補項），一旦圖床擋起來，
 *      前台就是一排破圖。本地檔沒有這個風險。
 *   3. 業主 2026-09-12 明確要求一律本地 webp。
 *
 * 用法：
 *   node scripts/make-cover.mjs <slug> "<英文搜圖關鍵字>"
 *   node scripts/make-cover.mjs --batch <json 檔>    # [{slug, keyword}, ...]
 *
 * 需要 GITHUB_TOKEN（worker 會驗此 token 對 repo 的 push 權）：
 *   GITHUB_TOKEN=$(gh auth token) node scripts/make-cover.mjs ...
 *
 * ⚠️ 圖選完之後仍要**人眼看過才寫 coverAlt**。機器沒看過圖就寫 alt 等於編造無障礙描述；
 *    而且實測過六次選錯圖（馬來西亞印刷行招牌、南非古董藥房、品牌自拍產品照）都通過了
 *    HTTP 驗證——光看網址看不出問題。本腳本只負責取得與轉檔，不寫 alt。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const WORKER = 'https://evidencetoday-ai-suggest.lightman-chang.workers.dev/stock';
const OUT_DIR = 'public/covers';
const W = 1280;
const H = 720;

const token = (process.env.GITHUB_TOKEN || '').trim();
if (!token) { console.error('缺 GITHUB_TOKEN（worker 用它驗 repo push 權）'); process.exit(1); }

/** 站上已用過的圖 id，避免整站重複配圖 */
function usedIds() {
  const ids = new Set();
  for (const col of ['articles', 'myths', 'ingredients', 'news', 'podcasts', 'videos']) {
    let files = [];
    try { files = readdirSync(`src/content/${col}`); } catch { continue; }
    for (const f of files) {
      if (!/\.mdx?$/.test(f)) continue;
      const t = readFileSync(`src/content/${col}/${f}`, 'utf8');
      for (const m of t.matchAll(/photo-[\w-]+|photos\/\d+/g)) ids.add(m[0]);
    }
  }
  return ids;
}

/**
 * 攝影者黑名單：圖庫上有品牌自己上傳的產品照，選到就等於在首頁放業配。
 * 硬規則 9 禁止把網站做成產品頁，而這種圖每次都通過 HTTP 驗證，光看網址看不出來。
 * 2026-09-05 與 09-12 兩次都選到同一個品牌（換了不同張圖，所以圖片 id 去重擋不住）。
 * 同樣要擋的還有醫療機構：診所／醫院／戒癮中心上傳的圖是它們的行銷素材，
 * 放上去等於把本站做成診所頁，一樣踩硬規則 9。
 */
const BLOCKED_CREDITS = [
  /beelith/i,
  /\bUSA\b.*supplement/i,
  /pharma(ceutical)?s?\s*(inc|ltd|co)/i,
  /\brehab\b/i, // 2026-09-13 選到 Diamond Rehab Thailand
  /\bclinic\b|\bhospital\b|\bmedical\s+cent(er|re)\b/i,
];

async function pick(keyword, used) {
  // worker 是 POST + { keywords }，不是 query string（照 scripts/backfill-covers.mjs 的用法）
  const r = await fetch(WORKER, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ keywords: keyword }),
  });
  if (!r.ok) throw new Error(`worker ${r.status}`);
  const j = await r.json();
  const list = j.photos || j.results || j.images || [];
  for (const p of list) {
    const url = p.full || p.src?.large2x || p.src?.original || p.urls?.full || p.urls?.regular;
    if (!url) continue;
    const id = (url.match(/photo-[\w-]+|photos\/\d+/) || [])[0];
    if (id && used.has(id)) continue;      // 跳過站上已用過的
    const credit = p.credit || p.photographer || p.user?.name || '';
    if (BLOCKED_CREDITS.some((re) => re.test(credit))) {
      console.log(`    ↳ 跳過品牌自拍：${credit}`);
      continue;
    }
    if (id) used.add(id);
    return { url, credit, id };
  }
  return null;
}

async function build(slug, keyword, used) {
  const hit = await pick(keyword, used);
  if (!hit) { console.log(`✗ ${slug}：關鍵字「${keyword}」找不到可用的圖`); return null; }
  const res = await fetch(hit.url);
  if (!res.ok) { console.log(`✗ ${slug}：原圖下載失敗 ${res.status}`); return null; }
  const buf = Buffer.from(await res.arrayBuffer());

  mkdirSync(OUT_DIR, { recursive: true });
  const out = `${OUT_DIR}/${slug}.webp`;
  // 目標 30–170KB（對齊站上既有檔），品質由高往下調到落進區間
  for (const q of [82, 74, 66, 58, 50]) {
    await sharp(buf).resize(W, H, { fit: 'cover', position: 'attention' }).webp({ quality: q }).toFile(out);
    const kb = Math.round(statSync(out).size / 1024);
    if (kb <= 170) { console.log(`✓ ${slug}.webp  ${W}x${H}  ${kb}KB  q=${q}  攝影：${hit.credit}`); return { slug, credit: hit.credit, kb }; }
  }
  console.log(`⚠ ${slug}：壓不到 170KB 以下，仍已產出`);
  return { slug, credit: hit.credit };
}

const args = process.argv.slice(2);
const used = usedIds();
const jobs = args[0] === '--batch'
  ? JSON.parse(readFileSync(args[1], 'utf8'))
  : [{ slug: args[0], keyword: args[1] }];

const done = [];
for (const j of jobs) {
  if (existsSync(`${OUT_DIR}/${j.slug}.webp`)) { console.log(`· ${j.slug}：已存在，跳過`); continue; }
  try { const r = await build(j.slug, j.keyword, used); if (r) done.push(r); }
  catch (e) { console.log(`✗ ${j.slug}：${e.message}`); }
}
writeFileSync('.tmp-plan/covers-made.json', JSON.stringify(done, null, 1));
console.log(`\n完成 ${done.length}/${jobs.length}。frontmatter 寫 coverImage: "/covers/<slug>.webp"，coverAlt 要看過圖再寫。`);
