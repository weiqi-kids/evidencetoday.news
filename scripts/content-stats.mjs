#!/usr/bin/env node
/**
 * 站況快照 — 內容盤點（唯讀，不寫檔）。
 *
 * 為什麼需要這支：文件裡曾經直接寫死「文章 83 / 闢謠 34」「articles 129/129 掛審閱」
 * 這類數字。數字一寫進 md 就開始腐爛——內容每天在長，文件不會跟著改，後來的人
 * （包含 AI agent）照著過期數字做決策。這支把「現在有幾篇、公開幾篇、排程到哪天、
 * 審閱署名掛了多少」變成一道指令，文件只要寫「跑 pnpm stats」就好。
 *
 * 分工（各查各的，不要在這支重造）：
 *   pnpm stats           內容盤點（本檔）— 篇數／可見性／署名／排程前緣
 *   pnpm check:schedule  排程健檢 — 破洞（擋）與跑道不足（警告）
 *   pnpm perf            GA4+GSC 效能快照 — 曝光／點擊／排名
 *   pnpm index:coverage  Google 索引涵蓋率
 *
 * 可見性判定與 `src/utils/visibility.ts` 的 isPublicEntry 對齊（draft / under-review /
 * 未來 publishDate 三條），否則這裡的「已公開」會跟前台對不起來。
 *
 * 用法：pnpm stats
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const CONTENT_DIR = 'src/content';
const COLLECTIONS = [
  ['articles', '文章'],
  ['myths', '闢謠'],
  ['ingredients', '成分解析'],
  ['news', '趨勢新聞'],
  ['podcasts', 'Podcast'],
  ['videos', '短影音'],
];

/** 台北時間（UTC+8）的今天，YYYY-MM-DD。專案硬規則：日期一律 UTC+8。 */
function todayTaipei() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 把 frontmatter 的 publishDate 正規化成 YYYY-MM-DD（可能是 Date 或字串）。 */
function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return null;
}

function readCollection(name) {
  let files = [];
  try {
    files = readdirSync(join(CONTENT_DIR, name)).filter((f) => /\.mdx?$/.test(f));
  } catch {
    return [];
  }
  return files.map((file) => {
    const raw = readFileSync(join(CONTENT_DIR, name, file), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    let fm = {};
    if (m) {
      try { fm = yaml.load(m[1]) || {}; } catch { fm = {}; }
    }
    return { file, fm };
  });
}

const today = todayTaipei();
const rows = [];
let latestScheduled = null;

for (const [name, label] of COLLECTIONS) {
  const entries = readCollection(name);
  if (entries.length === 0) continue;

  let published = 0;
  let scheduled = 0;
  let draft = 0;
  let underReview = 0;
  let reviewed = 0;
  let lastScheduled = null;

  for (const { fm } of entries) {
    if (fm.reviewer) reviewed += 1;

    if (fm.draft === true) { draft += 1; continue; }
    if (fm.status === 'under-review') { underReview += 1; continue; }

    const date = toIsoDate(fm.publishDate);
    if (date && date > today) {
      scheduled += 1;
      if (!lastScheduled || date > lastScheduled) lastScheduled = date;
      continue;
    }
    published += 1;
  }

  if (lastScheduled && (!latestScheduled || lastScheduled > latestScheduled)) {
    latestScheduled = lastScheduled;
  }

  rows.push({
    label,
    name,
    total: entries.length,
    published,
    scheduled,
    draft,
    underReview,
    reviewed,
    lastScheduled,
  });
}

// 終端機等寬字型下 CJK 佔兩欄，String.padEnd 只算字元數會讓表格歪掉。
const width = (s) => String(s).length + (String(s).match(/[⺀-￯]/g) || []).length;
const pad = (s, w) => String(s) + ' '.repeat(Math.max(0, w - width(s)));
const num = (n, w) => ' '.repeat(Math.max(0, w - width(n))) + String(n);

console.log(`\n站況快照（台北時間 ${today}）\n`);
console.log(`${pad('類型', 14)}${num('總數', 6)}${num('已公開', 8)}${num('排程中', 8)}${num('草稿', 6)}${num('待審', 6)}${num('掛審閱', 8)}  最後排程日`);
console.log('-'.repeat(74));

for (const r of rows) {
  const pending = r.underReview ? r.underReview : '-';
  const drafts = r.draft ? r.draft : '-';
  console.log(
    `${pad(r.label, 14)}${num(r.total, 6)}${num(r.published, 8)}${num(r.scheduled, 8)}` +
    `${num(drafts, 6)}${num(pending, 6)}${num(`${r.reviewed}/${r.total}`, 8)}  ${r.lastScheduled ?? '-'}`
  );
}

const totals = rows.reduce(
  (acc, r) => ({
    total: acc.total + r.total,
    published: acc.published + r.published,
    scheduled: acc.scheduled + r.scheduled,
  }),
  { total: 0, published: 0, scheduled: 0 }
);

console.log('-'.repeat(74));
console.log(`${pad('合計', 14)}${num(totals.total, 6)}${num(totals.published, 8)}${num(totals.scheduled, 8)}`);
console.log(`\n最後排程日：${latestScheduled ?? '（無未來排程稿）'}`);
console.log('排程破洞與跑道請跑 pnpm check:schedule；曝光數據 pnpm perf；索引涵蓋率 pnpm index:coverage\n');
