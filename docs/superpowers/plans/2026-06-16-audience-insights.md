# Audience Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 `/news` 管線（server cron + `claude -p`）在 Phase 2 即時抓 GA4＋GSC，跑 8 個策略，產出 `topicCandidates`／`writingDirectives`／`siteOptimizations` 三桶，分別驅動選題、寫法、既有頁建議。

**Architecture:** 一支 Node 腳本 `scripts/audience-insights.mjs`，責任分三層：fetch 層（spawn gcloud 取 token + 打 GA4/GSC REST）、strategy 層（8 個純函數 transform，可 vitest 測）、組裝層（合併三桶 → 寫 gitignored 的 `data/audience-insights.json` + stdout）。資料空或 API 失敗時回空桶、exit 0，管線退回現狀。

**Tech Stack:** Node 22（global fetch）、ESM `.mjs`、vitest 4、js-yaml（既有依賴，解析 content frontmatter）、gcloud CLI（token）。

**Spec:** `docs/superpowers/specs/2026-06-16-audience-insights-design.md`

---

## 檔案結構

| 檔案 | 責任 |
|---|---|
| `scripts/lib/insight-constants.mjs` | API 端點、GA4 property、GSC site、SA、預設值（純常數）|
| `scripts/lib/content-index.mjs` | 讀 `src/content/**` frontmatter → `[{type,slug,title,tags}]`；含純函數 `parseContentIndex(files)` |
| `scripts/lib/insight-fetch.mjs` | `getToken()`、`ga4Report()`、`gscQuery()` + 純正規化 `normalizeGa4Rows()` / `normalizeGscRows()` |
| `scripts/lib/insight-strategies.mjs` | 8 個純函數策略 + 共用 helper（`demandScore`、`isQuestionQuery`…）|
| `scripts/audience-insights.mjs` | 組裝層 entrypoint：load config → fetch → strategies → 合併 → 寫檔/stdout |
| `scripts/lib/*.test.mjs` | 純函數單元測試（vitest）|
| `data/news-automation-config.json` | 加 `audienceInsights` 區塊 |
| `vitest.config.ts` | include 加 `scripts/**/*.test.mjs` |
| `.gitignore` | 加 `data/audience-insights.json` |

**型別契約（跨任務一致）**

```js
// 每個策略簽章： (data, cfg) => Bucket
// Bucket 三鍵永遠都在（可空陣列）
/** @typedef {{topicCandidates: TopicCandidate[], writingDirectives: WritingDirective[], siteOptimizations: SiteOptimization[]}} Bucket */
/** @typedef {{topic:string, source:string, rationale:string, demandScore:number, suggestedAngle:string, evidence:{impressions:number, position:number, aiReferrals:number, onSiteSearch:number}}} TopicCandidate */
/** @typedef {{directive:string, basis:string, confidence:'low'|'med'|'high'}} WritingDirective */
/** @typedef {{type:string, target:string, action:string, rationale:string}} SiteOptimization */

// data（fetch 層產出，傳入所有策略）
/** data = {
 *   ga4: { contentViewByType, readCompleteByType, aeoByEvent,
 *          sessionSourceByLanding, onsiteSearch },
 *   gsc: { queries, pageQueries, queriesLast7, queriesPrev7 },
 *   contentIndex: ContentEntry[]
 * } */
/** @typedef {{type:string, slug:string, title:string, tags:string[]}} ContentEntry */
```

---

## Task 1: Scaffolding（config / vitest / gitignore / 常數）

**Files:**
- Modify: `vitest.config.ts`
- Modify: `.gitignore`
- Modify: `data/news-automation-config.json`
- Create: `scripts/lib/insight-constants.mjs`

- [ ] **Step 1: vitest 收 scripts 測試**

Modify `vitest.config.ts` `test.include`：

```ts
  test: {
    include: ['src/**/*.test.ts', 'workers/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
  },
```

- [ ] **Step 2: gitignore insights 輸出（不公開經營內幕）**

Append to `.gitignore`：

```gitignore
# Audience insights — 私密經營數據，不 commit、不 deploy
data/audience-insights.json
```

- [ ] **Step 3: config 區塊**

在 `data/news-automation-config.json` 頂層加入（與既有鍵並列）：

```json
"audienceInsights": {
  "enabled": true,
  "windowDays": 28,
  "trendWindowDays": 7,
  "thresholds": {
    "minImpressions": 1,
    "lowRankPosition": 10,
    "boostRankMin": 5,
    "boostRankMax": 15,
    "trendSurgeRatio": 2.0
  },
  "aiReferralDomains": ["chat.openai.com", "chatgpt.com", "perplexity.ai", "gemini.google.com", "claude.ai", "copilot.microsoft.com"]
}
```

- [ ] **Step 4: 常數模組**

Create `scripts/lib/insight-constants.mjs`：

```js
// GA4 / GSC 端點與識別碼。對齊 ~/ga4-report.py。
export const GA4_PROPERTY = 'properties/541692554'; // evidencetoday.news (G-5JH83LM8X7)
export const GSC_SITE = 'sc-domain:evidencetoday.news';
export const SERVICE_ACCOUNT = 'ga4-insights@yaocare.iam.gserviceaccount.com';
export const GA4_URL = `https://analyticsdata.googleapis.com/v1beta/${GA4_PROPERTY}:runReport`;
export const GSC_URL = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
export const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly';
export const CONTENT_TYPES = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'];
export const OUTPUT_PATH = 'data/audience-insights.json';
```

- [ ] **Step 5: 確認測試環境仍綠**

Run: `pnpm exec vitest run`
Expected: 既有 153 測試全 PASS（尚未加新測試，僅確認 config 沒壞）。

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts .gitignore data/news-automation-config.json scripts/lib/insight-constants.mjs
git commit -m "chore(insights): scaffolding — config 區塊、vitest 收 scripts 測試、常數模組"
```

---

## Task 2: Content index（判斷「站內有無對應文章」）

**Files:**
- Create: `scripts/lib/content-index.mjs`
- Test: `scripts/lib/content-index.test.mjs`

- [ ] **Step 1: 寫失敗測試**

Create `scripts/lib/content-index.test.mjs`：

```js
import { describe, it, expect } from 'vitest';
import { parseContentIndex, queryHasExistingPage } from './content-index.mjs';

const FILES = [
  { type: 'articles', slug: 'melatonin-x', raw: '---\ntitle: 褪黑激素與睡眠\ntags: ["睡眠","褪黑激素"]\n---\n內文' },
  { type: 'myths', slug: 'lemon-detox', raw: '---\ntitle: 檸檬水排毒迷思\n---\n內文' },
];

describe('parseContentIndex', () => {
  it('解析 frontmatter title/tags，缺 tags 給空陣列', () => {
    const idx = parseContentIndex(FILES);
    expect(idx).toEqual([
      { type: 'articles', slug: 'melatonin-x', title: '褪黑激素與睡眠', tags: ['睡眠', '褪黑激素'] },
      { type: 'myths', slug: 'lemon-detox', title: '檸檬水排毒迷思', tags: [] },
    ]);
  });
});

describe('queryHasExistingPage', () => {
  const idx = parseContentIndex(FILES);
  it('查詢字詞命中既有 title/tag → true', () => {
    expect(queryHasExistingPage('褪黑激素 帶回台灣', idx)).toBe(true);
  });
  it('查詢字詞與任何頁無交集 → false', () => {
    expect(queryHasExistingPage('維生素D 缺乏', idx)).toBe(false);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/content-index.test.mjs`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作**

Create `scripts/lib/content-index.mjs`：

```js
import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { CONTENT_TYPES } from './insight-constants.mjs';

/**
 * 純函數：把 [{type,slug,raw}] 解析成 [{type,slug,title,tags}]。
 * raw 為檔案內容（含 YAML frontmatter）。
 */
export function parseContentIndex(files) {
  return files.map(({ type, slug, raw }) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    let fm = {};
    if (m) {
      try { fm = yaml.load(m[1]) || {}; } catch { fm = {}; }
    }
    return {
      type,
      slug,
      title: typeof fm.title === 'string' ? fm.title : '',
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    };
  });
}

/**
 * 純函數：搜尋字詞是否已有對應內容頁。
 * 規則：query 以空白切詞，任一詞（長度≥2）出現在某頁 title 或 tags → 視為已覆蓋。
 */
export function queryHasExistingPage(query, index) {
  const terms = String(query).split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return false;
  return index.some((entry) => {
    const hay = entry.title + ' ' + entry.tags.join(' ');
    return terms.some((t) => hay.includes(t));
  });
}

/** 不純：從 repo 讀出 content index（組裝層用）。 */
export function loadContentIndex(root = 'src/content') {
  const files = [];
  for (const type of CONTENT_TYPES) {
    let names = [];
    try { names = readdirSync(`${root}/${type}`); } catch { continue; }
    for (const name of names) {
      if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue;
      const slug = name.replace(/\.mdx?$/, '');
      const raw = readFileSync(`${root}/${type}/${name}`, 'utf8');
      files.push({ type, slug, raw });
    }
  }
  return parseContentIndex(files);
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/content-index.test.mjs`
Expected: PASS（3 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/content-index.mjs scripts/lib/content-index.test.mjs
git commit -m "feat(insights): content index — 解析 frontmatter + 判斷查詢是否已有對應頁"
```

---

## Task 3: Fetch 層（token + GA4/GSC + 正規化）

**Files:**
- Create: `scripts/lib/insight-fetch.mjs`
- Test: `scripts/lib/insight-fetch.test.mjs`

純正規化函數可測；網路函數（getToken/ga4Report/gscQuery）薄層、靠 Task 10 本機實打驗證。

- [ ] **Step 1: 寫失敗測試（只測純正規化）**

Create `scripts/lib/insight-fetch.test.mjs`：

```js
import { describe, it, expect } from 'vitest';
import { normalizeGa4Rows, normalizeGscRows } from './insight-fetch.mjs';

describe('normalizeGa4Rows', () => {
  it('依 dimension/metric 名稱組成物件，數值轉 number', () => {
    const apiJson = {
      rows: [
        { dimensionValues: [{ value: 'article' }], metricValues: [{ value: '12' }] },
      ],
    };
    expect(normalizeGa4Rows(apiJson, ['content_type'], ['eventCount']))
      .toEqual([{ content_type: 'article', eventCount: 12 }]);
  });
  it('無 rows → 空陣列', () => {
    expect(normalizeGa4Rows({}, ['x'], ['y'])).toEqual([]);
  });
});

describe('normalizeGscRows', () => {
  it('攤平 keys 並保留 clicks/impressions/ctr/position', () => {
    const apiJson = { rows: [{ keys: ['褪黑激素'], clicks: 0, impressions: 4, ctr: 0, position: 10.75 }] };
    expect(normalizeGscRows(apiJson, ['query']))
      .toEqual([{ query: '褪黑激素', clicks: 0, impressions: 4, ctr: 0, position: 10.75 }]);
  });
  it('無 rows → 空陣列', () => {
    expect(normalizeGscRows({}, ['query'])).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/insight-fetch.test.mjs`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作**

Create `scripts/lib/insight-fetch.mjs`：

```js
import { execFileSync } from 'node:child_process';
import { GA4_URL, GSC_URL, SERVICE_ACCOUNT, SCOPES } from './insight-constants.mjs';

/** 不純：spawn gcloud 取 access token。失敗回 null（不丟，讓組裝層退化）。 */
export function getToken() {
  try {
    return execFileSync('gcloud', [
      'auth', 'print-access-token', '--account', SERVICE_ACCOUNT, '--scopes', SCOPES,
    ], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** 純：把 GA4 runReport 回應正規化成 [{dim..,metric..}]。 */
export function normalizeGa4Rows(apiJson, dimensions, metrics) {
  const rows = (apiJson && apiJson.rows) || [];
  return rows.map((row) => {
    const obj = {};
    (row.dimensionValues || []).forEach((d, i) => { obj[dimensions[i]] = d.value; });
    (row.metricValues || []).forEach((m, i) => { obj[metrics[i]] = Number(m.value); });
    return obj;
  });
}

/** 純：把 GSC 回應正規化成 [{dim.., clicks, impressions, ctr, position}]。 */
export function normalizeGscRows(apiJson, dimensions) {
  const rows = (apiJson && apiJson.rows) || [];
  return rows.map((row) => {
    const obj = {};
    (row.keys || []).forEach((k, i) => { obj[dimensions[i]] = k; });
    obj.clicks = Number(row.clicks ?? 0);
    obj.impressions = Number(row.impressions ?? 0);
    obj.ctr = Number(row.ctr ?? 0);
    obj.position = Number(row.position ?? 0);
    return obj;
  });
}

/** 不純：打 GA4 runReport，回正規化列；任何錯誤回 []。 */
export async function ga4Report(token, { dimensions, metrics, eventName, limit = 50, orderMetric, days }) {
  const body = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
    keepEmptyRows: false,
  };
  if (eventName) {
    body.dimensionFilter = { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventName } } };
  }
  if (orderMetric) body.orderBys = [{ metric: { metricName: orderMetric }, desc: true }];
  try {
    const r = await fetch(GA4_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) });
    if (!r.ok) return [];
    return normalizeGa4Rows(await r.json(), dimensions, metrics);
  } catch { return []; }
}

/** 不純：打 GSC searchAnalytics，回正規化列；任何錯誤回 []。 */
export async function gscQuery(token, { dimensions, startDate, endDate, rowLimit = 100 }) {
  const body = { startDate, endDate, dimensions, rowLimit };
  try {
    const r = await fetch(GSC_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) });
    if (!r.ok) return [];
    return normalizeGscRows(await r.json(), dimensions);
  } catch { return []; }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/insight-fetch.test.mjs`
Expected: PASS（4 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/insight-fetch.mjs scripts/lib/insight-fetch.test.mjs
git commit -m "feat(insights): fetch 層 — gcloud token + GA4/GSC 請求 + 純正規化"
```

---

## Task 4: 策略共用 helper + demandScore

**Files:**
- Create: `scripts/lib/insight-strategies.mjs`（本任務先放 helper 與 emptyBucket）
- Test: `scripts/lib/insight-strategies.test.mjs`（本任務先測 helper）

- [ ] **Step 1: 寫失敗測試**

Create `scripts/lib/insight-strategies.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 helper**

Create `scripts/lib/insight-strategies.mjs`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: PASS（4 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/insight-strategies.mjs scripts/lib/insight-strategies.test.mjs
git commit -m "feat(insights): 策略共用 helper（demandScore/isQuestionQuery/slugFromUrl）"
```

---

## Task 5: 選題策略 — search-gap / onsite-search / trend-radar / llm-referral

**Files:**
- Modify: `scripts/lib/insight-strategies.mjs`
- Modify: `scripts/lib/insight-strategies.test.mjs`

- [ ] **Step 1: 寫失敗測試（追加）**

Append to `scripts/lib/insight-strategies.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: FAIL（4 個 strategy 函數未定義）。

- [ ] **Step 3: 實作四個選題策略**

Append to `scripts/lib/insight-strategies.mjs`：

```js
import { queryHasExistingPage } from './content-index.mjs';

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
```

> 註：`strategyTrendRadar` 的候選多帶一個 `editorPickHint:true` 旗標，供 Phase 2 提示主編選題；不影響其他策略的型別（其餘候選無此鍵）。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: PASS（含先前 helper 共 12 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/insight-strategies.mjs scripts/lib/insight-strategies.test.mjs
git commit -m "feat(insights): 選題策略 search-gap/onsite-search/trend-radar/llm-referral"
```

---

## Task 6: 寫法策略 — completion-style / aeo-structure

**Files:**
- Modify: `scripts/lib/insight-strategies.mjs`
- Modify: `scripts/lib/insight-strategies.test.mjs`

- [ ] **Step 1: 寫失敗測試（追加）**

Append to `scripts/lib/insight-strategies.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: FAIL（2 函數未定義）。

- [ ] **Step 3: 實作兩個寫法策略**

Append to `scripts/lib/insight-strategies.mjs`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: PASS（共 16 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/insight-strategies.mjs scripts/lib/insight-strategies.test.mjs
git commit -m "feat(insights): 寫法策略 completion-style/aeo-structure"
```

---

## Task 7: 既有頁策略 — rank-boost / question-faq

**Files:**
- Modify: `scripts/lib/insight-strategies.mjs`
- Modify: `scripts/lib/insight-strategies.test.mjs`

- [ ] **Step 1: 寫失敗測試（追加）**

Append to `scripts/lib/insight-strategies.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: FAIL（2 函數未定義）。

- [ ] **Step 3: 實作兩個既有頁策略**

Append to `scripts/lib/insight-strategies.mjs`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/insight-strategies.test.mjs`
Expected: PASS（共 21 測試）。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/insight-strategies.mjs scripts/lib/insight-strategies.test.mjs
git commit -m "feat(insights): 既有頁策略 rank-boost/question-faq"
```

---

## Task 8: 組裝層 entrypoint

**Files:**
- Create: `scripts/audience-insights.mjs`
- Modify: `package.json`（加 `insights` script）
- Test: `scripts/lib/assemble.test.mjs`（測純合併函數）
- Create: `scripts/lib/assemble.mjs`（純合併 + dataHealth）

- [ ] **Step 1: 寫失敗測試（純合併）**

Create `scripts/lib/assemble.test.mjs`：

```js
import { describe, it, expect } from 'vitest';
import { mergeBuckets, computeDataHealth } from './assemble.mjs';

describe('mergeBuckets', () => {
  it('合併多個策略桶為單一三桶', () => {
    const a = { topicCandidates: [{ topic: 't1' }], writingDirectives: [], siteOptimizations: [] };
    const b = { topicCandidates: [{ topic: 't2' }], writingDirectives: [{ directive: 'd' }], siteOptimizations: [] };
    const merged = mergeBuckets([a, b]);
    expect(merged.topicCandidates).toHaveLength(2);
    expect(merged.writingDirectives).toHaveLength(1);
    expect(merged.siteOptimizations).toHaveLength(0);
  });
});

describe('computeDataHealth', () => {
  it('標記 sparse 當事件與 GSC 列都極少', () => {
    expect(computeDataHealth({ ga4Events: 0, gscRows: 2 }).sparse).toBe(true);
    expect(computeDataHealth({ ga4Events: 500, gscRows: 50 }).sparse).toBe(false);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm exec vitest run scripts/lib/assemble.test.mjs`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作純合併**

Create `scripts/lib/assemble.mjs`：

```js
/** 把多個策略 Bucket 合併成一個三桶。 */
export function mergeBuckets(buckets) {
  return {
    topicCandidates: buckets.flatMap((b) => b.topicCandidates ?? []),
    writingDirectives: buckets.flatMap((b) => b.writingDirectives ?? []),
    siteOptimizations: buckets.flatMap((b) => b.siteOptimizations ?? []),
  };
}

/** 依事件量/GSC 列數標記資料是否稀疏。 */
export function computeDataHealth({ ga4Events, gscRows }) {
  return { ga4Events, gscRows, sparse: ga4Events < 100 || gscRows < 10 };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm exec vitest run scripts/lib/assemble.test.mjs`
Expected: PASS（2 測試）。

- [ ] **Step 5: 實作 entrypoint**

Create `scripts/audience-insights.mjs`：

```js
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
    gscQuery(token, { dimensions: ['query'], startDate: tw(2 * T), endDate: tw(T), rowLimit: 200 }),
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
```

新增 `emptyBucketFile` 到 `scripts/lib/assemble.mjs`：

```js
export function emptyBucketFile(generatedAt, cfg, reason) {
  return {
    generatedAt,
    window: { ga4Days: cfg?.windowDays ?? 0, gscDays: cfg?.windowDays ?? 0 },
    dataHealth: { ga4Events: 0, gscRows: 0, sparse: true, note: reason },
    topicCandidates: [], writingDirectives: [], siteOptimizations: [],
  };
}
```

- [ ] **Step 6: 加 package.json script**

在 `package.json` `scripts` 加：

```json
"insights": "node scripts/audience-insights.mjs",
```

- [ ] **Step 7: 全測試綠**

Run: `pnpm exec vitest run`
Expected: 既有 + 新增測試全 PASS。

- [ ] **Step 8: Commit**

```bash
git add scripts/audience-insights.mjs scripts/lib/assemble.mjs scripts/lib/assemble.test.mjs package.json
git commit -m "feat(insights): 組裝層 entrypoint — fetch→8策略→合併→寫檔，含優雅退化"
```

---

## Task 9: 管線消費（SOP / AGENTS 指令層 + 修正過時敘述）

**Files:**
- Modify: `docs/news_sop.md`（Phase 2 步驟 + 修正第一節）
- Modify: `AGENTS.md`（撰寫趨勢文章流程）

- [ ] **Step 1: 修正 news_sop.md 第一節（過時的雲端排程敘述）**

把 `docs/news_sop.md`「一、排程與觸發」表格改為反映實際：

```markdown
## 一、排程與觸發

| 項目 | 設定 |
|------|------|
| 執行方式 | 使用者 server 上的 `cron` 呼叫 `claude -p`（headless）|
| 環境 | 具 gcloud 服務帳號認證 + 對外網路；可即時呼叫 GA4／GSC／WebSearch |
| 排程 | 由 server crontab 設定（建議每日數次，與內容節奏對齊）|
| 手動觸發 | 於 server 直接執行管線指令 |
```

- [ ] **Step 2: 在 news_sop.md「二、流程總覽」的 Phase 2 加 insights 步驟**

把 Phase 2 區塊改為：

```markdown
  ├─ Phase 2：編輯企劃（Sonnet x1）
  │   ├─ 執行 `node scripts/audience-insights.mjs`（即時抓 GA4+GSC → 8 策略）
  │   ├─ topicCandidates 併入素材池（來源標記 internal-demand）
  │   ├─ 五維度加權評分（話題性維度改吃候選 demandScore）→ 分組 → 撰文工單
  │   └─ 無工單 → 靜默結束
```

並在「五、評分與企劃規則」新增小節：

```markdown
### 5.3 Audience Insights 注入（GA4/GSC 數據驅動）

Phase 2 執行 `node scripts/audience-insights.mjs`，讀其輸出三桶：
- **topicCandidates** → 併入素材池一同評分；**話題性(10%)維度改用候選的 `demandScore`**（真實搜尋需求/AI 轉介），其餘四維度照舊。標記 `editorPickHint` 的候選可優先考慮主編選題。
- **writingDirectives** → Phase 3 撰文 agent 的 prompt 注入。
- **siteOptimizations** → 寫入 run summary，純人工建議，**不自動編輯既有文章**。

資料空（站點初期）時三桶皆空 → 行為等同未接入。設定見 `data/news-automation-config.json` 的 `audienceInsights`。詳見 `docs/playbooks/audience-insights.md`。
```

- [ ] **Step 3: 在 news_sop.md Phase 3 註明寫法注入**

把 Phase 3 區塊改為：

```markdown
  ├─ Phase 3：平行撰文（Sonnet x n）
  │   └─ 每份工單一個 agent，照撰文規則 + 注入 writingDirectives 產出 markdown
```

- [ ] **Step 4: 更新 AGENTS.md「撰寫趨勢文章」流程**

在 `AGENTS.md`「撰寫趨勢文章」步驟 3（評分與選題）前插入一步：

```markdown
2.5. 執行 `node scripts/audience-insights.mjs`，取得 topicCandidates / writingDirectives / siteOptimizations。將 topicCandidates 併入素材池（話題性維度用 demandScore）；writingDirectives 於撰文時注入；siteOptimizations 列入結尾報告供人工檢視。資料空時略過。
```

- [ ] **Step 5: Commit**

```bash
git add docs/news_sop.md AGENTS.md
git commit -m "docs(news): Phase 2 接入 audience-insights + 修正過時的排程敘述（→ server cron + claude -p）"
```

---

## Task 10: Playbook + README + architecture + 本機實跑驗證

**Files:**
- Create: `docs/playbooks/audience-insights.md`
- Modify: `README.md`（任務索引）
- Modify: `docs/architecture.md`（Analytics/GEO 區）

- [ ] **Step 1: 新增 playbook**

Create `docs/playbooks/audience-insights.md`（涵蓋：用途、鎖定參數、修改流程、常見陷阱、驗證清單）：

```markdown
# Playbook: Audience Insights（GA4/GSC 驅動 /news 選題與寫法）

> 功能：`scripts/audience-insights.mjs` 即時抓 GA4+GSC，跑 8 策略，吐三桶供 /news 管線 Phase 2 使用。
> Spec：`docs/superpowers/specs/2026-06-16-audience-insights-design.md`

## 結構
- `scripts/audience-insights.mjs` — 組裝層 entrypoint（`pnpm insights`）
- `scripts/lib/insight-fetch.mjs` — token + GA4/GSC + 正規化
- `scripts/lib/insight-strategies.mjs` — 8 純函數策略
- `scripts/lib/content-index.mjs` — 站內內容索引
- `scripts/lib/assemble.mjs` — 合併 + dataHealth
- 設定：`data/news-automation-config.json` → `audienceInsights`
- 輸出：`data/audience-insights.json`（**gitignore，不公開**）

## 鎖定參數（改前先確認）
- GA4 property `541692554`、GSC `sc-domain:evidencetoday.news`、SA `ga4-insights@yaocare`
- 門檻全在 config `audienceInsights.thresholds`，勿散落程式碼

## 修改流程（加新策略）
1. 在 `insight-strategies.mjs` 加 `(data,cfg)=>Bucket` 純函數，回 `emptyBucket()` 起手
2. 在 `insight-strategies.test.mjs` 先寫失敗測試（命中 + 空資料 + 門檻邊界）
3. 在 `audience-insights.mjs` 的策略陣列註冊
4. 若需新數據，於 entrypoint 加對應 `ga4Report`/`gscQuery` 拉取並放入 `data`

## 常見陷阱
- vitest 只收 `scripts/**/*.test.mjs`（已在 `vitest.config.ts` include）；測試副檔名必須 `.test.mjs`
- `data/audience-insights.json` **絕不可 commit**（含經營內幕；已在 .gitignore）
- 時區一律台灣 (UTC+8)：用 entrypoint 的 `tw()/nowTw()`，勿用裸 `new Date()`
- API/token 失敗一律回空桶 + exit 0，**不可擋發稿**

## 驗證清單
- [ ] `pnpm exec vitest run` 全綠
- [ ] `pnpm insights` 本機實跑：有認證時印出三桶 JSON；無認證時印空桶不報錯
- [ ] `git status` 確認 `data/audience-insights.json` 未被追蹤
```

- [ ] **Step 2: README 任務索引加一列**

在 `README.md` 任務索引表（或 `CLAUDE.md` 對應表）加：

```markdown
| GA4/GSC 數據驅動選題與寫法（audience insights） | `docs/playbooks/audience-insights.md` |
```

- [ ] **Step 3: architecture.md 補一段**

在 `docs/architecture.md` 的 Analytics/GEO 區補：

```markdown
### Audience Insights（閉環選題回饋）

`/news` 管線 Phase 2 執行 `scripts/audience-insights.mjs`，即時讀 GA4（讀完率/AI 轉介/站內搜尋）+ GSC（搜尋需求/排名），跑 8 策略產出 topicCandidates（選題）/writingDirectives（寫法）/siteOptimizations（人工建議）。輸出 `data/audience-insights.json` 為私密、gitignore。詳見 playbook 與 spec（2026-06-16）。
```

- [ ] **Step 4: 本機實跑驗證（有認證環境）**

Run: `pnpm insights`
Expected:
- 有 gcloud 認證：stdout 印出含 `generatedAt`（+08:00）、`dataHealth`、三桶的 JSON；現階段資料稀疏，候選可能少或空，但**不報錯**。
- 確認 `data/audience-insights.json` 已生成。

Run: `git status --short`
Expected: **看不到** `data/audience-insights.json`（已 gitignore）。

- [ ] **Step 5: Commit（僅文件，不含 insights JSON）**

```bash
git add docs/playbooks/audience-insights.md README.md docs/architecture.md
git commit -m "docs(insights): playbook + README 索引 + architecture 補 audience insights"
```

---

## 完成標準

- [ ] `pnpm exec vitest run` 全綠（含新增 ~23 個 insights 測試）
- [ ] `pnpm insights` 在有認證環境印出三桶、在無認證環境優雅退化
- [ ] `data/audience-insights.json` 不被 git 追蹤
- [ ] `/news` 管線文件（news_sop / AGENTS）已說明 Phase 2 注入流程
- [ ] news_sop 第一節過時的「雲端排程」敘述已修正為 server cron + `claude -p`
- [ ] playbook / README / architecture 同步（過 docs-sync-check）
