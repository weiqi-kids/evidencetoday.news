import { describe, it, expect } from 'vitest';
import { parse } from './mdx-doc';

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
