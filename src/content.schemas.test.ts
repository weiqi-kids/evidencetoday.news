import { describe, it, expect } from 'vitest';
import { validateFrontmatter, schemas } from './content.schemas';

describe('validateFrontmatter（編輯器存檔 gate）', () => {
  it('六個集合 schema 都存在', () => {
    expect(Object.keys(schemas).sort()).toEqual(
      ['articles', 'ingredients', 'myths', 'news', 'podcasts', 'videos'].sort(),
    );
  });

  it('合法 articles frontmatter → ok', () => {
    const r = validateFrontmatter('articles', {
      title: '維他命 D 與骨質疏鬆',
      description: '一篇符合長度上限的描述',
      author: '編輯部',
      publishDate: '2026-06-16',
      updatedDate: '2026-06-16',
      tags: ['維他命D'],
      tldr: '重點摘要',
      readingTime: 5,
    });
    expect(r.ok).toBe(true);
  });

  it('缺必填欄位 → ok:false 並回欄位路徑', () => {
    const r = validateFrontmatter('articles', { description: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.path === 'title')).toBe(true);
  });

  it('description 超過上限 → 擋下', () => {
    const r = validateFrontmatter('articles', {
      title: 't', description: 'x'.repeat(200), author: 'a',
      publishDate: '2026-06-16', updatedDate: '2026-06-16', tags: [], tldr: 't', readingTime: 1,
    });
    expect(r.ok).toBe(false);
  });

  it('封面新欄位 coverAlt / coverImageCredit 可選 → 不擋', () => {
    const r = validateFrontmatter('ingredients', {
      title: 't', sortKey: 't', description: 'd',
      publishDate: '2026-06-16', updatedDate: '2026-06-16', tags: [],
      introduction: 'i', uses: [], references: [],
      coverImage: '/covers/x.webp', coverAlt: '示意圖', coverImageCredit: 'Photographer',
    });
    expect(r.ok).toBe(true);
  });

  it('未知集合 → 不擋（ok:true）', () => {
    expect(validateFrontmatter('unknown', { anything: 1 }).ok).toBe(true);
  });
});
