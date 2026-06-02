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

function fitText(text = '', max = 48, suffix = '') {
  const normalized = cleanText(text);
  if (normalized.length <= max) return normalized;
  const punctuationCut = ['。', '；', '，', '：', ':', '？', '?', '｜', '—', '－', '-']
    .map((mark) => normalized.lastIndexOf(mark, max))
    .filter((idx) => idx >= Math.max(8, Math.floor(max * 0.52)))
    .sort((a, b) => b - a)[0];
  const base = punctuationCut ? normalized.slice(0, punctuationCut).trim() : normalized.slice(0, max).replace(/[，；、。:：？?｜|—－-]\S*$/, '').trim();
  return `${base || normalized.slice(0, max).trim()}${suffix}`;
}

function normalizedOgTitle(title = '', template = 'content') {
  const cleaned = cleanText(title)
    .replace(/^EP\s*\d+\s*[｜|:：-]\s*喜聞樂健\s*[｜|:：-]\s*/i, '')
    .replace(/^喜聞樂健\s*[｜|:：-]\s*/i, '')
    .replace(/^關於(.+?)，你所需要知道的/, '$1')
    .replace(/^關於(.+?)，你該知道的/, '$1')
    .replace(/^(.+?)完整指南[：:]/, '$1：')
    .replace(/你所需要知道的/g, '')
    .trim();

  if (template === 'section') return fitText(cleaned, 8);
  if (template === 'home') return cleaned;
  if (template === 'static') return fitText(cleaned, 16);
  if (cleaned.length <= 42) return cleaned;

  const phraseEnd = ['。', '；', '？', '?', '：', ':', '，', '｜', '—', '－', '-']
    .map((mark) => cleaned.indexOf(mark))
    .filter((idx) => idx >= 6 && idx <= 24)
    .sort((a, b) => a - b)[0];
  if (phraseEnd) return `${cleaned.slice(0, phraseEnd).replace(/[，；、。:：？?｜|—－-]+$/, '')}重點整理`;

  return fitText(cleaned, 34, '重點整理');
}

function splitBalancedChars(text, maxLines, maxPerLine) {
  const chars = Array.from(text);
  if (chars.length <= maxPerLine) return [text];
  const lines = [];
  let remaining = text;
  const breakMarks = ['。', '；', '，', '、', '：', ':', '？', '?', '｜', '—', '－', '-'];

  while (Array.from(remaining).length > maxPerLine && lines.length < maxLines - 1) {
    const current = Array.from(remaining);
    const target = Math.min(maxPerLine, Math.ceil(current.length / (maxLines - lines.length)));
    let breakAt = 0;
    for (let i = Math.min(maxPerLine, current.length - 1); i >= Math.max(5, target - 4); i -= 1) {
      if (breakMarks.includes(current[i])) { breakAt = i + 1; break; }
    }
    if (!breakAt) breakAt = Math.min(maxPerLine, Math.max(6, target));
    const line = current.slice(0, breakAt).join('').replace(/[，；、。:：？?｜|—－-]+$/, '').trim();
    if (line) lines.push(line);
    remaining = current.slice(breakAt).join('').replace(/^[，；、。:：？?｜|—－-]+/, '').trim();
  }
  if (remaining) lines.push(remaining);
  return lines.slice(0, maxLines);
}

function splitTitle(title = '', template = 'content') {
  const cleaned = normalizedOgTitle(title, template);
  if (template === 'home') return [cleaned];
  if (template === 'section') return splitBalancedChars(cleaned, 1, 8);
  if (template === 'static') return splitBalancedChars(cleaned, 2, 8);
  return splitBalancedChars(cleaned, 3, 13);
}

function titleSize(lines, template) {
  const longest = Math.max(...lines.map((item) => Array.from(item).length), 1);
  if (template === 'home') return 150;
  if (template === 'section') return longest <= 4 ? 148 : 126;
  if (template === 'static') return longest <= 4 ? 126 : 108;
  if (lines.length >= 3) return longest <= 11 ? 74 : 68;
  if (longest <= 6) return 106;
  if (longest <= 9) return 92;
  return 82;
}

function el(type, style, children) {
  const resolvedStyle = type === 'div' && !('display' in style) ? { display: 'flex', ...style } : style;
  return { type, props: { style: resolvedStyle, children } };
}

function text(children, style = {}) {
  return el('span', { display: 'flex', ...style }, children);
}

function strokedText(children, style = {}) {
  const size = Number.parseInt(String(style.fontSize || '80'), 10);
  const lineHeight = Number(style.lineHeight || 1);
  const height = Math.ceil(size * lineHeight);
  const offsets = [
    ['0px', '0px'], ['1px', '0px'], ['-1px', '0px'], ['0px', '1px'], ['0px', '-1px'],
    ['1px', '1px'], ['-1px', '1px'], ['1px', '-1px'], ['-1px', '-1px'],
  ];
  return el('div', {
    display: 'flex',
    position: 'relative',
    width: '100%',
    height: `${height}px`,
    justifyContent: 'center',
  }, offsets.map(([left, top]) => text(children, {
    ...style,
    position: 'absolute',
    left,
    top,
    width: '100%',
  })));
}

function brandMark(accent, variant = 'corner') {
  const isHome = variant === 'home';
  return el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: isHome ? '18px' : '12px',
    color: COLOR_TOKENS.navy,
    fontSize: isHome ? '42px' : '40px',
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: '0.04em',
    lineHeight: 1,
  }, [
    el('div', { width: isHome ? '24px' : '22px', height: isHome ? '24px' : '22px', borderRadius: '999px', backgroundColor: accent }, ''),
    text(BRAND.name),
  ]);
}

function latinMark(accent, size = 30) {
  return text('Evidence Today', {
    color: accent,
    fontSize: `${size}px`,
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: '0.03em',
    lineHeight: 1,
  });
}

function categoryPill(label, accent) {
  if (!label) return null;
  return el('div', {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLOR_TOKENS.paperWarm,
    color: accent,
    border: `3px solid ${accent}`,
    borderRadius: '999px',
    padding: '12px 24px',
    fontSize: '30px',
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: '0.04em',
    lineHeight: 1,
  }, label);
}

function titleStack(titleLines, template, color) {
  const fontSize = titleSize(titleLines, template);
  return el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: template === 'content' ? '8px' : '12px',
    width: '100%',
  }, titleLines.map((part) => strokedText(part, {
    color: COLOR_TOKENS.ink,
    fontSize: `${fontSize}px`,
    fontFamily: 'Noto Sans TC Bold',
    fontWeight: 700,
    letterSpacing: template === 'home' ? '0.06em' : '-0.035em',
    lineHeight: template === 'content' ? 1.04 : 1,
    textAlign: 'center',
    justifyContent: 'center',
  })));
}

function accentFrame(accent) {
  return [
    el('div', { position: 'absolute', inset: '28px', border: `5px solid ${COLOR_TOKENS.navy}`, borderRadius: '34px' }, ''),
    el('div', { position: 'absolute', left: '28px', top: '28px', width: '192px', height: '14px', backgroundColor: accent, borderTopLeftRadius: '30px' }, ''),
    el('div', { position: 'absolute', right: '28px', bottom: '28px', width: '192px', height: '14px', backgroundColor: accent, borderBottomRightRadius: '30px' }, ''),
  ];
}

async function renderOg({ template = 'content', badge, title, subtitle, color = COLOR_TOKENS.teal }) {
  const fonts = await ensureFonts();
  const titleLines = splitTitle(title, template);
  const cleanSubtitle = cleanText(subtitle || '');
  const showSubtitle = cleanSubtitle && cleanSubtitle.length <= (template === 'content' ? 18 : 20);
  const isHome = template === 'home';
  const isContent = template === 'content';

  const mainChildren = isHome
    ? [
        titleStack(titleLines, template, color),
        latinMark(color, 44),
      ]
    : [
        ...(isContent ? [categoryPill(badge, color)] : []),
        titleStack(titleLines, template, color),
        ...(showSubtitle ? [text(fitText(cleanSubtitle, 20), {
          color: COLOR_TOKENS.navy,
          fontSize: isContent ? '36px' : '40px',
          fontFamily: 'Noto Sans TC Bold',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          justifyContent: 'center',
          marginTop: isContent ? '4px' : '8px',
        })] : []),
      ];

  const svg = await satori({
    type: 'div',
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        backgroundColor: COLOR_TOKENS.paper,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Noto Sans TC',
      },
      children: [
        el('div', { position: 'absolute', inset: '0', backgroundColor: COLOR_TOKENS.paperWarm }, ''),
        el('div', { position: 'absolute', left: '28px', top: '28px', width: '1144px', height: '574px', borderRadius: '34px', backgroundColor: COLOR_TOKENS.white }, ''),
        ...accentFrame(color),
        el('div', { position: 'absolute', left: '76px', top: '72px' }, isHome ? brandMark(color, 'home') : brandMark(color)),
        !isHome ? el('div', { position: 'absolute', right: '76px', bottom: '68px' }, latinMark(color, 32)) : null,
        el('div', {
          position: 'absolute',
          left: isContent ? '96px' : '110px',
          right: isContent ? '96px' : '110px',
          top: isContent ? '146px' : '142px',
          bottom: isContent ? '122px' : '122px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isHome ? '30px' : isContent ? '22px' : '20px',
        }, mainChildren.filter(Boolean)),
      ].filter(Boolean),
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
