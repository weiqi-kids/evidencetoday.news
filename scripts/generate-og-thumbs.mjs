// 從 public/og-static/{category}.png 產生壓縮縮圖到 public/og-thumb/{category}.webp，
// 供「無封面內容卡」的分類 fallback 用（見 ArticleCard / IngredientCard）。
//
// og-static 原圖是 1200×630、~1MB，直接當卡片縮圖會吃掉字型子集化省下的效能；
// 這裡壓成 640px 寬的 webp（~20–40KB），體積約原圖的 3%。
//
// og-thumb 產物會 commit 進 repo（小且穩定、衍生自已 commit 的 og-static），
// 因此 dev / build 都不依賴此腳本即時執行。og-static 更新後手動跑 `pnpm og:thumbs` 重生。

import { fileURLToPath } from 'node:url';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = path.join(root, 'public', 'og-static');
const outDir = path.join(root, 'public', 'og-thumb');

const THUMB_WIDTH = 640; // 卡片實際顯示 ~280–320px，640 覆蓋 retina
const WEBP_QUALITY = 72;

async function main() {
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((f) => f.endsWith('.png'));
  if (files.length === 0) {
    console.warn('[og-thumbs] 找不到 public/og-static/*.png，略過');
    return;
  }

  let total = 0;
  for (const file of files) {
    const name = path.basename(file, '.png');
    const src = path.join(srcDir, file);
    const out = path.join(outDir, `${name}.webp`);
    const info = await sharp(src)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(out);
    total += info.size;
    console.log(`[og-thumbs] ${name}.webp  ${(info.size / 1024).toFixed(1)}KB  ${info.width}×${info.height}`);
  }
  console.log(`[og-thumbs] 完成 ${files.length} 檔，合計 ${(total / 1024).toFixed(1)}KB → public/og-thumb/`);
}

main().catch((err) => {
  console.error('[og-thumbs] 失敗：', err);
  process.exit(1);
});
