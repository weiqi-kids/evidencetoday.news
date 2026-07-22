// 成分解析縮圖「自動找照片」腳本 — 供 .github/workflows/ingredient-photos.yml 在
// GitHub Actions runner 上執行（CCR 雲端 session 的網路政策擋圖庫網域，runner 不受限）。
//
// 圖源：Wikimedia Commons API（免金鑰；Unsplash napi 已 401、ai-suggest worker 的
// push 權驗證不吃 Actions installation token，兩路皆不通，2026-07 驗證）。
// 只收 CC0 / Public domain / CC BY / CC BY-SA 授權的 JPEG/PNG，authors 署名記進 manifest
// 供 coverImageCredit 使用；coverImage 熱連結 upload.wikimedia.org 的 1080px 縮圖
// （與「圖庫照片存外部絕對 URL、不下載」慣例一致，見 docs/playbooks/editor-images.md）。
//
// 行為：對 27 個成分逐一以「策劃關鍵字」搜圖，每個成分抓 3 張 480px 候選縮圖到
// tmp-photo-review/，並輸出 manifest.json 供人工目視驗收後接進 frontmatter。
// 放圖邏輯（鐵則）：照片必須呈現「該成分本身」或「富含該營養素的食物」，
// 詳見 docs/playbooks/ingredient-thumbnails.md。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'tmp-photo-review';
mkdirSync(OUT_DIR, { recursive: true });

// 每成分的搜尋關鍵字（「富含該營養素的食物」策劃版；Commons 用學名/英文常拿到較好的圖）
const PLAN = {
  astaxanthin:         'cooked shrimp prawns',
  calcium:             'glass of milk',
  choline:             'chicken eggs',
  'coenzyme-q10':      'peanuts',
  collagen:            'bone broth',
  creatine:            'herring fish',
  'dietary-fiber':     'rolled oats',
  folate:              'spinach leaves',
  ginseng:             'ginseng root',
  glucosamine:         'crab',
  iron:                'raw beef steak',
  lutein:              'corn cob',
  magnesium:           'dark chocolate',
  melatonin:           'sweet cherries',
  'milk-thistle':      'Silybum marianum flower',
  'omega-3':           'salmon fillet',
  opc:                 'grapes bunch',
  probiotics:          'kimchi',
  'pumpkin-seed':      'pumpkin seeds',
  turmeric:            'turmeric root powder',
  'vitamin-a':         'carrots',
  'vitamin-b-complex': 'whole grain bread',
  'vitamin-c':         'lemons',
  'vitamin-d':         'sardines',
  'vitamin-e':         'almonds',
  'vitamin-k':         'broccoli',
  zinc:                'oysters half shell',
};

const OK_LICENSE = /^(cc0|public domain|pd|cc[ -]by(?:[ -]sa)?(?:[ -]\d\.\d)?)$/i;
const UA = { 'User-Agent': 'evidencetoday-thumb-fetch/1.0 (https://evidencetoday.news; editorial cover sourcing)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function commonsSearch(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: query, gsrnamespace: '6', gsrlimit: '12',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '480',
  });
  const res = await fetch(`${api}?${params}`, { headers: UA });
  if (!res.ok) throw new Error(`commons ${query}: HTTP ${res.status}`);
  const json = await res.json();
  const pages = Object.values(json.query?.pages ?? {});
  // 依搜尋相關性排序（generator 會把排名放在 page.index）
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    if (!/image\/(jpeg|png)/.test(ii.mime ?? '')) continue; // 跳過 SVG/GIF/圖表類
    if ((ii.width ?? 0) < 1000) continue; // 要能出 1080px 縮圖
    const meta = ii.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!OK_LICENSE.test(license)) continue;
    const thumb480 = ii.thumburl ?? '';
    if (!thumb480.includes('/480px-')) continue;
    out.push({
      title: p.title,
      thumb480,
      hotlink1080: thumb480.replace('/480px-', '/1080px-'),
      license,
      artist: stripHtml(meta.Artist?.value ?? ''),
      descUrl: ii.descriptionurl ?? '',
    });
  }
  return out;
}

const manifest = {};
let failures = 0;

for (const [slug, query] of Object.entries(PLAN)) {
  try {
    const photos = await commonsSearch(query);
    const picks = photos.slice(0, 3);
    if (picks.length === 0) throw new Error('no acceptable results');

    manifest[slug] = [];
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const img = await fetch(p.thumb480, { headers: UA });
      if (!img.ok) throw new Error(`download ${slug}-${i + 1}: HTTP ${img.status}`);
      writeFileSync(join(OUT_DIR, `${slug}-${i + 1}.jpg`), Buffer.from(await img.arrayBuffer()));
      manifest[slug].push({
        canonical: p.hotlink1080,
        title: p.title,
        license: p.license,
        artist: p.artist,
        source_page: p.descUrl,
      });
      await sleep(300);
    }
    console.log(`✓ ${slug}: ${manifest[slug].length} candidates`);
    await sleep(500);
  } catch (err) {
    failures++;
    console.error(`✗ ${slug}: ${err.message}`);
    manifest[slug] = { error: err.message };
  }
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\ndone — ${Object.keys(PLAN).length - failures}/${Object.keys(PLAN).length} ok, manifest at ${OUT_DIR}/manifest.json`);
if (failures > Object.keys(PLAN).length / 2) process.exit(1); // 大面積失敗才讓 job 紅，零星缺漏留給人工補
