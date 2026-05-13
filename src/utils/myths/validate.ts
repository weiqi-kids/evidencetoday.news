import type { CollectionEntry } from 'astro:content';

export function validateMythArticle(article: CollectionEntry<'myths'>): string[] {
  const errors: string[] = [];
  const d = article.data;

  if (!d.references || d.references.length === 0) errors.push('references 不可為空。');
  d.references.forEach((ref, idx) => {
    if (!ref.title || !ref.url || !ref.sourceType) {
      errors.push(`references[${idx}] 缺少 title/url/sourceType。`);
    }
  });

  if (!d.verdict) errors.push('verdict 缺失。');
  if (!d.verdictSummary) errors.push('verdictSummary 缺失。');
  if (!d.evidenceLevel) errors.push('evidenceLevel 缺失。');
  if (!d.updatedDate) errors.push('updatedDate 缺失。');
  if (!d.shareCardImage && !d.ogImage) errors.push('shareCardImage 或 ogImage 至少一個。');

  return errors;
}
