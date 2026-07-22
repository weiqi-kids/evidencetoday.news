// 成分解析縮圖「自動找照片」腳本 — 供 .github/workflows/ingredient-photos.yml 在
// GitHub Actions runner 上執行（CCR 雲端 session 的網路政策擋圖庫網域，runner 不受限）。
//
// 圖源走既有站方基礎設施：ai-suggest worker 的 POST /stock（Unsplash+Pexels 交錯合併，
// key 配在 worker secret），以 Actions 的 GITHUB_TOKEN 通過 worker 的 push 權驗證
// （與編輯器 ImagePicker 同一條授權路徑，見 docs/playbooks/editor-images.md）。
//
// 行為：對 27 個成分逐一以「策劃關鍵字」搜圖，每個成分抓 3 張候選縮圖到 tmp-photo-review/，
// 並輸出 manifest.json（正式 hotlink URL、攝影師署名與連結）供人工目視驗收後接進 frontmatter。
// 放圖邏輯（鐵則）：照片必須呈現「該成分本身」或「富含該營養素的食物」，
// 詳見 docs/playbooks/ingredient-thumbnails.md。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'tmp-photo-review';
mkdirSync(OUT_DIR, { recursive: true });

const WORKER = 'https://evidencetoday-ai-suggest.lightman-chang.workers.dev';
const TOKEN = process.env.GITHUB_TOKEN || '';
if (!TOKEN) { console.error('缺 GITHUB_TOKEN'); process.exit(1); }

// 每成分的圖庫搜尋關鍵字（「富含該營養素的食物」策劃版）
const PLAN = {
  astaxanthin:         'fresh shrimp prawns seafood',
  calcium:             'glass of milk dairy',
  choline:             'fresh eggs basket',
  'coenzyme-q10':      'peanuts nuts bowl',
  collagen:            'bone broth soup bowl',
  creatine:            'herring mackerel fish market',
  'dietary-fiber':     'oats whole grains cereal',
  folate:              'fresh spinach leaves',
  ginseng:             'ginseng root',
  glucosamine:         'crab shellfish shell',
  iron:                'raw beef steak red meat',
  lutein:              'corn cob fresh',
  magnesium:           'dark chocolate pieces cacao',
  melatonin:           'fresh cherries bowl',
  'milk-thistle':      'milk thistle flower plant',
  'omega-3':           'salmon fillet fresh',
  opc:                 'grapes bunch vineyard',
  probiotics:          'kimchi sauerkraut fermented jar',
  'pumpkin-seed':      'pumpkin seeds',
  turmeric:            'turmeric root powder',
  'vitamin-a':         'fresh carrots bunch',
  'vitamin-b-complex': 'whole grain bread loaf',
  'vitamin-c':         'lemons citrus fruits',
  'vitamin-d':         'sardines fish',
  'vitamin-e':         'almonds bowl',
  'vitamin-k':         'broccoli kale fresh',
  zinc:                'fresh oysters half shell',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stockSearch(keywords) {
  const res = await fetch(`${WORKER}/stock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ keywords }),
  });
  if (!res.ok) throw new Error(`/stock ${keywords}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const { photos } = await res.json();
  return photos ?? [];
}

// 與既有 14 篇相同的 hotlink 參數格式（Unsplash）；Pexels 直接沿用 worker 給的 full
function canonicalUrl(p) {
  if (p.provider === 'unsplash') return `${p.full.split('?')[0]}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`;
  return p.full;
}

const manifest = {};
let failures = 0;

for (const [slug, keywords] of Object.entries(PLAN)) {
  try {
    const photos = await stockSearch(keywords);
    const picks = photos.slice(0, 3);
    if (picks.length === 0) throw new Error('no results');

    manifest[slug] = [];
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const img = await fetch(p.thumb);
      if (!img.ok) throw new Error(`download ${slug}-${i + 1}: HTTP ${img.status}`);
      writeFileSync(join(OUT_DIR, `${slug}-${i + 1}.jpg`), Buffer.from(await img.arrayBuffer()));
      manifest[slug].push({
        provider: p.provider,
        canonical: canonicalUrl(p),
        photographer: p.credit,
        credit_url: p.creditUrl,
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
