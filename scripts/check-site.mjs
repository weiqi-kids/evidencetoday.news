#!/usr/bin/env node
/**
 * 全站結構守門（掃 dist/，不掃 src/）。
 *
 * 為什麼需要這支：本站原有的五道 gate（check-design / check-content / check-myths /
 * check-news / check-schedule）全部是「單檔、原始碼層」的檢查——它們問的是
 * 「這個檔案自己寫得對不對」。沒有任何一支問過「整站組起來長什麼樣」。
 *
 * 這道盲點是有代價的。闢謠頁的站內出站連結中位數長期是 0（讀者看完只能離站），
 * 這件事每一支既有 gate 都看不到：每個 .mdx 都合法、每個元件都合法、
 * 唯獨「組起來之後這個頁型沒有任何出口」這個事實不存在於任何單檔裡。
 * 2026-08-07 才靠人工稽核發現。這支就是為了讓同一類問題下次由機器發現。
 *
 * 判準：只檢查「跨頁、跨頁型才看得出來」的事。單檔查得到的一律留在原本的 gate，
 * 不要在這裡重造。
 *
 * 用法：
 *   pnpm check:site          先 build 再檢查（CI 用）
 *   node scripts/check-site.mjs --skip-build   用現成的 dist/
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');

if (!existsSync(DIST)) {
  console.error(`找不到 ${DIST}/。先跑 pnpm build，或用 pnpm check:site（會自動 build）。`);
  process.exit(1);
}

/** 遞迴收所有 html。 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const violations = [];
const warnings = [];

// ── 頁型定義：只檢查讀者會讀的內容頁，列表頁與工具頁另有規則 ──
const DETAIL = [
  { name: '文章', dir: 'articles' },
  { name: '闢謠', dir: 'myths' },
  { name: '成分解析', dir: 'ingredients' },
  { name: '趨勢新聞', dir: 'news' },
];

/** 取 <main> 內容；沒有 main 就退回整頁（版型異常會被 H1 規則另外抓到）。 */
function mainOf(html) {
  const m = html.match(/<main[\s\S]*?<\/main>/i);
  return m ? m[0] : html;
}

// 每一頁都會有、由版型固定產出的連結。它們不是「這一頁自己提供的出口」，
// 算進去會讓「頁型沒有出口」這件事被兩三個樣板連結蓋掉——2026-08-07 第一版門檻就是
// 這樣被騙過去的：舊版闢謠頁量出來是 2，其實那 2 個是 /disclosure/（署名列的固定連結）
// 和一張 .png 圖卡下載。扣掉之後才是真正的 0。
const BOILERPLATE_LINKS = new Set([
  '/', '/about/', '/contact/', '/privacy/', '/terms/',
  '/disclosure/', '/editorial-policy/', '/medical-disclaimer/', '/search/',
]);

/** 站內出站連結：只算「讀者讀完這一頁之後，可以往下去讀的另一個內容頁」。 */
function contentLinks(main) {
  let s = main;
  // 只剝「每頁都一樣」的版型導覽：站頭、麵包屑、側欄目錄。
  // 不能一律剝 <nav>——.topic-hubs（所屬健康專題）雖然是 nav，但它的內容是依這一頁自己的
  // 主題判定出來的，是真的出口。2026-08-07 第一版就是剝過頭，把 11 篇成分頁僅有的
  // 專題回鏈也算掉了，反過來製造假違規。
  for (const re of [
    /<nav[^>]*class="[^"]*\b(?:breadcrumb|topnav__nav|topnav__mobile|toc|pagination)\b[^"]*"[\s\S]*?<\/nav>/gi,
    /<aside class="article-sidebar"[\s\S]*?<\/aside>/gi,
    /<astro-island[^>]*component-export="default"[^>]*>[\s\S]*?<\/astro-island>/gi,
  ]) s = s.replace(re, ' ');
  const hrefs = [...s.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(hrefs.filter((h) => {
    if (!h.startsWith('/') || h.startsWith('//')) return false;
    const clean = h.split('#')[0].split('?')[0];
    if (BOILERPLATE_LINKS.has(clean)) return false;
    // 資產不是頁面：圖卡下載、feed、圖片、純文字端點
    if (/\.(png|jpe?g|webp|svg|gif|xml|txt|pdf|mp3|ico)$/i.test(clean)) return false;
    if (clean.startsWith('/og/') || clean.startsWith('/og-') || clean.startsWith('/images/')) return false;
    return true;
  }))];
}

const pages = walk(DIST);
const stats = {};

for (const { name, dir } of DETAIL) {
  const base = join(DIST, dir);
  if (!existsSync(base)) continue;
  const files = walk(base).filter((f) => {
    const html = readFileSync(f, 'utf8');
    // 舊 slug 轉址 stub（noindex + meta refresh）不是內容頁
    if (/http-equiv="refresh"/i.test(html)) return false;
    // 列表頁／分頁頁另有規則
    return f !== join(base, 'index.html');
  });
  if (!files.length) continue;

  const linkCounts = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const main = mainOf(html);
    const rel = f.replace(/^dist\//, '/').replace(/index\.html$/, '');

    // ── 規則 1：內容頁必須有恰好一個 h1 ──
    const h1 = [...html.matchAll(/<h1[\s>]/gi)].length;
    if (h1 !== 1) violations.push(`${rel} h1 有 ${h1} 個（內容頁必須恰好 1 個）`);

    // ── 規則 2：內容頁必須有 canonical、title、description ──
    if (!/<link rel="canonical" href="https?:\/\//.test(html))
      violations.push(`${rel} 缺 canonical`);
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    if (!title.trim()) violations.push(`${rel} 缺 <title>`);
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    if (desc.trim().length < 20) violations.push(`${rel} description 過短或缺漏（${desc.length} 字）`);

    // ── 規則 3：內容頁必須有結構化資料 ──
    const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!lds.length) violations.push(`${rel} 沒有 JSON-LD`);
    for (const [, raw] of lds) {
      try { JSON.parse(raw); }
      catch { violations.push(`${rel} JSON-LD 不是合法 JSON`); }
    }

    // ── 規則 4：站內出口 ──
    // 這一條是本檔存在的理由。單看任何一個 .mdx 都看不出「這個頁型沒有出口」。
    linkCounts.push(contentLinks(main).length);
  }

  linkCounts.sort((a, b) => a - b);
  const median = linkCounts[Math.floor(linkCounts.length / 2)];
  const zero = linkCounts.filter((n) => n === 0).length;
  stats[name] = { n: files.length, median, zero };

  // 門檻：頁型的站內出站連結中位數必須 ≥2。
  // 為什麼是中位數不是平均：少數幾篇手工掛滿相關連結會把平均拉高，掩蓋掉「大多數頁沒有出口」。
  // 為什麼是 2：一個出口容易是麵包屑殘留或單一固定連結，兩個才代表版型真的有推薦區。
  if (median < 2)
    violations.push(`${name}頁型站內出口不足：中位數 ${median} 個（門檻 2）。讀者讀完只能離站。`);
  if (zero > files.length * 0.1)
    violations.push(`${name}頁型有 ${zero}/${files.length} 頁完全沒有站內出口（上限 10%）`);
}

// ── 規則 5：sitemap 不得收錄 noindex 頁 ──
// 送出去的和讓收錄的必須一致，否則 GSC 會一直回報「已提交但被 noindex 排除」。
const smFiles = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
const smUrls = new Set();
for (const f of smFiles)
  for (const m of readFileSync(join(DIST, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g))
    smUrls.add(m[1].replace(/^https?:\/\/[^/]+/, ''));
let noindexInSitemap = 0;
for (const u of smUrls) {
  if (u.endsWith('.xml')) continue;
  let up = u;
  try { up = decodeURIComponent(u); } catch { /* 非法編碼就照原樣查 */ }
  const f = join(DIST, up.replace(/^\//, ''), 'index.html');
  const alt = join(DIST, up.replace(/^\//, ''));
  const path = existsSync(f) ? f : existsSync(alt) ? alt : null;
  if (!path) { violations.push(`sitemap 收錄了不存在的頁：${u}`); continue; }
  if (/name="robots"[^>]*noindex/.test(readFileSync(path, 'utf8'))) {
    violations.push(`sitemap 收錄了 noindex 的頁：${u}`);
    noindexInSitemap++;
  }
}

// ── 規則 6：站內連結不得指向不存在的頁（dist 內死連結）──
let dead = 0;
const deadSamples = [];
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  for (const h of contentLinks(mainOf(html))) {
    // href 裡的中文是百分號編碼的（/tags/%E9%A0%90...），檔案系統上是解碼後的目錄名，
    // 不解碼會把全站標籤連結誤判成死連結。
    let clean = h.split('#')[0].split('?')[0];
    if (!clean || clean === '/') continue;
    try { clean = decodeURIComponent(clean); } catch { /* 非法編碼就照原樣查 */ }
    const p1 = join(DIST, clean.replace(/^\//, ''), 'index.html');
    const p2 = join(DIST, clean.replace(/^\//, ''));
    if (existsSync(p1) || existsSync(p2)) continue;
    dead++;
    if (deadSamples.length < 8) deadSamples.push(`${f.replace(/^dist/, '')} → ${h}`);
  }
}
if (dead) {
  violations.push(`站內死連結 ${dead} 個：`);
  deadSamples.forEach((s) => violations.push(`    ${s}`));
}

// ── 輸出 ──
console.log(`\n全站結構檢查（掃 ${pages.length} 個 html）\n`);
console.log('頁型'.padEnd(12) + '篇數'.padStart(6) + '站內出口(中位數)'.padStart(18) + '零出口頁'.padStart(10));
for (const [name, s] of Object.entries(stats))
  console.log(name.padEnd(12) + String(s.n).padStart(6) + String(s.median).padStart(18) + String(s.zero).padStart(10));
console.log(`\nsitemap 收錄 ${smUrls.size} 個 URL｜其中 noindex ${noindexInSitemap} 個｜站內死連結 ${dead} 個`);

if (warnings.length) {
  console.log(`\n提醒 ${warnings.length} 則：`);
  warnings.forEach((w) => console.log(`  · ${w}`));
}
if (violations.length) {
  console.error(`\n全站結構違規 ${violations.length} 處：`);
  violations.forEach((v) => console.error(`  ✗ ${v}`));
  process.exit(1);
}
console.log('\n全站結構檢查通過：每個內容頁有唯一 h1／canonical／description／JSON-LD，各頁型都有站內出口，sitemap 與 noindex 一致，無站內死連結。\n');
