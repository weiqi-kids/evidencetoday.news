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

import { strategyCompletionStyle, strategyAeoStructure } from './insight-strategies.mjs';

describe('strategyCompletionStyle', () => {
  it('讀完率最高的類型 → writingDirective', () => {
    const data = {
      ga4: {
        contentViewByType: [{ content_type: 'ingredient', eventCount: 100 }, { content_type: 'article', eventCount: 100 }],
        readCompleteByType: [{ content_type: 'ingredient', eventCount: 62 }, { content_type: 'article', eventCount: 30 }],
      },
    };
    const out = strategyCompletionStyle(data, CFG);
    expect(out.writingDirectives.length).toBeGreaterThanOrEqual(1);
    expect(out.writingDirectives[0].directive).toContain('ingredient');
    expect(out.writingDirectives[0].basis).toBe('completion');
  });
  it('樣本量為 0 → 無指令（優雅退化）', () => {
    const data = { ga4: { contentViewByType: [], readCompleteByType: [] } };
    expect(strategyCompletionStyle(data, CFG).writingDirectives).toHaveLength(0);
  });
});

describe('strategyAeoStructure', () => {
  it('FAQ/來源互動量高 → 強化結構指令', () => {
    const data = { ga4: { aeoByEvent: [{ eventName: 'faq_open', eventCount: 40 }, { eventName: 'references_expand', eventCount: 25 }, { eventName: 'content_view', eventCount: 100 }] } };
    const out = strategyAeoStructure(data, CFG);
    expect(out.writingDirectives).toHaveLength(1);
    expect(out.writingDirectives[0].basis).toBe('aeo');
  });
  it('無 AEO 事件 → 無指令', () => {
    expect(strategyAeoStructure({ ga4: { aeoByEvent: [] } }, CFG).writingDirectives).toHaveLength(0);
  });
});

import { strategyRankBoost, strategyQuestionFaq } from './insight-strategies.mjs';

describe('strategyRankBoost', () => {
  it('既有頁排名 5–15 且有曝光 → siteOptimization', () => {
    const data = { gsc: { pageQueries: [{ page: 'https://evidencetoday.news/articles/creatine/', query: '肌酸 劑量', clicks: 0, impressions: 30, ctr: 0, position: 8 }] } };
    const out = strategyRankBoost(data, CFG);
    expect(out.siteOptimizations).toHaveLength(1);
    expect(out.siteOptimizations[0].type).toBe('edit-existing');
    expect(out.siteOptimizations[0].target).toBe('/articles/creatine/');
  });
  it('排名已在前段（<5）→ 不建議', () => {
    const data = { gsc: { pageQueries: [{ page: 'https://evidencetoday.news/articles/creatine/', query: 'x', clicks: 5, impressions: 30, ctr: 0.1, position: 2 }] } };
    expect(strategyRankBoost(data, CFG).siteOptimizations).toHaveLength(0);
  });
});

describe('strategyQuestionFaq', () => {
  it('疑問句查詢 + 站內已有對應頁 → 建議補 FAQ（siteOptimization）', () => {
    const data = { gsc: { queries: [{ query: '肌酸 會不會 傷腎', clicks: 0, impressions: 6, ctr: 0, position: 9 }] }, contentIndex: INDEX };
    const out = strategyQuestionFaq(data, CFG);
    expect(out.siteOptimizations).toHaveLength(1);
    expect(out.siteOptimizations[0].action).toContain('FAQ');
  });
  it('疑問句查詢 + 站內無對應頁 → 新主題候選', () => {
    const data = { gsc: { queries: [{ query: '褪黑激素 安全嗎', clicks: 0, impressions: 8, ctr: 0, position: 20 }] }, contentIndex: INDEX };
    const out = strategyQuestionFaq(data, CFG);
    expect(out.topicCandidates).toHaveLength(1);
    expect(out.topicCandidates[0].source).toBe('question-faq');
  });
  it('非疑問句 → 略過', () => {
    const data = { gsc: { queries: [{ query: '肌酸 功效', clicks: 0, impressions: 8, ctr: 0, position: 20 }] }, contentIndex: INDEX };
    const out = strategyQuestionFaq(data, CFG);
    expect(out.topicCandidates).toHaveLength(0);
    expect(out.siteOptimizations).toHaveLength(0);
  });
});
