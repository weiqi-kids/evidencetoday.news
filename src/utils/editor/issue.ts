// 與 src/utils/editor/github.ts 的 OWNER/REPO 保持一致
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

export type IssueBrief = {
  collection: string;
  title: string;
  slug: string;
  direction?: string;
  sources?: string;
  conclusion?: string;
};

export function buildIssueBody(b: IssueBrief): string {
  const or = (v?: string) => (v && v.trim() ? v.trim() : '未指定');
  return `## 文章寫作工單

- 分類（collection）: ${b.collection}
- 標題: ${b.title}
- 目標檔案: \`src/content/${b.collection}/${b.slug}.mdx\`
- 網址: \`/${b.collection}/${b.slug}/\`

### 寫作方向
${or(b.direction)}

### 參考資料源
${or(b.sources)}

### 想表達的結論
${or(b.conclusion)}

---
### 給寫作者（Claude Code）
- 依 \`src/content.config.ts\` 的 \`${b.collection}\` schema 填 frontmatter（必填欄位、\`description\` 字數上限）。
- 內容結構與風格參考既有 \`${b.collection}\` 文章與 \`docs/playbooks/article-layout.md\`。
- 健康資訊須有可信來源；\`references\` 用真實連結，**禁止杜撰**。
- 寫到目標檔案後以 **PR** 回傳（不要直接 push main）。
`;
}

export async function createArticleIssue(args: IssueBrief & { token: string }): Promise<{ number: number; url: string }> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: `[文章] ${args.title}`,
      body: buildIssueBody(args),
      labels: ['article-draft'],
    }),
  });
  if (!res.ok) throw new Error(`建立 Issue 失敗（${res.status}）。請確認已登入管理者帳號後重試。`);
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, url: data.html_url };
}
