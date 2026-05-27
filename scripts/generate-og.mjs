import { promises as fs } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, 'src/content');
const OUTPUT_ROOT = path.join(ROOT, 'public/og');

// 色碼需與 src/styles/tokens.css 的分類色同步維護。
const COLOR_TOKENS = {
  paper: '#f7f7f5',
  neutral: '#e7ecec',
  teal: '#1f6f72',
  navy: '#103b44',
  brandText: '#0e2931',
  dimText: '#42616a',
  article: '#2d8185',
  myth: '#b85a3a',
  ingredient: '#3a8a4a',
  podcast: '#6a5aad',
  video: '#8a7030',
  news: '#1f7c93',
};

const COLLECTIONS = [
  { key: 'articles', badge: '文章', color: COLOR_TOKENS.article },
  { key: 'myths', badge: '闢謠', color: COLOR_TOKENS.myth },
  { key: 'ingredients', badge: '成分解析', color: COLOR_TOKENS.ingredient },
  { key: 'podcasts', badge: 'Podcast', color: COLOR_TOKENS.podcast },
  { key: 'videos', badge: '短影音', color: COLOR_TOKENS.video },
  { key: 'news', badge: '趨勢', color: COLOR_TOKENS.news },
];

const FONT_DIR = path.join(ROOT, 'src/assets/fonts');
let fontsCache;

function stripExt(filename) {
  return filename.replace(/\.[^.]+$/, '');
}

function readFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const pick = (key) => {
    const line = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!line) return undefined;
    return line[1].trim().replace(/^['\"]|['\"]$/g, '');
  };
  return {
    title: pick('title'),
    draft: pick('draft') === 'true',
    publishDate: pick('publishDate'),
    updatedDate: pick('updatedDate'),
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function clampTitle(title) {
  if (title.length <= 52) return title;
  return `${title.slice(0, 51)}…`;
}

async function ensureFonts() {
  if (fontsCache) return fontsCache;
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, 'NotoSansTC-Regular-static.ttf')),
    fs.readFile(path.join(FONT_DIR, 'NotoSansTC-Bold-static.ttf')),
  ]);
  fontsCache = { regular, bold };
  return fontsCache;
}

async function renderOg({ title, badge, badgeColor, dateText }) {
  const fonts = await ensureFonts();
  const svg = await satori({
    type: 'div',
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: COLOR_TOKENS.paper,
        padding: '56px 64px',
        position: 'relative',
      },
      children: [
        { type: 'div', props: { style: { position: 'absolute', top: '-60px', right: '-90px', width: '360px', height: '360px', borderRadius: '180px', backgroundColor: 'rgba(31, 111, 114, 0.13)' } } },
        { type: 'div', props: { style: { position: 'absolute', bottom: '-120px', left: '-30px', width: '420px', height: '260px', borderRadius: '40px', backgroundColor: 'rgba(16, 59, 68, 0.1)', transform: 'rotate(-14deg)' } } },
        { type: 'div', props: { style: { display: 'flex' }, children: { type: 'span', props: { style: { backgroundColor: badgeColor, color: '#fff', fontSize: '30px', fontWeight: 700, padding: '10px 24px', borderRadius: '999px' }, children: badge } } } },
        { type: 'div', props: { style: { display: 'flex', color: COLOR_TOKENS.brandText, fontSize: '62px', fontWeight: 700, lineHeight: 1.25, maxHeight: '252px', overflow: 'hidden' }, children: clampTitle(title) } },
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${COLOR_TOKENS.neutral}`, paddingTop: '20px' }, children: [
          { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', color: COLOR_TOKENS.navy }, children: [
            { type: 'span', props: { style: { fontSize: '32px', fontWeight: 700 }, children: '本日有據 Evidence Today' } },
            { type: 'span', props: { style: { fontSize: '22px', color: COLOR_TOKENS.dimText }, children: '健康議題編輯平台' } },
          ] } },
          { type: 'span', props: { style: { fontSize: '24px', color: COLOR_TOKENS.dimText }, children: dateText || '' } },
        ] } },
      ],
    },
  }, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Noto Sans TC', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans TC', data: fonts.bold, weight: 700, style: 'normal' },
    ],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  let generated = 0;
  let skipped = 0;
  const generatedCollections = new Set();

  const indexPng = await renderOg({
    title: '本日有據：把健康議題，講得有根據。',
    badge: '首頁',
    badgeColor: COLOR_TOKENS.teal,
    dateText: formatDate(new Date().toISOString()),
  });
  await fs.writeFile(path.join(OUTPUT_ROOT, 'index.png'), indexPng);
  generated += 1;

  for (const cfg of COLLECTIONS) {
    const dir = path.join(CONTENT_ROOT, cfg.key);
    try {
      await fs.access(dir);
    } catch {
      continue;
    }
    const outDir = path.join(OUTPUT_ROOT, cfg.key);
    await fs.mkdir(outDir, { recursive: true });
    const files = await fs.readdir(dir);

    for (const file of files.filter((name) => /\.(md|mdx)$/.test(name))) {
      const slug = stripExt(file);
      const raw = await fs.readFile(path.join(dir, file), 'utf8');
      const fm = readFrontmatter(raw);
      if (!fm) {
        console.warn(`[skip] ${cfg.key}/${file}: missing frontmatter`);
        skipped += 1;
        continue;
      }
      if (fm.draft) {
        skipped += 1;
        continue;
      }
      if (!fm.title) {
        console.warn(`[skip] ${cfg.key}/${file}: missing title`);
        skipped += 1;
        continue;
      }
      try {
        const png = await renderOg({
          title: fm.title,
          badge: cfg.badge,
          badgeColor: cfg.color,
          dateText: formatDate(fm.updatedDate || fm.publishDate),
        });
        await fs.writeFile(path.join(outDir, `${slug}.png`), png);
        generated += 1;
        generatedCollections.add(cfg.key);
      } catch (error) {
        console.warn(`[skip] ${cfg.key}/${file}: failed to generate OG`, error);
        skipped += 1;
      }
    }
  }

  console.log('\nOG generation summary');
  console.log(`generated: ${generated}`);
  console.log(`skipped: ${skipped}`);
  console.log(`collections: ${[...generatedCollections].join(', ') || '(none)'}`);
  console.log(`output: ${OUTPUT_ROOT}`);
}

main().catch((error) => {
  console.error('[og:generate] failed', error);
  process.exit(1);
});
