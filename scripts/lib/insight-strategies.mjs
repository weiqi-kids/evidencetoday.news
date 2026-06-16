export const emptyBucket = () => ({ topicCandidates: [], writingDirectives: [], siteOptimizations: [] });

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const round = (n, d = 1) => { const f = 10 ** d; return Math.round(n * f) / f; };

/** URL/路徑最後一段 slug。 */
export function slugFromUrl(url) {
  return String(url).split('/').filter(Boolean).pop() ?? '';
}

const QUESTION_RE = /為什麼|會不會|能不能|可以嗎|安全嗎|有效嗎|是否|嗎\b|\?|？|\bis\b|\bcan\b|\bdoes\b|\bsafe\b|\bhow\b|\bwhy\b/i;
export function isQuestionQuery(q) {
  return QUESTION_RE.test(String(q));
}

/**
 * 需求分數 0–10：曝光量（飽和對數）+ 排名落後（position 越大越該補）+ AI 轉介 + 站內搜尋。
 * 給選題的話題性維度用。
 */
export function demandScore({ impressions = 0, position = 0, aiReferrals = 0, onSiteSearch = 0 }) {
  const impComponent = Math.min(4, Math.log10(impressions + 1) * 2);      // 0–4
  const rankComponent = position > 10 ? Math.min(3, (position - 10) / 20) : 0; // 0–3
  const aiComponent = Math.min(2, aiReferrals * 0.5);                     // 0–2
  const searchComponent = Math.min(1, onSiteSearch * 0.5);               // 0–1
  return round(clamp(impComponent + rankComponent + aiComponent + searchComponent, 0, 10), 2);
}
