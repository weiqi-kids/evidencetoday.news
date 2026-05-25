export const ARTICLE_QUERY_PATTERN_LABELS = {
  'ingredient-explainer': '成分解析',
  'myth-check': '迷思查證',
  'taiwan-regulation-market': '臺灣法規',
  'audience-stage-guide': '熟齡族群',
  comparison: '成分比較',
} as const;

export type ArticleQueryPattern = keyof typeof ARTICLE_QUERY_PATTERN_LABELS;

export function getArticleQueryPatternLabel(queryPattern?: string): string | undefined {
  if (!queryPattern) return undefined;
  return ARTICLE_QUERY_PATTERN_LABELS[queryPattern as ArticleQueryPattern];
}
