#!/usr/bin/env node
/**
 * pnpm audit:pmids — 全站 PMID 真偽比對（盤點用，恆 exit 0）。
 *
 * 比對每一筆 frontmatter references 的 PubMed 連結：
 *   ① 該 PMID 在 NCBI 是否存在
 *   ② 標題裡寫的第一作者，是否在該 PMID 的前三位作者裡
 *   ③ 標題裡寫的出版年，與 NCBI 的出版年差距是否超過一年
 *
 * 為什麼需要：2026-09-22 事實核對時抓到「虛構的作者與期刊套在真實 PMID 上」，
 * 隨後用這支比對全站 1,649 個 PMID，又抓出 8 筆指向完全無關論文的引用
 * （基因轉染研究被當成維生素轉運研究、養護機構物理治療被當成 VITAL 試驗），
 * 其中好幾筆的 PMID 只差 1——像是憑印象寫了一個相近的數字。
 * 這種錯**人工讀稿看不出來**：標題、作者、期刊都寫得像模像樣，只有點進連結才會發現。
 *
 * 限制（刻意保守，寧可漏報不要誤報）：
 *   - 只比對「姓 縮寫,」開頭的條目（如「Zhao Y, et al.」）。以論文題目或機構名開頭的條目不比作者。
 *   - 標題裡的年份若屬於資料期間（「2012-2021」「through 2040」「from 2000 to 2019」）不比年份。
 *   - NCBI 取不回的 PMID 不下結論（請求失敗 ≠ 不存在）。
 *
 * 報出來的每一筆都要人工確認後再改：用 esearch 以正確作者＋年份＋題目找出真正的 PMID，
 * 並檢查同一個錯誤 PMID 在檔案裡的每一處（frontmatter、正文連結、手寫參考文獻清單）。
 */
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

const rows = [];
for (const col of ['articles', 'myths', 'ingredients', 'news']) {
  for (const f of readdirSync(`src/content/${col}`).filter((x) => /\.mdx?$/.test(x))) {
    const t = readFileSync(`src/content/${col}/${f}`, 'utf8').replace(/\r\n/g, '\n');
    const m = t.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]); } catch { continue; }
    for (const r of fm.references || []) {
      const pm = String(r.url || '').match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
      if (pm) rows.push({ file: `${col}/${f}`, pmid: pm[1], title: String(r.title || '') });
    }
  }
}
const ids = [...new Set(rows.map((r) => r.pmid))];
const meta = {};
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  for (let tries = 0; tries < 5; tries++) {
    try {
      const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${chunk.join(',')}`);
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.result) throw new Error('no result');
      for (const id of chunk) meta[id] = j.result[id];
      break;
    } catch { await sleep(1500 * (tries + 1)); }
  }
  await sleep(700); // NCBI 未帶 API key 的限制是每秒 3 次
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ORG = /^(TFOS|GBD|US Preventive|WHO|NICE|ESPEN|EFSA|KDIGO|ADA|AHA|ACC|ESC|EAS|NAMS|USPSTF|Cochrane)\b/;
const res = { notExist: [], author: [], year: [] };
for (const row of rows) {
  const m = meta[row.pmid];
  if (!m) continue;
  if (m.error || !m.uid) { res.notExist.push(row); continue; }
  if (!ORG.test(row.title)) {
    const a = row.title.match(/^((?:van |de |von |du |le |la |da |di )?[A-Z][A-Za-z'\-]+(?: [A-Z][a-z]+)?)\s+[A-Z]{1,4}\b[,.( ]/);
    const real = (m.authors || []).map((x) => norm(String(x.name).replace(/\s+[A-Z]{1,4}$/, '')));
    // NCBI 偶爾把作者存成「A DM」這種縮寫格式，無法比對，跳過
    if (a && real.length && !real.slice(0, 3).every((r) => r.length <= 2)) {
      const wrote = norm(a[1]);
      if (!real.slice(0, 3).some((r) => r === wrote || r.startsWith(wrote) || wrote.startsWith(r)))
        res.author.push({ ...row, wrote: a[1], real: (m.authors || []).slice(0, 3).map((x) => x.name).join(', '), realTitle: m.title });
    }
  }
  // 標題裡的資料期間、推估年、研究團隊名稱都不是出版年
  const stripped = row.title
    .replace(/(19|20)\d{2}\s*[-–—~至到]\s*(19|20)\d{2}/g, '')
    .replace(/between\s+(19|20)\d{2}\s+and\s+(19|20)\d{2}/gi, '')
    .replace(/(from|since|through|to|until|by|in)\s+(19|20)\d{2}/gi, '')
    .replace(/\bGBD\s+(19|20)\d{2}/g, '');
  const y = stripped.match(/\b(19|20)\d{2}\b/);
  const yr = String(m.pubdate || '').slice(0, 4);
  if (y && yr && Math.abs(+y[0] - +yr) > 1) res.year.push({ ...row, wrote: y[0], real: yr, realTitle: m.title });
}

console.log(`references 裡的 PubMed 連結 ${rows.length} 筆、不重複 PMID ${ids.length} 個，NCBI 取回 ${Object.keys(meta).filter((k) => meta[k]).length} 個`);
console.log(`\n① PMID 不存在：${res.notExist.length}`);
for (const r of res.notExist) console.log(`  ${r.file}  PMID ${r.pmid} ｜ ${r.title.slice(0, 80)}`);
console.log(`\n② 寫的第一作者不在該 PMID 的前三位作者裡：${res.author.length}`);
for (const r of res.author) console.log(`  ${r.file}  PMID ${r.pmid}\n     寫：${r.title.slice(0, 90)}\n     實：${r.real}｜${String(r.realTitle).slice(0, 70)}`);
console.log(`\n③ 出版年差距超過一年：${res.year.length}`);
for (const r of res.year) console.log(`  ${r.file}  PMID ${r.pmid}  寫 ${r.wrote}／實 ${r.real} ｜ ${String(r.realTitle).slice(0, 60)}`);
