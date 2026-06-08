import { describe, it, expect } from 'vitest';
import { getSeoFields } from './seo-schema';

describe('getSeoFields', () => {
  it('所有 collection 第一個欄位都是必填的 title', () => {
    for (const c of ['articles', 'myths', 'ingredients', 'unknown']) {
      const fields = getSeoFields(c);
      expect(fields[0].key).toBe('title');
      expect(fields[0].required).toBe(true);
    }
  });

  it('articles 用 socialTitle/socialDescription，且沒有 og 欄位', () => {
    const keys = getSeoFields('articles').map((f) => f.key);
    expect(keys).toEqual(['title', 'description', 'socialTitle', 'socialDescription']);
    expect(keys).not.toContain('ogTitle');
    const desc = getSeoFields('articles').find((f) => f.key === 'description')!;
    expect(desc.maxLength).toBe(155);
  });

  it('myths 含 og 欄位，description 上限 220', () => {
    const keys = getSeoFields('myths').map((f) => f.key);
    expect(keys).toContain('ogTitle');
    expect(keys).toContain('ogDescription');
    expect(keys).toContain('socialTitle');
    const desc = getSeoFields('myths').find((f) => f.key === 'description')!;
    expect(desc.maxLength).toBe(220);
  });

  it('未知 collection 回傳通用欄位（含 title 與 description）', () => {
    const keys = getSeoFields('unknown').map((f) => f.key);
    expect(keys).toContain('title');
    expect(keys).toContain('description');
  });
});
