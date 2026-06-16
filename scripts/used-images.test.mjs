import { describe, it, expect } from 'vitest';
import { collectIds } from './used-images.mjs';

describe('used-images collectIds', () => {
  it('抽出 unsplash / pexels 穩定識別（與 worker stockImageId 一致）', () => {
    const text = `
      coverImage: https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?ixid=x
      <img src="https://images.pexels.com/photos/3760069/pexels-photo.jpeg">
    `;
    const ids = [...collectIds(text)].sort();
    expect(ids).toEqual(['pexels:3760069', 'unsplash:1581235720704-06d3acfcb36f']);
  });

  it('重複出現只記一次、無圖庫圖回空集合', () => {
    const dup = 'a https://images.unsplash.com/photo-AAA b https://images.unsplash.com/photo-AAA';
    expect([...collectIds(dup)]).toEqual(['unsplash:AAA']);
    expect([...collectIds('沒有圖庫圖，只有 /covers/local.webp')]).toEqual([]);
  });
});
