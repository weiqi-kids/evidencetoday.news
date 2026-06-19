/**
 * News 內容品質 gate（發布趨勢新聞前的確定性把關）
 *
 * 規則：每篇非 draft 的 news 必須具備「可點的來源連結」，滿足以下任一即通過——
 *   1. 結構化 references 至少 1 筆含合法 http(s) url
 *   2. 有合法 http(s) 的 sourceUrl
 *   3. 有 pmid（前台會組成 PubMed 連結）
 *   4. sourcePending === true（刻意暫缺，需附 sourcePendingReason；放行但會提示）
 *
 * 另外：references 內任何「有填 url」者，url 必須是合法 http(s)。
 *
 * 背景與緣由見 docs/news-prompt-architecture.md「把關現況與已知缺口」。
 * 用法：pnpm check:news（CI deploy.yml 於 build 前執行）
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const NEWS_DIR = 'src/content/news';

function parseFrontmatter(raw, file) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${file}: 找不到 frontmatter`);
  return yaml.load(m[1]) || {};
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && !/[\s【】]/.test(value);
  } catch {
    return false;
  }
}

const files = readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md') || f.endsWith('.mdx')).sort();
const errors = [];
const warnings = [];
let checked = 0;

for (const file of files) {
  const full = path.join(NEWS_DIR, file);
  let fm;
  try {
    fm = parseFrontmatter(readFileSync(full, 'utf8'), file);
  } catch (e) {
    errors.push(e.message);
    continue;
  }

  if (fm.draft === true) continue; // draft 不發布，跳過
  checked += 1;

  const refs = Array.isArray(fm.references) ? fm.references : [];

  // references 內凡有填 url 者，url 必須合法
  refs.forEach((r, i) => {
    if (r && r.url != null && !isHttpUrl(r.url)) {
      errors.push(`${file}: references[${i}] 的 url 非合法 http(s)：${JSON.stringify(r.url)}`);
    }
  });

  const hasStructRefUrl = refs.some((r) => r && isHttpUrl(r.url));
  const hasSourceUrl = isHttpUrl(fm.sourceUrl);
  const hasPmid = fm.pmid != null && String(fm.pmid).trim() !== '';
  const sourcePending = fm.sourcePending === true;

  if (hasStructRefUrl || hasSourceUrl || hasPmid) continue; // 通過

  if (sourcePending) {
    // 刻意暫缺：放行但要求說明理由
    if (!fm.sourcePendingReason || String(fm.sourcePendingReason).trim() === '') {
      errors.push(`${file}: sourcePending=true 但缺 sourcePendingReason`);
    } else {
      warnings.push(`${file}: 來源連結暫缺（sourcePending）— ${fm.sourcePendingReason}`);
    }
    continue;
  }

  // 完全沒有可點來源連結 → 擋下
  errors.push(
    `${file}: 缺可點來源連結（需 references 含 url、或 sourceUrl、或 pmid；若刻意暫缺請設 sourcePending:true + sourcePendingReason）`,
  );
}

if (warnings.length > 0) {
  console.warn(`News quality check 提示：\n${warnings.map((w) => `- ${w}`).join('\n')}\n`);
}

if (errors.length > 0) {
  console.error(`News quality check failed（${errors.length} 項）：\n${errors.map((e) => `- ${e}`).join('\n')}`);
  process.exit(1);
}

console.log(`News quality check passed：${checked} 篇已發布 news 皆具可點來源連結（共掃 ${files.length} 檔）`);
