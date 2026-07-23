// 首頁/趨勢新聞配圖「自動找照片」腳本 — 供 .github/workflows/content-photos.yml 在
// GitHub Actions runner 上執行（CCR 雲端 session 的網路政策擋圖庫網域，runner 不受限）。
//
// 沿用 scripts/fetch-ingredient-photos.mjs 的驗證過的路子：
//   圖源 = Wikimedia Commons API（免金鑰），只收自由授權（CC0/PD/CC BY*/CC BY-SA*/
//   Attribution/Copyrighted free use/No restrictions）的 JPEG/PNG，作者署名記進 manifest
//   供 coverImageCredit；canonical 熱連結一律用 API 回傳的 thumburl「原字串」，
//   禁止自行改寫寬度桶（2026-07-22 事故：手改 /1024px- 全數 404）。
//
// 行為：對 news（62 篇）與 topics（11 個）逐一以「策劃關鍵字 + filetype:bitmap」搜圖，
// 每項抓最多 3 張候選縮圖到 tmp-photo-review/<group>/，輸出 manifest.json 供人工目視驗收。
// canonical 用 iiurlwidth=1280（Commons 標準桶、實測合法）；節奏 700ms、429 退避。
// 放圖邏輯：照片須呈現該篇主題最具體的畫面（食物 / 物件 / 情境），避開明顯非亞洲人臉。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'tmp-photo-review';

// group -> { slug: 'english commons search keywords' }
const PLANS = {
  news: {
    'radar-2026-05-08-12-02': 'ground cinnamon powder',
    'radar-2026-05-08-12-06': 'multivitamin tablets',
    'radar-2026-05-08-18-01': 'fresh vegetables basket',
    'radar-2026-05-08-18-02': 'kimchi fermented vegetables',
    'radar-2026-05-08-18-03': 'moringa powder',
    'radar-2026-05-08-18-04': 'milk carton dairy',
    'radar-2026-05-08-18-05': 'packaged snack food',
    'radar-2026-05-08-18-06': 'infant formula milk powder',
    'radar-2026-05-09-06-01': 'nutrition facts label',
    'radar-2026-05-09-06-02': 'weight training dumbbells gym',
    'radar-2026-05-09-06-03': 'person sleeping bed',
    'radar-2026-05-09-06-04': 'dietary supplement capsules',
    'radar-2026-05-09-06-05': 'school cafeteria lunch tray',
    'radar-2026-05-09-06-06': 'supplement pills bottle',
    'radar-2026-05-09-06-07': 'virus laboratory research',
    'radar-2026-05-09-18-01': 'healthy food vegetables plate',
    'radar-2026-05-09-18-02': 'poultry chicken farm',
    'radar-2026-05-10-06-01': 'blue pills medication',
    'radar-2026-05-10-06-02': 'yogurt probiotics bowl',
    'radar-2026-05-10-06-03': 'leafy greens berries nuts',
    'radar-2026-05-10-12-01': 'baby bottle formula milk',
    'radar-2026-05-10-12-02': 'alarm clock bedroom sleep',
    'radar-2026-05-10-12-03': 'processed packaged food supermarket',
    'radar-2026-05-12-12-01': 'whey protein powder scoop',
    'radar-2026-05-12-12-02': 'whole grains vegetables healthy',
    'radar-2026-05-12-12-03': 'insomnia clock night',
    'radar-2026-05-12-18-01': 'fresh vegetables jogging shoes',
    'radar-2026-05-12-18-02': 'food safety inspection laboratory',
    'radar-2026-05-12-19-01': 'supplement pills capsules',
    'radar-2026-05-12-19-02': 'high fiber foods vegetables',
    'radar-2026-05-12-20-01': 'colorful salad vegetables bowl',
    'radar-2026-05-12-22-01': 'cruise ship ocean',
    'radar-2026-05-12-22-02': 'virus laboratory microscope',
    'radar-2026-06-03-01': 'plastic microplastics water pollution',
    'radar-2026-06-04-01': 'vitamin d supplement softgel',
    'radar-2026-06-05-01': 'medical checkup stethoscope',
    'radar-2026-06-06-01': 'creatine powder scoop',
    'radar-2026-06-07-01': 'insulin injection pen',
    'radar-2026-06-08-01': 'chicken flock poultry farm',
    'radar-2026-06-09-01': 'junk food snacks assortment',
    'radar-2026-06-10-01': 'blood pressure monitor cuff',
    'radar-2026-06-11-01': 'vaccine vial syringe',
    'radar-2026-06-12-01': 'walking feet pavement park',
    'radar-2026-06-13-01': 'diet soda cans beverage',
    'radar-2026-06-14-01': 'cup of coffee beans',
    'radar-2026-06-15-01': 'air pollution smog city',
    'radar-2026-06-16-16-01': 'dumbbell weights senior fitness',
    'radar-2026-06-16-16-02': 'turmeric powder root',
    'radar-2026-06-16-16-03': 'food safety laboratory testing',
    'radar-2026-07-15-12-01': 'alarm clock bed night',
    'radar-2026-07-16-12-01': 'blood pressure pills medication',
    'radar-2026-07-17-12-01': 'cooking oil bottle pouring',
    'radar-2026-07-18-12-01': 'anti aging supplement capsules',
    'radar-2026-07-19-12-01': 'aedes mosquito',
    'radar-2026-07-20-12-01': 'barbell weight training',
    'radar-2026-07-21-12-01': 'weight loss injection pen',
    'radar-2026-07-22-12-01': 'milk calcium supplement',
    'radar-2026-07-23-12-01': 'glucosamine supplement joint',
    'radar-2026-07-24-12-01': 'fish oil omega 3 capsules',
    'radar-2026-07-25-12-01': 'fast food burger fries',
    'radar-2026-07-26-12-01': 'alarm clock bedtime',
    'radar-2026-07-27-12-01': 'fresh vegetables market',
  },
  topics: {
    'omega-3': 'salmon fillet fish',
    lutein: 'spinach kale leafy greens',
    'calcium-vitamin-d': 'milk glass dairy',
    'supplement-guide': 'dietary supplement capsules bottle',
    'blood-lipids': 'blood sample test tubes',
    'blood-sugar': 'blood glucose meter',
    'liver-kidney-test': 'medical blood test tubes',
    sleep: 'person sleeping bed pillow',
    'womens-health': 'woman yoga meditation wellness',
    'sports-nutrition': 'dumbbells protein fitness',
    'gut-health': 'yogurt probiotics bowl',
  },
};

// 第一輪多字關鍵字太窄（Commons 全文搜 + filetype:bitmap 常 0 命中或撈到古董版畫）；
// 第二輪對這些 slug 改用單一具體名詞重搜（目視驗收後決定的覆寫關鍵字）。
const OVERRIDE = {
  'radar-2026-05-08-18-04': 'milk bottles',
  'radar-2026-05-08-18-06': 'baby formula',
  'radar-2026-05-09-06-03': 'alarm clock',
  'radar-2026-05-10-06-02': 'yoghurt',
  'radar-2026-05-10-06-03': 'walnuts',
  'radar-2026-05-10-12-01': 'baby formula bottle',
  'radar-2026-05-10-12-02': 'alarm clock',
  'radar-2026-05-12-12-01': 'protein powder',
  'radar-2026-05-12-12-03': 'alarm clock',
  'radar-2026-05-12-18-01': 'vegetables',
  'radar-2026-06-03-01': 'plastic bottles',
  'radar-2026-06-04-01': 'softgel capsules',
  'radar-2026-06-05-01': 'stethoscope',
  'radar-2026-06-06-01': 'creatine',
  'radar-2026-06-08-01': 'chicken farm',
  'radar-2026-06-09-01': 'junk food',
  'radar-2026-06-10-01': 'sphygmomanometer',
  'radar-2026-06-12-01': 'walking legs',
  'radar-2026-07-15-12-01': 'alarm clock',
  'radar-2026-07-16-12-01': 'sphygmomanometer',
  'radar-2026-07-17-12-01': 'cooking oil',
  'radar-2026-07-18-12-01': 'capsules pills',
  'radar-2026-07-21-12-01': 'syringe',
  'radar-2026-07-22-12-01': 'milk glass',
  'radar-2026-07-26-12-01': 'alarm clock',
  lutein: 'spinach',
  'sports-nutrition': 'dumbbell',
  'gut-health': 'yoghurt',
};

const OK_LICENSE = /^(cc0|public domain|pd[\s-]|pd$|attribution|copyrighted free use|no restrictions|cc[ -]by\b|cc[ -]by[ -]sa\b)/i;
const UA = { 'User-Agent': 'evidencetoday-content-photo-fetch/1.0 (https://evidencetoday.news; editorial cover sourcing)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function fetchRetry(url, tries = 3) {
  for (let t = 1; ; t++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429 || t >= tries) return res;
    const wait = Number(res.headers.get('retry-after')) * 1000 || 6000;
    console.log(`  [429] backoff ${wait}ms: ${String(url).slice(-60)}`);
    await sleep(wait);
  }
}

let dumpedRaw = false;
async function commonsSearch(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280',
  });
  const res = await fetchRetry(`${api}?${params}`);
  if (!res.ok) throw new Error(`commons ${query}: HTTP ${res.status}`);
  const json = await res.json();
  if (!dumpedRaw) {
    dumpedRaw = true;
    console.log(`[debug] raw(${query}) keys=${Object.keys(json)} :: ${JSON.stringify(json).slice(0, 500)}`);
  }
  const pages = json.query?.pages ?? [];
  const list = Array.isArray(pages) ? pages : Object.values(pages);
  list.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const out = [];
  for (const p of list) {
    const ii = p.imageinfo?.[0];
    const reject = (why) => console.log(`  [skip] ${query} :: ${p.title} :: ${why}`);
    if (!ii) { reject('no imageinfo'); continue; }
    if (!/image\/(jpeg|png)/.test(ii.mime ?? '')) { reject(`mime=${ii.mime}`); continue; }
    if ((ii.width ?? 0) < 800) { reject(`width=${ii.width}`); continue; }
    const meta = ii.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!OK_LICENSE.test(license)) { reject(`license=${license || '(none)'}`); continue; }
    // canonical = API 回傳的 thumburl 原字串（1280 桶）；原圖不足 1280 時 thumburl 即原圖，仍合法。
    const canonical = ii.thumburl ?? ii.url ?? '';
    if (!canonical) { reject('no thumburl/url'); continue; }
    out.push({
      title: p.title,
      canonical,
      width: ii.width ?? 0,
      license,
      artist: stripHtml(meta.Artist?.value ?? ''),
      descUrl: ii.descriptionurl ?? '',
    });
  }
  return out;
}

// argv：`node scripts/fetch-content-photos.mjs news` 只跑某 group；
//       `node scripts/fetch-content-photos.mjs news:radar-2026-06-14-01` 只補某項（合併進 manifest）
const argv = process.argv.slice(2);
const groupFilter = argv.length ? argv.map((a) => a.split(':')[0]) : Object.keys(PLANS);
const slugFilter = new Set(argv.filter((a) => a.includes(':')).map((a) => a.split(':')[1]));

let manifest = {};
try {
  manifest = JSON.parse((await import('node:fs')).readFileSync(join(OUT_DIR, 'manifest.json'), 'utf8'));
} catch {}

let okCount = 0;
let totalCount = 0;

for (const group of Object.keys(PLANS)) {
  if (!groupFilter.includes(group)) continue;
  mkdirSync(join(OUT_DIR, group), { recursive: true });
  manifest[group] = manifest[group] ?? {};
  for (const [slug, baseQuery] of Object.entries(PLANS[group])) {
    if (slugFilter.size && !slugFilter.has(slug)) continue;
    const query = OVERRIDE[slug] ?? baseQuery;
    totalCount++;
    try {
      const photos = await commonsSearch(query);
      const picks = photos.slice(0, 5);
      if (picks.length === 0) throw new Error('no acceptable results');
      const got = [];
      for (let i = 0; i < picks.length && got.length < 3; i++) {
        const p = picks[i];
        try {
          const img = await fetchRetry(p.canonical);
          if (!img.ok) throw new Error(`HTTP ${img.status}`);
          writeFileSync(join(OUT_DIR, group, `${slug}-${got.length + 1}.jpg`), Buffer.from(await img.arrayBuffer()));
          got.push({
            canonical: p.canonical,
            title: p.title,
            width: p.width,
            license: p.license,
            artist: p.artist,
            source_page: p.descUrl,
          });
        } catch (e) {
          console.log(`  [miss] ${group}/${slug} candidate ${i + 1}: ${e.message}`);
        }
        await sleep(700);
      }
      if (got.length === 0) throw new Error('all downloads failed');
      manifest[group][slug] = got;
      okCount++;
      console.log(`✓ ${group}/${slug}: ${got.length} candidates (${query})`);
      await sleep(400);
    } catch (err) {
      console.error(`✗ ${group}/${slug}: ${err.message}`);
      manifest[group][slug] = { error: err.message, query };
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\ndone — ${okCount}/${totalCount} ok, manifest at ${OUT_DIR}/manifest.json`);
if (okCount === 0) process.exit(1);
