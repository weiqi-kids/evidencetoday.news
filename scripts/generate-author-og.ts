/**
 * 一次性生成作者頁專屬 OG 圖（文字卡，無人臉）。
 * 用法：npx tsx scripts/generate-author-og.ts
 * 產出：public/og-static/author-luo-yang.png（1200x630），需 commit 入 git（og-static 慣例）。
 *
 * 為何是獨立一次性腳本：/og-static 的分類圖原為手動上傳，repo 內無常駐 OG 生成器；
 * 此腳本僅在作者卡文案/版面變更時手動重跑，不掛進 build。
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAuthorOgSvg } from '../src/utils/og-template.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'og-static', 'author-luo-yang.png');

const svg = await generateAuthorOgSvg({
  name: '羅揚',
  subtitle: '本日有據主編',
  badge: '作者',
  tagline: '拆解保健成分與行銷話術',
});

const png = await sharp(Buffer.from(svg)).resize(1200, 630).png().toBuffer();
writeFileSync(outPath, png);
console.log(`Created ${outPath} (${png.length} bytes, 1200x630)`);
