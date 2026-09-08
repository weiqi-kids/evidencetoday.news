import { describe, it, expect } from 'vitest';
import { parseContentIndex, queryHasExistingPage, latinPhrases, entryNames } from './content-index.mjs';

const FILES = [
  { type: 'articles', slug: 'melatonin-x', raw: '---\ntitle: 褪黑激素與睡眠\ntags: ["睡眠","褪黑激素"]\n---\n內文' },
  { type: 'myths', slug: 'lemon-detox', raw: '---\ntitle: 檸檬水排毒迷思\n---\n內文' },
  { type: 'ingredients', slug: 'alpha-lipoic-acid', raw: '---\ntitle: 硫辛酸\ntitleEn: "Alpha-Lipoic Acid"\ntags: ["硫辛酸"]\n---\n內文' },
  { type: 'ingredients', slug: 'lions-mane', raw: '---\ntitle: 猴頭菇菌絲體\ntitleEn: "Lion\'s Mane (Hericium erinaceus)"\ntags: ["猴頭菇"]\n---\n內文' },
  { type: 'ingredients', slug: 'green-tea-extract', raw: '---\ntitle: 綠茶萃取物\ntitleEn: "Green Tea Extract (EGCG)"\ntags: ["綠茶"]\n---\n內文' },
  { type: 'ingredients', slug: 'prebiotics', raw: '---\ntitle: 益生元\ntitleEn: "Prebiotics"\ntags: ["益生元"]\n---\n內文' },
];

describe('parseContentIndex', () => {
  it('解析 frontmatter title/titleEn/tags，缺欄位給空值', () => {
    const idx = parseContentIndex(FILES.slice(0, 2));
    expect(idx).toEqual([
      { type: 'articles', slug: 'melatonin-x', title: '褪黑激素與睡眠', titleEn: '', tags: ['睡眠', '褪黑激素'] },
      { type: 'myths', slug: 'lemon-detox', title: '檸檬水排毒迷思', titleEn: '', tags: [] },
    ]);
  });
});

describe('latinPhrases', () => {
  it('把英數詞切成連續 n-gram，忽略連字號與所有格', () => {
    expect([...latinPhrases('alpha lipoic acid 中文')]).toContain('alphalipoicacid');
    expect([...latinPhrases("lion's mane mushroom")]).toContain('lionsmane');
  });
  it('CJK 與英數相鄰會斷開', () => {
    expect([...latinPhrases('creatine中文')]).toContain('creatine');
  });
});

describe('entryNames', () => {
  it('slug、titleEn 整串與拆段、英數 tag 都成為比對名', () => {
    const [entry] = parseContentIndex([FILES[4]]);
    const { latin } = entryNames(entry);
    expect(latin.has('greenteaextract')).toBe(true);
    expect(latin.has('egcg')).toBe(true);
  });
});

describe('queryHasExistingPage', () => {
  const idx = parseContentIndex(FILES);
  it('查詢字詞命中既有 title/tag → true', () => {
    expect(queryHasExistingPage('褪黑激素 帶回台灣', idx)).toBe(true);
  });
  it('查詢字詞與任何頁無交集 → false', () => {
    expect(queryHasExistingPage('維生素D 缺乏', idx)).toBe(false);
  });
  it('英文成分名對得上 slug（正規化連字號／空白／大小寫）', () => {
    expect(queryHasExistingPage('alpha lipoic acid', idx)).toBe(true);
    expect(queryHasExistingPage('alpha lipoic acid 中文', idx)).toBe(true);
  });
  it('英文別名對得上中文標題頁（titleEn 括號內的並列名）', () => {
    expect(queryHasExistingPage("lion's mane 功效", idx)).toBe(true);
    expect(queryHasExistingPage('hericium erinaceus', idx)).toBe(true);
    expect(queryHasExistingPage('egcg功效', idx)).toBe(true);
  });
  it('別名表補上 frontmatter 推不出來的說法', () => {
    expect(queryHasExistingPage('inulin', idx)).toBe(true);
  });
  it('用片語等值比對，不會被子字串誤判（iron ⊄ environment）', () => {
    const ironIdx = parseContentIndex([
      { type: 'ingredients', slug: 'iron', raw: '---\ntitle: 鐵\ntitleEn: "Iron"\ntags: []\n---\n內文' },
    ]);
    expect(queryHasExistingPage('environment', ironIdx)).toBe(false);
    expect(queryHasExistingPage('iron supplement', ironIdx)).toBe(true);
  });
});
