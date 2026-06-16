// 建置期掃所有內容，抽出「已使用的免費圖庫圖（Unsplash / Pexels）」穩定識別，
// 產出 public/admin/used-images.json。編輯器「AI 找圖庫」載入後當 exclude 傳給 worker，
// 避免推薦已用過的圖。識別規則須與 workers/ai-suggest/src/index.ts 的 stockImageId 一致。
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT_ROOT = 'src/content';
const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'];
const OUT_DIR = 'public/admin';
const OUT_FILE = join(OUT_DIR, 'used-images.json');

// 與 worker stockImageId() 相同：unsplash photo-<seg> / pexels photos/<id>
const PATTERNS = [
  [/images\.unsplash\.com\/photo-([\w-]+)/g, 'unsplash'],
  [/images\.pexels\.com\/photos\/(\d+)/g, 'pexels'],
];

export function collectIds(text, set = new Set()) {
  for (const [re, provider] of PATTERNS) {
    for (const m of text.matchAll(re)) set.add(`${provider}:${m[1]}`);
  }
  return set;
}

function run() {
  const ids = new Set();
  let total = 0;
  for (const col of COLLECTIONS) {
    const dir = join(CONTENT_ROOT, col);
    let files = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    } catch {
      continue; // 該集合目錄不存在就略過
    }
    for (const f of files) {
      try {
        collectIds(readFileSync(join(dir, f), 'utf8'), ids);
        total += 1;
      } catch {
        /* 略過讀取失敗的單檔 */
      }
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ ids: [...ids].sort() }, null, 0));
  console.log(`[used-images] ${total} 篇內容 → ${ids.size} 個已用圖庫圖 → ${OUT_FILE}`);
}

// 直接執行（被 prebuild 呼叫）；被 import（測試）時不自動跑
if (import.meta.url === `file://${process.argv[1]}`) run();
