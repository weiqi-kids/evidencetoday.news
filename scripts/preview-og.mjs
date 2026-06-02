import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OG_ROOT = path.join(ROOT, 'public/og');
const PREVIEW_ROOT = path.join(ROOT, 'public/og-preview');
const VIEWPORTS = [
  { key: 'mobile', label: '手機 LINE 小縮圖', width: 240 },
  { key: 'tablet', label: '平板中圖', width: 480 },
  { key: 'desktop', label: '桌機大圖', width: 720 },
];
const DEFAULT_TARGETS = [
  'index.png',
  'videos/index.png',
  'ingredients/index.png',
  'news/index.png',
  'podcasts/index.png',
  'videos/blanch-spinach-oxalate.png',
  'ingredients/collagen.png',
  'podcasts/ep01.png',
];

function normalizeTargets(args) {
  return (args.length ? args : DEFAULT_TARGETS)
    .map((item) => item.replace(/^\/og\//, '').replace(/^public\/og\//, '').replace(/^\/+/, ''))
    .filter((item) => item.endsWith('.png'));
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function createPreview(targets) {
  await fs.rm(PREVIEW_ROOT, { recursive: true, force: true });
  await fs.mkdir(PREVIEW_ROOT, { recursive: true });

  const cards = [];
  for (const target of targets) {
    const source = path.join(OG_ROOT, target);
    if (!(await exists(source))) {
      console.warn(`[og:preview] missing ${target}; run pnpm run og:generate first or pass an existing OG path.`);
      continue;
    }

    const id = target.replace(/\//g, '__').replace(/\.png$/, '');
    const originalOut = `${id}__original.png`;
    await fs.copyFile(source, path.join(PREVIEW_ROOT, originalOut));

    const variants = [];
    for (const viewport of VIEWPORTS) {
      const output = `${id}__${viewport.key}.png`;
      await sharp(source)
        .resize({ width: viewport.width })
        .png()
        .toFile(path.join(PREVIEW_ROOT, output));
      variants.push({ ...viewport, output });
    }
    cards.push({ target, originalOut, variants });
  }

  const html = `<!doctype html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>本日有據 OG 縮圖預覽</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif; background: #f7f7f2; color: #303136; }
    body { margin: 0; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .note { margin: 0 0 28px; color: #526168; line-height: 1.7; }
    .card { margin: 0 0 34px; padding: 24px; border: 1px solid #dce3e3; border-radius: 24px; background: #fff; }
    .path { margin: 0 0 18px; font-weight: 800; color: #253445; }
    .grid { display: grid; grid-template-columns: minmax(280px, 1fr); gap: 20px; }
    .sizes { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 20px; }
    figure { margin: 0; }
    figcaption { margin-bottom: 8px; font-size: 14px; font-weight: 800; color: #1f6f72; }
    img { display: block; max-width: 100%; height: auto; border: 1px solid #e6ebeb; background: #f7f7f2; }
    .original img { width: min(100%, 720px); }
  </style>
</head>
<body>
  <h1>本日有據 OG 縮圖預覽</h1>
  <p class="note">用來檢查 1200×630 原圖，以及手機、平板、桌機分享預覽尺寸。手機縮圖應優先確認主字、品牌識別與內容類型是否一眼可辨。</p>
  ${cards.map((card) => `<section class="card">
    <p class="path">/og/${escapeHtml(card.target)}</p>
    <div class="grid">
      <figure class="original"><figcaption>原始 1200×630</figcaption><img src="./${card.originalOut}" alt="${escapeHtml(card.target)} 原始 OG"></figure>
      <div class="sizes">
        ${card.variants.map((variant) => `<figure><figcaption>${variant.label}（${variant.width}px）</figcaption><img src="./${variant.output}" width="${variant.width}" alt="${escapeHtml(card.target)} ${variant.label}"></figure>`).join('')}
      </div>
    </div>
  </section>`).join('\n')}
</body>
</html>`;

  await fs.writeFile(path.join(PREVIEW_ROOT, 'index.html'), html);
  console.log(`[og:preview] wrote ${path.relative(ROOT, path.join(PREVIEW_ROOT, 'index.html'))}`);
}

createPreview(normalizeTargets(process.argv.slice(2))).catch((error) => {
  console.error('[og:preview] failed', error);
  process.exit(1);
});
