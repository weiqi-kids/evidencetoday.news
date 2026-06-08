import { describe, it, expect } from 'vitest';
import { parse, serialize } from './mdx-doc';

describe('parse', () => {
  it('拆出 frontmatter 物件與 body 字串', () => {
    const raw = `---\ntitle: 測試標題\ntags:\n- 一\n- 二\n---\n\n正文第一段。\n`;
    const result = parse(raw);
    expect(result.frontmatter).toEqual({ title: '測試標題', tags: ['一', '二'] });
    expect(result.body).toBe('正文第一段。\n');
  });

  it('沒有 frontmatter 時 frontmatter 為空物件、body 為原文', () => {
    const raw = `只有正文，沒有 frontmatter。\n`;
    const result = parse(raw);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('只有正文，沒有 frontmatter。\n');
  });
});

describe('serialize', () => {
  it('輸出 frontmatter 不加多餘引號、list 扁平縮排', () => {
    const out = serialize({
      frontmatter: { title: '測試標題', tags: ['一', '二'] },
      body: '正文第一段。\n',
    });
    expect(out).toBe(`---\ntitle: 測試標題\ntags:\n  - 一\n  - 二\n---\n\n正文第一段。\n`);
  });

  it('parse 後 serialize 再 parse 的資料不變（round-trip）', () => {
    const original = `---\ntitle: 來回測試\nevidenceLevel: 低\ntags:\n  - 甲\n  - 乙\n---\n\n內文。\n`;
    const once = parse(original);
    const round = parse(serialize(once));
    expect(round.frontmatter).toEqual(once.frontmatter);
    expect(round.body).toBe(once.body);
  });
});
