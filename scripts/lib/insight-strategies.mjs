import { queryHasExistingPage } from './content-index.mjs';

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

/** 搜尋需求缺口：GSC 高曝光 + 排名落後 + 站內無對應頁。 */
export function strategySearchGap(data, cfg) {
  const out = emptyBucket();
  const { minImpressions, lowRankPosition } = cfg.thresholds;
  for (const row of data.gsc?.queries ?? []) {
    if (row.impressions < minImpressions) continue;
    if (row.position <= lowRankPosition) continue;
    if (queryHasExistingPage(row.query, data.contentIndex ?? [])) continue;
    out.topicCandidates.push({
      topic: row.query,
      source: 'search-gap',
      rationale: `GSC 曝光 ${row.impressions}、平均排名 ${round(row.position)}、站內無對應文章`,
      demandScore: demandScore({ impressions: row.impressions, position: row.position }),
      suggestedAngle: `針對「${row.query}」提供有據解答`,
      evidence: { impressions: row.impressions, position: round(row.position), aiReferrals: 0, onSiteSearch: 0 },
    });
  }
  return out;
}

/** 站內搜尋未滿足：使用者站內搜了、站內卻無對應內容。 */
export function strategyOnsiteSearch(data, cfg) {
  const out = emptyBucket();
  for (const row of data.ga4?.onsiteSearch ?? []) {
    if (queryHasExistingPage(row.searchTerm, data.contentIndex ?? [])) continue;
    out.topicCandidates.push({
      topic: row.searchTerm,
      source: 'onsite-search',
      rationale: `站內被搜尋 ${row.eventCount} 次、站內無對應內容（高意圖讀者）`,
      demandScore: demandScore({ onSiteSearch: row.eventCount }),
      suggestedAngle: `回應站內讀者真實提問「${row.searchTerm}」`,
      evidence: { impressions: 0, position: 0, aiReferrals: 0, onSiteSearch: row.eventCount },
    });
  }
  return out;
}

/** 時效熱點：近 7 天曝光較前期暴增。 */
export function strategyTrendRadar(data, cfg) {
  const out = emptyBucket();
  const prev = new Map((data.gsc?.queriesPrev7 ?? []).map((r) => [r.query, r.impressions]));
  for (const row of data.gsc?.queriesLast7 ?? []) {
    const before = prev.get(row.query) ?? 0;
    const ratio = before === 0 ? (row.impressions >= 3 ? Infinity : 0) : row.impressions / before;
    if (ratio < cfg.thresholds.trendSurgeRatio) continue;
    out.topicCandidates.push({
      topic: row.query,
      source: 'trend-radar',
      rationale: `近 ${cfg.trendWindowDays} 天曝光 ${row.impressions}（前期 ${before}），熱度暴增`,
      demandScore: demandScore({ impressions: row.impressions, position: 11 }),
      suggestedAngle: `即時跟進熱點「${row.query}」`,
      evidence: { impressions: row.impressions, position: 0, aiReferrals: 0, onSiteSearch: 0 },
      editorPickHint: true,
    });
  }
  return out;
}

/** LLM 轉介逆向工程：AI 助理來源帶流量的落地頁 → 產同類延伸主題。 */
export function strategyLlmReferral(data, cfg) {
  const out = emptyBucket();
  const domains = cfg.aiReferralDomains ?? [];
  for (const row of data.ga4?.sessionSourceByLanding ?? []) {
    const isAi = domains.some((d) => String(row.sessionSource).includes(d));
    if (!isAi) continue;
    const slug = slugFromUrl(row.landingPage);
    const entry = (data.contentIndex ?? []).find((e) => e.slug === slug);
    const label = entry ? entry.title : slug;
    out.topicCandidates.push({
      topic: `${label}（延伸主題）`,
      source: 'llm-referral',
      rationale: `${row.sessionSource} 經由 AI 助理帶 ${row.sessions} 次工作階段到此頁，複製成功模式`,
      demandScore: demandScore({ aiReferrals: row.sessions }),
      suggestedAngle: `延伸 LLM 已引用的「${label}」相關子題`,
      evidence: { impressions: 0, position: 0, aiReferrals: row.sessions, onSiteSearch: 0 },
    });
  }
  return out;
}

/** 讀完率回饋：算各 content_type 的 read_complete ÷ content_view，挑最高者給寫法指令。 */
export function strategyCompletionStyle(data, cfg) {
  const out = emptyBucket();
  const views = new Map((data.ga4?.contentViewByType ?? []).map((r) => [r.content_type, r.eventCount]));
  const ratios = [];
  for (const r of data.ga4?.readCompleteByType ?? []) {
    const v = views.get(r.content_type) ?? 0;
    if (v < 1) continue;
    ratios.push({ type: r.content_type, ratio: r.eventCount / v, sample: v });
  }
  if (ratios.length === 0) return out;
  ratios.sort((a, b) => b.ratio - a.ratio);
  const top = ratios[0];
  out.writingDirectives.push({
    directive: `「${top.type}」類讀完率最高（${round(top.ratio * 100)}%，樣本 ${top.sample}）→ 撰文時優先採用此類型的結構與長度`,
    basis: 'completion',
    confidence: top.sample >= 50 ? 'med' : 'low',
  });
  return out;
}

/** AEO 結構訊號：FAQ 展開 / 來源點擊相對 content_view 的比例高 → 強化問答+來源結構。 */
export function strategyAeoStructure(data, cfg) {
  const out = emptyBucket();
  const byEvent = new Map((data.ga4?.aeoByEvent ?? []).map((r) => [r.eventName, r.eventCount]));
  const faq = byEvent.get('faq_open') ?? 0;
  const refs = byEvent.get('references_expand') ?? 0;
  if (faq + refs === 0) return out;
  const views = byEvent.get('content_view') ?? 0;
  const rate = views > 0 ? round(((faq + refs) / views) * 100) : null;
  out.writingDirectives.push({
    directive: `讀者高度使用 FAQ（${faq}）與來源展開（${refs}）${rate !== null ? `，互動率約 ${rate}%` : ''} → 維持「問答式 FAQ + 可驗證來源清單」結構（LLM 抓答案最愛此格式）`,
    basis: 'aeo',
    confidence: faq + refs >= 30 ? 'med' : 'low',
  });
  return out;
}

/** 臨門一腳：既有頁排名落在 boostRankMin–boostRankMax 且有曝光 → 補強建議。 */
export function strategyRankBoost(data, cfg) {
  const out = emptyBucket();
  const { boostRankMin, boostRankMax, minImpressions } = cfg.thresholds;
  for (const row of data.gsc?.pageQueries ?? []) {
    if (row.position < boostRankMin || row.position > boostRankMax) continue;
    if (row.impressions < minImpressions) continue;
    out.siteOptimizations.push({
      type: 'edit-existing',
      target: '/' + slugPathFromUrl(row.page),
      action: '補強內容 / 優化標題與描述',
      rationale: `查詢「${row.query}」排名 ${round(row.position)}（第一頁邊緣）、曝光 ${row.impressions}，小幅優化即可進前段`,
    });
  }
  return out;
}

/** 問句查詢→FAQ：疑問句查詢，有對應頁→建議補 FAQ；無→新主題候選。 */
export function strategyQuestionFaq(data, cfg) {
  const out = emptyBucket();
  for (const row of data.gsc?.queries ?? []) {
    if (!isQuestionQuery(row.query)) continue;
    if (row.impressions < cfg.thresholds.minImpressions) continue;
    if (queryHasExistingPage(row.query, data.contentIndex ?? [])) {
      out.siteOptimizations.push({
        type: 'edit-existing',
        target: '(對應既有頁)',
        action: `新增 FAQ 條目回答「${row.query}」`,
        rationale: `疑問句查詢曝光 ${row.impressions}、排名 ${round(row.position)}；LLM 偏好引用直接回答問句的 FAQ`,
      });
    } else {
      out.topicCandidates.push({
        topic: row.query,
        source: 'question-faq',
        rationale: `疑問句查詢曝光 ${row.impressions}、站內無對應頁`,
        demandScore: demandScore({ impressions: row.impressions, position: row.position }),
        suggestedAngle: `以 FAQ 問答形式直接回答「${row.query}」`,
        evidence: { impressions: row.impressions, position: round(row.position), aiReferrals: 0, onSiteSearch: 0 },
      });
    }
  }
  return out;
}

/** URL → 去掉 origin 的路徑（保留尾段 slug，供 target 顯示）。 */
function slugPathFromUrl(url) {
  try { return new URL(url).pathname.replace(/^\/+/, ''); } catch { return slugFromUrl(url); }
}
