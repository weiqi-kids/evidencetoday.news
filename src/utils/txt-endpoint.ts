import { referenceTypeLabel } from '@/utils/evidence-labels';

export interface TxtReference {
  title: string;
  url?: string;
  type?: string;
}

export interface TxtFaqItem {
  question: string;
  answer: string;
}

// 把 references 格式化為純文字來源清單，接在 body 之後。空清單回傳空字串。
// 帶上研究類型中文標籤（沿用前台 ReferenceList 同一份對照表，用詞不漂移）。
export function renderSources(refs: readonly TxtReference[] | undefined): string {
  if (!refs || refs.length === 0) return '';
  const lines = refs.map((r) => {
    const typeLabel = r.type ? `（${referenceTypeLabel(r.type)}）` : '';
    return r.url ? `- ${r.title}${typeLabel} — ${r.url}` : `- ${r.title}${typeLabel}`;
  });
  return `\n\n來源：\n${lines.join('\n')}`;
}

// 把 FAQ 格式化為純文字 Q&A，接在來源之前。空清單回傳空字串。
export function renderFaq(faq: readonly TxtFaqItem[] | undefined): string {
  if (!faq || faq.length === 0) return '';
  const lines = faq.map((f) => `Q：${f.question}\nA：${f.answer}`);
  return `\n\nFAQ：\n${lines.join('\n\n')}`;
}
