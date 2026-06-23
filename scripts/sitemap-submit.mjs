#!/usr/bin/env node
/**
 * pnpm sitemap:submit — 主動把 sitemap 提交給 Google Search Console，並回報索引覆蓋率。
 *
 * 背景：本站 build 會產出 234-URL 的 sitemap-index.xml、robots.txt 也已聲明，但對權重仍低的
 * 新站，光靠 robots.txt 那行不足以讓 Google 系統性發現全部頁面（2026-06-23 實測：約 200 頁
 * 內容僅 26 頁拿到曝光，整批 myths/ingredients 回報「URL is unknown to Google」）。根因是
 * GSC 從未提交過 sitemap。提交後 Google 會週期性重抓 sitemap，自動發現新頁。
 *
 * 認證：沿用 ga4-insights service account（見 docs/playbooks/audience-insights.md 與記憶
 * ga4-insights-auth-setup），但「提交 sitemap 需寫入 scope」——perf/insights 用的共用 SCOPES
 * 是唯讀（webmasters.readonly），故本腳本「就地」用寫入 scope 取一顆獨立 token，不放寬其他
 * 唯讀流程的權限。SA 本身已具該 GSC 屬性的擁有者權限（已實測可提交）。
 *
 * 用法：
 *   pnpm sitemap:submit          # 提交 sitemap-index.xml + 印覆蓋率
 *   pnpm sitemap:submit --check  # 只查狀態與覆蓋率，不提交
 */
import { execFileSync } from 'node:child_process';
import { SERVICE_ACCOUNT, GSC_SITE } from './lib/insight-constants.mjs';

// gcloud 常裝在 /snap/bin；非互動環境 PATH 可能缺它。
if (!(process.env.PATH || '').split(':').includes('/snap/bin')) {
  process.env.PATH = `/snap/bin:${process.env.PATH || ''}`;
}

const SITEMAP = 'https://evidencetoday.news/sitemap-index.xml';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const checkOnly = process.argv.includes('--check');

function writeToken() {
  return execFileSync('gcloud', [
    'auth', 'print-access-token', '--account', SERVICE_ACCOUNT, '--scopes', WRITE_SCOPE,
  ]).toString().trim();
}

const site = encodeURIComponent(GSC_SITE);
const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/sitemaps`;
const token = writeToken();
const auth = { Authorization: `Bearer ${token}` };

if (!checkOnly) {
  const res = await fetch(`${base}/${encodeURIComponent(SITEMAP)}`, { method: 'PUT', headers: auth });
  if (res.status === 204) console.log(`✅ 已提交 sitemap：${SITEMAP}`);
  else console.log(`⚠️ 提交回應 ${res.status}：${(await res.text()).slice(0, 300)}`);
}

// 回報目前 sitemap 處理狀態
const list = await (await fetch(base, { headers: auth })).json();
for (const s of list.sitemap ?? []) {
  console.log(`\nsitemap: ${s.path}`);
  console.log(`  最後下載=${s.lastDownloaded ?? '從未'} | 錯誤=${s.errors ?? 0} | 警告=${s.warnings ?? 0} | pending=${s.isPending ?? false}`);
}

// 回報索引覆蓋率（有曝光的頁數 / sitemap 總頁數的概略訊號用 searchAnalytics 估）
const end = new Date(); end.setDate(end.getDate() - 3);
const start = new Date(end); start.setDate(start.getDate() - 28);
const pad = (d) => d.toISOString().slice(0, 10);
const saRes = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
  { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: pad(start), endDate: pad(end), dimensions: ['page'], rowLimit: 1000 }) },
);
const sa = await saRes.json();
const pagesWithImpr = (sa.rows ?? []).length;
console.log(`\n近 28 天有曝光的頁數：${pagesWithImpr}（sitemap 含 234 頁；此數應隨索引回補成長）`);
