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
  // 鐵則 7a 全文擴掃：作者假借「我觀察／我在臨床」自證經驗，是 AI 量產文最常見的第一人稱口氣。
  // 兩者原本只在正文第一句被 bannedOpeningPatterns 擋，實際卻大量出現在文中第 2、3 段；改為全文攔截。
  // 讀者/引述語氣的第一人稱（如 FAQ 問句「我發現…」、示範對醫師說「我最近有在吃…」）不在此列，故不掃 我發現／我最近。
  ['我觀察', /我觀察/g],
  ['我在臨床', /我在臨床/g],
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

// 模板化第一人稱開頭：YMYL 致命傷，命中一律「強制」擋下（exit 1），不受 warning/strict 模式影響。
// 偵測「正文第一句」是否以固定人設開場白起頭（見 docs/content-guide.md 鐵則 / CLAUDE.md 硬規則 7a）。
const bannedOpeningPatterns = [
  // 規則:正文第一句不得以第一人稱「我…」或固定人設/軼事開場白起頭，
  // 必須直接給具體價值（數據/主張/情境）。詳見 CLAUDE.md 硬規則 7a。
  /^我[^們]/,            // 任何以「我…」起頭的人設開場（我一直/我最近/我做/我有/我在/我觀察…）
  /^我$/,
  /^老實(講|說)/,
  /^朋友(最常|常)問我/,
  /^最近[，,]?\s*有讀者/, // 軼事型開場（最近有讀者傳訊息給我…）
];

// 取「正文」第一段文字（跳過 frontmatter、標題、圖片、HTML、引用、清單、表格）。
function firstBodyLine(text) {
  const lines = text.split(/\r?\n/);
  let fm = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t === '---') { fm += 1; continue; }
    if (fm < 2) continue;          // 仍在 frontmatter 內
    if (!t) continue;              // 空行
    if (/^(#|!\[|<|>|\||[-*]\s)/.test(t)) continue; // 標題/圖片/HTML/引用/表格/清單（- 或 * 後接空白）；不跳過 **粗體** 開頭段
    return { text: t, line: i + 1 };
  }
  return null;
}

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

  // 模板化開頭檢查（強制擋）
  const opening = firstBodyLine(text);
  if (opening && bannedOpeningPatterns.some((re) => re.test(opening.text))) {
    findings.push({
      file: relativeFile,
      line: opening.line,
      type: 'banned-opening',
      label: opening.text.slice(0, 12),
      message: `禁止的模板化第一人稱開頭「${opening.text.slice(0, 12)}…」，開頭第一句須直接給具體價值且每篇不同（CLAUDE.md 硬規則 7a）。`,
    });
  }

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
const bannedOpeningCount = findings.filter((item) => item.type === 'banned-opening').length;

console.log(`Content audit mode: ${strictMode ? 'strict mode' : 'warning mode'}`);
console.log(`Scanned files: ${files.length} (.mdx + .md)`);
console.log(`Total findings: ${findings.length}`);
console.log(`- Banned openings (BLOCKING): ${bannedOpeningCount}`);
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

// 強制擋下的類型：模板化開頭 + AI 感句型 + 模糊引用（全站已清零，2026-06-23 起鎖定防回歸）。
// raw-enum 仍為警告：多數命中其實是 references 的合法 `type:` schema 值與正文研究類型用詞。
const blockingCount = bannedOpeningCount + aiCount + vagueCount;
if (blockingCount > 0) {
  console.log(`\n❌ 偵測到 ${blockingCount} 處必須修正才能發布的問題（模板化開頭 ${bannedOpeningCount}／AI 感句型 ${aiCount}／模糊引用 ${vagueCount}）——一律擋下，不受 warning/strict 模式影響。`);
  console.log('   規範見 CLAUDE.md 硬規則 7a 與 docs/content-guide.md「鐵則」。');
  process.exitCode = 1;
} else if (strictMode && rawEnumCount > 0) {
  console.log('Strict mode enabled and raw-enum findings detected, setting exit code to 1.');
  process.exitCode = 1;
} else {
  console.log('✅ 無模板化開頭／AI 感句型／模糊引用。raw-enum 為警告（多為合法 schema 值），不擋 CI。');
}
