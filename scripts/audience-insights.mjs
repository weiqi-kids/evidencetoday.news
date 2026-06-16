#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'node:fs';
import { OUTPUT_PATH } from './lib/insight-constants.mjs';
import { getToken, ga4Report, gscQuery } from './lib/insight-fetch.mjs';
import { loadContentIndex } from './lib/content-index.mjs';
import {
  strategySearchGap, strategyOnsiteSearch, strategyTrendRadar, strategyLlmReferral,
  strategyCompletionStyle, strategyAeoStructure, strategyRankBoost, strategyQuestionFaq,
} from './lib/insight-strategies.mjs';
import { mergeBuckets, computeDataHealth, emptyBucketFile } from './lib/assemble.mjs';

const cfg = JSON.parse(readFileSync('data/news-automation-config.json', 'utf8')).audienceInsights;

function tw(dateOffsetDays = 0) {
  // 台灣時間 (UTC+8) 的 YYYY-MM-DD
  const ms = Date.now() + 8 * 3600 * 1000 - dateOffsetDays * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}
function nowTw() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19) + '+08:00';
}

function writeOut(obj) {
  writeFileSync(OUTPUT_PATH, JSON.stringify(obj, null, 2) + '\n');
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

async function main() {
  if (!cfg || cfg.enabled === false) {
    writeOut(emptyBucketFile(nowTw(), cfg, '已停用'));
    return;
  }
  const token = getToken();
  if (!token) {
    console.error('[insights] 取不到 gcloud token，輸出空桶、退回現狀');
    writeOut(emptyBucketFile(nowTw(), cfg, '無 token'));
    return;
  }
  const D = cfg.windowDays;
  const T = cfg.trendWindowDays;

  const [
    contentViewByType, readCompleteByType, aeoByEvent, sessionSourceByLanding, onsiteSearch,
  ] = await Promise.all([
    ga4Report(token, { dimensions: ['customEvent:content_type'], metrics: ['eventCount'], eventName: 'content_view', days: D, limit: 50, orderMetric: 'eventCount' }),
    ga4Report(token, { dimensions: ['customEvent:content_type'], metrics: ['eventCount'], eventName: 'read_complete', days: D, limit: 50, orderMetric: 'eventCount' }),
    ga4Report(token, { dimensions: ['eventName'], metrics: ['eventCount'], days: D, limit: 50, orderMetric: 'eventCount' }),
    ga4Report(token, { dimensions: ['sessionSource', 'landingPage'], metrics: ['sessions'], days: D, limit: 100, orderMetric: 'sessions' }),
    ga4Report(token, { dimensions: ['searchTerm'], metrics: ['eventCount'], eventName: 'view_search_results', days: D, limit: 50, orderMetric: 'eventCount' }),
  ]);

  const [queries, pageQueries, queriesLast7, queriesPrev7] = await Promise.all([
    gscQuery(token, { dimensions: ['query'], startDate: tw(D), endDate: tw(0), rowLimit: 200 }),
    gscQuery(token, { dimensions: ['page', 'query'], startDate: tw(D), endDate: tw(0), rowLimit: 200 }),
    gscQuery(token, { dimensions: ['query'], startDate: tw(T), endDate: tw(0), rowLimit: 200 }),
    gscQuery(token, { dimensions: ['query'], startDate: tw(2 * T), endDate: tw(T + 1), rowLimit: 200 }),
  ]);

  const data = {
    ga4: { contentViewByType, readCompleteByType, aeoByEvent, sessionSourceByLanding, onsiteSearch },
    gsc: { queries, pageQueries, queriesLast7, queriesPrev7 },
    contentIndex: loadContentIndex(),
  };

  const buckets = [
    strategySearchGap, strategyOnsiteSearch, strategyTrendRadar, strategyLlmReferral,
    strategyCompletionStyle, strategyAeoStructure, strategyRankBoost, strategyQuestionFaq,
  ].map((fn) => {
    try { return fn(data, cfg); } catch (e) { console.error(`[insights] 策略 ${fn.name} 失敗：`, e.message); return { topicCandidates: [], writingDirectives: [], siteOptimizations: [] }; }
  });

  const merged = mergeBuckets(buckets);
  const ga4Events = (aeoByEvent ?? []).reduce((s, r) => s + (r.eventCount || 0), 0);
  writeOut({
    generatedAt: nowTw(),
    window: { ga4Days: D, gscDays: D },
    dataHealth: computeDataHealth({ ga4Events, gscRows: (queries ?? []).length }),
    ...merged,
  });
}

main().catch((e) => { console.error('[insights] 未預期錯誤，退回現狀：', e); writeOut(emptyBucketFile(nowTw(), cfg, '例外')); });
