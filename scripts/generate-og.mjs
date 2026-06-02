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

// Hex approximations of src/styles/tokens.css. OG rendering runs through satori,
// which cannot consume the site's oklch tokens directly.
const COLOR_TOKENS = {
  paper: '#f7f7f2',
  paperWarm: '#fbfaf4',
  fog: '#e6ebeb',
  teal: '#1f6f72',
  navy: '#253445',
  ink: '#303136',
  coral: '#b95b3b',
  white: '#ffffff',
};

const BRAND = {
  name: '本日有據',
  latin: 'EVIDENCE TODAY',
  descriptor: '健康議題編輯平台',
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

function fitText(text = '', max = 24) {
  const normalized = cleanText(text);
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function splitTitle(title = '', template = 'content') {
  const max = template === 'section' ? 8 : template === 'home' ? 10 : template === 'static' ? 12 : 18;
  const cleaned = fitText(title, max);
  if (cleaned.length <= (template === 'content' ? 9 : 6)) return [cleaned];

  const preferredBreak = ['，', '：', ':', '？', '?', '｜', '—', '－', '-']
    .map((mark) => cleaned.indexOf(mark))
    .find((idx) => idx >= 4 && idx <= 10);
  const breakAt = preferredBreak || (template === 'content' ? Math.min(9, Math.ceil(cleaned.length / 2)) : Math.ceil(cleaned.length / 2));
  return [cleaned.slice(0, breakAt).replace(/[，：:？?｜—－-]$/, ''), cleaned.slice(breakAt).replace(/^[，：:？?｜—－-]/, '')].filter(Boolean);
}

function titleSize(lines, template) {
  const longest = Math.max(...lines.map((item) => item.length), 1);
  if (template === 'section') return longest <= 4 ? 132 : 112;
  if (template === 'home') return 116;
  if (template === 'static') return longest <= 4 ? 112 : 92;
  if (longest <= 5) return 98;
  if (longest <= 7) return 88;
  return 78;
}

function el(type, style, children) {
  return { type, props: { style, children } };
}

function text(children, style = {}) {
  return el('span', { display: 'flex', ...style }, children);
}

function heavyText(children, style = {}) {
  const size = Number.parseInt(String(style.fontSize || '80'), 10);
  const height = Math.ceil(size * Number(style.lineHeight || 1));
  const offsets = [
    ['0px', '0px'],
    ['1px', '0px'],
    ['0px', '1px'],
    ['1px', '1px'],
    ['-1px', '0px'],
    ['0px', '-1px'],
  ];
  return el('div', {
    display: 'flex',
    position: 'relative',
    height: `${height}px`,
    width: '100%',
  }, offsets.map(([left, top]) => text(children, {
    ...style,
    position: 'absolute',
    left,
    top,
  })));
}

function brandPanel(accent, template) {
  const isHome = template === 'home' || template === 'static';
  return el('div', {
    width: isHome ? '320px' : '275px',
    height: '100%',
    backgroundColor: COLOR_TOKENS.navy,
    borderRadius: '34px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    padding: '34px 26px',
  }, [
    el('div', {
      position: 'absolute',
      left: '-70px',
      top: '50px',
      color: 'rgba(255,255,255,0.12)',
      fontSize: isHome ? '196px' : '170px',
      fontFamily: 'Noto Sans TC Bold',
      fontWeight: 700,
      letterSpacing: '-0.09em',
      lineHeight: 1,
    }, 'ET'),
    el('div', { position: 'absolute', left: '0', bottom: '0', width: '100%', height: '18px', backgroundColor: accent }, ''),
    el('div', { display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }, [
      text(BRAND.name, {
        color: COLOR_TOKENS.white,
        fontSize: '38px',
        fontFamily: 'Noto Sans TC Bold',
        fontWeight: 700,
        letterSpacing: '0.04em',
        lineHeight: 1.1,
      }),
      text(BRAND.latin, {
        color: 'rgba(255,255,255,0.78)',
        fontSize: '22px',
        fontFamily: 'Noto Sans TC Bold',
        fontWeight: 700,
        letterSpacing: '0.12em',
        lineHeight: 1,
      }),
    ]),
    el('div', { display: 'flex', marginTop: 'auto', position: 'relative' }, [
      text(BRAND.descriptor, {
        color: 'rgba(255,255,255,0.9)',
        fontSize: '22px',
        fontFamily: 'Noto Sans TC Bold',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }),
    ]),
  ]);
}

function badgePill(label, accent) {
  return el('div', {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: accent,
    color: COLOR_TOKENS.white,
    borderRadius: '999px',
    padding: '14px 28px',
    fontSize: '34px',
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: '0.04em',
    lineHeight: 1,
  }, label);
}

function mainWordmark(accent) {
  return el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    color: COLOR_TOKENS.navy,
    fontSize: '30px',
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: '0.04em',
  }, [
    el('div', { width: '18px', height: '18px', borderRadius: '999px', backgroundColor: accent }, ''),
    text(BRAND.name),
  ]);
}

async function renderOg({ template = 'content', badge, title, subtitle, color = COLOR_TOKENS.teal }) {
  const fonts = await ensureFonts();
  const titleLines = splitTitle(title, template);
  const fontSize = titleSize(titleLines, template);
  const showSubtitle = subtitle && cleanText(subtitle).length <= (template === 'content' ? 12 : 16);
  const isSection = template === 'section';
  const isHomeLike = template === 'home' || template === 'static';
  const mainMaxWidth = isSection ? '690px' : isHomeLike ? '640px' : '735px';

  const svg = await satori({
    type: 'div',
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        backgroundColor: COLOR_TOKENS.paper,
        padding: '42px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Noto Sans TC',
      },
      children: [
        el('div', { position: 'absolute', inset: '0', backgroundColor: COLOR_TOKENS.paperWarm }, ''),
        el('div', { position: 'absolute', right: '-78px', top: '-72px', width: '310px', height: '310px', borderRadius: '999px', backgroundColor: `${color}22` }, ''),
        el('div', { position: 'absolute', right: '64px', bottom: '56px', width: '132px', height: '132px', borderRadius: '999px', border: `18px solid ${color}2c` }, ''),
        el('div', { position: 'absolute', left: '404px', bottom: '38px', width: '616px', height: '9px', borderRadius: '999px', backgroundColor: COLOR_TOKENS.fog }, ''),
        el('div', { display: 'flex', width: '100%', height: '100%', gap: '34px', position: 'relative' }, [
          brandPanel(color, template),
          el('div', { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '12px 6px 8px 0' }, [
            el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '68px' }, [
              badgePill(badge, color),
              mainWordmark(color),
            ]),
            el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, maxWidth: mainMaxWidth, gap: isSection ? '8px' : '6px' }, [
              ...titleLines.map((part) => heavyText(part, {
                color: COLOR_TOKENS.ink,
                fontSize: `${fontSize}px`,
                fontFamily: 'Noto Sans TC Bold',
                fontWeight: 700,
                lineHeight: 0.98,
                letterSpacing: '-0.055em',
              })),
              ...(showSubtitle ? [text(fitText(subtitle, 12), {
                color: COLOR_TOKENS.navy,
                fontSize: isHomeLike ? '46px' : '38px',
                fontFamily: 'Noto Sans TC Bold',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                marginTop: '18px',
              })] : []),
            ]),
            el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px' }, [
              text('手機優先分享圖', { color: COLOR_TOKENS.navy, fontSize: '24px', fontFamily: 'Noto Sans TC Bold',
                fontWeight: 700, letterSpacing: '0.04em' }),
              text('evidencetoday.news', { color, fontSize: '28px', fontFamily: 'Noto Sans TC Bold',
                fontWeight: 700, letterSpacing: '0.02em' }),
            ]),
          ]),
        ]),
      ],
    },
  }, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Noto Sans TC', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans TC Bold', data: fonts.bold, weight: 700, style: 'normal' },
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
