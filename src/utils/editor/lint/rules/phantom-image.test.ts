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
  it('body 含 ./images/ 相對圖片 → error', () => {
    const r = phantomImageRule({ ...base, body: '![a](./images/1.png)' });
    expect(r).toHaveLength(1);
    expect(r[0].level).toBe('error');
    expect(r[0].message).toContain('./images/1.png');
  });
  it('body 含 ../images/ 相對圖片 → error', () => {
    const r = phantomImageRule({ ...base, body: '![a](../images/2.png)' });
    expect(r).toHaveLength(1);
    expect(r[0].level).toBe('error');
    expect(r[0].message).toContain('../images/2.png');
  });
  it('一般絕對網址圖片不報', () => {
    const r = phantomImageRule({ ...base, body: '![ok](https://example.com/a.png)' });
    expect(r).toEqual([]);
  });
  it('根路徑絕對引用 /images/ 不報（為實際可服務路徑，非 build import）', () => {
    const r = phantomImageRule({ ...base, body: '![a](/images/x.png)' });
    expect(r).toEqual([]);
  });
  it('含 images/ 子路徑的絕對網址不報', () => {
    const r = phantomImageRule({ ...base, body: '![a](https://cdn.com/images/a.png)' });
    expect(r).toEqual([]);
  });
});
