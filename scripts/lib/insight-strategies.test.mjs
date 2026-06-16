import { describe, it, expect } from 'vitest';
import { demandScore, isQuestionQuery, slugFromUrl, emptyBucket } from './insight-strategies.mjs';

describe('demandScore', () => {
  it('曝光越高、排名越差（數字大）分數越高，clamp 0–10', () => {
    const lowDemand = demandScore({ impressions: 1, position: 80, aiReferrals: 0, onSiteSearch: 0 });
    const highDemand = demandScore({ impressions: 50, position: 11, aiReferrals: 5, onSiteSearch: 3 });
    expect(highDemand).toBeGreaterThan(lowDemand);
    expect(highDemand).toBeLessThanOrEqual(10);
    expect(lowDemand).toBeGreaterThanOrEqual(0);
  });
});

describe('isQuestionQuery', () => {
  it('辨識中英文疑問句', () => {
    expect(isQuestionQuery('褪黑激素 會不會 上癮')).toBe(true);
    expect(isQuestionQuery('is creatine safe')).toBe(true);
    expect(isQuestionQuery('維生素C 功效')).toBe(false);
  });
});

describe('slugFromUrl', () => {
  it('取 URL 最後一段 slug', () => {
    expect(slugFromUrl('https://evidencetoday.news/articles/melatonin-x/')).toBe('melatonin-x');
    expect(slugFromUrl('/myths/lemon-detox')).toBe('lemon-detox');
  });
});

describe('emptyBucket', () => {
  it('三鍵皆空陣列', () => {
    expect(emptyBucket()).toEqual({ topicCandidates: [], writingDirectives: [], siteOptimizations: [] });
  });
});
