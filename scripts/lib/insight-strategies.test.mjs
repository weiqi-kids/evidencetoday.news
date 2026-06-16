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

import {
  strategySearchGap, strategyOnsiteSearch, strategyTrendRadar, strategyLlmReferral,
} from './insight-strategies.mjs';

const CFG = {
  windowDays: 28, trendWindowDays: 7,
  thresholds: { minImpressions: 1, lowRankPosition: 10, boostRankMin: 5, boostRankMax: 15, trendSurgeRatio: 2.0 },
  aiReferralDomains: ['perplexity.ai', 'chatgpt.com'],
};
const INDEX = [{ type: 'articles', slug: 'creatine', title: '肌酸與運動', tags: ['肌酸'] }];

describe('strategySearchGap', () => {
  it('高曝光、排名>10、站內無對應 → topicCandidate', () => {
    const data = { gsc: { queries: [{ query: '褪黑激素 帶回台灣', clicks: 0, impressions: 4, ctr: 0, position: 10.75 }] }, contentIndex: INDEX };
    const out = strategySearchGap(data, CFG);
    expect(out.topicCandidates).toHaveLength(1);
    expect(out.topicCandidates[0].source).toBe('search-gap');
    expect(out.topicCandidates[0].evidence.impressions).toBe(4);
  });
  it('站內已有對應頁 → 不產候選', () => {
    const data = { gsc: { queries: [{ query: '肌酸 安全', clicks: 0, impressions: 9, ctr: 0, position: 12 }] }, contentIndex: INDEX };
    expect(strategySearchGap(data, CFG).topicCandidates).toHaveLength(0);
  });
  it('排名已在前段（position≤10）→ 不產候選', () => {
    const data = { gsc: { queries: [{ query: '新主題 X', clicks: 1, impressions: 9, ctr: 0.1, position: 4 }] }, contentIndex: INDEX };
    expect(strategySearchGap(data, CFG).topicCandidates).toHaveLength(0);
  });
});

describe('strategyOnsiteSearch', () => {
  it('站內搜尋字、站內無對應 → 高意圖候選', () => {
    const data = { ga4: { onsiteSearch: [{ searchTerm: '鎂 助眠', eventCount: 3 }] }, contentIndex: INDEX };
    const out = strategyOnsiteSearch(data, CFG);
    expect(out.topicCandidates).toHaveLength(1);
    expect(out.topicCandidates[0].source).toBe('onsite-search');
    expect(out.topicCandidates[0].evidence.onSiteSearch).toBe(3);
  });
});

describe('strategyTrendRadar', () => {
  it('近 7 天曝光較前期暴增（≥倍率）→ 標記高優先候選', () => {
    const data = {
      gsc: {
        queriesLast7: [{ query: '禽流感 雞蛋', impressions: 20 }],
        queriesPrev7: [{ query: '禽流感 雞蛋', impressions: 5 }],
      },
      contentIndex: INDEX,
    };
    const out = strategyTrendRadar(data, CFG);
    expect(out.topicCandidates).toHaveLength(1);
    expect(out.topicCandidates[0].source).toBe('trend-radar');
  });
  it('無暴增 → 不產候選', () => {
    const data = { gsc: { queriesLast7: [{ query: 'x', impressions: 6 }], queriesPrev7: [{ query: 'x', impressions: 5 }] }, contentIndex: INDEX };
    expect(strategyTrendRadar(data, CFG).topicCandidates).toHaveLength(0);
  });
});

describe('strategyLlmReferral', () => {
  it('AI 助理來源帶流量的落地頁 → 同類延伸主題候選', () => {
    const data = {
      ga4: { sessionSourceByLanding: [{ sessionSource: 'perplexity.ai', landingPage: '/articles/creatine/', sessions: 7 }] },
      contentIndex: INDEX,
    };
    const out = strategyLlmReferral(data, CFG);
    expect(out.topicCandidates).toHaveLength(1);
    expect(out.topicCandidates[0].source).toBe('llm-referral');
    expect(out.topicCandidates[0].evidence.aiReferrals).toBe(7);
  });
  it('非 AI 來源 → 略過', () => {
    const data = { ga4: { sessionSourceByLanding: [{ sessionSource: 'google', landingPage: '/articles/creatine/', sessions: 99 }] }, contentIndex: INDEX };
    expect(strategyLlmReferral(data, CFG).topicCandidates).toHaveLength(0);
  });
});
