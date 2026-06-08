export type SuggestTask = 'rewrite' | 'summarize' | 'improve';

const INSTRUCTION: Record<SuggestTask, string> = {
  rewrite: '請以更清楚、易讀的繁體中文改寫下列文字，保留原意與專業度：',
  summarize: '請用繁體中文為下列文字寫一段精簡摘要：',
  improve: '請潤飾下列繁體中文文字，修正語病與冗詞，保持原意：',
};

export function buildPrompt(task: string, context: Record<string, unknown>, selection: string): string {
  const t = (['rewrite', 'summarize', 'improve'] as const).includes(task as SuggestTask) ? (task as SuggestTask) : 'improve';
  const ctx = context && Object.keys(context).length ? `\n\n文章脈絡：${JSON.stringify(context)}` : '';
  return `${INSTRUCTION[t]}${ctx}\n\n---\n${selection}\n---\n\n只輸出結果文字，不要前後說明。`;
}
