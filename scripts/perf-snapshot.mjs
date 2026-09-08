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
  // ⚠️ 含 `#` 的 fragment 列必須先剔除，否則所有頁面榜單都會被誤導（2026-09-08 修）。
  // 那些列是 Google SERP 上的「跳至章節」sitelinks：它們隨母頁的同一則結果一起曝光，
  // 曝光與母頁**重複計算**（同一批 SERP 的切片，不是額外流量），而只有使用者特意點那一條
  // 才記點擊——所以它們的 CTR 恆趨近 0，是計數方式造成的，與標題／內容品質無關。
  // 實際後果：站上表現最好的那一頁，它的錨點列霸佔了「高曝光低 CTR」榜首，觸發了一次
  // 對「根本沒壞的內容」的搶救調查。判讀依據見 docs/playbooks/audience-insights.md。
  // 站台層級總計（gscTotal）是 GSC 直接給的站台數字，沒有這個問題，不要動。
  const isFragmentRow = (p) => String(p.page ?? '').includes('#');
  const anchorRows = pages.filter(isFragmentRow);
  const realPages = pages.filter((p) => !isFragmentRow(p));

  console.log(`\n— Top 著陸頁 · 依曝光 (clicks / impr / pos / CTR)${anchorRows.length ? `，已剔除 ${anchorRows.length} 筆章節 sitelinks` : ''} —`);
  [...realPages].sort(byImpr).slice(0, 20).forEach((p) => console.log(pLine(p)));

  // ⚠️ 位置過濾不可省。查詢表（上面）有 position <= 10，頁面表原本沒有，於是排名 24.7、
  // 59.2 的頁（第 3、第 6 頁）也被列進「低 CTR」——那些位置的 CTR 本來就趨近 0，是排名
  // 問題不是標題問題。2026-08-06 實測 14 筆裡有 2 筆是這種假陽性，照著改標題等於白工。
  // 這正是 docs/playbooks/audience-insights.md 記載的位置校正陷阱，門檻放寬到 12 是為了
  // 納入第 2 頁前段（仍有可觀曝光、標題確實影響點擊），再往後就不該用 CTR 判讀標題。
  const LOW_CTR_MAX_POS = 12;
  const weak = realPages.filter((p) => p.impressions >= 50 && p.position <= LOW_CTR_MAX_POS && p.ctr < 0.02).sort(byImpr);
  console.log(`\n— ⚠️ 高曝光低 CTR 頁面：曝光 ≥50、排名 ≤${LOW_CTR_MAX_POS}、CTR <2%（共 ${weak.length} 筆）—`);
  weak.slice(0, 20).forEach((p) => console.log(pLine(p)));
  if (!weak.length) console.log('  (無)');

  // 排名太後面而 CTR 低的，單獨列出來並標明「這不是標題問題」，避免下次又被誤讀成待改標題。
  const deepLowCtr = realPages.filter((p) => p.impressions >= 50 && p.position > LOW_CTR_MAX_POS && p.ctr < 0.02).sort(byImpr);
  if (deepLowCtr.length) {
    console.log(`\n— ℹ️ 曝光 ≥50 但排名 >${LOW_CTR_MAX_POS} 的低 CTR 頁（共 ${deepLowCtr.length} 筆）—`);
    console.log('   這些是排名問題，不是標題問題。要做的是內鏈／權威／內容深度，改標題無效。');
    deepLowCtr.slice(0, 20).forEach((p) => console.log(pLine(p)));
  }

  // 剔除的列不丟掉，另闢一區並標明不可判讀：既能解釋「page 列加總為何多於站台總曝光」，
  // 也擋掉下一個人拿它當「高曝光零點擊」的證據。依母頁彙總，避免整頁被錨點刷版。
  if (anchorRows.length) {
    const byParent = new Map();
    anchorRows.forEach((r) => {
      const parent = path(String(r.page).split('#')[0]);
      const acc = byParent.get(parent) || { parent, rows: 0, clicks: 0, impressions: 0 };
      acc.rows += 1; acc.clicks += r.clicks; acc.impressions += r.impressions;
      byParent.set(parent, acc);
    });
    const grouped = [...byParent.values()].sort(byImpr);
    console.log(`\n— ℹ️ 章節跳轉 sitelinks（URL 含 #，共 ${anchorRows.length} 筆，已從上列所有榜單剔除）—`);
    console.log('   非獨立搜尋結果：隨母頁同一則 SERP 結果曝光，曝光與母頁重複計算，只有點該條才記點擊。');
    console.log('   → CTR 恆趨近 0，是計數方式不是內容問題，不可拿來判讀標題。母頁的真實表現看上面那張表。');
    grouped.forEach((g) => console.log(`  錨點${String(g.rows).padStart(2)} 條  c${String(g.clicks).padStart(3)}  i${String(g.impressions).padStart(5)}  ${g.parent}`));
  }
}
console.log('');
