import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { CONTENT_TYPES } from './insight-constants.mjs';

/**
 * 純函數：把 [{type,slug,raw}] 解析成 [{type,slug,title,titleEn,tags}]。
 * raw 為檔案內容（含 YAML frontmatter）。
 * `titleEn` 是 ingredients 既有的 frontmatter 欄位（見 src/content.schemas.ts），
 * 撞題比對靠它認得英文成分名，不另建 schema。
 */
export function parseContentIndex(files) {
  return files.map(({ type, slug, raw }) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    let fm = {};
    if (m) {
      try { fm = yaml.load(m[1]) || {}; } catch { fm = {}; }
    }
    return {
      type,
      slug,
      title: typeof fm.title === 'string' ? fm.title : '',
      titleEn: typeof fm.titleEn === 'string' ? fm.titleEn : '',
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    };
  });
}

/**
 * 人工維護的別名補丁：只放「slug／title／titleEn／tags 四個欄位都推不出來」的說法。
 * key = `<collection>/<slug>`，value = 讀者實際會打、但頁面 frontmatter 沒有的字串
 *（俗名、簡體寫法、成分頁只在內文提到的次要成分名）。
 *
 * 維護責任：內容／經營 session（分流 B）。跑 `pnpm insights` 發現某則查詢明明站上有頁
 * 卻仍被判成「站內無對應文章」時，先確認能不能改頁面的 `titleEn` / `tags` 解決
 *（那才是正解，別名表是最後手段），真的不行才在此加一行。
 * 加完跑 scripts/lib/content-index.test.mjs 確認沒有把不相干的查詢也吃進來。
 */
export const EXTRA_ALIASES = {
  'ingredients/prebiotics': ['inulin', '菊糖', '菊苣纖維', 'fos', 'gos', '果寡糖', '半乳寡糖'],
  'ingredients/lactoferrin': ['乳铁蛋白'],
  'ingredients/5-htp': ['htp', '5 htp', '5-羥色胺酸'],
  'ingredients/gaba': ['gamma aminobutyrate', 'gamma amino butyric acid', '珈瑪胺基丁酸'],
  'ingredients/l-carnitine': ['carnitine', '左旋肉鹼', '肉碱'],
  'ingredients/lions-mane': ['hericium mushroom', 'monkey head mushroom', '猴头菇'],
  'ingredients/chromium': ['chromium picolinate', '吡啶甲酸鉻', '鉻酵母'],
  'ingredients/colostrum': ['bovine colostrum', '牛初乳'],
  'ingredients/green-tea-extract': ['egcg', '兒茶素', '茶多酚'],
  'ingredients/soy-isoflavones': ['soy isoflavone', '大豆异黄酮'],
  'ingredients/l-theanine': ['theanine', '茶胺酸', '茶氨酸'],
  'ingredients/hmb': ['beta hydroxy beta methylbutyrate'],
  'ingredients/omega-3': ['epa', 'dha'],
  'ingredients/coenzyme-q10': ['coq10', 'ubiquinol', '輔酵素q10'],
  'ingredients/nmn': ['nicotinamide mononucleotide', 'nad'],
  'ingredients/nac': ['n acetylcysteine', 'acetylcysteine'],
  // 非 ingredients 的 collection 沒有 titleEn 欄位，英文縮寫只能靠這裡補。
  'articles/gerd-acid-reflux-guide': ['gerd'],
};

const CJK = '\\u3400-\\u9fff\\uf900-\\ufaff';
const CJK_RE = new RegExp(`[${CJK}]`);
/** titleEn 裡的括號／冒號／頓號分隔，用來拆出「Green Tea Extract」與「EGCG」這種並列名。 */
const NAME_SPLIT = /[()（）[\]:：,，/、;；]+/;

/** 壓平成比對鍵：小寫、只留英數與 CJK。 */
function collapse(s) {
  return String(s).toLowerCase().replace(new RegExp(`[^a-z0-9${CJK}]`, 'g'), '');
}

/** 切詞：英數與 CJK 之間強制斷開，其餘符號一律當分隔。 */
function tokenize(s) {
  return String(s).toLowerCase()
    .replace(new RegExp(`([a-z0-9])([${CJK}])`, 'g'), '$1 $2')
    .replace(new RegExp(`([${CJK}])([a-z0-9])`, 'g'), '$1 $2')
    .replace(new RegExp(`[^a-z0-9${CJK}]+`, 'g'), ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const isLatin = (t) => /^[a-z0-9]+$/.test(t);

/**
 * 查詢字串裡所有「連續英數詞」的 n-gram（壓平後）。
 * 「alpha lipoic acid 中文」→ alpha / alphalipoic / alphalipoicacid / lipoic / …
 * 用完整片語做等值比對（而非子字串包含），避免 iron ⊂ environment 這種誤判。
 */
export function latinPhrases(query, maxN = 6) {
  const toks = tokenize(query);
  const out = new Set();
  for (let i = 0; i < toks.length; i += 1) {
    if (!isLatin(toks[i])) continue;
    let buf = '';
    for (let j = i; j < toks.length && j < i + maxN; j += 1) {
      if (!isLatin(toks[j])) break;
      buf += toks[j];
      if (buf.length >= 3) out.add(buf);
    }
  }
  return out;
}

/**
 * 一頁的「名字」集合：slug、titleEn（整串與拆段）、英數 tag、別名表。
 * 回傳 { latin, cjk }：latin 走等值比對，cjk（只來自別名表）走「出現在查詢裡」。
 */
export function entryNames(entry) {
  const latin = new Set();
  const cjk = new Set();
  const add = (s, allowCjk) => {
    const c = collapse(s);
    if (c.length < 3) return;
    if (CJK_RE.test(c)) { if (allowCjk) cjk.add(c); return; }
    latin.add(c);
  };
  add(entry.slug, false);
  add(entry.titleEn, false);
  for (const seg of String(entry.titleEn || '').split(NAME_SPLIT)) add(seg, false);
  for (const t of entry.tags) add(t, false);
  for (const a of EXTRA_ALIASES[`${entry.type}/${entry.slug}`] ?? []) add(a, true);
  return { latin, cjk };
}

/**
 * 純函數：搜尋字詞是否已有對應內容頁。三條規則，任一成立即視為已覆蓋：
 * 1. 舊規則——query 以空白切詞，任一詞（長度≥2）出現在某頁 title 或 tags。
 * 2. 英文名／slug——query 的英數片語等於某頁的 slug、titleEn 段落或英數 tag
 *    （正規化掉連字號、空白、大小寫、所有格撇號）。
 * 3. 別名表——EXTRA_ALIASES 裡的中文別名出現在 query 中。
 */
export function queryHasExistingPage(query, index) {
  const terms = String(query).split(/\s+/).filter((t) => t.length >= 2);
  const phrases = latinPhrases(query);
  const collapsedQuery = collapse(query);
  if (terms.length === 0 && phrases.size === 0) return false;
  return index.some((entry) => {
    const hay = entry.title + ' ' + entry.tags.join(' ');
    if (terms.some((t) => hay.includes(t))) return true;
    const { latin, cjk } = entryNames(entry);
    for (const p of phrases) if (latin.has(p)) return true;
    for (const a of cjk) if (collapsedQuery.includes(a)) return true;
    return false;
  });
}

/** 不純：從 repo 讀出 content index（組裝層用）。 */
export function loadContentIndex(root = 'src/content') {
  const files = [];
  for (const type of CONTENT_TYPES) {
    let names = [];
    try { names = readdirSync(`${root}/${type}`); } catch { continue; }
    for (const name of names) {
      if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue;
      const slug = name.replace(/\.mdx?$/, '');
      const raw = readFileSync(`${root}/${type}/${name}`, 'utf8');
      files.push({ type, slug, raw });
    }
  }
  return parseContentIndex(files);
}
