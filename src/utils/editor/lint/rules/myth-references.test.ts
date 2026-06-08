import { describe, it, expect } from 'vitest';
import { mythReferencesRule } from './myth-references';

describe('mythReferencesRule', () => {
  it('myths 且 references 少於 2 → error', () => {
    const r = mythReferencesRule({
      collection: 'myths',
      frontmatter: { references: [{ title: '只有一個', url: 'https://a.test' }] },
      body: '',
    });
    expect(r[0].level).toBe('error');
    expect(r[0].field).toBe('references');
  });
  it('myths 且 references >= 2 → 無警告', () => {
    const r = mythReferencesRule({
      collection: 'myths',
      frontmatter: { references: [{ title: 'a', url: 'https://a.test' }, { title: 'b', url: 'https://b.test' }] },
      body: '',
    });
    expect(r).toEqual([]);
  });
  it('非 myths collection 不適用此規則', () => {
    const r = mythReferencesRule({ collection: 'articles', frontmatter: {}, body: '' });
    expect(r).toEqual([]);
  });
});
