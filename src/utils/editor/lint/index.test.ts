import { describe, it, expect } from 'vitest';
import { lint } from './index';

describe('lint 聚合器', () => {
  it('內容完全正常時回傳空陣列', () => {
    const result = lint({
      collection: 'articles',
      frontmatter: { description: '這是一段長度適中、介於五十到一百六十字之間的描述，用來確保 SEO 摘要不會過短也不會被截斷，符合搜尋結果顯示需求。' },
      body: '正文沒有任何問題。\n',
    });
    expect(result).toEqual([]);
  });
});
