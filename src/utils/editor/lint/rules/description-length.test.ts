import { describe, it, expect } from 'vitest';
import { descriptionLengthRule } from './description-length';

const base = { collection: 'articles', body: '' };

describe('descriptionLengthRule', () => {
  it('缺 description → error', () => {
    const r = descriptionLengthRule({ ...base, frontmatter: {} });
    expect(r).toEqual([
      { level: 'error', field: 'description', message: '缺少 description，搜尋結果與社群分享會沒有摘要。', fix: '補上 50–160 字的描述。' },
    ]);
  });
  it('description 過短（<50）→ warn', () => {
    const r = descriptionLengthRule({ ...base, frontmatter: { description: '太短的描述。' } });
    expect(r[0].level).toBe('warn');
    expect(r[0].field).toBe('description');
  });
  it('長度適中（50–160）→ 無警告', () => {
    const desc = '一'.repeat(80);
    const r = descriptionLengthRule({ ...base, frontmatter: { description: desc } });
    expect(r).toEqual([]);
  });
  it('過長（>160）→ warn', () => {
    const desc = '一'.repeat(180);
    const r = descriptionLengthRule({ ...base, frontmatter: { description: desc } });
    expect(r[0].level).toBe('warn');
  });
});
