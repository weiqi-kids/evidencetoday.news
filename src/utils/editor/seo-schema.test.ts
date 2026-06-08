import { describe, it, expect } from 'vitest';
import { getSeoFields } from './seo-schema';

describe('getSeoFields', () => {
  it('myths 含 description 與 ogTitle 欄位描述', () => {
    const fields = getSeoFields('myths');
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('description');
    expect(keys).toContain('ogTitle');
    const desc = fields.find((f) => f.key === 'description')!;
    expect(desc.maxLength).toBe(160);
  });
  it('未知 collection 回傳通用欄位（至少含 description）', () => {
    const fields = getSeoFields('unknown');
    expect(fields.map((f) => f.key)).toContain('description');
  });
});
