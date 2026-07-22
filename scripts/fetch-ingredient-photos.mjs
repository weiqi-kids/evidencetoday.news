// 成分解析縮圖「自動找照片」腳本 — 供 .github/workflows/ingredient-photos.yml 在
// GitHub Actions runner 上執行（CCR 雲端 session 的網路政策擋圖庫網域，runner 不受限）。
//
// 圖源：Wikimedia Commons API（免金鑰；Unsplash napi 已 401、ai-suggest worker 的
// push 權驗證不吃 Actions installation token，兩路皆不通，2026-07 驗證）。
// 只收自由授權（CC0/PD/CC BY*/CC BY-SA*/Attribution/Copyrighted free use/No restrictions）
// 的 JPEG/PNG，作者署名記進 manifest 供 coverImageCredit；coverImage 熱連結
// upload.wikimedia.org 的 1024px 縮圖（標準桶寬；Commons 會把非桶寬吸附到桶值）。
//
// 行為：對 27 個成分逐一以「策劃關鍵字 + filetype:bitmap」搜圖，每個成分抓 3 張候選
// 縮圖到 tmp-photo-review/，並輸出 manifest.json 供人工目視驗收後接進 frontmatter。
// 節奏與退避：upload.wikimedia.org 會 429 限流，下載間隔 700ms、429 退避重試 3 次。
// 放圖邏輯（鐵則）：照片必須呈現「該成分本身」或「富含該營養素的食物」，
// 詳見 docs/playbooks/ingredient-thumbnails.md。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'tmp-photo-review';
mkdirSync(OUT_DIR, { recursive: true });

// 每成分的搜尋關鍵字（「富含該營養素的食物」策劃版；避開會撈到酒吧名/文獻 PDF 的字組）
const PLAN = {
  astaxanthin:         'cooked shrimp prawns',
  calcium:             'bottle of milk',
  choline:             'chicken eggs',
  'coenzyme-q10':      'peanuts',
  collagen:            'bone broth',
  creatine:            'fresh mackerel',
  'dietary-fiber':     'rolled oats',
  folate:              'spinach leaves',
  ginseng:             'ginseng root',
  glucosamine:         'crab',
  iron:                'raw beef steak',
  lutein:              'corn cob',
  magnesium:           'dark chocolate bar',
  melatonin:           'cherries fruit',
  'milk-thistle':      'Silybum marianum flower',
  'omega-3':           'salmon fillet',
  opc:                 'red grapes fruit',
  probiotics:          'kimchi',
  'pumpkin-seed':      'pumpkin seeds',
  turmeric:            'turmeric powder',
  'vitamin-a':         'carrots',
  'vitamin-b-complex': 'whole grain bread',
  'vitamin-c':         'lemons',
  'vitamin-d':         'sardines',
  'vitamin-e':         'almonds',
  'vitamin-k':         'broccoli head',
  zinc:                'raw oysters',
};

// 自由授權白名單（含 CC 地區版如 CC BY-SA 2.0 kr/de/au；排除 GFDL-only 與非自由）
const OK_LICENSE = /^(cc0|public domain|pd[\s-]|pd$|attribution|copyrighted free use|no restrictions|cc[ -]by\b|cc[ -]by[ -]sa\b)/i;
const UA = { 'User-Agent': 'evidencetoday-thumb-fetch/1.0 (https://evidencetoday.news; editorial cover sourcing)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// 429 退避重試（尊重 Retry-After，預設 6s）
async function fetchRetry(url, tries = 3) {
  for (let t = 1; ; t++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429 || t >= tries) return res;
    const wait = Number(res.headers.get('retry-after')) * 1000 || 6000;
    console.log(`  [429] backoff ${wait}ms: ${url.slice(-60)}`);
    await sleep(wait);
  }
}

let dumpedRaw = false; // 第一個查詢 dump 原始回應前段，供遠端偵錯（CCR session 打不到 Commons）
async function commonsSearch(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '480',
  });
  const res = await fetchRetry(`${api}?${params}`);
  if (!res.ok) throw new Error(`commons ${query}: HTTP ${res.status}`);
  const json = await res.json();
  if (!dumpedRaw) {
    dumpedRaw = true;
    console.log(`[debug] raw(${query}) top keys=${Object.keys(json)} :: ${JSON.stringify(json).slice(0, 600)}`);
  }
  const pages = json.query?.pages ?? [];
  const list = Array.isArray(pages) ? pages : Object.values(pages); // formatversion 1/2 都相容
  list.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const out = [];
  for (const p of list) {
    const ii = p.imageinfo?.[0];
    const reject = (why) => console.log(`  [skip] ${query} :: ${p.title} :: ${why}`);
    if (!ii) { reject('no imageinfo'); continue; }
    if (!/image\/(jpeg|png)/.test(ii.mime ?? '')) { reject(`mime=${ii.mime}`); continue; } // 跳過 SVG/GIF/PDF/影片
    if ((ii.width ?? 0) < 800) { reject(`width=${ii.width}`); continue; }
    const meta = ii.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!OK_LICENSE.test(license)) { reject(`license=${license || '(none)'}`); continue; }
    const thumb480 = ii.thumburl ?? ii.url ?? '';
    if (!thumb480) { reject('no thumburl/url'); continue; }
    // 1024px 熱連結（標準桶寬）：有 <N>px- 縮圖樣式就換寬度；原圖不夠寬則用原圖 URL
    const hotlink = (ii.width ?? 0) >= 1024 && /\/\d+px-/.test(thumb480)
      ? thumb480.replace(/\/\d+px-/, '/1024px-')
      : (ii.url ?? thumb480);
    out.push({
      title: p.title,
      thumb480,
      hotlink,
      license,
      artist: stripHtml(meta.Artist?.value ?? ''),
      descUrl: ii.descriptionurl ?? '',
    });
  }
  return out;
}

// 指定 slug 補撈模式：`node scripts/fetch-ingredient-photos.mjs calcium creatine` 只重抓
// 這幾個並「合併」進既有 manifest（給關鍵字換字重試用；不帶參數＝全量）
const targets = process.argv.slice(2).filter((s) => PLAN[s]);
const entries = targets.length ? targets.map((s) => [s, PLAN[s]]) : Object.entries(PLAN);
let manifest = {};
try { manifest = JSON.parse((await import('node:fs')).readFileSync(join(OUT_DIR, 'manifest.json'), 'utf8')); } catch {}
let okCount = 0;

for (const [slug, query] of entries) {
  try {
    const photos = await commonsSearch(query);
    const picks = photos.slice(0, 4);
    if (picks.length === 0) throw new Error('no acceptable results');

    const got = [];
    for (let i = 0; i < picks.length && got.length < 3; i++) {
      const p = picks[i];
      try {
        const img = await fetchRetry(p.thumb480);
        if (!img.ok) throw new Error(`HTTP ${img.status}`);
        writeFileSync(join(OUT_DIR, `${slug}-${got.length + 1}.jpg`), Buffer.from(await img.arrayBuffer()));
        got.push({
          canonical: p.hotlink,
          title: p.title,
          license: p.license,
          artist: p.artist,
          source_page: p.descUrl,
        });
      } catch (e) {
        console.log(`  [miss] ${slug} candidate ${i + 1}: ${e.message}`); // 單張失敗不拖垮整個 slug
      }
      await sleep(700);
    }
    if (got.length === 0) throw new Error('all downloads failed');
    manifest[slug] = got;
    okCount++;
    console.log(`✓ ${slug}: ${got.length} candidates`);
    await sleep(500);
  } catch (err) {
    console.error(`✗ ${slug}: ${err.message}`);
    manifest[slug] = { error: err.message };
  }
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\ndone — ${okCount}/${entries.length} ok, manifest at ${OUT_DIR}/manifest.json`);
if (okCount === 0) process.exit(1); // 全滅才讓 job 紅；部分成功照樣 commit 供驗收，缺漏下輪補
