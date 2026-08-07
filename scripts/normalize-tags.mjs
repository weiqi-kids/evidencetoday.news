#!/usr/bin/env node
/**
 * 標籤同義詞一次性收斂（改寫 frontmatter）。
 *
 * 對照表是 src/data/tag-aliases.ts（唯一真實來源，本檔只是把它套用到既有內容）。
 * 為什麼要改 frontmatter 而不是只在讀取時轉換：/tags/<tag>/ 的路由、tag-stats 的統計、
 * 推薦演算法的 IDF 都直接吃 frontmatter；只在某一處轉換，其他地方看到的還是舊值，
 * 會出現「推薦算得出來但 tag 頁分開」這種內部不一致。
 *
 * 用法：
 *   node scripts/normalize-tags.mjs --dry    只印會改什麼
 *   node scripts/normalize-tags.mjs          實際改寫
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const COLLECTIONS = ['articles', 'myths', 'ingredients', 'news', 'podcasts', 'videos'];
const TAG_FIELDS = ['tags', 'topicTags'];

// 從 TS 檔讀對照表（避免在兩個地方各維護一份）
const src = readFileSync('src/data/tag-aliases.ts', 'utf8');
const body = src.slice(src.indexOf('TAG_ALIASES: Record<string, string> = {'), src.indexOf('};'));
const ALIASES = new Map();
for (const m of body.matchAll(/^\s*([^\s:]+)\s*:\s*'([^']+)'\s*,\s*$/gm)) {
  ALIASES.set(m[1].replace(/^['"]|['"]$/g, ''), m[2]);
}
if (!ALIASES.size) { console.error('讀不到 TAG_ALIASES，中止。'); process.exit(1); }
console.log(`對照表 ${ALIASES.size} 條\n`);

let files = 0, replaced = 0;
const hits = new Map();

for (const col of COLLECTIONS) {
  let names = [];
  try { names = readdirSync(join('src/content', col)).filter((f) => /\.mdx?$/.test(f)); } catch { continue; }
  for (const name of names) {
    const path = join('src/content', col, name);
    const raw = readFileSync(path, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const lines = m[1].split('\n');
    let inTagBlock = false;
    let touched = false;

    const out = lines.map((line) => {
      const key = line.match(/^(\w+):\s*$/);
      if (key) { inTagBlock = TAG_FIELDS.includes(key[1]); return line; }
      // 行內陣列：tags: [a, b]
      const inline = line.match(/^(\w+):\s*\[(.*)\]\s*$/);
      if (inline && TAG_FIELDS.includes(inline[1])) {
        const items = inline[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        const mapped = [];
        for (const it of items) {
          const c = ALIASES.get(it);
          if (c) { touched = true; replaced++; hits.set(`${it} → ${c}`, (hits.get(`${it} → ${c}`) ?? 0) + 1); }
          const v = c ?? it;
          if (v && !mapped.includes(v)) mapped.push(v);
        }
        return `${inline[1]}: [${mapped.map((s) => (/[:#{}\[\],]/.test(s) ? `"${s}"` : s)).join(', ')}]`;
      }
      if (line.trim() && !/^\s*-\s/.test(line)) inTagBlock = false;
      if (!inTagBlock) return line;
      const item = line.match(/^(\s*-\s*)(.*)$/);
      if (!item) return line;
      const value = item[2].trim().replace(/^['"]|['"]$/g, '');
      const c = ALIASES.get(value);
      if (!c) return line;
      touched = true; replaced++;
      hits.set(`${value} → ${c}`, (hits.get(`${value} → ${c}`) ?? 0) + 1);
      return `${item[1]}${/[:#{}\[\],]/.test(c) ? `"${c}"` : c}`;
    });

    if (!touched) continue;
    files++;
    // 同一份清單裡收斂後可能出現重複項，去重（保留順序）
    const deduped = [];
    let block = null;
    for (const line of out) {
      const key = line.match(/^(\w+):\s*$/);
      if (key) { block = TAG_FIELDS.includes(key[1]) ? new Set() : null; deduped.push(line); continue; }
      const item = block && line.match(/^\s*-\s*(.*)$/);
      if (item) {
        const v = item[1].trim().replace(/^['"]|['"]$/g, '');
        if (block.has(v)) continue;
        block.add(v);
      } else if (line.trim() && !/^\s*-\s/.test(line)) block = null;
      deduped.push(line);
    }
    if (!DRY) writeFileSync(path, `---\n${deduped.join('\n')}\n---${raw.slice(m[0].length)}`);
  }
}

console.log([...hits.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${String(v).padStart(3)} 次  ${k}`).join('\n'));
console.log(`\n${DRY ? '（試跑）' : ''}${files} 個檔案、${replaced} 個標籤收斂。`);
