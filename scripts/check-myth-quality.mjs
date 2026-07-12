import { readFileSync, readdirSync } from 'node:fs';

const MYTH_DIR = 'src/content/myths';
const EXPECTED_PUBLISHED_COUNT = 36;
const FORBIDDEN = [
  'TODO',
  'source needed',
  '來源待補',
  'references: 。',
  '【289截止**',
  '本篇判讀為',
  '證據強度為',
  '需依情境判讀',
  '有疾病、用藥、特殊性',
  '建議先看證據等級',
  '主編把關',
];
const REQUIRED_BODY_SECTIONS = [
  '30 秒快速結論',
  '坊間怎麼流傳，為什麼容易相信？',
  '科學證據怎麼看？',
  '白話辯證',
  '哪些人要特別小心？',
  'FAQ',
  'References',
  '健康資訊提醒',
];
const FORBIDDEN_BODY_SECTION_TITLES = [
  'AI 可引用答案',
  '迷思說法',
  '判斷結論',
  '先看懂這個詞',
  '一般人最安全做法',
  '正確做法',
  '建議做法',
  '什麼時候該尋求專業意見',
  '何時應詢問醫師、藥師或營養師',
  '什麼情況應該就醫',
  'When to seek professional advice',
];

function frontmatter(raw) {
  return raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
}

function body(raw) {
  return raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)?.[1]?.trim() || '';
}

function scalar(fm, key) {
  return fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()?.replace(/^"|"$/g, '') || '';
}

function boolValue(fm, key) {
  const value = scalar(fm, key);
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

function block(fm, key) {
  const lines = fm.split('\n');
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9_-]*:/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function referenceUrls(fm) {
  return [...block(fm, 'references').matchAll(/^\s*url:\s*"?([^"\n]+)"?/gm)].map((match) => match[1]);
}

function arrayItemCount(fm, key) {
  return (block(fm, key).match(/^\s*-\s+/gm) || []).length;
}

function evidenceItemCount(fm) {
  return (block(fm, 'evidenceSummary').match(/^\s*-\s*title:/gm) || []).length;
}

function faqCount(fm) {
  return (block(fm, 'faq').match(/^\s*-\s*question:/gm) || []).length;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !/[\s】【]/.test(value) && !value.includes('references:') && !value.includes('289截止');
  } catch {
    return false;
  }
}

function hasBodySection(bodyText, title) {
  return new RegExp(`^## ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(bodyText);
}

function bodySectionText(bodyText, title) {
  const lines = bodyText.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);
  if (start === -1) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function quickConclusionBodyItemCount(bodyText) {
  return (bodySectionText(bodyText, '30 秒快速結論').match(/^\s*-\s+/gm) || []).length;
}

function reasoningCardItemCount(bodyText, tone) {
  const match = bodyText.match(new RegExp(`<div class="myth-reasoning-card myth-reasoning-card--${tone}">([\\s\\S]*?)<\\/div>`));
  if (!match) return 0;
  return (match[1].match(/<li>/g) || []).length;
}


const files = readdirSync(MYTH_DIR).filter((file) => file.endsWith('.mdx')).map((file) => `${MYTH_DIR}/${file}`).sort();
const errors = [];
const published = [];
const slugs = new Map();

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const fm = frontmatter(raw);
  const bodyText = body(raw);
  const slug = scalar(fm, 'slug') || file.replace(/^.*\//, '').replace(/\.mdx$/, '');
  const status = scalar(fm, 'status') || 'published';
  const draft = boolValue(fm, 'draft') === true;
  const needsReview = boolValue(fm, 'needsEditorialReview') === true;
  const deleteCandidate = boolValue(fm, 'deleteCandidate') === true;
  const isPublished = status === 'published' && !draft;

  if (slugs.has(slug)) errors.push(`${file}: duplicate slug ${slug} (also ${slugs.get(slug)})`);
  slugs.set(slug, file);

  if (isPublished) {
    published.push(file);
    if (needsReview || deleteCandidate) errors.push(`${file}: published article cannot be marked needsEditorialReview/deleteCandidate`);
    for (const phrase of FORBIDDEN) {
      if (raw.includes(phrase)) errors.push(`${file}: contains forbidden phrase ${phrase}`);
    }
    if (raw.includes('under-review')) errors.push(`${file}: published content contains under-review`);
    for (const key of ['title', 'slug', 'verdict', 'evidenceLevel', 'cardConclusion']) {
      if (!scalar(fm, key)) errors.push(`${file}: missing ${key}`);
    }

    const quickCount = quickConclusionBodyItemCount(bodyText) || arrayItemCount(fm, 'thirtySecondConclusion') || arrayItemCount(fm, 'tldr');
    if (quickCount < 2) errors.push(`${file}: 30 秒快速結論 must have at least 2 bullet items`);
    for (const section of REQUIRED_BODY_SECTIONS) {
      if (!hasBodySection(bodyText, section)) errors.push(`${file}: missing body section ${section}`);
    }
    for (const section of FORBIDDEN_BODY_SECTION_TITLES) {
      if (hasBodySection(bodyText, section)) errors.push(`${file}: forbidden body section ${section}`);
    }

    const whyText = block(fm, 'whyItSpreads');
    if (!whyText.trim()) errors.push(`${file}: missing whyItSpreads`);
    if (/短影音簡化說法|產品廣告文案|親友群組轉傳|這個說法常在社群、親友群組或產品文案中流傳/.test(whyText)) {
      errors.push(`${file}: whyItSpreads appears templated`);
    }
    const evidenceCount = evidenceItemCount(fm);
    if (evidenceCount < 1) errors.push(`${file}: evidenceSummary must include at least 1 evidenceItem`);
    const whoCount = arrayItemCount(fm, 'whoShouldBeCareful');
    if (whoCount < 2) errors.push(`${file}: whoShouldBeCareful must have at least 2 items`);
    const reasoningText = block(fm, 'reasoningCards');
    if (!reasoningText.includes('tone: blue') || !reasoningText.includes('tone: red')) {
      errors.push(`${file}: reasoningCards must include blue and red cards`);
    }
    const blueCardItems = reasoningCardItemCount(bodyText, 'blue');
    const redCardItems = reasoningCardItemCount(bodyText, 'red');
    if (blueCardItems < 2 || redCardItems < 2) errors.push(`${file}: reasoningCards blue/red cards must each have at least 2 items`);
    const urls = referenceUrls(fm);
    if (urls.length < 2) errors.push(`${file}: published article must have at least 2 reference URLs`);
    urls.forEach((url) => {
      if (!validUrl(url)) errors.push(`${file}: invalid reference URL ${url}`);
    });
    if (faqCount(fm) < 1) errors.push(`${file}: published article must have FAQ items`);
    if (!bodyText.includes('本文為健康資訊與迷思查證，不提供個人診斷或治療建議。')) {
      errors.push(`${file}: missing standard health information reminder text`);
    }
  }
}

if (published.length !== EXPECTED_PUBLISHED_COUNT) {
  errors.push(`published myths count must be ${EXPECTED_PUBLISHED_COUNT}, got ${published.length}`);
}

if (errors.length > 0) {
  console.error(`Myth quality check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Myth quality check passed: ${published.length} published myths across ${files.length} files`);
