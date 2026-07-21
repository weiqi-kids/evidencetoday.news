export type SuggestTask = 'rewrite' | 'summarize' | 'improve';

const INSTRUCTION: Record<SuggestTask, string> = {
  rewrite: '請以更清楚、易讀的繁體中文改寫下列文字，保留原意與專業度：',
  summarize: '請用繁體中文為下列文字寫一段精簡摘要：',
  improve: '請潤飾下列繁體中文文字，修正語病與冗詞，保持原意：',
};

// 統一去 AI 味禁用句型清單（權威清單見 docs/content-guide.md「鐵則」，全站生成端一致）。
// 這是編輯器 rewrite/summarize/improve 的共用語感護欄，輸出必須讀起來像人寫的、不是模板填空。
const VOICE = [
  '【語感護欄｜台灣繁體中文，禁中國用語，YMYL 醫療語境】改寫時務必避免以下 AI 味句型：',
  '① 禁「不是X，而是Y」下定義，與「不僅…更／還」「不只是…而是／更是」「並非…而是」排比（要對比就用「是Y，而非X」或正面直述）；',
  '② 禁「值得注意的是」「值得一提的是」「換句話說」等填充轉折；',
  '③ 禁空泛收束（總的來說／綜上所述／總而言之／歸根結底／整體而言）；',
  '④ 禁「真正的問題／關鍵是…」拔高，與「隨著…的發展／普及」「在…的今天」開場公式；',
  '⑤ 禁誇大形容詞「至關重要／不可或缺／舉足輕重」；',
  '⑥ 禁模糊引用（研究顯示／有研究指出／專家認為／學者認為／普遍認為）——要嘛保留原文既有的具體可點來源、要嘛不寫，不得自行編造來源；',
  '⑦ 禁用破折號（——）下定義；',
  '⑧ 禁模板化第一人稱開場（以「我」起句、我一直覺得／老實講／朋友最常問我／最近有讀者／我發現／我觀察）。',
  '正向：長短句交錯、每段換一種開法、保留原文的具體事實（數字／年份／機構／情境），台灣口語、容許口語瑕疵。',
].join('\n');

export function buildPrompt(task: string, context: Record<string, unknown>, selection: string): string {
  const t = (['rewrite', 'summarize', 'improve'] as const).includes(task as SuggestTask) ? (task as SuggestTask) : 'improve';
  const ctx = context && Object.keys(context).length ? `\n\n文章脈絡：${JSON.stringify(context)}` : '';
  return `${INSTRUCTION[t]}${ctx}\n\n${VOICE}\n\n---\n${selection}\n---\n\n只輸出結果文字，不要前後說明。`;
}
