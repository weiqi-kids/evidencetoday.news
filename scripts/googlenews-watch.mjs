#!/usr/bin/env node
/**
 * pnpm gnews:watch — 每週監測 Google News／News 分頁／Discover 的曝光。
 *
 * 為何需要：本站已補齊 Google News 技術件（News Sitemap、NewsArticle、NewsMediaOrganization…），
 * 但實際「被收錄」受網域權重影響、需時間。本監測每週打 GSC API 查 googleNews/news/discover 三種
 * search type 的曝光，偵測「從 0 變正」的里程碑與週對週變化，讓我們知道資格何時兌現。
 *
 * 純資料查詢（不需 headless claude）。沿用 ga4-insights service account 唯讀 token。
 *
 * 用法：
 *   pnpm gnews:watch                      # 查並印報告
 *   GNEWS_HISTORY=/path/history.jsonl pnpm gnews:watch   # 另存歷史並做週對週對比＋里程碑偵測
 *
 * 退出碼：偵測到 googleNews 或 news 曝光「從 0 變正」的里程碑時回 10（供 cron 包裝判斷是否高亮通知）。
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { getToken } from './lib/insight-fetch.mjs';
import { GSC_URL } from './lib/insight-constants.mjs';

const TYPES = ['googleNews', 'news', 'discover', 'web'];
const HISTORY = process.env.GNEWS_HISTORY || '';

// 台灣日期（UTC+8）字串 yyyy-mm-dd，n 天前。
function tw(daysAgo) {
  const d = new Date(Date.now() + 8 * 3600 * 1000 - daysAgo * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

async function queryType(token, type, { startDate, endDate, dimensions = [], rowLimit = 5 }) {
  const body = { startDate, endDate, type, dimensions, rowLimit };
  try {
    const r = await fetch(GSC_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, status: r.status, rows: [] };
    const json = await r.json();
    return { ok: true, rows: json.rows || [] };
  } catch (e) {
    return { ok: false, status: 'fetch-error', rows: [], error: e.message };
  }
}

function sum(rows, field) {
  return rows.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
}

const token = getToken();
if (!token) {
  console.error('[gnews-watch] 取不到 gcloud token（需 ga4-insights SA / PATH 含 /snap/bin）。');
  process.exit(1);
}

const startDate = tw(7);
const endDate = tw(0);
const startPrev = tw(14);
const endPrev = tw(8);

const result = { stamp: new Date().toISOString(), window: `${startDate}~${endDate}`, byType: {} };

console.log(`===== Google News 曝光監測（GSC）${startDate} ~ ${endDate} =====`);
for (const type of TYPES) {
  const cur = await queryType(token, type, { startDate, endDate });
  const prev = await queryType(token, type, { startDate: startPrev, endDate: endPrev });
  const impr = sum(cur.rows, 'impressions');
  const clicks = sum(cur.rows, 'clicks');
  const imprPrev = sum(prev.rows, 'impressions');
  result.byType[type] = { impressions: impr, clicks, imprPrev };
  const delta = impr - imprPrev;
  const arrow = delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '＝';
  const flag = !cur.ok ? `（查詢失敗 ${cur.status}）` : '';
  console.log(`  ${type.padEnd(11)} 曝光 ${impr}｜點擊 ${clicks}｜前7日 ${imprPrev}（${arrow}）${flag}`);
}

// 里程碑：googleNews 或 news 從 0（上次歷史）變正。
let milestone = false;
let prevEntry = null;
let history = [];
if (HISTORY) {
  try {
    history = readFileSync(HISTORY, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    if (history.length) prevEntry = history[history.length - 1];
  } catch { /* 無歷史檔，首次執行 */ }
}
for (const key of ['googleNews', 'news']) {
  const now = result.byType[key]?.impressions ?? 0;
  const was = prevEntry?.byType?.[key]?.impressions ?? 0;
  if (now > 0 && was === 0) milestone = true;
}

if (milestone) {
  console.log('\n🎉🎉🎉 里程碑：Google News／News 分頁曝光「從 0 變正」！本站開始被 Google News 收錄。');
  console.log('   建議：到 GSC 看哪些頁進榜、確認 sitemap-news.xml 抓取正常，並擴大相關主題產出。');
} else {
  const gn = result.byType.googleNews?.impressions ?? 0;
  const nv = result.byType.news?.impressions ?? 0;
  if (gn === 0 && nv === 0) {
    console.log('\n尚未進入 Google News（googleNews/news 曝光仍為 0）。屬正常——技術件已備齊，等網域權重累積與 Google 認定。');
  }
}

if (HISTORY) {
  try {
    appendFileSync(HISTORY, JSON.stringify(result) + '\n');
    console.log(`\n[gnews-watch] 已寫入歷史：${HISTORY}`);
  } catch (e) {
    console.error(`[gnews-watch] 寫歷史失敗：${e.message}`);
  }
}

// ── 歷史趨勢分析 + 線性推估（不論里程碑與否，每週都產 Slack 摘要）──────────────────
// 確定性計算（無 headless claude）：週對週、零連續週數、近 6 週最小二乘斜率、推估下週值/破 100 週數。
function analyze(series) {
  const n = series.length;
  const latest = series[n - 1] ?? 0;
  const prev = series[n - 2] ?? 0;
  const wow = latest - prev;
  let zeroStreak = 0;
  for (let i = n - 1; i >= 0; i--) { if (series[i] === 0) zeroStreak++; else break; }
  const k = Math.min(6, n);
  let slope = 0;
  if (k >= 2) {
    const pts = series.slice(n - k);
    const mx = (k - 1) / 2;
    const my = pts.reduce((a, b) => a + b, 0) / k;
    let num = 0, den = 0;
    for (let i = 0; i < k; i++) { num += (i - mx) * (pts[i] - my); den += (i - mx) ** 2; }
    slope = den ? num / den : 0;
  }
  return { n, latest, prev, wow, zeroStreak, slope, projNext: Math.max(0, Math.round(latest + slope)) };
}

const allEntries = [...history, result];
const weeks = allEntries.length;
const FOCUS = [['googleNews', 'Google News'], ['news', 'News 分頁'], ['discover', 'Discover'], ['web', 'Web 搜尋']];
const slackLines = [];
for (const [key, label] of FOCUS) {
  const series = allEntries.map((e) => e.byType?.[key]?.impressions ?? 0);
  const a = analyze(series);
  const arrow = a.wow > 0 ? `▲${a.wow}` : a.wow < 0 ? `▼${-a.wow}` : '＝';
  let proj;
  if (a.latest === 0 && a.zeroStreak === a.n) {
    proj = `連續 ${a.n} 週 0`;
  } else if (a.slope > 0.5) {
    proj = `升，推估下週約 ${a.projNext}`;
    if (a.latest < 100) { const w = Math.ceil((100 - a.latest) / a.slope); if (w > 0 && w < 260) proj += `、約 ${w} 週後破 100`; }
  } else if (a.slope < -0.5) {
    proj = `降，推估下週約 ${a.projNext}`;
  } else {
    proj = a.latest > 0 ? `持平 ~${a.latest}` : '仍為 0';
  }
  slackLines.push(`• ${label}：曝光 ${a.latest}（週對週 ${arrow}）｜推估：${proj}`);
}

const gnSeries = allEntries.map((e) => e.byType?.googleNews?.impressions ?? 0);
const nvSeries = allEntries.map((e) => e.byType?.news?.impressions ?? 0);
let gnZeroWeeks = 0;
for (let i = gnSeries.length - 1; i >= 0; i--) { if (gnSeries[i] === 0 && nvSeries[i] === 0) gnZeroWeeks++; else break; }
let verdict;
if (milestone) {
  verdict = '🎉 已破 0！Google News／News 分頁開始收錄。建議到 GSC 看進榜頁、確認 sitemap-news 抓取正常，並擴大相關主題產出。';
} else if ((result.byType.googleNews?.impressions ?? 0) === 0 && (result.byType.news?.impressions ?? 0) === 0) {
  verdict = `尚未進入 Google News／News（連續 ${gnZeroWeeks} 週 0）。技術件已備齊，瓶頸在網域權重——推估短期仍需靠站外權威引用累積，非站內可翻盤。`;
} else {
  verdict = '部分流量面已有曝光，依目前斜率持續監測；若連續成長可考慮加碼相關主題。';
}

const slackMsg = [
  `📰 *Google News 監測週報* — ${endDate}`,
  `視窗：近 7 日 vs 前 7 日｜歷史 ${weeks} 週`,
  '',
  ...slackLines,
  '',
  `推估：${verdict}`,
].join('\n');
console.log('\n' + slackMsg);

const SLACK_OUT = process.env.GNEWS_SLACK_OUT || '';
if (SLACK_OUT) {
  try { writeFileSync(SLACK_OUT, slackMsg); } catch (e) { console.error(`[gnews-watch] 寫 Slack 摘要失敗：${e.message}`); }
}

process.exit(milestone ? 10 : 0);
