import { promises as fs } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { COLLECTION_SOCIAL, STATIC_SOCIAL, contentSocial, tagSocial, cleanText } from '../src/utils/social-meta.mjs';

const WIDTH = 1200;
const HEIGHT = 630;
const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, 'src/content');
const OUTPUT_ROOT = path.join(ROOT, 'public/og');

const COLOR_TOKENS = {
  paper: '#f7f7f5',
  neutral: '#e7ecec',
  teal: '#1f6f72',
  navy: '#103b44',
  brandText: '#0e2931',
  dimText: '#42616a',
};

const COLLECTIONS = Object.keys(COLLECTION_SOCIAL);
const FONT_DIR = path.join(ROOT, 'src/assets/fonts');
let fontsCache;

function stripExt(filename) {
  return filename.replace(/\.[^.]+$/, '');
}

function unquote(value = '') {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const pick = (key) => {
    const line = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return line ? unquote(line[1]) : undefined;
  };
  const tags = [];
  const inlineTags = pick('tags');
  if (inlineTags?.startsWith('[')) {
    tags.push(...inlineTags.replace(/[\[\]'"]/g, '').split(',').map((tag) => tag.trim()).filter(Boolean));
  } else {
    const block = fm.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (block) tags.push(...block[1].split('\n').map((line) => line.replace(/^\s*-\s*/, '').trim()).filter(Boolean));
  }
  return {
    title: pick('title'),
    titleDisplay: pick('titleDisplay'),
    titleEn: pick('titleEn'),
    description: pick('description'),
    summary: pick('summary'),
    subtitle: pick('subtitle'),
    intro: pick('intro'),
    ogTitle: pick('ogTitle'),
    ogDescription: pick('ogDescription'),
    ogShortTitle: pick('ogShortTitle'),
    socialTitle: pick('socialTitle'),
    socialDescription: pick('socialDescription'),
    episodeNumber: Number(pick('episodeNumber')) || undefined,
    draft: pick('draft') === 'true',
    tags,
  };
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

function fitText(text = '', max = 22) {
  const normalized = cleanText(text);
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function splitTitle(title = '') {
  const cleaned = fitText(title, 22);
  if (cleaned.length <= 12) return [cleaned];
  const breakAt = Math.min(12, Math.max(7, cleaned.indexOf('，') > 0 ? cleaned.indexOf('，') : 10));
  return [cleaned.slice(0, breakAt), cleaned.slice(breakAt)].filter(Boolean);
}

function line(text, style = {}) {
  return { type: 'span', props: { style: { display: 'flex', ...style }, children: text } };
}

async function renderOg({ template = 'content', badge, title, subtitle, color = COLOR_TOKENS.teal }) {
  const fonts = await ensureFonts();
  const titleLines = splitTitle(title);
  const showSubtitle = subtitle && cleanText(subtitle).length <= 14;
  const svg = await satori({
    type: 'div',
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        backgroundColor: COLOR_TOKENS.paper,
        padding: '54px 62px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Noto Sans TC',
      },
      children: [
        { type: 'div', props: { style: { position: 'absolute', top: '-115px', right: '-80px', width: '440px', height: '440px', borderRadius: '220px', backgroundColor: `${color}28` } } },
        { type: 'div', props: { style: { position: 'absolute', right: '100px', bottom: '74px', width: '210px', height: '210px', border: `22px solid ${color}22`, borderRadius: '999px' } } },
        { type: 'div', props: { style: { position: 'absolute', bottom: '-112px', left: '-36px', width: '480px', height: '270px', borderRadius: '46px', backgroundColor: 'rgba(16, 59, 68, 0.08)', transform: 'rotate(-12deg)' } } },
        { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }, children: [
          { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [
            { type: 'span', props: { style: { backgroundColor: color, color: '#fff', fontSize: template === 'home' ? '30px' : '28px', fontWeight: 700, padding: '10px 24px', borderRadius: '999px', letterSpacing: '0.02em' }, children: badge } },
            { type: 'span', props: { style: { color: COLOR_TOKENS.navy, fontSize: '24px', fontWeight: 700, letterSpacing: '0.02em' }, children: '本日有據' } },
          ] } },
          { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '370px', maxWidth: template === 'section' ? '760px' : '820px', gap: '12px' }, children: [
            ...titleLines.map((part) => line(part, { color: COLOR_TOKENS.brandText, fontSize: template === 'section' ? '92px' : '72px', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em' })),
            ...(showSubtitle ? [line(fitText(subtitle, 14), { color: COLOR_TOKENS.dimText, fontSize: '34px', fontWeight: 700, marginTop: '12px' })] : []),
          ] } },
          { type: 'div', props: { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: `2px solid ${COLOR_TOKENS.neutral}`, paddingTop: '20px' }, children: [
            { type: 'span', props: { style: { color: COLOR_TOKENS.navy, fontSize: '30px', fontWeight: 700 }, children: 'Evidence Today' } },
            { type: 'span', props: { style: { color, fontSize: '26px', fontWeight: 700 }, children: '健康議題編輯平台' } },
          ] } },
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

async function writeOg(relativePath, options) {
  const outPath = path.join(OUTPUT_ROOT, relativePath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const png = await renderOg(options);
  await fs.writeFile(outPath, png);
}

async function main() {
  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_ROOT, '.gitkeep'), '');
  let generated = 0;
  let skipped = 0;
  const tags = new Set();

  for (const page of Object.values(STATIC_SOCIAL)) {
    const rel = page.ogPath.replace(/^\/og\//, '');
    await writeOg(rel, { template: page.template, badge: page.ogBadge, title: page.ogTitle, subtitle: page.ogSubtitle, color: page.color });
    generated += 1;
  }

  for (const [key, cfg] of Object.entries(COLLECTION_SOCIAL)) {
    await writeOg(`${key}/index.png`, { template: 'section', badge: cfg.ogBadge, title: cfg.ogTitle, color: cfg.color });
    generated += 1;
  }

  for (const collection of COLLECTIONS) {
    const cfg = COLLECTION_SOCIAL[collection];
    const dir = path.join(CONTENT_ROOT, collection);
    try { await fs.access(dir); } catch { continue; }
    const files = await fs.readdir(dir);
    for (const file of files.filter((name) => /\.(md|mdx)$/.test(name))) {
      const slug = stripExt(file);
      const raw = await fs.readFile(path.join(dir, file), 'utf8');
      const fm = readFrontmatter(raw);
      if (!fm || fm.draft || !fm.title) { skipped += 1; continue; }
      fm.tags.forEach((tag) => tags.add(tag));
      const social = contentSocial(collection, fm, slug);
      await writeOg(`${collection}/${slug}.png`, {
        template: 'content',
        badge: social.ogBadge || cfg.badge,
        title: social.ogTitle,
        subtitle: social.ogSubtitle,
        color: cfg.color,
      });
      generated += 1;
    }
  }

  const tagIndex = tagSocial('主題標籤');
  await writeOg('tags/index.png', {
    template: 'section',
    badge: tagIndex.ogBadge,
    title: '主題標籤',
    color: tagIndex.color,
  });
  generated += 1;

  console.log('\nOG generation summary');
  console.log(`generated: ${generated}`);
  console.log(`skipped: ${skipped}`);
  console.log(`collections: ${COLLECTIONS.join(', ')}`);
  console.log(`tags: ${tags.size}`);
  console.log(`output: ${OUTPUT_ROOT}`);
}

main().catch((error) => {
  console.error('[og:generate] failed', error);
  process.exit(1);
});
