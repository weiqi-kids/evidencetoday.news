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
 * 只有 articles / ingredients 兩個頁型配封面。**myths 與 news 刻意不配**——
 * 這不是漏掉：2026-08-07 曾替 74 篇闢謠自動配圖，結果全數與內文不相干（見
 * docs/pitfalls.md），事後移除，此後闢謠與趨勢新聞維持無封面。不要「順手補上」。
 * ANCHOR 是各頁型 frontmatter 裡用來插在其前的既有欄位（該頁型每篇都有的欄位）。
 */
const DIRS = {
  articles: { dir: 'src/content/articles', anchor: /^(readingTime: .*)$/m },
  ingredients: { dir: 'src/content/ingredients', anchor: /^(featured: .*)$/m },
};
const dirArg = process.argv.indexOf('--dir');
const dirKey = dirArg > -1 ? process.argv[dirArg + 1] : 'articles';
if (!DIRS[dirKey]) { console.error(`--dir 只接受：${Object.keys(DIRS).join(' / ')}`); process.exit(1); }
const DIR = DIRS[dirKey].dir;
const ANCHOR = DIRS[dirKey].anchor;
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
  'japan-drugstore-medicine-bring-back-taiwan': 'japan pharmacy drugstore shelf tokyo street',
  'cbd-products-bring-back-taiwan-legal-risk': 'airport customs declaration counter luggage',
  'thailand-sleep-gummies-bring-back-taiwan': 'gummy candy jar bedside table night',
  'aspirin-fish-oil-together-bleeding-risk': 'pill organizer weekly medication elderly hands',
  'levothyroxine-calcium-iron-spacing-hours': 'morning glass of water medication kitchen table',
  'probiotics-with-antibiotics-spacing': 'yogurt bowl probiotic breakfast healthy gut',
  // 2026-08-17 批次：症狀類文章一律取「人在該情境裡」的場景，不取患部病灶特寫
  //   （病灶照對讀者不友善，且圖庫的病灶照多半是素材商標好的示意圖，未必對應本文疾病）。
  'dry-eye-syndrome-guide': 'tired woman rubbing eyes computer screen office',
  'hemorrhoids-guide': 'high fiber vegetables whole grains wooden table',
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
};

/* ---- 1. 站上已用過的圖 id，避免推薦重複 ---- */
const usedIds = new Set();
const allFiles = readdirSync(DIR).filter((f) => /\.mdx?$/.test(f));
for (const f of allFiles) {
  const t = readFileSync(`${DIR}/${f}`, 'utf8');
  for (const m of t.matchAll(/photo-\d+-[a-z0-9]+|photos\/\d+/g)) usedIds.add(m[0]);
}
console.log(`站上已用過 ${usedIds.size} 張圖，將排除。\n`);

/* ---- 找出缺封面的文章，並從內容推關鍵字 ---- */
const targets = [];
for (const f of allFiles) {
  const slug = f.replace(/\.mdx?$/, '');
  if (only && !only.includes(slug)) continue;
  const t = readFileSync(`${DIR}/${f}`, 'utf8');
  if (/^coverImage:/m.test(t)) continue;                       // 規矩 6：不覆蓋
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
    `coverImage: "${photo.full}"\ncoverImageCredit: "${photo.credit}"\n$1`);
  if (out === src) { console.log(`  ✗ 找不到插入點（${dirKey} 的 anchor），略過\n`); continue; }
  writeFileSync(t.file, out);
  usedIds.add(String(photo.id));
  needAlt.push(t.slug);
  console.log('  已寫入 coverImage / coverImageCredit\n');
}

if (needAlt.length) {
  console.log('─'.repeat(60));
  console.log('⚠️ 以下文章還缺 coverAlt，請逐張看圖後補寫繁中替代文字：');
  needAlt.forEach((s) => console.log(`   ${s}`));
  console.log('（playbook 要求看過圖才寫 alt，機器不代寫，避免編造無障礙描述）');
}
console.log(`\n完成後跑 pnpm build，確認 dist 的 --fallback 佔位卡歸零。`);
