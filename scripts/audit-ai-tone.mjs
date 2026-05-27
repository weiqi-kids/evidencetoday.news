import { readdirSync, readFileSync, statSync, appendFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/content');
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const strictMode = process.env.CONTENT_AUDIT_STRICT === '1';

const aiPhrasePatterns = [
  ['不是…而是', /不是.+?而是/g],
  ['不只是…更是', /不只是.+?更是/g],
  ['換句話說', /換句話說/g],
  ['這件事值得說清楚', /這件事值得說清楚/g],
  ['真正的問題是', /真正的問題是/g],
  ['我一直覺得', /我一直覺得/g],
  ['老實講', /老實講/g],
  ['有人說', /有人說/g],
];

const vagueReferencePatterns = [
  '有研究指出',
  '某研究指出',
  '專家認為',
  '有文獻表示',
  '文獻回顧',
  '研究者觀點',
  '摘自臨床生化教學文獻',
  '研究顯示',
  '多項研究指出',
  '國外研究發現',
  '臨床研究指出',
  '學者認為',
];

const rawEnumPattern = /\b(meta-analysis|rct|observational|animal|in-vitro)\b/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      out.push(...walk(p));
      continue;
    }
    if (p.endsWith('.mdx') || p.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function warningMessage(type, label) {
  if (type === 'ai-phrase') {
    return `偵測到 AI 感句型「${label}」，建議人工檢查是否符合作者語氣。`;
  }
  if (type === 'vague-reference') {
    return `偵測到模糊引用「${label}」，建議人工檢查是否需要補來源或改成主編判讀。`;
  }
  return `偵測到 raw enum 字串「${label}」，建議人工檢查是否應轉為前台可讀文字。`;
}

function collectFindings(file) {
  const relativeFile = path.relative(process.cwd(), file);
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i];
    const lineNo = i + 1;

    for (const [label, pattern] of aiPhrasePatterns) {
      if (pattern.test(lineText)) {
        findings.push({
          file: relativeFile,
          line: lineNo,
          type: 'ai-phrase',
          label,
          message: warningMessage('ai-phrase', label),
        });
      }
      pattern.lastIndex = 0;
    }

    for (const label of vagueReferencePatterns) {
      if (lineText.includes(label)) {
        findings.push({
          file: relativeFile,
          line: lineNo,
          type: 'vague-reference',
          label,
          message: warningMessage('vague-reference', label),
        });
      }
    }

    const enumMatches = lineText.match(rawEnumPattern) || [];
    for (const label of enumMatches) {
      findings.push({
        file: relativeFile,
        line: lineNo,
        type: 'raw-enum',
        label,
        message: warningMessage('raw-enum', label),
      });
    }
  }

  return findings;
}

function emitGitHubWarnings(findings) {
  if (!isGitHubActions) return;

  for (const finding of findings) {
    if (finding.line) {
      console.log(`::warning file=${finding.file},line=${finding.line}::${finding.message}`);
    } else {
      console.log(`::warning file=${finding.file}::${finding.message}`);
    }
  }
}

function writeStepSummary(findings) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const aiCount = findings.filter((item) => item.type === 'ai-phrase').length;
  const vagueCount = findings.filter((item) => item.type === 'vague-reference').length;
  const rawEnumCount = findings.filter((item) => item.type === 'raw-enum').length;

  let markdown = '# Content audit summary\n\n';
  markdown += `- Total findings: ${findings.length}\n`;
  markdown += `- AI phrase warnings: ${aiCount}\n`;
  markdown += `- Vague reference warnings: ${vagueCount}\n`;
  markdown += `- Raw enum warnings: ${rawEnumCount}\n\n`;

  if (findings.length === 0) {
    markdown += '✅ No content audit warnings found.\n';
  } else {
    markdown += '| File | Line | Type | Message |\n';
    markdown += '|---|---:|---|---|\n';
    for (const finding of findings) {
      markdown += `| ${finding.file} | ${finding.line ?? '-'} | ${finding.type} | ${finding.message} |\n`;
    }
  }

  appendFileSync(summaryPath, `${markdown}\n`);
}

const files = walk(root);
const findings = files.flatMap((file) => collectFindings(file));

const aiCount = findings.filter((item) => item.type === 'ai-phrase').length;
const vagueCount = findings.filter((item) => item.type === 'vague-reference').length;
const rawEnumCount = findings.filter((item) => item.type === 'raw-enum').length;

console.log(`Content audit mode: ${strictMode ? 'strict mode' : 'warning mode'}`);
console.log(`Scanned files: ${files.length} (.mdx + .md)`);
console.log(`Total findings: ${findings.length}`);
console.log(`- AI phrase warnings: ${aiCount}`);
console.log(`- Vague reference warnings: ${vagueCount}`);
console.log(`- Raw enum warnings: ${rawEnumCount}`);

if (findings.length > 0) {
  console.log('\nFindings:');
  for (const finding of findings) {
    console.log(`- [${finding.type}] ${finding.file}:${finding.line} ${finding.message}`);
  }
} else {
  console.log('✅ No content audit warnings found.');
}

emitGitHubWarnings(findings);
writeStepSummary(findings);

if (strictMode && findings.length > 0) {
  console.log('Strict mode enabled and findings detected, setting exit code to 1.');
  process.exitCode = 1;
} else {
  console.log('Warning mode behavior: findings do not block CI.');
}
