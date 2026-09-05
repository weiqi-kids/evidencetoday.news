#!/usr/bin/env node
/**
 * pnpm covers:backfill — 批次替缺封面的文章補 coverImage（headless，不開前台編輯器）。
 *
 * 這支腳本把 docs/playbooks/editor-images.md「六、D. 用 gh token 直接呼叫 /stock worker
 * 批次補封面」那段手工流程固定下來，避免每次重新摸索、也避免漏掉其中的驗證步驟。
 *
 * 嚴格遵守 playbook 的六條規矩：
 *   1. 先蒐集站上已用過的圖 id，避免推薦重複圖
 *   2. 每篇用主題關鍵字打 worker /stock（回真實 Unsplash/Pexels，非 AI 編造網址）
 *   3. 挑第一張「非重複」的圖
 *   4. **寫檔前一定 HEAD 驗證回 200**——ArticleCard 對 https URL 不檢查存在性，
 *      404 會變破圖，比佔位卡更糟。驗不過就跳過，不寫進 frontmatter。
 *   5. 寫 coverImage / coverImageCredit 兩欄
 *   6. **已有 coverImage 的文章一律不覆蓋**（尊重使用者在前台選過的圖）
 *
 * ⚠️ coverAlt 刻意不自動產生。playbook 要求「逐張看圖再寫 alt」，機器沒看過圖就寫 alt
 * 等於編造無障礙描述。本腳本改為印出待補清單，由人或具視覺能力的 session 補上。
 *
 * 用法：
 *   pnpm covers:backfill --dry              # 只查詢與驗證，不寫檔（建議先跑）
 *   pnpm covers:backfill                    # 實際寫入 frontmatter（預設 articles）
 *   pnpm covers:backfill --dir ingredients  # 改跑成分解析頁
 *   pnpm covers:backfill --only slug-a,slug-b
 *
 * 需要：GITHUB_TOKEN（worker 會驗此 token 對 repo 的 push 權）與對外網路。
 * ⚠️ Claude Code on the web 的沙箱 egress allowlist 預設**擋掉** workers.dev 與
 * images.unsplash.com（實測回 403 CONNECT）。在那種環境跑會全數失敗，屬預期行為，
 * 請改在主機、或把這兩個網域加進環境的網路白名單後再跑。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const WORKER = 'https://evidencetoday-ai-suggest.lightman-chang.workers.dev/stock';

/**
 * articles / ingredients / news 三個頁型配封面；**只有 myths 刻意不配**——
 * 那不是漏掉：2026-08-07 曾替 74 篇闢謠自動配圖，結果全數與內文不相干（見
 * docs/pitfalls.md），事後移除，此後闢謠維持無封面。不要「順手補上」。
 *
 * ⚠️ **news 的封面欄位叫 `heroImage`，不是 `coverImage`**（見 editor-images.md
 * 的 getCoverConfig）。2026-08-24 曾因為拿 `coverImage` 去 grep news 得到 0 篇，
 * 誤判成「news 不配封面」，導致該批 10 篇趨勢新聞無圖上線。欄位名不同不等於沒有這個功能，
 * 查某個頁型有沒有某功能時，要先確認那個頁型用的欄位名。
 *
 * FIELD 是封面網址要寫進哪個欄位；ANCHOR 是插在哪個既有欄位之前（該頁型每篇都有的欄位）。
 */
const DIRS = {
  articles: { dir: 'src/content/articles', field: 'coverImage', anchor: /^(readingTime: .*)$/m },
  ingredients: { dir: 'src/content/ingredients', field: 'coverImage', anchor: /^(featured: .*)$/m },
  news: { dir: 'src/content/news', field: 'heroImage', anchor: /^(tags:.*)$/m },
};
const dirArg = process.argv.indexOf('--dir');
const dirKey = dirArg > -1 ? process.argv[dirArg + 1] : 'articles';
if (!DIRS[dirKey]) { console.error(`--dir 只接受：${Object.keys(DIRS).join(' / ')}`); process.exit(1); }
const DIR = DIRS[dirKey].dir;
const ANCHOR = DIRS[dirKey].anchor;
const FIELD = DIRS[dirKey].field;
const dry = process.argv.includes('--dry');
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > -1 ? (process.argv[onlyArg + 1] || '').split(',').filter(Boolean) : null;

const token = (process.env.GITHUB_TOKEN || '').trim();
if (!token) { console.error('缺 GITHUB_TOKEN（worker 用它驗 repo push 權）'); process.exit(1); }

/**
 * 英文關鍵字覆寫。Unsplash / Pexels 的索引是英文，直接把中文 tags 丟過去搜不到東西
 * （2026-08-05 實測：中文 tags 幾乎回空）。沒對應到的文章會退回用中文 tags，
 * 屆時多半查無結果，補上對應即可——這比讓腳本亂猜英文詞安全。
 * 選詞原則：具體場景 > 抽象概念，且避開藥品實物特寫（本站不做產品頁）。
 */
const KEYWORD_HINTS = {
  'japan-drugstore-medicine-bring-back-taiwan': 'japanese drugstore storefront signage tokyo shopping street',
  'cbd-products-bring-back-taiwan-legal-risk': 'airport customs declaration counter luggage',
  'thailand-sleep-gummies-bring-back-taiwan': 'gummy candy jar bedside table night',
  'aspirin-fish-oil-together-bleeding-risk': 'pill organizer weekly medication elderly hands',
  'levothyroxine-calcium-iron-spacing-hours': 'morning glass of water medication kitchen table',
  'probiotics-with-antibiotics-spacing': 'yogurt bowl probiotic breakfast healthy gut',
  // 2026-08-17 批次：症狀類文章一律取「人在該情境裡」的場景，不取患部病灶特寫
  //   （病灶照對讀者不友善，且圖庫的病灶照多半是素材商標好的示意圖，未必對應本文疾病）。
  'dry-eye-syndrome-guide': 'tired woman rubbing eyes computer screen office',
  'hemorrhoids-guide': 'whole grain bread oats fiber breakfast',
  'tinnitus-guide': 'man touching ear quiet room listening',
  'vertigo-bppv-guide': 'woman sitting sofa hand on forehead unwell',
  'plantar-fasciitis-guide': 'person holding heel foot pain barefoot',
  'frozen-shoulder-guide': 'man holding shoulder stretching arm pain',
  'chronic-urticaria-guide': 'red skin rash irritation forearm',
  'psoriasis-guide': 'dry skin elbow closeup moisturizer hand',
  'thyroid-nodule-guide': 'ultrasound scan probe neck examination sonographer',
  'recurrent-uti-guide': 'woman drinking glass of water hydration',
  // 2026-08-24 台灣在地食品安全家族：取「食材／場景本體」，不取病灶或發霉腐敗特寫
  //   （腐敗照對讀者不友善，且圖庫的「發霉」素材多半是擺拍，未必對應本文情境）。
  'lunchbox-noon-to-evening-safe': 'bento lunch box office desk',
  'buffet-warming-tray-how-long': 'buffet steam table warming tray food',
  'lunchbox-refrigerate-then-microwave': 'microwave',
  'buffet-which-dishes-riskiest': 'cafeteria buffet line serving dishes',
  'food-delivery-40-minutes-safe': 'food delivery courier insulated bag scooter',
  'braised-food-stall-room-temp': 'taiwanese street food stall evening',
  'oden-broth-simmering-all-day': 'simmering broth pot steam stove',
  'breakfast-shop-mayo-room-temp': 'breakfast egg sandwich toast griddle',
  'night-market-frying-oil-all-night': 'deep fryer cooking oil kitchen',
  'bubble-tea-ice-toppings-risk': 'bubble milk tea tapioca pearls',
  'filled-bread-room-temp-how-long': 'bakery bread display shelf',
  'leftovers-reheat-how-many-times': 'leftover food containers refrigerator',
  'fridge-storage-time-table': 'open refrigerator full of food',
  'fridge-overpacked-airflow': 'home refrigerator interior full shelves',
  'thawed-food-refreeze': 'frozen food package freezer',
  'food-poisoning-onset-time': 'person holding stomach abdominal discomfort',
  'food-poisoning-when-see-doctor': 'doctor consulting patient clinic desk',
  'market-ground-meat-risk': 'raw minced ground meat butcher',
  'warm-meat-chill-or-freeze': 'raw pork cutting board kitchen',
  'market-meat-after-noon': 'traditional market butcher stall',
  'organ-meat-room-temp-stall': 'market meat stall counter display',
  'cas-traceability-slaughter-labels': 'supermarket meat packaging label',
  'meat-color-slime-when-to-discard': 'raw beef steak closeup',
  'market-eggs-room-temp-refrigerate': 'eggs in carton market stall',
  'washed-vs-unwashed-eggs': 'white and brown eggs carton',
  'soft-boiled-egg-salmonella': 'soft boiled egg runny yolk ramen',
  'night-market-raw-marinated-shrimp': 'raw shrimp closeup',
  'sashimi-freezing-regulation-taiwan': 'salmon sashimi slices plate',
  'room-temp-soymilk-how-long': 'glass of soy milk breakfast',
  'market-tofu-soaked-in-water': 'fresh tofu blocks market',
  'dried-tofu-color-additives': 'pressed tofu blocks stacked market',
  'raw-oyster-why-risky': 'fresh oysters on ice half shell',
  'homemade-pickles-botulism': 'homemade pickled vegetables glass jars',
  'rancid-nuts-still-edible': 'mixed nuts peanuts wooden bowl',
  'dried-goods-sulfur-dioxide': 'dried mushrooms and dried vegetables market',
  'herbal-dried-goods-wash-first': 'chinese herbal medicine dried roots',
  'cut-watermelon-at-stall': 'watermelon slices cut wedges',
  'supermarket-precut-fruit-box': 'precut fruit plastic container supermarket',
  'cooking-oil-reuse-times': 'used cooking oil in pan closeup',
  'soy-sauce-refrigerate-after-open': 'soy sauce bottle pouring dish',
  'mid-autumn-bbq-food-safety': 'barbecue grill charcoal meat skewers',
  'new-year-dishes-made-ahead': 'chinese new year reunion dinner table dishes',
  'temple-offerings-left-all-day': 'temple offering table fruit incense taiwan',
  'chicken-essence': 'chicken soup broth bowl',
  'clam-extract': 'fresh clams shellfish bowl',
  'birds-nest': 'chinese dessert soup white bowl',
  'pearl-powder': 'white powder in bowl with pearls',
  zeaxanthin: 'corn kernels yellow maize closeup',
  // 2026-08-31 補：08-17 那批趨勢新聞漏配圖（誤判 news 不用封面，實際欄位是 heroImage）。
  //   新聞取「該則研究主題的情境」，不取新聞感的示意圖。
  'radar-2026-08-24-12-01': 'weight scale measuring tape health',
  'radar-2026-08-25-12-01': 'scientist microscope research lab',
  'radar-2026-08-26-12-01': 'gut microbiome petri dish laboratory',
  'radar-2026-08-27-12-01': 'blood pressure monitor arm cuff',
  'radar-2026-08-28-12-01': 'medical screening clinic corridor',
  'radar-2026-08-29-12-01': 'vaccine syringe vial clinic',
  'radar-2026-08-30-12-01': 'senior couple walking outdoors park',
  'radar-2026-08-31-12-01': 'man doing squat barbell training',
  'radar-2026-09-01-12-01': 'people walking city street daytime',
  'radar-2026-09-02-12-01': 'packaged snacks supermarket shelf',
  // 成分頁取「食物來源／原料本體」，不取膠囊瓶罐（本站不做產品頁，見規矩說明）
  berberine: 'dried barberry goldenseal root herbs bowl',
  'beta-glucan': 'rolled oats oatmeal bowl wooden spoon',
  chromium: 'broccoli whole grains healthy meal plate',
  iodine: 'dried seaweed kelp sheets sea salt',
  bacopa: 'green herb leaves plant botanical medicine',
  'tart-cherry': 'fresh tart cherries bowl red fruit',
  'beta-alanine': 'athlete strength training gym weights',
  lactoferrin: 'pouring milk glass dairy breakfast',
  phosphatidylserine: 'soybeans soy seeds bowl',
  maca: 'peruvian maca root tuber harvest',
  'krill-oil': 'antarctic krill shrimp ocean',
  // 2026-09-01 成分解析批：台灣特有品類 + 貨架比較型。
  //   比較型（劑型比較）取「貨架／膠囊實體」而非食材原型——這兩篇的讀者是站在藥局前的人。
  'antrodia-cinnamomea': 'wild bracket fungus mushroom growing tree trunk forest',
  'reishi-mushroom': 'reishi ganoderma mushroom dried whole',
  bromelain: 'fresh pineapple sliced tropical fruit',
  'royal-jelly': 'beehive honeycomb bees apiary frame',
  propolis: 'beekeeper hands honeycomb hive wooden frame',
  'bitter-melon-peptide': 'bitter gourd momordica sliced cutting board',
  'roselle-extract': 'roselle hibiscus flowers red calyx harvest',
  'si-wu-decoction': 'dried chinese herbal medicine roots bowl',
  'fish-oil-forms-comparison': 'omega 3 softgel capsules golden pile close up',
  'lutein-forms-comparison': 'supplement capsules bottle pharmacy shelf',
  // 2026-09-01 秋冬節氣批：延續上面 08-17 的原則——症狀類取「人在那個情境裡」，
  //   不取患部特寫；進補與火鍋類取食物與餐桌場景，不取藥材標本照。
  'cold-or-allergy-seasonal-change': 'woman sneezing tissue autumn window',
  'autumn-dry-cough-two-weeks': 'man coughing hand chest indoor',
  'autumn-dry-skin-itch': 'woman applying body lotion cream after shower',
  'cold-hands-feet-causes': 'cold hands holding warm mug blanket',
  'temperature-swing-blood-pressure': 'home blood pressure monitor arm cuff table',
  'autumn-hair-shedding': 'hair brush comb fallen hair bathroom',
  'flu-vaccine-still-got-flu': 'nurse giving flu vaccine injection arm clinic',
  'air-pollution-outdoor-exercise': 'hazy city skyline smog air pollution morning',
  'winter-bedding-dust-mites': 'folded winter blankets duvet bedroom linen',
  'who-should-avoid-winter-tonic': 'herbal chicken soup hot pot clay bowl',
  'herbal-tonic-drug-interactions': 'medicine pills capsules spilled wooden table',
  'sesame-oil-chicken-alcohol': 'sesame oil chicken soup ginger cooking pot',
  'hotpot-tonic-sodium': 'steaming hot pot broth table winter dinner',
  'tonic-side-effects-heatiness': 'tired woman sitting bed night insomnia',
  'hotpot-frequency-blood-lipids': 'sliced beef pork hotpot ingredients platter',
  'hotpot-dipping-sauce-calories': 'small bowl of sauce sesame paste chopsticks',
  'hotpot-broth-purine-gout': 'seafood hotpot shrimp clams broth',
  'cold-snap-cardiac-timing': 'elderly man warm coat cold winter morning street',
  'hot-spring-who-should-avoid': 'outdoor hot spring steam onsen rocks',
  'low-temperature-burns-heating-devices': 'hot water bottle knitted cover bed winter',
  // 2026-09-05 日韓跨境批：取「當地藥局／貨架／機場」的場景，不取商品或藥丸特寫
  //   （本站不做商城，封面出現可辨識商品會讓頁面看起來像業配）。
  'korea-sleep-gummies-bring-back-taiwan': 'seoul street night pharmacy storefront korea',
  'korea-red-ginseng-bring-back-taiwan': 'dried ginseng roots traditional market',
  'korea-drugstore-medicine-bring-back-taiwan': 'seoul korea city street shop signs hangul daytime',
  'japan-supplements-bring-back-taiwan': 'japanese drugstore aisle shelves products',
  'japan-otc-ingredient-red-lines': 'person reading medicine box label pharmacy hands',
  'ashwagandha-regulation-denmark-eu-us-taiwan': 'ashwagandha root withania herbal powder',
  '5-htp-regulation-taiwan-us-eu': 'woman shopping supplement aisle grocery store shelves',
  // 這兩篇是既有已上線文，深化時才發現從來沒有封面。
  // 它們的關鍵字本來就在本表最上面（第 72、74 行），這裡不要再寫一次——
  // JS 物件字面值後者覆蓋前者，重複鍵會讓「改了上面那筆卻沒生效」，很難查。
  // 2026-09-01 國際法規落差批：取「跨境／貨架／官方文件」場景，不取藥丸特寫。
  'melatonin-why-otc-abroad-prescription-taiwan': 'american pharmacy supplement aisle shelves bottles',
  'nmn-regulation-taiwan-japan-us-eu': 'japanese drugstore shelf supplements tokyo',
  'red-yeast-rice-regulation-eu-japan-taiwan': 'red yeast rice fermented grain bowl',
};

/* ---- 1. 站上已用過的圖 id，避免推薦重複 ---- */
const usedIds = new Set();
const allFiles = readdirSync(DIR).filter((f) => /\.mdx?$/.test(f));
// 2026-08-31 修：原本只掃當前 collection 的目錄，跨頁型的重複因此抓不到——
// news 的 08-31 與 ingredients 的 beta-alanine 就拿到了同一張健身房照片。
// 圖是全站共用資源，去重必須掃全部 collection。
for (const col of ['articles', 'myths', 'ingredients', 'news', 'podcasts', 'videos']) {
  let entries = [];
  try { entries = readdirSync(`src/content/${col}`).filter((f) => /\.mdx?$/.test(f)); } catch { continue; }
  for (const f of entries) {
    const t = readFileSync(`src/content/${col}/${f}`, 'utf8');
    for (const m of t.matchAll(/photo-[\w-]+|photos\/\d+/g)) usedIds.add(m[0]);
  }
}
console.log(`站上已用過 ${usedIds.size} 張圖（掃全部 collection），將排除。\n`);

/* ---- 找出缺封面的文章，並從內容推關鍵字 ---- */
const targets = [];
for (const f of allFiles) {
  const slug = f.replace(/\.mdx?$/, '');
  if (only && !only.includes(slug)) continue;
  const t = readFileSync(`${DIR}/${f}`, 'utf8');
  if (new RegExp(`^${FIELD}:`, 'm').test(t)) continue;          // 規矩 6：不覆蓋
  const tags = (t.match(/^tags: *\[(.*)\]/m)?.[1] || '')
    .split(',').map((s) => s.replace(/["\s]/g, '')).filter(Boolean);
  const kw = KEYWORD_HINTS[slug] || tags.slice(0, 4).join(' ');
  targets.push({ slug, file: `${DIR}/${f}`, kw, hinted: !!KEYWORD_HINTS[slug] });
}
if (!targets.length) { console.log('沒有缺封面的文章。'); process.exit(0); }
console.log(`缺封面 ${targets.length} 篇：${targets.map((x) => x.slug).join(', ')}\n`);

/* ---- 2–4. 打 /stock、挑非重複、HEAD 驗 200 ---- */
async function pick(kw) {
  const r = await fetch(WORKER, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ keywords: kw }),
  });
  if (!r.ok) return { err: `worker HTTP ${r.status}` };
  const photos = (await r.json())?.photos ?? [];
  for (const p of photos) {
    const id = String(p.id ?? '');
    if ([...usedIds].some((u) => p.full?.includes(u))) continue;   // 非重複
    const head = await fetch(p.full, { method: 'HEAD' });          // 規矩 4：硬驗 200
    if (!head.ok) { console.log(`    ↳ 跳過（HEAD ${head.status}）：${p.full.slice(0, 60)}…`); continue; }
    return { photo: p, id };
  }
  return { err: '無可用且驗證通過的圖' };
}

const needAlt = [];
for (const t of targets) {
  process.stdout.write(`${t.slug}\n  關鍵字：${t.kw}${t.hinted ? '' : '  ⚠️ 未設英文覆寫，中文搜圖多半查無結果'}\n`);
  let res;
  try { res = await pick(t.kw); } catch (e) { res = { err: String(e).slice(0, 80) }; }
  if (res.err) { console.log(`  ✗ ${res.err}\n`); continue; }
  const { photo } = res;
  console.log(`  ✓ ${photo.provider} ${photo.credit}`);
  console.log(`    ${photo.full.slice(0, 90)}…`);
  if (dry) { console.log(''); continue; }

  /* ---- 5. 寫 coverImage / coverImageCredit（coverAlt 留人工）---- */
  const src = readFileSync(t.file, 'utf8');
  const out = src.replace(ANCHOR,
    `${FIELD}: "${photo.full}"\ncoverImageCredit: "${photo.credit}"\n$1`);
  if (out === src) { console.log(`  ✗ 找不到插入點（${dirKey} 的 anchor），略過\n`); continue; }
  writeFileSync(t.file, out);
  // 用「從網址擷取的 id」登記，格式必須與第 1 步的初始掃描一致。
  // 2026-08-31 修：原本存的是 API 的 photo.id，與網址裡的 photo-<ts>-<hash> 格式不同，
  // 導致同一次執行內剛用過的圖不會被排除——news 那批的 08-25 與 08-28 因此拿到同一張。
  const usedId = (photo.full.match(/photo-[\w-]+|photos\/\d+/) || [])[0];
  if (usedId) usedIds.add(usedId);
  needAlt.push(t.slug);
  console.log(`  已寫入 ${FIELD} / coverImageCredit\n`);
}

if (needAlt.length) {
  console.log('─'.repeat(60));
  console.log('⚠️ 以下文章還缺 coverAlt，請逐張看圖後補寫繁中替代文字：');
  needAlt.forEach((s) => console.log(`   ${s}`));
  console.log('（playbook 要求看過圖才寫 alt，機器不代寫，避免編造無障礙描述）');
}
console.log(`\n完成後跑 pnpm build，確認 dist 的 --fallback 佔位卡歸零。`);
