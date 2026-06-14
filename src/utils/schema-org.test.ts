import { describe, it, expect } from 'vitest';
import { VERDICT_RATING, MYTH_VERDICTS } from '@/utils/myths/schema';

describe('VERDICT_RATING', () => {
  it('六種 verdict 都有對映', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeTypeOf('number');
    }
  });

  it('正確端與錯誤端落在 1–5 兩極', () => {
    expect(VERDICT_RATING['大致正確']).toBe(5);
    expect(VERDICT_RATING['大致錯誤']).toBe(1);
  });

  it('所有數值介於 1 到 5', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeGreaterThanOrEqual(1);
      expect(VERDICT_RATING[v]).toBeLessThanOrEqual(5);
    }
  });
});

import { buildClaimReview } from '@/utils/schema-org';

const sample = {
  mythClaim: '檸檬水可以鹼化體質、預防癌症',
  verdict: '大致錯誤' as const,
  verdictSummary: '人體酸鹼由生理機制嚴格調控，飲食無法改變血液 pH。',
  publishDate: new Date('2026-05-01T00:00:00.000Z'),
  updatedDate: new Date('2026-05-20T00:00:00.000Z'),
  url: 'https://evidencetoday.news/myths/lemon-water/',
};

describe('buildClaimReview', () => {
  it('@type 與 @context 正確', () => {
    const r = buildClaimReview(sample);
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@type']).toBe('ClaimReview');
  });

  it('claimReviewed 帶被檢驗說法', () => {
    expect(buildClaimReview(sample).claimReviewed).toBe(sample.mythClaim);
  });

  it('reviewRating 反映 verdict 數值與中文標籤', () => {
    const r = buildClaimReview(sample);
    expect(r.reviewRating['@type']).toBe('Rating');
    expect(r.reviewRating.ratingValue).toBe(1); // 大致錯誤
    expect(r.reviewRating.bestRating).toBe(5);
    expect(r.reviewRating.worstRating).toBe(1);
    expect(r.reviewRating.alternateName).toBe('大致錯誤');
  });

  it('itemReviewed 為 Claim、author/publisher 為本站 Organization', () => {
    const r = buildClaimReview(sample);
    expect(r.itemReviewed['@type']).toBe('Claim');
    expect(r.author['@type']).toBe('Organization');
    expect(r.author.name).toBe('本日有據');
  });

  it('url 與日期帶入（ISO 格式）', () => {
    const r = buildClaimReview(sample);
    expect(r.url).toBe(sample.url);
    expect(r.datePublished).toBe('2026-05-01T00:00:00.000Z');
    expect(r.dateModified).toBe('2026-05-20T00:00:00.000Z');
  });
});
