import { describe, it, expect } from 'vitest';
import { phantomImageRule } from './phantom-image';

const base = { collection: 'articles', frontmatter: {} };

describe('phantomImageRule', () => {
  it('body 含相對 images/ 行內圖片 → error（會讓 build 失敗）', () => {
    const r = phantomImageRule({ ...base, body: '段落。\n\n![圖說](images/3.svg)\n\n下一段。' });
    expect(r).toHaveLength(1);
    expect(r[0].level).toBe('error');
    expect(r[0].message).toContain('images/3.svg');
  });
  it('多張幽靈圖各自回報', () => {
    const r = phantomImageRule({ ...base, body: '![a](images/1.png)\n![b](images/2.png)' });
    expect(r).toHaveLength(2);
  });
  it('一般絕對網址圖片不報', () => {
    const r = phantomImageRule({ ...base, body: '![ok](https://example.com/a.png)' });
    expect(r).toEqual([]);
  });
});
