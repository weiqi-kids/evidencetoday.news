#!/usr/bin/env node
/**
 * pnpm audit:regulation — 成分頁的台灣法規身分 × 食藥署食品原料整合查詢平臺（盤點用，恆 exit 0）。
 *
 * 找出「平臺把這個成分（或其某部位）列為『未確認安全性尚不得使用之原料』，
 * 成分頁卻完全沒有提到不得使用／屬藥品」的頁面。
 *
 * 為什麼需要：2026-09-22 事實核對時發現乳薊（水飛薊）被當成「台灣護肝保健食品最常見的成分」
 * 寫了好幾篇，但平臺列它不得作食品原料、合法產品是藥品。用這支全站比對後，又抓出鋸棕櫚、
 * 東革阿里、纈草三頁同樣的錯，以及人參「根不得單一原料使用、果實莖籽不得使用」這種部位差異。
 * 這類錯誤會直接改變讀者怎麼買、出事找誰，而且**讀稿的人通常不會懷疑**——
 * 「某某是常見保健食品」聽起來就像常識。
 *
 * 資料：平臺開放資料 CSV（https://data.fda.gov.tw/data/opendata/export/4/csv）。
 * 預設每次重新下載（約 11MB）；加 `--cached` 改用 `.tmp-plan/fda-material.csv`。
 *
 * 限制：
 *   - 只用成分頁 `title`（中文名，去掉括號）與 `titleEn` **完整比對**平臺品名欄，
 *     平臺用別名登錄的成分會漏掉——這是刻意的，寧可漏報不要把相似名稱誤配。
 *   - 報出來的頁面要人工判斷：平臺只列某個部位不得使用、而頁面只談可用的部位（例如洛神只談花萼），
 *     那不是錯。
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import yaml from 'js-yaml';

const CSV_URL = 'https://data.fda.gov.tw/data/opendata/export/4/csv';
const CACHE = '.tmp-plan/fda-material.csv';
let csvText;
if (process.argv.includes('--cached') && existsSync(CACHE)) {
  csvText = readFileSync(CACHE, 'utf8');
} else {
  const r = await fetch(CSV_URL);
  if (!r.ok) { console.log(`下載平臺資料失敗（HTTP ${r.status}），略過。`); process.exit(0); }
  csvText = await r.text();
  try { mkdirSync('.tmp-plan', { recursive: true }); writeFileSync(CACHE, csvText); } catch { /* 快取失敗不影響 */ }
}

const rows = csvText.split(/\r?\n/).map((r) => {
  const c = r.replace(/<[^>]*>/g, '').split('","').map((x) => x.replace(/^"|"$/g, '').trim());
  return { cat: c.find((x) => /可供食品使用之原料|未確認安全性尚不得使用之原料/.test(x)) || '', cells: c };
}).filter((r) => r.cat);

const results = [];
for (const f of readdirSync('src/content/ingredients').filter((x) => /\.mdx?$/.test(x))) {
  const t = readFileSync(`src/content/ingredients/${f}`, 'utf8').replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]); } catch { continue; }
  const zh = String(fm.title || '').replace(/[（(].*$/, '').trim();
  const en = String(fm.titleEn || '').replace(/[（(].*$/, '').trim();
  if (!zh) continue;
  const hit = rows.filter((r) =>
    r.cells.some((c) => c.split(/[；;、]/).map((s) => s.trim()).includes(zh)) ||
    (en.length > 4 && r.cells.some((c) => c.toLowerCase() === en.toLowerCase())));
  if (!hit.length) continue;
  const banned = hit.filter((r) => /不得使用/.test(r.cat));
  if (!banned.length) continue;
  const mentions = /不得(供為|供作|作為|作)?食品原料|不得使用|藥品許可證|以藥品管理|屬藥品|是藥品|不得單一原料/.test(t);
  results.push({ f, zh, en, mentions, allowed: hit.length - banned.length,
    detail: banned.map((r) => r.cells.filter((c) => c && c.length < 80).slice(2, 7).join('｜')).join(' ／ ') });
}

const flagged = results.filter((r) => !r.mentions);
console.log(`成分頁在平臺有「不得使用」條目的：${results.length} 頁（其中已在頁面說明的 ${results.length - flagged.length} 頁）`);
console.log(`\n⚠️ 頁面沒有提到不得使用／屬藥品：${flagged.length} 頁`);
for (const r of flagged) console.log(`  ${r.f.padEnd(36)} ${r.zh}／${r.en}｜同名另有可供食品的條目 ${r.allowed} 筆\n      平臺：${r.detail.slice(0, 180)}`);
