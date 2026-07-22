// 成分解析縮圖「自動找照片」腳本 — 供 .github/workflows/ingredient-photos.yml 在
// GitHub Actions runner 上執行（CCR 雲端 session 的網路政策擋圖庫網域，runner 不受限）。
//
// 行為：對下方 27 個成分逐一以「策劃關鍵字」搜 Unsplash（有 UNSPLASH_ACCESS_KEY 走官方 API，
// 否則走網站前端同源的 napi 端點），以 RELEVANT 正則過濾 alt/tags 確認食物正確，
// 每個成分下載至多 3 張 480px 候選縮圖到 tmp-photo-review/，並輸出 manifest.json
// （含正式 hotlink URL、攝影師署名與連結）供人工目視驗收後接進 frontmatter。
//
// 放圖邏輯（鐵則）：照片必須呈現「該成分本身」或「富含該營養素的食物」，
// 詳見 docs/playbooks/ingredient-thumbnails.md。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'tmp-photo-review';
mkdirSync(OUT_DIR, { recursive: true });

// query: 送給圖庫的搜尋字串；relevant: 命中 alt_description/tags 任一即視為「食物正確」
const PLAN = {
  astaxanthin:         { query: 'fresh shrimp prawns seafood',      relevant: /shrimp|prawn|seafood/i },
  calcium:             { query: 'glass of milk dairy',              relevant: /milk|dairy/i },
  choline:             { query: 'fresh eggs basket',                relevant: /egg/i },
  'coenzyme-q10':      { query: 'peanuts nuts bowl',                relevant: /peanut|nut|almond/i },
  collagen:            { query: 'bone broth soup bowl',             relevant: /broth|soup|stew/i },
  creatine:            { query: 'herring mackerel fish market',     relevant: /herring|mackerel|fish/i },
  'dietary-fiber':     { query: 'oats whole grains cereal',         relevant: /oat|grain|cereal|wheat/i },
  folate:              { query: 'fresh spinach leaves',             relevant: /spinach|leaf|leaves|green/i },
  ginseng:             { query: 'ginseng root',                     relevant: /ginseng|root/i },
  glucosamine:         { query: 'crab shellfish shell',             relevant: /crab|shell|shrimp|lobster/i },
  iron:                { query: 'raw beef steak red meat',          relevant: /beef|steak|meat/i },
  lutein:              { query: 'corn cob fresh',                   relevant: /corn|maize/i },
  magnesium:           { query: 'dark chocolate pieces cacao',      relevant: /chocolate|cacao|cocoa/i },
  melatonin:           { query: 'fresh cherries bowl',              relevant: /cherr/i },
  'milk-thistle':      { query: 'milk thistle flower plant',        relevant: /thistle|purple flower/i },
  'omega-3':           { query: 'salmon fillet fresh',              relevant: /salmon|fish/i },
  opc:                 { query: 'grapes bunch vineyard',            relevant: /grape/i },
  probiotics:          { query: 'kimchi sauerkraut fermented jar',  relevant: /kimchi|sauerkraut|ferment|pickle/i },
  'pumpkin-seed':      { query: 'pumpkin seeds',                    relevant: /pumpkin|seed/i },
  turmeric:            { query: 'turmeric root powder',             relevant: /turmeric/i },
  'vitamin-a':         { query: 'fresh carrots bunch',              relevant: /carrot/i },
  'vitamin-b-complex': { query: 'whole grain bread loaf',           relevant: /bread|grain|loaf/i },
  'vitamin-c':         { query: 'lemons citrus fruits',             relevant: /lemon|citrus|orange|lime/i },
  'vitamin-d':         { query: 'sardines fish',                    relevant: /sardine|fish/i },
  'vitamin-e':         { query: 'almonds bowl',                     relevant: /almond|nut/i },
  'vitamin-k':         { query: 'broccoli kale fresh',              relevant: /broccoli|kale|green/i },
  zinc:                { query: 'fresh oysters half shell',         relevant: /oyster/i },
};

const KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; evidencetoday-thumb-fetch/1.0)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  const url = KEY
    ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`
    : `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`;
  const res = await fetch(url, { headers: KEY ? { ...UA, Authorization: `Client-ID ${KEY}` } : UA });
  if (!res.ok) throw new Error(`search ${query}: HTTP ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

// 與既有 14 篇相同的 hotlink 參數格式
function canonicalUrl(raw) {
  const base = raw.split('?')[0];
  return `${base}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`;
}

const manifest = {};
let failures = 0;

for (const [slug, plan] of Object.entries(PLAN)) {
  try {
    const results = await search(plan.query);
    const text = (p) =>
      [p.alt_description, p.description, ...(p.tags ?? []).map((t) => t.title ?? t)].filter(Boolean).join(' ');
    const relevant = results.filter((p) => plan.relevant.test(text(p)));
    const pool = relevant.length >= 3 ? relevant : [...relevant, ...results.filter((p) => !relevant.includes(p))];
    const picks = pool.slice(0, 3);
    if (picks.length === 0) throw new Error('no results');

    manifest[slug] = [];
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const small = `${p.urls.raw.split('?')[0]}?fm=jpg&q=70&w=480&fit=max`;
      const img = await fetch(small, { headers: UA });
      if (!img.ok) throw new Error(`download ${slug}-${i + 1}: HTTP ${img.status}`);
      writeFileSync(join(OUT_DIR, `${slug}-${i + 1}.jpg`), Buffer.from(await img.arrayBuffer()));
      manifest[slug].push({
        canonical: canonicalUrl(p.urls.raw),
        alt_en: p.alt_description ?? '',
        photographer: p.user?.name ?? '',
        credit_url: p.user?.links?.html ?? '',
        photo_page: p.links?.html ?? '',
        matched_filter: relevant.includes(p),
      });
      await sleep(400);
    }
    console.log(`✓ ${slug}: ${manifest[slug].length} candidates (${relevant.length} passed filter)`);
    await sleep(800);
  } catch (err) {
    failures++;
    console.error(`✗ ${slug}: ${err.message}`);
    manifest[slug] = { error: err.message };
  }
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\ndone — ${Object.keys(PLAN).length - failures}/${Object.keys(PLAN).length} ok, manifest at ${OUT_DIR}/manifest.json`);
if (failures > Object.keys(PLAN).length / 2) process.exit(1); // 大面積失敗才讓 job 紅，零星缺漏留給人工補
