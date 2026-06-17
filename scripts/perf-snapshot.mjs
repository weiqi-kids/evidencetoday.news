#!/usr/bin/env node
/**
 * pnpm perf — 近 28 天 GA4 + GSC 效能快照（唯讀，不寫檔、不提交）。
 *
 * 用途：經營決策用的真實數據面板（流量、搜尋曝光/點擊/排名、Top 頁面與查詢）。
 * 與 `pnpm insights`（為 /news 選題設計）不同：perf 給的是「站整體表現」。
 *
 * 認證沿用 audience-insights 的 service account（見 docs/playbooks/audience-insights.md
 * 與記憶 ga4-insights-auth-setup）：`getToken()` 走 `gcloud auth print-access-token`，
 * 因此 PATH 必須含 /snap/bin，否則 gcloud 找不到 → 兩桶空。下方自動補上。
 *
 * GSC 搜尋查詢屬商業內部資訊：只印到 stdout，絕不寫入 repo 檔案。
 */
import { getToken, ga4Report, gscQuery } from './lib/insight-fetch.mjs';

// gcloud 常安裝在 /snap/bin（snap 版 google-cloud-cli）；非互動環境 PATH 可能缺它。
if (!(process.env.PATH || '').split(':').includes('/snap/bin')) {
  process.env.PATH = `/snap/bin:${process.env.PATH || ''}`;
}

const token = getToken();
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
const start = pad(gscStart), end = pad(gscEnd);
const [gscTotal] = await gscQuery(token, { dimensions: [], startDate: start, endDate: end });
const queries = await gscQuery(token, { dimensions: ['query'], startDate: start, endDate: end, rowLimit: 15 });
const pages = await gscQuery(token, { dimensions: ['page'], startDate: start, endDate: end, rowLimit: 12 });

console.log(`\n===== GSC ${start} ~ ${end} (sc-domain:evidencetoday.news) =====`);
console.log(gscTotal
  ? `點擊 ${num(gscTotal.clicks)} ｜ 曝光 ${num(gscTotal.impressions)} ｜ CTR ${pct(gscTotal.ctr)} ｜ 平均排名 ${fix(gscTotal.position)}`
  : '(GSC 無資料 — SA 可能尚未加入資源，或資料未累積)');
if (queries.length) {
  console.log('\n— Top 搜尋查詢 (clicks / impr / pos) —');
  queries.sort((a, b) => b.impressions - a.impressions).forEach((q) =>
    console.log(`  c${String(q.clicks).padStart(3)}  i${String(q.impressions).padStart(4)}  p${fix(q.position).padStart(5)}  ${q.query}`));
}
if (pages.length) {
  console.log('\n— Top 著陸頁 (clicks / impr) —');
  pages.sort((a, b) => b.impressions - a.impressions).forEach((p) =>
    console.log(`  c${String(p.clicks).padStart(3)}  i${String(p.impressions).padStart(4)}  ${String(p.page).replace('https://evidencetoday.news', '')}`));
}
console.log('');
