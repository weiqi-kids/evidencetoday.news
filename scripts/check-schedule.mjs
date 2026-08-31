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

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT_DIR = 'src/content';

/**
 * 各 collection 的產線節奏。runwayDays = 下一批 cron 補進來之前，至少該剩的天數。
 * evergreen 是每週一批（7 天），抓 10 天留緩衝——營運帳號與 appi.news 共用週限額，
 * 撞到限額那批就會空跑，得留得起一次 miss 的餘裕。
 */
const PIPELINES = {
  articles: { label: '文章', cron: '每週日', runwayDays: 10, everyNDays: 1 },
  ingredients: { label: '成分解析', cron: '每週二', runwayDays: 10, everyNDays: 2 },
  myths: { label: '闢謠', cron: '每週四', runwayDays: 10, everyNDays: 2 },
  news: { label: '趨勢新聞', cron: '每日', runwayDays: null, everyNDays: 1 }, // 只看破洞，不看跑道
};

/**
 * everyNDays = 這條線的發布節奏（1 = 每天、2 = 每兩天）。
 *
 * 2026-08-31 加。原本破洞判定寫死「兩篇之間不得有空日」，那等於假設每條線都是每日發。
 * 業主決定把闢謠與成分解析降到兩天一篇（依 GSC 每頁曝光效率：文章 87.0、成分 58.3、
 * 闢謠 32.6、新聞 12.1，闢謠與成分的邊際效益已不值得每日產能），若不改這裡，
 * 降頻後每一天都會被誤報成破洞，這支 gate 就會被當成雜訊忽略——那比沒有 gate 更糟。
 *
 * 判準改成：相鄰兩篇的間隔大於 everyNDays 才算破洞。間隔小於節奏（同一天兩篇）不罰，
 * 那是補稿或特例，不是失誤。
 *
 * ⚠️ news 必須維持 1：它是每日 cron 產出、publishDate 等於檔名日期，
 * 中間空一天代表 cron 沒跑成功，那正是要被抓出來的事。
 */

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
let hasLinkErrors = false;   // 內鏈指向未發布稿；與排程破洞分開計數，補法不同
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

  // 破洞：相鄰兩篇的間隔超過該線節奏。每日線（everyNDays=1）等同「中間不得有空日」。
  const step = cfg.everyNDays ?? 1;
  const days = [...scheduled].sort();
  const gaps = [];
  for (let i = 1; i < days.length; i++) {
    const span = daysBetween(days[i - 1], days[i]);
    if (span > step) gaps.push(`${days[i - 1]}→${days[i]}（隔 ${span} 天，節奏應為 ${step}）`);
  }

  const runway = daysBetween(today, last);
  console.log(
    `  ${cfg.label.padEnd(5)} ${String(entries.length).padStart(3)} 篇  ${first} ~ ${last}  （跑道 ${runway} 天、節奏 ${cfg.everyNDays ?? 1} 天 1 篇）`,
  );

  if (gaps.length) {
    errors.push(`${cfg.label}（${collection}）排程破洞 ${gaps.length} 處：${gaps.join('、')}`);
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

/* ── 內鏈指向「尚未發布」的稿件 ───────────────────────────────────────────────
 * 2026-08-06 這個組合把整個部署擋掉：每日優化 cron 在已上線的
 * import-melatonin-taiwan-customs 內文加了一條指向 thailand-sleep-gummies 的
 * 站內連結，但後者排在 08-25。已發布頁 → 未發布頁的連結在 dist 裡是死連結，
 * `pnpm build` 不會抱怨（Astro 不驗站內連結字串），CI 的 lychee 才會，
 * 於是 build 綠燈、部署紅燈。
 * 判定只看「來源已發布」這個方向：未發布 → 未發布是安全的，因為兩者上線時
 * 目標多半已在（同批排程），且雙方都還沒進 dist。
 */
{
  const linkErrors = [];
  const pubOf = new Map();          // "collection/slug" → publishDate
  const bodies = [];                // 已發布稿的內文，供掃連結
  for (const collection of Object.keys(PIPELINES)) {
    const dir = `${CONTENT_DIR}/${collection}`;
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => /\.mdx?$/.test(x))) {
      const raw = readFileSync(`${dir}/${f}`, 'utf8');
      const m = raw.match(/^publishDate: *["']?(\d{4}-\d{2}-\d{2})/m);
      if (!m) continue;
      const slug = f.replace(/\.mdx?$/, '');
      pubOf.set(`${collection}/${slug}`, m[1]);
      if (m[1] <= today) bodies.push({ from: `${collection}/${slug}`, body: raw.split('---').slice(2).join('---') });
    }
  }
  for (const { from, body } of bodies) {
    for (const mm of body.matchAll(/\]\(\/(articles|myths|ingredients|news)\/([a-z0-9-]+)\/?[)"]/g)) {
      const target = `${mm[1]}/${mm[2]}`;
      const td = pubOf.get(target);
      if (td && td > today) {
        linkErrors.push(`${from} 內文連到尚未發布的 /${target}/（${td} 才發布）`);
      }
    }
  }
  if (linkErrors.length) {
    console.log(`\n內鏈指向未發布稿 ${linkErrors.length} 處（會讓 CI 連結檢查失敗、擋住部署）：`);
    for (const l of linkErrors) console.log(`  ✗ ${l}`);
    console.log('\n補法：把連結拿掉（保留語意），或把目標稿的 publishDate 提前到來源之前。');
    hasLinkErrors = true;
  }
}

if (errors.length) {
  console.log(`\n排程破洞 ${errors.length} 項：`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\n補法：補一篇該日的稿，或把後面的稿往前挪一天把洞填掉（見 docs/content-guide.md）。');
  console.log('⚠️ news 例外：news 的 publishDate 必須等於檔名的名目日期，不可挪動——要補就補新稿。');
  process.exit(1);
}

if (hasLinkErrors) process.exit(1);

console.log('\n排程健檢通過：無破洞、無指向未發布稿的內鏈。');
