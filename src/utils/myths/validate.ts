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
  // 2026-08-07 移除「shareCardImage 或 ogImage 至少一個」的要求。
  // 這條規則的實際效果是逼每篇填一個值，而沒有任何機制檢查那個值對不對——結果是
  // 74/76 篇指向同兩張 radar SVG，那兩張圖裡烤死了「維他命 C 能預防感冒嗎？」與
  // 「喝檸檬水真的可以排毒嗎？」的字樣與 aria-label，出現在藍光眼鏡、氣炸鍋、大骨湯…
  // 等完全無關的頁面上。要求「有值」而不要求「值正確」，比沒有要求更糟。
  // 分享圖實際上由 contentSocial() 的 mythOgImage(slug) 逐篇產生，不吃這兩個欄位；
  // 卡片縮圖缺值時 MythCard 退回品牌縮圖。兩條路都不需要 frontmatter 填圖。

  return errors;
}
