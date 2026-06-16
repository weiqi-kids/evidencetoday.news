import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs plugin 無型別宣告，執行期 import 即可
import rehypeStockFigure, { stockCreditHref, toFigure } from './rehype-stock-figure.mjs';

const img = (properties: Record<string, unknown>) => ({ type: 'element', tagName: 'img', properties, children: [] });
const p = (...children: unknown[]) => ({ type: 'element', tagName: 'p', properties: {}, children });
const text = (value: string) => ({ type: 'text', value });

describe('stockCreditHref（連結把關：只認真實圖庫網域）', () => {
  it('接受 Unsplash 攝影師頁', () => {
    expect(stockCreditHref('https://unsplash.com/@markus')).toBe('https://unsplash.com/@markus');
  });
  it('接受 Pexels 攝影師頁（含子網域）', () => {
    expect(stockCreditHref('https://www.pexels.com/@cat')).toBe('https://www.pexels.com/@cat');
  });
  it('擋掉非圖庫網域（防編造/釣魚連結）', () => {
    expect(stockCreditHref('https://evil.example.com/@markus')).toBeNull();
    expect(stockCreditHref('https://unsplash.com.evil.com/x')).toBeNull();
  });
  it('擋掉非 http(s) 與非法 URL', () => {
    expect(stockCreditHref('javascript:alert(1)')).toBeNull();
    expect(stockCreditHref('不是網址')).toBeNull();
    expect(stockCreditHref('')).toBeNull();
    expect(stockCreditHref(undefined)).toBeNull();
  });
});

describe('toFigure', () => {
  it('帶圖庫攝影連結的 <p><img> → <figure> + 可點 figcaption', () => {
    const node = p(img({ src: 'https://images.unsplash.com/photo-1', alt: 'Markus Winkler', title: 'https://unsplash.com/@markus' }));
    const fig = toFigure(node);
    expect(fig.tagName).toBe('figure');
    expect(fig.properties.className).toContain('et-figure');
    const [figImg, figcap] = fig.children;
    expect(figImg.tagName).toBe('img');
    expect(figImg.properties.loading).toBe('lazy');
    expect(figImg.properties.title).toBeUndefined(); // title 已轉成連結、從 img 移除
    expect(figcap.tagName).toBe('figcaption');
    const a = figcap.children.find((c: { tagName?: string }) => c.tagName === 'a');
    expect(a.properties.href).toBe('https://unsplash.com/@markus');
    expect(a.properties.rel).toContain('nofollow');
    expect(a.children[0].value).toBe('Markus Winkler');
    expect(figcap.children[0].value).toBe('攝影：');
  });

  it('沒有圖庫連結 title 的圖 → 不轉（維持原樣）', () => {
    expect(toFigure(p(img({ src: '/images/x.webp', alt: '' })))).toBeNull();
    expect(toFigure(p(img({ src: '/images/x.webp', alt: 'desc', title: 'https://evil.com/x' })))).toBeNull();
  });

  it('段落含圖以外的內容 → 不轉', () => {
    expect(toFigure(p(text('看這張'), img({ src: 'x', title: 'https://unsplash.com/@a' })))).toBeNull();
  });

  it('忽略圖片前後的空白文字節點', () => {
    const node = p(text('\n'), img({ src: 'x', alt: 'A', title: 'https://unsplash.com/@a' }), text('\n'));
    expect(toFigure(node)?.tagName).toBe('figure');
  });
});

describe('plugin walk', () => {
  it('就地替換樹中符合的段落', () => {
    const tree = {
      type: 'root',
      children: [
        p(text('前言')),
        p(img({ src: 'https://images.unsplash.com/p', alt: 'Ann', title: 'https://unsplash.com/@ann' })),
      ],
    };
    rehypeStockFigure()(tree);
    expect(tree.children[0].tagName).toBe('p');
    expect(tree.children[1].tagName).toBe('figure');
  });
});
