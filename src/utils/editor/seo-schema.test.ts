import { describe, it, expect } from 'vitest';
import { getSeoFields } from './seo-schema';

describe('getSeoFields', () => {
  it('每個 collection 只列作者手寫的 title + description', () => {
    for (const c of ['articles', 'myths', 'ingredients', 'unknown']) {
      const keys = getSeoFields(c).map((f) => f.key);
      expect(keys).toEqual(['title', 'description']);
    }
  });

  it('title 必填、description 必填', () => {
    const [title, description] = getSeoFields('articles');
    expect(title.key).toBe('title');
    expect(title.required).toBe(true);
    expect(description.required).toBe(true);
  });

  it('不暴露任何自動衍生欄位（og*/social*）', () => {
    const keys = getSeoFields('myths').map((f) => f.key);
    expect(keys).not.toContain('ogTitle');
    expect(keys).not.toContain('ogImage');
    expect(keys).not.toContain('socialTitle');
  });

  it('description 上限對齊 schema：articles 155、myths 220', () => {
    expect(getSeoFields('articles')[1].maxLength).toBe(155);
    expect(getSeoFields('myths')[1].maxLength).toBe(220);
  });
});
