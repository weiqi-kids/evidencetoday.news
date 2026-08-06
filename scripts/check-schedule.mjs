#!/usr/bin/env node
/**
 * 發文排程健檢 — 找出「破洞」與「跑道快到底」。
 *
 * 為什麼需要這支：2026-08-06 盤點時才發現 ingredients 的 08-17 是空的，
 * 沒有任何檢查會看排程本身，破洞只能靠人眼掃 frontmatter。少發一天不會讓
 * build 失敗、不會讓 CI 變紅，就這樣安靜地過去。
 *
 * 兩種問題分開看，理由不同：
 *  - 破洞（gap）：兩篇已排程稿之間夾著空日。這一定是失誤，因為排程是連續產出的，
 *    中間不該有洞。→ exit 1。
 *  - 跑道（runway）：最後一篇排程稿距今剩幾天。這不是失誤，是產線的正常前緣，
 *    evergreen 由每週 cron 續產（ingredients 週二 / myths 週四 / articles 週日）。
 *    只有短到「下一批 cron 來不及補」才需要示警。→ 只警告，不擋。
 *
 * news 不檢查跑道：趨勢新聞每日 cron 產出，且 publishDate 一律等於檔名的名目日期，
 * 拿它跟 evergreen 一起談「排程」會重蹈 2026-08-04 把 news 拉開 54 天那次的錯。
 * 但 news 仍檢查破洞——每日產出中間空一天就是 cron 沒跑成功，那是要知道的。
 *
 * 用法：pnpm check:schedule
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT_DIR = 'src/content';

/**
 * 各 collection 的產線節奏。runwayDays = 下一批 cron 補進來之前，至少該剩的天數。
 * evergreen 是每週一批（7 天），抓 10 天留緩衝——營運帳號與 appi.news 共用週限額，
 * 撞到限額那批就會空跑，得留得起一次 miss 的餘裕。
 */
const PIPELINES = {
  articles: { label: '文章', cron: '每週日', runwayDays: 10 },
  ingredients: { label: '成分解析', cron: '每週二', runwayDays: 10 },
  myths: { label: '闢謠', cron: '每週四', runwayDays: 10 },
  news: { label: '趨勢新聞', cron: '每日', runwayDays: null }, // 只看破洞，不看跑道
};

/** 台北時間（UTC+8）的今天，YYYY-MM-DD。專案硬規則 4：日期一律 UTC+8。 */
function todayTaipei() {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * 收集某 collection 未來（> today）的排程日。
 * 只算會真的公開的稿：draft: true 不列入，否則草稿會把破洞蓋掉、看起來一切正常。
 */
function futureDates(collection, today) {
  const dir = join(CONTENT_DIR, collection);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  } catch {
    return [];
  }
  const dates = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    const fm = text.slice(0, text.indexOf('\n---', 3) + 1);
    if (/^draft: *true/m.test(fm)) continue;
    const m = fm.match(/^publishDate: *"?(\d{4}-\d{2}-\d{2})/m);
    if (!m || m[1] <= today) continue;
    dates.push({ date: m[1], file });
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date));
}

const today = todayTaipei();
const errors = [];
const warnings = [];

console.log(`發文排程健檢（台北時間 ${today}）\n`);

for (const [collection, cfg] of Object.entries(PIPELINES)) {
  const entries = futureDates(collection, today);

  if (entries.length === 0) {
    warnings.push(`${cfg.label}（${collection}）：未來完全沒有排程稿，產線可能停了（cron ${cfg.cron}）`);
    console.log(`  ${cfg.label.padEnd(5)} 未來 0 篇`);
    continue;
  }

  const first = entries[0].date;
  const last = entries[entries.length - 1].date;
  const scheduled = new Set(entries.map((e) => e.date));

  // 破洞：第一篇到最後一篇之間，哪幾天是空的
  const gaps = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (!scheduled.has(d)) gaps.push(d);
  }

  const runway = daysBetween(today, last);
  console.log(
    `  ${cfg.label.padEnd(5)} ${String(entries.length).padStart(3)} 篇  ${first} ~ ${last}  （跑道 ${runway} 天）`,
  );

  if (gaps.length) {
    errors.push(`${cfg.label}（${collection}）排程破洞 ${gaps.length} 天：${gaps.join('、')}`);
  }
  if (cfg.runwayDays !== null && runway < cfg.runwayDays) {
    warnings.push(
      `${cfg.label}（${collection}）跑道只剩 ${runway} 天（低於 ${cfg.runwayDays} 天），` +
        `下一批 ${cfg.cron} cron 若空跑就會斷更`,
    );
  }
}

if (warnings.length) {
  console.log('\n⚠️  警告（不擋）：');
  for (const w of warnings) console.log(`  · ${w}`);
}

if (errors.length) {
  console.log(`\n排程破洞 ${errors.length} 項：`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\n補法：補一篇該日的稿，或把後面的稿往前挪一天把洞填掉（見 docs/content-guide.md）。');
  console.log('⚠️ news 例外：news 的 publishDate 必須等於檔名的名目日期，不可挪動——要補就補新稿。');
  process.exit(1);
}

console.log('\n排程健檢通過：無破洞。');
