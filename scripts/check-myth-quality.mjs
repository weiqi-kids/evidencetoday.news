import { readFileSync, readdirSync } from 'node:fs';

const MYTH_DIR = 'src/content/myths';
const EXPECTED_PUBLISHED_COUNT = 27;
const FORBIDDEN = [
  'TODO',
  'source needed',
  '來源待補',
  'references: 。',
  '【289截止**',
  '這個說法將複雜健康議題簡化成單一做法',
  '需依情境判讀',
  '先看證據等級再決定是否採用',
  '目前研究顯示可能有幫助',
  '主編把關',
];

function frontmatter(raw) {
  return raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
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

function validUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !/[\s】【]/.test(value) && !value.includes('references:') && !value.includes('289截止');
  } catch {
    return false;
  }
}

const files = readdirSync(MYTH_DIR).filter((file) => file.endsWith('.mdx')).map((file) => `${MYTH_DIR}/${file}`).sort();
const errors = [];
const published = [];
const slugs = new Map();

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const fm = frontmatter(raw);
  const title = scalar(fm, 'title');
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
    for (const key of ['title', 'mythClaim', 'verdict', 'evidenceLevel', 'cardConclusion']) {
      if (!scalar(fm, key)) errors.push(`${file}: missing ${key}`);
    }
    const urls = referenceUrls(fm);
    if (urls.length < 2) errors.push(`${file}: published article must have at least 2 reference URLs`);
    urls.forEach((url) => {
      if (!validUrl(url)) errors.push(`${file}: invalid reference URL ${url}`);
    });
    const faqCount = (block(fm, 'faq').match(/^\s*-\s*question:/gm) || []).length;
    if (faqCount < 3) errors.push(`${file}: published article must have at least 3 FAQ items`);
    if (!raw.includes('## References')) errors.push(`${file}: missing body References section`);
    if (!raw.includes('## 健康資訊提醒')) errors.push(`${file}: missing body health information reminder`);
    const body = raw.split('---').slice(2).join('---').trim();
    if (/^## AI 可引用答案\s*$/m.test(body) && body.length < 200) errors.push(`${file}: AI answer section appears empty`);
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
