export const ARTICLE_QUERY_PATTERN_LABELS = {
  'ingredient-explainer': '成分解析',
  'myth-check': '迷思查證',
  'taiwan-regulation-market': '臺灣法規',
  'audience-stage-guide': '熟齡族群',
  comparison: '成分比較',
  // 2026-07-28 新增：讀者手上已有一個具體待決事項（要不要檢查／要不要用藥／先改哪一項），
  // 全篇圍繞該決定的判斷順序展開。見 docs/playbooks/winning-article-formula.md 六基因。
  'decision-guide': '判讀決策',
} as const;

export type ArticleQueryPattern = keyof typeof ARTICLE_QUERY_PATTERN_LABELS;

export function getArticleQueryPatternLabel(queryPattern?: string): string | undefined {
  if (!queryPattern) return undefined;
  return ARTICLE_QUERY_PATTERN_LABELS[queryPattern as ArticleQueryPattern];
}
