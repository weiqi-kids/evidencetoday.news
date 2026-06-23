// 建置期字型切塊：掃描 dist 全站 HTML 實際用到的字，把每個繁中權重「依碼位切成連續區段」，
// 每段子集成一個 woff2，並用帶 unicode-range 的 @font-face 取代原本的單體繁中 @font-face。
//
// 為何：Base.astro 改載 chinese-traditional 子集後，每權重是一整包繁中字（~1MB+），
// 整站三個權重 ~3.4MB，內頁全載會主導 slow-4G FCP。切塊後瀏覽器只下載當頁出現字命中的
// 少數區段，且每段 URL 全站固定 → 跨頁可快取、檔數固定不隨內容膨脹。
// font-display:optional 讓字型不擋首屏；family 用真實名稱，字型棧不需改。
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import subsetFont from 'subset-font';
import { partitionCodepoints, unicodeRange, faceCss, replaceFontFaces } from './lib/font-slicing.mjs';

const DIST = 'dist';
const ASTRO_DIR = join(DIST, '_astro');
const TARGET_PER_SLICE = 200;

// 繁中權重（對應 src/layouts/Base.astro 載入的子集）：base 檔名（不含 astro hash）、family、weight。
// 本日有據用 Noto Sans TC 400/700 + Noto Serif TC 700；若 Base.astro 新增權重，這裡要同步加。
const WEIGHTS = [
  { base: 'noto-sans-tc-chinese-traditional-400-normal', family: 'Noto Sans TC', weight: 400 },
  { base: 'noto-sans-tc-chinese-traditional-700-normal', family: 'Noto Sans TC', weight: 700 },
  { base: 'noto-serif-tc-chinese-traditional-700-normal', family: 'Noto Serif TC', weight: 700 },
];

// 基線白名單：ASCII 可見字 + 常見半形/全形標點、CJK 標點，避免邊角缺字。
function baselineChars() {
  let s = '';
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCodePoint(c); // ASCII 可見字
  for (let c = 0x3000; c <= 0x303f; c++) s += String.fromCodePoint(c); // CJK 標點
  for (let c = 0xff00; c <= 0xffef; c++) s += String.fromCodePoint(c); // 全形 ASCII/標點
  // 其餘常見符號。彎引號（U+2018/2019/201C/201D）以 codePoint 加入，避免 linter 把它們轉成直引號破壞字串。
  s += '　、。．，；：？！「」『』（）〔〕【】《》〈〉—…‧·‵′″–§¶†‡•○●◎◇◆□■△▲▽▼☆★※←↑→↓№℃℉°±×÷';
  for (const cp of [0x2018, 0x2019, 0x201c, 0x201d]) s += String.fromCodePoint(cp);
  return s;
}

// 遞迴列出 dist 下符合副檔名的檔案。
function listFiles(dir, exts) {
  const out = [];
  for (const rel of readdirSync(dir, { recursive: true })) {
    const p = join(dir, rel);
    if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

// 1) 收集全站用到的字（逐 code point，正確處理 surrogate pair）。
const used = new Set();
for (const ch of baselineChars()) used.add(ch);
const htmlFiles = listFiles(DIST, ['.html']);
for (const f of htmlFiles) for (const ch of readFileSync(f, 'utf8')) used.add(ch);
const usedText = [...used].join('');
console.log(`[subset-fonts] 掃描 ${htmlFiles.length} 個 HTML → ${used.size} 個唯一字`);

// 2) 切塊（各權重共用同一組邊界）。
const slices = partitionCodepoints(usedText, TARGET_PER_SLICE);
console.log(`[subset-fonts] 切成 ${slices.length} 段（每段 ~${TARGET_PER_SLICE} 字）`);

// 找某 base 在 CSS 的 src url 前綴（取得 /_astro/ 之類前綴）。
const cssFiles = listFiles(ASTRO_DIR, ['.css']);
const cssAll = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
function urlPrefixFor(base) {
  const m = cssAll.match(
    new RegExp('url\\(([^)]*' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "[^)]*\\.woff2)"),
  );
  // 去掉檔名留目錄前綴；並去掉可能的前導引號（Astro 目前輸出無引號，引號版屬防禦）。
  return m ? m[1].replace(/[^/]*$/, '').replace(/^['"]/, '') : null;
}

// 3) 每權重 × 每段子集成 woff2，收集切片 @font-face 規則（依 base）。
const woff2now = listFiles(ASTRO_DIR, ['.woff2']);
const rulesByBase = new Map();
let sliceFiles = 0;
let sliceBytes = 0;
for (const w of WEIGHTS) {
  const srcPath = woff2now.find((p) => basename(p).startsWith(w.base + '.'));
  if (!srcPath) {
    console.warn(`[subset-fonts] 找不到來源字型 ${w.base}，略過該權重`);
    continue;
  }
  const prefix = urlPrefixFor(w.base) || '/_astro/';
  const srcBuf = readFileSync(srcPath);
  const rules = [];
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const sub = await subsetFont(srcBuf, s.chars, { targetFormat: 'woff2' });
    const hash = createHash('sha256').update(sub).digest('hex').slice(0, 8);
    const name = `${w.base}.slice-${i}.${hash}.woff2`;
    writeFileSync(join(ASTRO_DIR, name), sub);
    sliceFiles++;
    sliceBytes += sub.length;
    rules.push(
      faceCss({ family: w.family, weight: w.weight, url: prefix + name, range: unicodeRange(s.min, s.max) }),
    );
  }
  rulesByBase.set(w.base, rules);
}

if (rulesByBase.size === 0) {
  console.warn('[subset-fonts] 沒有任何繁中來源字型可切塊（import 是否已切換？），略過');
  process.exit(0);
}

// 4) 在 CSS 取代舊單體 @font-face。
let rewritten = 0;
for (const f of cssFiles) {
  let text = readFileSync(f, 'utf8');
  let changed = false;
  for (const [base, rules] of rulesByBase) {
    const r = replaceFontFaces(text, base, rules);
    if (r.changed) {
      text = r.css;
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(f, text);
    rewritten++;
  }
}
if (rewritten === 0) {
  console.warn('[subset-fonts] 警告：CSS 中找不到可取代的繁中 @font-face（結構是否變動？）');
}

// 5) 刪掉舊整包字型（woff2 + woff），避免殘留佔空間（切片檔含 .slice- 不刪）。
const allFontFiles = listFiles(ASTRO_DIR, ['.woff2', '.woff']);
let removed = 0;
for (const w of WEIGHTS) {
  for (const p of allFontFiles) {
    if (basename(p).startsWith(w.base + '.') && !basename(p).includes('.slice-')) {
      rmSync(p);
      removed++;
    }
  }
}

console.log(
  `[subset-fonts] 切片 ${sliceFiles} 檔 ${(sliceBytes / 1024 / 1024).toFixed(2)}MB；改寫 ${rewritten} 個 CSS；刪除舊整包 ${removed} 檔`,
);
