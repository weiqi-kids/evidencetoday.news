// 設計規範守門 v2（團隊共用；v1 源自 dreamer868，v2 加 css 白名單＋掃 .svelte）：
// 掃 src/ 下所有 .css/.astro/.svelte，違規即 exit 1（pnpm build 前自動跑）。
// 規則（見 src/styles/variables.css 檔頭）：
// 1. font-size 一律走 var(--text-*) 階梯，且分兩級判定（2026-08-07 補洞）：
//    1a【硬規則，無例外】算得出來的字級不得低於 18px——px/rem/em/pt/% 全部換算，
//       clamp()/min() 取最小值。違反即擋。
//    1b【token 純度，可凍結遞延】不走 var(--text-*) 的原始數值字級，記入 FONT_SIZE_DEFER 才放行。
//    ── 為什麼要改（別再退回舊寫法）──
//    舊規則只擋 `font-size: NNpx` 字面值，於是 `font-size: 0.7rem` 完全合法；規則 6 又只掃
//    TOKEN_FILE，管不到「根本不用 token 的人」。兩條規則之間有一道洞，18px 下限形同虛設：
//    2026-08-07 用 Playwright 實測渲染結果，站上有 24 種規則的文字低於 18px，最小 11.2px
//    （.news-item__tag 0.7rem、.article-card__topic 0.76rem 共 195 處）。
//    判準：下限用「算出來的值」守，不是用「有沒有寫 px」守。
// 2. 顏色（hex / rgb() / hsl()）只准出現在 src/styles/variables.css
// 3. 禁 !important
// 4. 禁外部 CDN（fonts.googleapis / cdnjs / unpkg / jsdelivr）
// 5. 統一 css 檔案：src/ 下的 .css 只准 src/styles/ 白名單那幾檔，新增即 fail
//    （元件樣式寫 Astro/Svelte scoped <style> 或進 global.css）
// 6. --text-* 階梯下限：token 值一律 ≥18px（1.125rem）；clamp() 以最小值計，
//    禁止用 token 值「開小門」繞過 18px 下限（掃 TOKEN_FILE，見 checkLadder()）。
//
// ── 本站遷移期遞延（TODO 2026-07-20 導入時凍結，禁再擴充；清完即移除）──
// A. 規則 3（禁 !important）暫不掃：存量 26 處全在 global.css——
//    21 處為原 rwd-fixes.css 版面覆蓋 hack（含 topnav 字級守衛；需 375/768/1280 三寬度
//    視覺驗證才能安全拆除）、4 處為 prefers-reduced-motion 無障礙降級 reset（WCAG 2.3.3，
//    業界公認例外，見該段註解）、1 處為 topnav 品牌字級守衛（global 原有）。
//    拆 rwd-fixes 覆蓋為正規 variant/scoped 樣式後再開啟本規則。
// B. 規則 1（禁 px 字級）對 PX_DEFER 檔案暫不掃：PathwayDiagram.svelte 的 font-size 是
//    SVG viewBox 座標系單位（隨 viewBox 縮放，非螢幕 px），换 rem token 會破壞圖表座標設計；
//    正解是改成 viewBox 內相對比例或圖表專用階梯，屬視覺重設計，遞延。
const SKIP_IMPORTANT = true; // TODO(遷移遞延 A)：清完存量後改 false
const PX_DEFER = new Set(["src/components/charts/PathwayDiagram.svelte"]); // TODO(遷移遞延 B)
// 規則 1b 的存量豁免集合。2026-08-07 全站收斂完成後為空——這代表「字級只有一個來源」
//   這件事目前是真的成立的，不是靠豁免撐著。要往裡面加檔案前先想清楚：加進來的那一刻，
//   這條規則對該檔就不存在了。
const FONT_SIZE_DEFER = new Set([
  // 唯一豁免：可下載的 1:1 分享卡，尺寸固定、自成一套內部比例尺（同 PathwayDiagram 的處境），
  // 套前台字級階梯會破壞卡片版面。它仍受規則 1a（≥18px）約束——2026-08-07 已把
  // 卡內 14px/15px 提到 18px。新檔案一律不得加入本集合。
  "src/components/myths/MythSquareCardVisual.astro",
]);

// 把一個 font-size 值換算成「可能渲染出來的最小 px」。
// rem 以根字級 16px 計；em 無法靜態解析父級，保守以 16px 計（低估比漏抓好）。
// clamp(A, B, C) 的下限是「第一個參數 A」，不是式子裡最小的那個數字——
//   clamp(1.3rem, 1.1rem + 0.8vw, 1.8rem) 實際最小是 1.3rem(20.8px)，
//   若誤取 1.1rem 會產生假違規。min() 才是取所有參數的最小值。
function toPx(tok) {
  const m = /(-?[0-9]*\.?[0-9]+)\s*(px|rem|em|pt)\s*$/i.exec(tok.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  return u === "px" ? n : u === "pt" ? (n * 96) / 72 : n * 16;
}

// 依逗號切一層引數（括號內的逗號不算）。
function splitArgs(inner) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function smallestPx(value) {
  const v = value.replace(/var\([^)]*\)/g, " ").trim();
  const fn = /^(clamp|min|max)\s*\(([\s\S]*)\)$/i.exec(v);
  if (fn) {
    const kind = fn[1].toLowerCase();
    const args = splitArgs(fn[2]).map((a) => smallestPx(a.trim()));
    const known = args.filter((x) => x !== null);
    if (!known.length) return null;
    if (kind === "clamp") return args[0];            // 下限＝第一參數
    if (kind === "min") return Math.min(...known);
    return Math.max(...known);                       // max() 的下限是最大那個
  }
  // 純算式（如 "1rem + 0.55vw"）：取其中可解析的最小固定值。
  const nums = [];
  for (const m of v.matchAll(/(-?[0-9]*\.?[0-9]+)\s*(px|rem|em|pt)/gi)) {
    const px = toPx(m[0]);
    if (px !== null) nums.push(px);
  }
  return nums.length ? Math.min(...nums) : null;
}
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, basename, sep } from "node:path";

const ROOT = "src";
const TOKEN_FILE = "src/styles/variables.css";
// 舊站遷移期可暫加既有檔（凍結用，禁再擴充）；新站一律只有這兩檔。
const STYLE_WHITELIST = new Set(["variables.css", "global.css"]);
const exts = new Set([".css", ".astro", ".svelte"]);
const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (exts.has(extname(p))) scan(p);
  }
}

function scan(file) {
  const rel = relative(".", file).split(sep).join("/");
  if (extname(file) === ".css") {
    const inStyles = rel.startsWith("src/styles/");
    if (!inStyles || !STYLE_WHITELIST.has(basename(file)))
      violations.push(
        `${rel} css 檔不在白名單（統一 css：src/styles/{${[...STYLE_WHITELIST].join(",")}}；元件樣式用 scoped <style>）`
      );
  }
  const isTokenFile = rel === TOKEN_FILE;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const loc = `${rel}:${i + 1}`;
    if (!PX_DEFER.has(rel))
      for (const m of line.matchAll(/font-size\s*:\s*([^;{}"'`]+)/gi)) {
        const v = m[1].trim().replace(/!important/i, "").trim();
        if (/^(inherit|unset|initial|revert)\b/i.test(v)) continue;
        const usesToken = /var\(\s*--text-/.test(v);
        const px = smallestPx(v);
        if (px !== null && px < 18)
          violations.push(`${loc} 字級 ${px.toFixed(1)}px 低於 18px 下限（規則 1a，無例外）: font-size: ${v}`);
        if (!usesToken && !FONT_SIZE_DEFER.has(rel))
          violations.push(`${loc} 字級未走 --text-* token（規則 1b）: font-size: ${v}`);
      }
    if (!isTokenFile && /(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/.test(line) && !/url\(/.test(line))
      violations.push(`${loc} token 外硬編顏色（改用 var(--color-*)）: ${line.trim()}`);
    if (!SKIP_IMPORTANT && /!important/.test(line))
      violations.push(`${loc} 禁用 !important: ${line.trim()}`);
    if (/(fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare|unpkg\.com|cdn\.jsdelivr)/.test(line))
      violations.push(`${loc} 外部 CDN（字型/資源一律自託管或系統堆疊）: ${line.trim()}`);
  });
}

// 規則 6：--text-* 階梯每個 token 值一律 ≥18px（1.125rem）；clamp() 以最小值計。
// 掃 TOKEN_FILE（variables.css，token 唯一真實來源）——禁止用 token 值開小門繞過下限。
function checkLadder() {
  let css;
  try { css = readFileSync(TOKEN_FILE, "utf8"); }
  catch { violations.push(`${TOKEN_FILE} 不存在（token 檔必備）`); return; }
  const re = /--text-[\w-]+\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css))) {
    const raw = m[1].trim();
    const first = raw.startsWith("clamp(") ? raw.slice(6).split(",")[0].trim() : raw;
    const num = parseFloat(first);
    const px = /px\s*$/.test(first) ? num : /rem\s*$/.test(first) ? num * 16 : NaN;
    if (!Number.isNaN(px) && px < 18)
      violations.push(`${TOKEN_FILE} 字級階梯低於 18px：${m[0].split(":")[0].trim()} = ${raw}（最小 1.125rem）`);
  }
}

walk(ROOT);
checkLadder();
if (violations.length) {
  console.error(`設計規範違規 ${violations.length} 處：\n` + violations.join("\n"));
  process.exit(1);
}
console.log(
  "設計規範檢查通過：css 白名單、字級 ≥18px 且走 --text-* token、階梯 ≥18px、無 token 外顏色、無外部 CDN。" +
    (SKIP_IMPORTANT ? "（!important 規則遷移期遞延中，見檔頭 TODO）" : "無 !important。")
);
