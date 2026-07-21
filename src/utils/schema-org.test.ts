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

  it('需謹慎 的 alternateName 修正為 須謹慎；name 可選帶入', () => {
    const r = buildClaimReview({ ...sample, verdict: '需謹慎', name: '檸檬水抗癌？查證' });
    expect(r.reviewRating.alternateName).toBe('須謹慎');
    expect(r.name).toBe('檸檬水抗癌？查證');
  });

  it('未提供 name 時不輸出 name 欄位', () => {
    const r = buildClaimReview(sample);
    expect('name' in r).toBe(false);
  });
});

import { buildPerson, SITE_SAMEAS } from '@/utils/schema-org';

describe('SITE_SAMEAS', () => {
  it('含 Firstory 與 YouTube 兩個外部身分', () => {
    expect(SITE_SAMEAS).toContain('https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes');
    expect(SITE_SAMEAS).toContain('https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ');
  });
});

describe('buildPerson', () => {
  it('已知作者（羅揚）回傳含 credential 與 sameAs 的 Person', () => {
    const p = buildPerson('羅揚');
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('羅揚');
    expect(p.url).toBe('https://evidencetoday.news/authors/luo-yang/');
    expect(p.jobTitle).toBe('本日有據主編');
    expect(Array.isArray(p.knowsAbout)).toBe(true);
    expect(p.knowsAbout!.length).toBeGreaterThan(0);
    // 羅揚 sameAs = 站台共用 sameAs（實體圖）＋ 其跨站作者身分（Wikidata Person / appi / 樂地滋 / 粉專）
    expect(p.sameAs).toEqual(expect.arrayContaining([...SITE_SAMEAS]));
    expect(p.sameAs).toContain('https://www.wikidata.org/wiki/Q140319371');
    expect(p.sameAs).toContain('https://appi.news/authors/luo-yang/');
    expect(p.sameAs).toContain('https://lodes.com.tw/');
    expect(p['@id']).toBe('https://evidencetoday.news/authors/luo-yang/#person');
  });

  it('未知作者回傳僅含 name 的 Person（fallback）', () => {
    const p = buildPerson('某匿名作者');
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('某匿名作者');
    expect(p.url).toBeUndefined();
    expect(p.jobTitle).toBeUndefined();
    expect(p.sameAs).toBeUndefined();
  });
});
