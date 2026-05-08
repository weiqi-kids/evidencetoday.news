import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FONT_DIR = new URL('../assets/fonts/', import.meta.url);

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

export async function loadFonts() {
  if (fontCache) return fontCache;

  const [regular, bold] = await Promise.all([
    readFile(fileURLToPath(new URL('NotoSansTC-Regular.ttf', FONT_DIR))),
    readFile(fileURLToPath(new URL('NotoSansTC-Bold.ttf', FONT_DIR))),
  ]);

  fontCache = {
    regular: regular.buffer as ArrayBuffer,
    bold: bold.buffer as ArrayBuffer,
  };

  return fontCache;
}
