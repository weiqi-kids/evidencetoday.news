#!/usr/bin/env node
/**
 * 跨檔樣板語守門（去 AI 味的第二層）。
 *
 * check-content.mjs 做的是「單檔正則」——它問「這句話像不像 AI 寫的」。
 * 那一層抓不到本站真正的問題：**每一句都合法，但 68 篇逐字一樣**。
 * 樣板化是跨檔現象，不存在於任何單一檔案裡，單檔正則永遠看不到。
 *
 * 這件事有實際代價：2026-08-06 的索引調查顯示，未被 Google 收錄的成分頁跨頁樣板
 * 覆蓋率中位數 45%，被收錄的是 0%。Google 對「同一批頁面互相重複」的容忍度很低。
 *
 * 檢查兩件事：
 *   A. frontmatter 欄位跨檔逐字相同 —— 例如 68/76 篇 myths 的 medicalDisclaimer
 *      一字不差。這種欄位一旦上前台，就是 68 頁一模一樣的段落。
 *   B. 正文 n-gram 跨檔重複率 —— 一篇文章有多少比例的內容，在另外 ≥2 篇裡也出現過。
 *
 * 判準（重要，改門檻前先讀）：
 *   - 「結構一致」不是問題。同一頁型用同一組小標（「科學證據怎麼看？」）是刻意的
 *     編輯規格，讀者靠它建立預期。所以標題行預設不計入。
 *   - 「敘述一致」才是問題。同一段解釋文字出現在幾十篇裡，代表那幾十篇沒有各自的內容。
 *   - 引用來源網址（PubMed/NCBI 連結）大量重複是正常的，不計入。
 *
 * 用法：
 *   pnpm check:boilerplate           全站盤點（擋 build）
 *   node scripts/check-boilerplate.mjs --report   只印報告不擋（人工普查用）
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const REPORT_ONLY = process.argv.includes('--report');
const CONTENT = 'src/content';
// 全部內容 collection 都要掃。2026-08-08 的教訓：videos 沒列進來，於是「5 支短影音頁
// 彼此重複 43.8%、每頁只有 700–960 字」這件事完全沒有守門看到，而 Google 收錄了 0/6。
// 新增 collection 時必須同步加進這個清單，否則那個 collection 等於沒有樣板守門。
const COLLECTIONS = ['articles', 'myths', 'ingredients', 'news', 'videos', 'podcasts'];

/** n-gram 長度。中文 12 字約等於一個短句——短了會抓到常用詞組，長了會漏掉改幾個字的樣板。 */
const N = 12;
/** 一個 n-gram 出現在幾篇以上才算「樣板」。2 篇可能只是互相引用，3 篇起才是成批複製。 */
const MIN_DF = 3;

/** 單篇樣板覆蓋率上限。超過代表這一篇有三分之一內容是別篇也有的。 */
const MAX_RATIO = 0.35;
/** 頁型的樣板覆蓋率中位數上限。 */
const MAX_MEDIAN = 0.2;
/** 同一個 frontmatter 欄位值在幾篇以上逐字相同就算樣板填充。 */
const MAX_SAME_FIELD = 5;

/** 這些欄位天生就會重複，不是樣板問題。 */
const FIELD_ALLOW = new Set([
  'author', 'category', 'draft', 'status', 'reviewer', 'editorReviewed',
  'publishDate', 'updatedDate', 'publishedAt', 'updatedAt', 'datePublished', 'dateModified',
  'queryPattern', 'contentType', 'lang', 'license', 'coverImageCredit',
]);

function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, body: raw };
  let fm = {};
  try { fm = yaml.load(m[1]) || {}; } catch { fm = {}; }
  return { fm, body: raw.slice(m[0].length) };
}

/**
 * 取「敘述文字」：去掉 code fence、行內 code、連結網址、HTML 標籤與清單符號。
 * 小標行（# 開頭）預設不計——頁型共用小標是刻意的編輯規格，不是樣板語。
 */
function proseText(body) {
  let inFence = false;
  const out = [];
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^\s*#{1,6}\s/.test(line)) continue;          // 小標：結構一致不算問題
    if (/^\s*\|/.test(line)) continue;                // 表格
    const t = line
      .replace(/`[^`]*`/g, ' ')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')      // 連結留文字去網址
      .replace(/https?:\/\/\S+/g, ' ')                // 裸網址
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s*[-*>+]\s*/, '');
    out.push(t);
  }
  return out.join('').replace(/\s+/g, '');
}

const docs = [];
for (const col of COLLECTIONS) {
  const dir = join(CONTENT, col);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
    const { fm, body } = frontmatter(readFileSync(join(dir, file), 'utf8'));
    docs.push({ col, file, fm, text: proseText(body) });
  }
}

const violations = [];
const notes = [];

// ── A. frontmatter 欄位跨檔逐字相同 ──
const fieldValues = new Map(); // `${col}::${key}` → Map(value → [files])
for (const d of docs) {
  for (const [k, v] of Object.entries(d.fm)) {
    if (v == null || FIELD_ALLOW.has(k)) continue;
    // 陣列不能用 join——物件陣列（faq/references/uses）會全部變成 "[object Object]"，
    // 於是「109 篇 faq 逐字相同」這種假違規就出現了。要比就比實際內容。
    const s = typeof v === 'string' ? v.trim()
      : Array.isArray(v) ? (v.length ? JSON.stringify(v) : null)
      : null;
    if (!s || s.length < 20) continue;     // 短值重複沒有意義（分類名、狀態值）
    const key = `${d.col}::${k}`;
    if (!fieldValues.has(key)) fieldValues.set(key, new Map());
    const m = fieldValues.get(key);
    if (!m.has(s)) m.set(s, []);
    m.get(s).push(d.file);
  }
}
/* 嚴重度分級：同樣是「28 篇逐字相同」，讀者看得到跟看不到，代價差很多。
 *   已渲染 + 沒過濾 → ERROR（擋）：讀者與 Google 真的會看到幾十頁一樣的段落。
 *   已渲染 + 有過濾 → 通過：dropIfBoilerplate 會在 build 期擋掉，前台不會出現。
 *   沒渲染        → WARN：目前不傷讀者，但是個陷阱——下一個人把欄位接上前台就中獎。
 * 「有沒有渲染」「有沒有過濾」都用掃 src/ 判斷，不維護名單，才不會跟程式脫節。 */
function srcSources() {
  const roots = ['src/pages', 'src/components', 'src/layouts', 'src/utils'];
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (/\.(astro|svelte|ts|tsx|mjs)$/.test(name.name)) out.push(readFileSync(p, 'utf8'));
    }
  };
  roots.forEach(walk);
  return out.join('\n');
}
const SRC = srcSources();
const isRendered = (field) => new RegExp(`\\.${field}\\b`).test(SRC);
// 兩種過濾都算「已守住」：整包丟掉（dropIfBoilerplate）與逐項濾掉（filterBoilerplateItems）。
const isGuarded = (field) =>
  new RegExp(`(dropIfBoilerplate|filterBoilerplateItems)\\([^)]*['"\`]${field}['"\`]`).test(SRC);

for (const [key, m] of fieldValues) {
  for (const [value, files] of m) {
    if (files.length < MAX_SAME_FIELD) continue;
    const [col, field] = key.split('::');
    const preview = `「${value.slice(0, 56)}${value.length > 56 ? '…' : ''}」`;
    const head = `${col} 的 ${field} 有 ${files.length} 篇逐字相同（上限 ${MAX_SAME_FIELD - 1}）：${preview}`;
    if (!isRendered(field)) {
      notes.push(`${head}\n      目前沒有任何模板讀這個欄位，讀者看不到——但它是個陷阱：` +
        `下一個人把它接上前台，就是 ${files.length} 頁一模一樣的段落。接之前先清乾淨，或直接移除欄位。`);
    } else if (isGuarded(field)) {
      notes.push(`${head}\n      已由 dropIfBoilerplate 在渲染時擋掉，前台不會出現。原始資料仍建議清理。`);
    } else {
      violations.push(`${head}\n      這個欄位有模板在讀，且沒有經過 dropIfBoilerplate 過濾——` +
        `讀者與 Google 會看到 ${files.length} 頁一模一樣的段落。\n` +
        `      改法二選一：逐篇改寫成該篇自己的話；或在模板改用 dropIfBoilerplate('${col}', '${field}', …) 讓樣板值不顯示。`);
    }
  }
}

// ── B. 正文 n-gram 跨檔重複率 ──
const grams = docs.map((d) => {
  const s = new Set();
  for (let i = 0; i + N <= d.text.length; i++) s.add(d.text.slice(i, i + N));
  return s;
});
const df = new Map();
for (const g of grams) for (const t of g) df.set(t, (df.get(t) ?? 0) + 1);

const rows = docs.map((d, i) => {
  const g = grams[i];
  let shared = 0;
  for (const t of g) if ((df.get(t) ?? 0) >= MIN_DF) shared++;
  return { ...d, ratio: g.size ? shared / g.size : 0, size: g.size };
});

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const byCol = {};
for (const col of COLLECTIONS) {
  const r = rows.filter((x) => x.col === col && x.size > 0);
  if (!r.length) continue;
  const med = median(r.map((x) => x.ratio));
  const over = r.filter((x) => x.ratio > MAX_RATIO);
  byCol[col] = { n: r.length, med, over: over.length };
  if (med > MAX_MEDIAN)
    violations.push(`${col} 樣板覆蓋率中位數 ${(med * 100).toFixed(1)}%（上限 ${MAX_MEDIAN * 100}%）——整批內容互相重複，Google 對這個很敏感。`);
  for (const x of over)
    violations.push(`${x.col}/${x.file} 樣板覆蓋率 ${(x.ratio * 100).toFixed(1)}%（上限 ${MAX_RATIO * 100}%）：這一篇有三分之一以上的敘述在其他 ≥${MIN_DF} 篇裡也出現過。`);
}

// 最廣的樣板句（協助定位，不直接構成違規）
const top = [...df.entries()].filter(([, v]) => v >= 8).sort((a, b) => b[1] - a[1]);
const shown = [];
for (const [g, v] of top) {
  if (shown.some((s) => s.g.slice(0, 8) === g.slice(0, 8))) continue;
  shown.push({ g, v });
  if (shown.length >= 12) break;
}

console.log(`\n跨檔樣板檢查（${docs.length} 篇，n-gram=${N}，df≥${MIN_DF} 算樣板）\n`);
console.log('頁型'.padEnd(14) + '篇數'.padStart(6) + '樣板覆蓋率中位數'.padStart(18) + `超過 ${MAX_RATIO * 100}% 的篇數`.padStart(18));
for (const [col, s] of Object.entries(byCol))
  console.log(col.padEnd(14) + String(s.n).padStart(6) + `${(s.med * 100).toFixed(1)}%`.padStart(18) + String(s.over).padStart(18));
if (shown.length) {
  console.log('\n全站流傳最廣的敘述片段（定位用）：');
  shown.forEach((s) => console.log(`  ${String(s.v).padStart(4)} 篇 ｜ ${s.g}`));
}

if (notes.length) {
  console.log(`\n提醒 ${notes.length} 則（不擋 build）：`);
  notes.forEach((n) => console.log(`  · ${n}`));
}
if (violations.length) {
  const head = REPORT_ONLY ? '跨檔樣板問題' : '跨檔樣板違規';
  console.error(`\n${head} ${violations.length} 處：`);
  violations.forEach((v) => console.error(`  ✗ ${v}`));
  if (!REPORT_ONLY) {
    console.error('\n改法：樣板不是靠改幾個字繞過的。同一段話如果 20 篇都適用，那它對這 20 篇都沒有資訊量——');
    console.error('該做的是刪掉它，或把它換成只有這一篇成立的具體內容。');
    process.exit(1);
  }
}
console.log('\n跨檔樣板檢查通過：沒有欄位被成批複製，各頁型的敘述重複率在門檻內。\n');
