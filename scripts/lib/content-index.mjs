import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { CONTENT_TYPES } from './insight-constants.mjs';

/**
 * 純函數：把 [{type,slug,raw}] 解析成 [{type,slug,title,tags}]。
 * raw 為檔案內容（含 YAML frontmatter）。
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
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    };
  });
}

/**
 * 純函數：搜尋字詞是否已有對應內容頁。
 * 規則：query 以空白切詞，任一詞（長度≥2）出現在某頁 title 或 tags → 視為已覆蓋。
 */
export function queryHasExistingPage(query, index) {
  const terms = String(query).split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return false;
  return index.some((entry) => {
    const hay = entry.title + ' ' + entry.tags.join(' ');
    return terms.some((t) => hay.includes(t));
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
