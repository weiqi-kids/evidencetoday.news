import { describe, it, expect } from 'vitest';
import { extForMime, imageUploadName, repoImagePath, publicImageUrl } from './image-upload';

describe('image-upload 檔名/路徑', () => {
  it('extForMime 對應常見圖片 MIME，未知退 png', () => {
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/svg+xml')).toBe('svg');
    expect(extForMime('application/octet-stream')).toBe('png');
  });
  it('imageUploadName 用 slug + 時間戳 + 副檔名，slug 清成小寫安全字元', () => {
    expect(imageUploadName('vitamin-c-myth', 'image/jpeg', 1700000000000)).toBe('vitamin-c-myth-1700000000000.jpg');
    expect(imageUploadName('A B/c', 'image/png', 1)).toBe('a-b-c-1.png');
    expect(imageUploadName('', 'image/png', 5)).toBe('image-5.png');
  });
  it('repoImagePath 與 publicImageUrl', () => {
    expect(repoImagePath('x-1.png')).toBe('public/images/x-1.png');
    expect(publicImageUrl('x-1.png')).toBe('/images/x-1.png');
  });
});
