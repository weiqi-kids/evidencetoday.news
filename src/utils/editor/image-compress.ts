// 瀏覽器端圖片壓縮：上傳前把圖縮到合理寬度並重新編碼（預設 WebP），
// 避免 AI 生成的大圖（gpt-image 約 3MB PNG）當封面拖慢網站。
// 純尺寸計算抽成 fitWidth 供單元測試；canvas 編碼僅瀏覽器可用。

export interface CompressOptions {
  maxWidth?: number; // 超過才等比縮小；預設 1280
  mime?: string; // 輸出格式；預設 image/webp
  quality?: number; // 0–1；預設 0.82
}

/** 等比縮放：寬度超過 maxWidth 才縮，否則原樣。回傳整數寬高。 */
export function fitWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth || width <= 0) return { width, height };
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

/**
 * 壓縮圖片 Blob。瀏覽器環境用 canvas 縮放 + 重新編碼。
 * 任何一步不支援或失敗，回傳原始 blob（不阻斷上傳）。
 */
export async function compressImage(blob: Blob, opts: CompressOptions = {}): Promise<Blob> {
  const { maxWidth = 1280, mime = 'image/webp', quality = 0.82 } = opts;
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = fitWidth(bitmap.width, bitmap.height, maxWidth);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
    // 壓完反而更大（少數情況）就用原圖
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}
