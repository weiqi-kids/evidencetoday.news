#!/usr/bin/env node
/**
 * pnpm index:coverage — 全站 Google 索引覆蓋率掃描（唯讀），並記錄歷史快照供追蹤回補曲線。
 *
 * 背景：2026-06-23 診斷出本站真正的流量瓶頸是「Google 發現了卻不索引」——當時真實索引僅
 * 25/233（11%），189 頁卡在「Discovered - currently not indexed」（網域權重不足，非技術 bug）。
 * sitemap 當天才提交，需 2–4 週讓 Google 消化。本指令把當時的一次性掃描變成可重複量測：
 * 每跑一次記一筆快照到倉庫外的歷史檔，並印出與上次的差異，判斷索引數是在「爬升中（時間問題）」
 * 還是「卡住（權重天花板，該投資站外）」。
 *
 * 認證：沿用 ga4-insights service account 的「唯讀」token（URL 檢查 API 唯讀即可，已實測），
 * 不需要 sitemap:submit 那種寫入 scope。PATH 須含 /snap/bin（自動補上）。
 *
 * 用法：
 *   pnpm index:coverage            # 掃描 + 記錄快照 + 與上次比對
 *   pnpm index:coverage --no-save  # 只掃描印出，不寫歷史
 *
 * 歷史檔（非機密、僅彙總計數，故存倉庫外，不 commit）：
 *   /root/.config/evidencetoday-news/index-coverage-history.jsonl（每行一筆 JSON 快照）
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getToken } from './lib/insight-fetch.mjs';
import { GSC_SITE } from './lib/insight-constants.mjs';
import { buildLastmodMap } from './lib/content-dates.mjs';

if (!(process.env.PATH || '').split(':').includes('/snap/bin')) {
  process.env.PATH = `/snap/bin:${process.env.PATH || ''}`;
}

const SITEMAP_INDEX = 'https://evidencetoday.news/sitemap-index.xml';
const HISTORY = '/root/.config/evidencetoday-news/index-coverage-history.jsonl';
// 逐 URL 明細（覆寫，只留最新一份）。歷史檔只存彙總計數，回答不了「Google 到底不收哪幾頁」——
// 而那正是唯一能判斷「該衝內容量還是先修既有頁」的資料：新頁若有兩成機率不被收，
// 「再多寫幾篇」就是錯的方向。2026-08-08 為了做這個分析得另外寫臨時腳本重跑一次 345 個
// URL（API 有額度，重跑不是免費的），所以把明細一起留下來。
const DETAIL = '/root/.config/evidencetoday-news/index-coverage-latest.json';
const INDEXED = 'Submitted and indexed';
const save = !process.argv.includes('--no-save');
const token = await getToken();
if (!token) { console.error('無法取得 gcloud token（檢查 /snap/bin 與 SA）。'); process.exit(1); }

// ---- 取全部 URL：優先線上 sitemap，取不到才退回本地 dist/ ----
// ⚠️ 遠端沙箱（Claude Code on the web／CCR）的 egress allowlist 不含本站網域，
// fetch 會回 403 純文字「Host not in allowlist」而**不是丟例外**。舊版沒驗證內容，
// 於是解析出 0 個 <loc>、照樣往下跑，最後印出「真實索引：0/0（NaN%）」——
// 看起來像「索引全掛」的災難數字，其實只是抓不到 sitemap。務必保留下方的硬失敗。
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

async function fromRemote() {
  const idxRes = await fetch(SITEMAP_INDEX);
  const idxXml = await idxRes.text();
  if (!idxRes.ok || !idxXml.includes('<loc>')) {
    console.error(`  線上 sitemap 取不到（HTTP ${idxRes.status}）：${idxXml.trim().slice(0, 120)}`);
    return [];
  }
  const subs = locs(idxXml).filter((u) => u.endsWith('.xml'));
  const out = [];
  for (const sm of subs.length ? subs : [SITEMAP_INDEX]) {
    out.push(...locs(await (await fetch(sm)).text()).filter((u) => !u.endsWith('.xml')));
  }
  return out;
}

function fromDist() {
  const idx = 'dist/sitemap-index.xml';
  if (!existsSync(idx)) return [];
  const subs = locs(readFileSync(idx, 'utf8')).filter((u) => u.endsWith('.xml'));
  const out = [];
  for (const u of subs) {
    const local = `dist/${u.split('/').pop()}`;
    if (existsSync(local)) out.push(...locs(readFileSync(local, 'utf8')).filter((x) => !x.endsWith('.xml')));
  }
  return out;
}

let urls = await fromRemote();
let source = '線上 sitemap';
if (!urls.length) {
  urls = fromDist();
  source = 'dist/ 本地 sitemap';
}
if (!urls.length) {
  console.error('\n❌ 取不到任何 URL，中止（不輸出覆蓋率，避免誤讀成「索引掛掉」）。');
  console.error('   線上抓不到多半是遠端沙箱封鎖本站網域。兩條路擇一：');
  console.error('   1. 先跑 pnpm build 產生 dist/，本腳本會自動改讀本地 sitemap');
  console.error('   2. 把 evidencetoday.news 加進環境的 network egress allowlist');
  process.exit(1);
}
console.error(`掃描 ${urls.length} 個 URL（${source}）...`);

// ---- 逐一打 URL 檢查 API（併發 5，429 退避）----
const site = GSC_SITE;
async function inspect(u) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: u, siteUrl: site }),
      });
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 3000)); continue; }
      const j = await r.json();
      if (j.error) return { u, cov: `ERR${j.error.code}` };
      const ir = j.inspectionResult?.indexStatusResult || {};
      return { u, cov: ir.coverageState || '?', lastCrawl: ir.lastCrawlTime || null };
    } catch { if (t === 3) return { u, cov: 'EXC' }; }
  }
  return { u, cov: 'FAIL' };
}
const out = [];
let i = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (i < urls.length) { const k = i++; out[k] = await inspect(urls[k]); }
}));

// ---- 彙總 ----
const seg = (u) => u.replace('https://evidencetoday.news/', '').split('/')[0] || '(home)';
const byCov = {};
const bySeg = {};
for (const r of out) {
  byCov[r.cov] = (byCov[r.cov] || 0) + 1;
  const c = seg(r.u);
  bySeg[c] = bySeg[c] || { tot: 0, idx: 0 };
  bySeg[c].tot++;
  if (r.cov === INDEXED) bySeg[c].idx++;
}
const indexed = out.filter((r) => r.cov === INDEXED).length;
const stamp = new Date().toISOString();

console.log(`\n===== 索引覆蓋率 ${stamp.slice(0, 16)} =====`);
console.log('— coverageState 分布 —');
Object.entries(byCov).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
console.log('\n— 各 collection 已索引/總 —');
Object.entries(bySeg).filter(([, v]) => v.tot >= 2).sort((a, b) => b[1].tot - a[1].tot)
  .forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v.idx}/${v.tot}`));
console.log(`\n>>> 真實索引：${indexed}/${urls.length}（${(indexed / urls.length * 100).toFixed(0)}%）`);

// ---- 依發布月份的索引率 ----
// 為什麼要看這個：本檔原本只印總數，成長時一律建議「續觀察，多屬時間問題」。
// 2026-08-08 把逐 URL 狀態對上 publishDate 之後，發現那句話是錯的——
// 索引率不是隨時間單調上升，而是隨「發布當時的內容品質」變化：
//   2026-03 76% ｜ 2026-04 38% ｜ 2026-05 53% ｜ 2026-06 71% ｜ 2026-07 97%
// 也就是說近期產出幾乎全被收錄，拖累總數的是特定一批舊內容。那批已經過了 90–120 天，
// Google 不是還沒看，是看過了決定不收。對它們「續觀察」等於永遠不處理。
{
  const dates = new Map();
  for (const [path, iso] of buildLastmodMap()) dates.set(path, iso);
  const byMonth = {};
  for (const r of out) {
    const path = r.u.replace('https://evidencetoday.news', '');
    const iso = dates.get(path) ?? dates.get(path.endsWith('/') ? path : `${path}/`);
    if (!iso) continue;
    const mo = String(iso).slice(0, 7);
    byMonth[mo] = byMonth[mo] || { tot: 0, idx: 0 };
    byMonth[mo].tot++;
    if (r.cov === INDEXED) byMonth[mo].idx++;
  }
  const months = Object.entries(byMonth).sort();
  if (months.length > 1) {
    console.log('\n— 依發布月份的索引率（判斷「是時間問題還是品質問題」）—');
    for (const [mo, v] of months) {
      const pct = (v.idx / v.tot) * 100;
      console.log(`  ${mo}  ${String(v.idx).padStart(3)}/${String(v.tot).padEnd(3)} ${pct.toFixed(0).padStart(4)}%  ${'█'.repeat(Math.round(pct / 5))}`);
    }
    console.log('  判讀：最近一兩個月偏低是正常的（還在排隊）。舊月份偏低才是品質訊號——');
    console.log('  那些頁已經過了幾個月，Google 不是還沒看，是看過了決定不收。');
  }
}

// ---- 與上次比對 + 記錄 ----
let prev = null;
if (existsSync(HISTORY)) {
  const lines = readFileSync(HISTORY, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length) prev = JSON.parse(lines[lines.length - 1]);
}
if (prev) {
  const d = indexed - prev.indexed;
  const days = ((Date.parse(stamp) - Date.parse(prev.stamp)) / 86400000).toFixed(1);
  const arrow = d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '＝ 持平';
  console.log(`\n對比上次（${prev.stamp.slice(0, 10)}，${days} 天前）：已索引 ${prev.indexed} → ${indexed}　${arrow}`);
  console.log(d > 0 ? '  → 已索引數在成長。但成長不等於「未收錄的那些也會跟著回補」，見下方年齡分佈。' : '  → 未成長，偏向權重天花板訊號，該投資站外權威（見 docs/playbooks/geo-offsite.md）。');
}
if (save) {
  const snapshot = { stamp, total: urls.length, indexed, byCov, bySeg };
  mkdirSync(dirname(HISTORY), { recursive: true });
  appendFileSync(HISTORY, JSON.stringify(snapshot) + '\n');
  writeFileSync(DETAIL, JSON.stringify({ stamp, urls: out }, null, 1));
  console.log(`\n已記錄快照 → ${HISTORY}`);
  console.log(`逐 URL 明細 → ${DETAIL}（含 coverageState 與 lastCrawlTime，供交叉分析用）`);
}

// ---- 未被收錄的頁：直接列出來，不用再另外查 ----
const notIndexed = out.filter((r) => r.cov !== INDEXED && !r.cov.startsWith('ERR'));
if (notIndexed.length) {
  const byState = {};
  for (const r of notIndexed) (byState[r.cov] ||= []).push(r.u.replace('https://evidencetoday.news', ''));
  console.log('\n— 未被收錄的頁（依狀態）—');
  for (const [state, list] of Object.entries(byState).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${state}（${list.length}）`);
    list.slice(0, 15).forEach((u) => console.log(`    ${u}`));
    if (list.length > 15) console.log(`    …另 ${list.length - 15} 頁，完整清單見 ${DETAIL}`);
  }
  console.log('\n  判讀：Discovered - currently not indexed 是「Google 知道但選擇不收」，');
  console.log('  多半與內容量或跨頁重複有關（見 docs/playbooks/analytics.md）；');
  console.log('  URL is unknown to Google 則是還沒被發現，屬內鏈或時間問題。');
}
