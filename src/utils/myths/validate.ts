import type { CollectionEntry } from 'astro:content';

export function validateMythArticle(article: CollectionEntry<'myths'>): string[] {
  const errors: string[] = [];
  const d = article.data;

  if (!d.references || d.references.length === 0) errors.push('references 不可為空。');
  d.references.forEach((ref, idx) => {
    // 證據類型接受必填的 `type` 或選填的 `sourceType`（schema 中 sourceType 為 optional，
    // 早期部分闢謠只填了 type；排程稿到期發布時才會被這個執行期驗證器擋下，故放寬為兩者取一）。
    if (!ref.title || !ref.url || !(ref.type || ref.sourceType)) {
      errors.push(`references[${idx}] 缺少 title/url/type。`);
    }
  });

  if (!d.verdict) errors.push('verdict 缺失。');
  if (!d.verdictSummary) errors.push('verdictSummary 缺失。');
  if (!d.evidenceLevel) errors.push('evidenceLevel 缺失。');
  if (!d.updatedDate) errors.push('updatedDate 缺失。');
  if (!d.shareCardImage && !d.ogImage) errors.push('shareCardImage 或 ogImage 至少一個。');

  return errors;
}
