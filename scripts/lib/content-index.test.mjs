import { describe, it, expect } from 'vitest';
import { parseContentIndex, queryHasExistingPage } from './content-index.mjs';

const FILES = [
  { type: 'articles', slug: 'melatonin-x', raw: '---\ntitle: 褪黑激素與睡眠\ntags: ["睡眠","褪黑激素"]\n---\n內文' },
  { type: 'myths', slug: 'lemon-detox', raw: '---\ntitle: 檸檬水排毒迷思\n---\n內文' },
];

describe('parseContentIndex', () => {
  it('解析 frontmatter title/tags，缺 tags 給空陣列', () => {
    const idx = parseContentIndex(FILES);
    expect(idx).toEqual([
      { type: 'articles', slug: 'melatonin-x', title: '褪黑激素與睡眠', tags: ['睡眠', '褪黑激素'] },
      { type: 'myths', slug: 'lemon-detox', title: '檸檬水排毒迷思', tags: [] },
    ]);
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
});
