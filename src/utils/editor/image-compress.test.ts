import { describe, it, expect } from 'vitest';
import { fitWidth, compressImage } from './image-compress';

describe('fitWidth', () => {
  it('寬度超過上限 → 等比縮小，高度取整', () => {
    expect(fitWidth(1536, 1024, 1280)).toEqual({ width: 1280, height: 853 });
  });
  it('寬度未超過上限 → 原樣不動', () => {
    expect(fitWidth(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWidth(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
  });
  it('異常寬度（0）→ 原樣', () => {
    expect(fitWidth(0, 0, 1280)).toEqual({ width: 0, height: 0 });
  });
});

describe('compressImage', () => {
  it('非瀏覽器環境（無 createImageBitmap）→ 回原 blob 不阻斷', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    expect(await compressImage(blob)).toBe(blob);
  });
});
