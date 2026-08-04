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
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getToken } from './lib/insight-fetch.mjs';
import { GSC_SITE } from './lib/insight-constants.mjs';

if (!(process.env.PATH || '').split(':').includes('/snap/bin')) {
  process.env.PATH = `/snap/bin:${process.env.PATH || ''}`;
}

const SITEMAP_INDEX = 'https://evidencetoday.news/sitemap-index.xml';
const HISTORY = '/root/.config/evidencetoday-news/index-coverage-history.jsonl';
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
      return { u, cov: j.inspectionResult?.indexStatusResult?.coverageState || '?' };
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
  console.log(d > 0 ? '  → 回補中，多屬時間問題，續觀察。' : '  → 未成長，偏向權重天花板訊號，該投資站外權威（見 docs/playbooks/geo-offsite.md）。');
}
if (save) {
  const snapshot = { stamp, total: urls.length, indexed, byCov, bySeg };
  mkdirSync(dirname(HISTORY), { recursive: true });
  appendFileSync(HISTORY, JSON.stringify(snapshot) + '\n');
  console.log(`\n已記錄快照 → ${HISTORY}`);
}
