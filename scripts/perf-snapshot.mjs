#!/usr/bin/env node
/**
 * pnpm perf — 近 28 天 GA4 + GSC 效能快照（唯讀，不寫檔、不提交）。
 *
 * 用途：經營決策用的真實數據面板（流量、搜尋曝光/點擊/排名、Top 頁面與查詢）。
 * 與 `pnpm insights`（為 /news 選題設計）不同：perf 給的是「站整體表現」。
 *
 * 認證沿用 audience-insights 的 service account（見 docs/playbooks/audience-insights.md）。
 * `getToken()` 優先用服務帳號金鑰（`GOOGLE_SERVICE_ACCOUNT_KEY` 環境變數）走 JWT-bearer
 * 換 token，取不到才退回 `gcloud auth print-access-token`。主機 cron 走 gcloud 這條，
 * 因此 PATH 必須含 /snap/bin，否則 gcloud 找不到 → 兩桶空。下方自動補上。
 * 遠端環境（CCR／CI）沒有 gcloud，靠環境變數那條。
 *
 * GSC 搜尋查詢屬商業內部資訊：只印到 stdout，絕不寫入 repo 檔案。
 */
import { getToken, ga4Report, gscQuery } from './lib/insight-fetch.mjs';

// gcloud 常安裝在 /snap/bin（snap 版 google-cloud-cli）；非互動環境 PATH 可能缺它。
if (!(process.env.PATH || '').split(':').includes('/snap/bin')) {
  process.env.PATH = `/snap/bin:${process.env.PATH || ''}`;
}

const token = await getToken();
const pad = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const gscEnd = new Date(today); gscEnd.setDate(gscEnd.getDate() - 3);   // GSC 資料約 3 天延遲
const gscStart = new Date(gscEnd); gscStart.setDate(gscStart.getDate() - 28);

const num = (n) => Number(n ?? 0).toLocaleString();
const pct = (n) => (Number(n ?? 0) * 100).toFixed(1) + '%';
const fix = (n, d = 1) => Number(n ?? 0).toFixed(d);

// ---------- GA4 ----------
const [overview] = await ga4Report(token, { dimensions: [], metrics: ['totalUsers', 'sessions', 'screenPageViews'], days: 28 });
const topPages = await ga4Report(token, { dimensions: ['pagePath'], metrics: ['screenPageViews'], orderMetric: 'screenPageViews', limit: 12, days: 28 });
const channels = await ga4Report(token, { dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions'], orderMetric: 'sessions', limit: 8, days: 28 });

console.log('\n===== GA4 近 28 天 (properties/541692554) =====');
console.log(overview
  ? `使用者 ${num(overview.totalUsers)} ｜ 工作階段 ${num(overview.sessions)} ｜ 瀏覽 ${num(overview.screenPageViews)}`
  : '(GA4 無回應 — 檢查 gcloud token / SA 權限)');
if (channels.length) {
  console.log('\n— 流量來源 (channel / sessions) —');
  channels.forEach((c) => console.log(`  ${String(c.sessionDefaultChannelGroup).padEnd(18)} ${num(c.sessions)}`));
}
if (topPages.length) {
  console.log('\n— Top 頁面 (pageviews) —');
  topPages.forEach((p) => console.log(`  ${num(p.screenPageViews).padStart(5)}  ${p.pagePath}`));
}

// ---------- GSC ----------
// ⚠️ rowLimit 必須拉大。GSC searchAnalytics 沒給 orderBy 時是「依點擊排序」，
// 所以 rowLimit:15 拿到的是「點擊最高的 15 筆」，不是曝光最高的 15 筆。
// 2026-08-04 實測：那 15 筆合計曝光 122，站台總曝光 4,112——97% 的曝光看不到，
// 而「有曝光、零點擊」的查詢（正是 CTR 優化對象）會被結構性地全部濾掉。
// 故一次抓大量列回本地，再依用途各自排序。
const GSC_ROWS = 1000;
const start = pad(gscStart), end = pad(gscEnd);
const [gscTotal] = await gscQuery(token, { dimensions: [], startDate: start, endDate: end });
const queries = await gscQuery(token, { dimensions: ['query'], startDate: start, endDate: end, rowLimit: GSC_ROWS });
const pages = await gscQuery(token, { dimensions: ['page'], startDate: start, endDate: end, rowLimit: GSC_ROWS });

const byImpr = (a, b) => b.impressions - a.impressions;
const path = (p) => String(p).replace('https://evidencetoday.news', '');
const qLine = (q) => `  c${String(q.clicks).padStart(3)}  i${String(q.impressions).padStart(5)}  p${fix(q.position).padStart(5)}  ${pct(q.ctr).padStart(6)}  ${q.query}`;
const pLine = (p) => `  c${String(p.clicks).padStart(3)}  i${String(p.impressions).padStart(5)}  p${fix(p.position).padStart(5)}  ${pct(p.ctr).padStart(6)}  ${path(p.page)}`;

console.log(`\n===== GSC ${start} ~ ${end} (sc-domain:evidencetoday.news) =====`);
console.log(gscTotal
  ? `點擊 ${num(gscTotal.clicks)} ｜ 曝光 ${num(gscTotal.impressions)} ｜ CTR ${pct(gscTotal.ctr)} ｜ 平均排名 ${fix(gscTotal.position)}`
  : '(GSC 無資料 — SA 可能尚未加入資源，或資料未累積)');

if (queries.length) {
  const shown = queries.reduce((s, q) => s + q.impressions, 0);
  console.log(`\n（查詢列數 ${queries.length}／涵蓋曝光 ${num(shown)}${gscTotal ? `，佔總曝光 ${((shown / gscTotal.impressions) * 100).toFixed(0)}%` : ''}）`);

  console.log('\n— Top 查詢 · 依曝光 (clicks / impr / pos / CTR) —');
  [...queries].sort(byImpr).slice(0, 20).forEach((q) => console.log(qLine(q)));

  // 排名 5–20 ＝ 第一頁邊緣到第二頁：標題／重點摘要改寫最容易換到點擊的區間。
  const near = queries.filter((q) => q.position >= 5 && q.position <= 20 && q.impressions >= 20).sort(byImpr);
  console.log(`\n— ⭐ 機會查詢：排名 5–20 且曝光 ≥20（差一點進第一頁，共 ${near.length} 筆）—`);
  near.slice(0, 30).forEach((q) => console.log(qLine(q)));
  if (!near.length) console.log('  (無)');

  // 已經排在前段卻沒人點 ＝ 標題／描述沒吸引力，不是排名問題。
  const lowCtr = queries.filter((q) => q.impressions >= 50 && q.position <= 10 && q.ctr < 0.02).sort(byImpr);
  console.log(`\n— ⚠️ 高曝光低 CTR 查詢：曝光 ≥50、排名 ≤10、CTR <2%（共 ${lowCtr.length} 筆）—`);
  lowCtr.slice(0, 20).forEach((q) => console.log(qLine(q)));
  if (!lowCtr.length) console.log('  (無)');
}

if (pages.length) {
  console.log('\n— Top 著陸頁 · 依曝光 (clicks / impr / pos / CTR) —');
  [...pages].sort(byImpr).slice(0, 20).forEach((p) => console.log(pLine(p)));

  const weak = pages.filter((p) => p.impressions >= 50 && p.ctr < 0.02).sort(byImpr);
  console.log(`\n— ⚠️ 高曝光低 CTR 頁面：曝光 ≥50 且 CTR <2%（共 ${weak.length} 筆）—`);
  weak.slice(0, 20).forEach((p) => console.log(pLine(p)));
  if (!weak.length) console.log('  (無)');
}
console.log('');
