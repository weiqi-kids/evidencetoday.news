# GA4 + 同意橫幅 + 內容經營級閱讀互動追蹤

## Context（為什麼做）

站方要把「未來文章寫什麼、怎麼寫」變成**數據驅動**：知道哪些主題/型態的內容讀者真的讀得下去、讀完、會點下一篇、會回訪。需要的不是「裝個 GA 看流量」，而是一套自訂事件 + 自訂維度的量測體系，能把「每篇閱讀時間／是否讀完／點擊下一篇／留存」按 `主題/分類/內容型態/證據等級/查詢意圖` 切分，回頭指導選題與寫法。

GA4 Measurement ID `G-5JH83LM8X7`（已建立）。使用者選擇 **完整 cookie 同意橫幅**：GA 只在「接受」後載入，拒絕＝永不載入、不放 cookie。隱私頁（`src/pages/privacy.astro`）已自我承諾「導入 GA 會更新說明並提供退出機制」，本計畫一併履行。

靜態站、GitHub Pages 部署、Lighthouse warn-mode（跑 dist，未同意頁無 GA → 不傷效能門檻）。Svelte 5.55（runes）、island 慣例 `client:idle`、config 慣例放 `src/data/`、無 .env（GA ID 為公開值，直接提交）。

## 架構（三層，純邏輯與副作用嚴格分離）

1. **Config** `src/data/analytics.ts` — 常數（Measurement ID、localStorage key、捲動里程碑、門檻）。純資料。
2. **Util** `src/utils/analytics.ts` — 同意狀態唯一真相 + 唯一碰 `gtag`/`dataLayer` 的模組。純函式（`isTrackable`/`computeScrollDepth`/`nextUnfiredMilestone`/`parseConsent`/`reduceConsent`/`buildEventEnvelope`）與副作用薄層（`readConsent`/`setConsent`/`loadGtag`/`trackEvent`/`onConsentChange`）分開，前者用 vitest 測。
3. **Islands**（Svelte，`client:idle`）：
   - `ConsentBanner.svelte`（全站，掛 `Base.astro`）：接受/拒絕，寫 localStorage，接受時注入 gtag、flush 事件佇列。
   - `ReadingEngagement.svelte`（文章/闢謠/成分頁，無可見輸出）：把該頁 metadata 當 props，掛各種互動監聽 → 全部走 `trackEvent`（自動受同意門檻）。
   - `ConsentReset.svelte`（隱私頁）：顯示目前選擇 + 「變更我的選擇」清除重來。

**同意單一真相** = `localStorage['et_consent']`；跨 island/util 協調用 `window` 上的自訂事件 `et:consent-change`（比照站上既有 `window`+`addEventListener` 風格，不引入 store 套件）。`trackEvent` 在「未同意 / gtag 未就緒」時：未同意→丟棄；已同意未就緒→入有界佇列，gtag 就緒後 flush。**接受前不載入 gtag.js、不放 `_ga` cookie、不發任何請求。**

## 事件分類（量測核心 — 使用者最在意的部分）

| 事件 | 觸發 | 關鍵參數 | 說明 |
|---|---|---|---|
| `page_view`（強化） | 每頁載入（同意後；接受前的首頁 view 入佇列補送） | content_type, content_category, query_pattern, verdict, evidence_level, author, content_slug, reading_time_bucket, is_editor_reviewed | 富化原生 page_view，讓所有原生報表可按內容切分 |
| `scroll`（自訂門檻） | `.article-content`（非視窗）捲過 25/50/75/90% | percent_scrolled, content_type, content_slug | 每里程碑每次瀏覽僅一次（Set 去重、單調補發）。關閉 Enhanced Measurement 的 scroll |
| `read_complete` | 三閘全過：①捲動≥90% ②投入時間≥`floor(readingTime×60×0.5)`（下限 20s、上限 240s）③順序正確 | engaged_time_sec, completion_ratio, content_type, query_pattern, verdict | **頭號指標**：用投入時間+捲動排除略讀 |
| `read_skim` | pagehide 時 捲動≥75% 但投入時間閘從未達標 | content_type, content_slug | read_complete 的反向訊號，配對看「黏著度」 |
| `engaged_view` | 首次 pagehide/隱藏（sendBeacon） | engaged_time_sec, max_scroll_percent, read_completed, reached_references, content_type, query_pattern, verdict | **真實主動閱讀時間**：僅在 可見+聚焦+15s 內有活動 時累計，blur/hidden 暫停；上限 1800s |
| `select_content`（=next_article_click） | 點 `.related-content__grid a`（articles/ingredients 有、myths 無） | source_type, source_slug, target_type, target_slug, link_position, link_text | 用 GA4 建議名 `select_content` + 自訂參數，兼得原生報表與位置/來源 |
| `faq_open` | `.article-faq details.faq-accordion__item` 的 `toggle` 且 `.open`（原生 details，已確認） | faq_index, faq_question, content_type, content_slug | 僅開啟、每題每頁一次 |
| `click`（outbound，=reference_click） | `.reference-list a[target="_blank"]` 點擊 | link_url, link_domain, reference_index, content_type, evidence_level | 用建議名 `click`+`outbound:true`；關閉 Enhanced Measurement outbound 避免重複 |
| `references_expand` | `details.reference-list` summary 開啟 | content_type, content_slug | 有多少讀者去看一手來源（信任訊號） |
| `view_search_results` | `/search/?q=`（原生 Enhanced Measurement，保留開啟） | search_term | 「讀者想要但還沒寫」的金礦 |
| video（原生） | YouTube 內嵌（Enhanced Measurement video，保留） | — | 影音基本追蹤，無需自訂碼 |

**留存/回訪**：GA4 原生（`_ga` cookie 的 client_id → New/Returning、Retention、Cohort），**無需自訂碼**；僅對「接受同意」的使用者可量測，故為相對趨勢非絕對值（誠實註記，不用 localStorage 自建 ID 繞過，那會違背同意機制）。

## 檔案結構

**新增**
- `src/data/analytics.ts` — 常數（見下）。
- `src/utils/analytics.ts` — 同意 SSOT + gtag 載入 + trackEvent + 純helpers。
- `src/utils/analytics.test.ts` — 純邏輯/狀態機 vitest 測試。
- `src/components/blocks/ConsentBanner.svelte` — 全站同意橫幅 island。
- `src/components/blocks/ReadingEngagement.svelte` — 頁級互動追蹤 island。
- `src/components/blocks/ConsentReset.svelte` — 隱私頁「變更選擇」island。
- `docs/playbooks/analytics.md` — 事件分類/參數/同意模型/驗證清單（並在 `docs/architecture.md`、`CLAUDE.md` 任務索引連結）。

**修改**
- `src/layouts/Base.astro` — 在 `<slot name="scripts" />` 前掛 `<ConsentBanner client:idle />`。
- `src/pages/articles/[slug].astro`、`myths/[slug].astro`、`ingredients/[slug].astro` — 掛 `<ReadingEngagement client:idle …props />`（比照既有 `EditButton` 掛法；myths 設 `hasRelated={false}`、無 queryPattern）。
- `src/pages/privacy.astro` — 改寫 Cookie/分析段為主動揭露 + 掛 `<ConsentReset client:idle />`。

**重用既有**（不重造）：`TableOfContents.svelte` 的 `IntersectionObserver`+`$effect`cleanup 模式、`EditButton.svelte` 的頁級 island 掛法、原生 `<details>`（FaqAccordion.astro / ReferenceList.astro）。**不新增 npm 依賴**（gtag 為 runtime `<script>` 注入）。

### `src/data/analytics.ts` 形狀
```ts
export type ConsentStatus = 'granted' | 'denied' | 'unset';
export const MEASUREMENT_ID = 'G-5JH83LM8X7'; // 公開值，直接提交；設 '' 可全域停用
export const CONSENT_KEY = 'et_consent';
export const CONSENT_EVENT = 'et:consent-change';
export const SCROLL_MILESTONES = [25, 50, 75, 90] as const;
export const READ_COMPLETE_THRESHOLD = 90;
export const ENGAGED_IDLE_TIMEOUT_MS = 15_000;
export const ENGAGED_MAX_MS = 1_800_000;
export const MAX_QUEUE = 50;
export const GA_CONFIG = { anonymize_ip: true, send_page_view: true } as const;
```

## 任務拆解（TDD 順序、bite-sized）

1. **Config 常數** `src/data/analytics.ts`。驗證：`pnpm build` 綠。
2. **純 helpers + 測試（先紅後綠）** `src/utils/analytics.test.ts` → `src/utils/analytics.ts` 純段。測 `isTrackable` 真值表、`computeScrollDepth` 邊界、`nextUnfiredMilestone`、`parseConsent/serializeConsent` round-trip、`reduceConsent`（unset+accept→granted 且 effects=['dispatch','load','flush']；unset+decline→denied effects=['dispatch']；re-accept 冪等）、`buildEventEnvelope` 合併 meta 去 undefined。驗證：`pnpm test` 綠。
3. **副作用薄層** `src/utils/analytics.ts`（runtime）：`readConsent/setConsent/loadGtag/trackEvent/onConsentChange`，全在函式內碰 window（import 時不碰）。輕量測試注入假 localStorage + 捕捉 dispatch。驗證：`pnpm test`、`pnpm build` 綠。
4. **ConsentBanner.svelte**（全站，掛 Base.astro）。`status==='unset'` 才顯示；接受→`setConsent('granted')`，拒絕→`setConsent('denied')`；訂閱 `et:consent-change`（$effect cleanup 退訂）。驗證：`pnpm preview` — 載入無 `gtag/js` 請求；按接受恰一個 `gtag/js?id=G-5JH83LM8X7` 請求、拒絕零請求；reload 記住選擇。
5. **ReadingEngagement.svelte**（核心）。props：`contentType, slug, tags, author, queryPattern?, verdict?, evidenceLevel?, readingTime, hasRelated`。各監聽各自 `$effect`+cleanup：捲動深度（IntersectionObserver 觀察注入的 sentinel 或對 `.article-content` 算 %，Set 去重）、投入時間（Visibility/focus/blur/activity，pagehide 用 sendBeacon flush）、read_complete（三閘、latch）、related 點擊委派（`hasRelated` 才掛）、faq_open（`.article-faq details` 的 toggle）、reference_click + references_expand（`.reference-list`）。全走 `trackEvent`（island 不自讀同意）。驗證：build 後 dist 文章/闢謠/成分 HTML 含此 island、他頁無；preview+DebugView：未同意零事件、接受後各事件出現；myths 頁無 `.related-content__grid` 不報錯。
6. **頁面接線** 三個 `[slug].astro` 加 `<ReadingEngagement client:idle …/>`（myths 略 queryPattern、`hasRelated={false}`）。驗證：`pnpm build` 零錯誤、grep dist 的 `astro-island props`。
7. **隱私頁 + ConsentReset** 改寫 Cookie/分析段（GA4 僅同意後載入、IP 匿名、無跨站追蹤、退出方式；台灣繁中、無聳動/醫療承諾），掛 `<ConsentReset client:idle />`（顯示 granted/denied/未選擇 + 清除按鈕）。驗證：preview 顯示現選、清除後下一頁橫幅重現。
8. **docs 同步**（CI `docs-sync-check` 必過）：`docs/playbooks/analytics.md` + `architecture.md`/`CLAUDE.md` 索引連結。

## 站方在 GA4 後台要做（非程式，搭配本計畫）

- **註冊事件範圍自訂維度**：content_type, content_category, query_pattern, verdict, evidence_level, author, content_slug, reading_time_bucket, is_editor_reviewed, target_type, link_position, read_completed, reached_references, link_domain（約 14 個，遠低於 25 上限）。**自訂指標**：engaged_time_sec, max_scroll_percent, completion_ratio。
- **Enhanced Measurement**：保留 ON＝page_view、site search、video；關 OFF＝scroll、outbound clicks（已被自訂取代，避免重複計數）。
- **建議**：開啟 **BigQuery 匯出**（免費額度足夠，per-article 不受 GA 門檻/抽樣限制，直接服務「每篇數字」目標）；**Google Signals 關閉**（低流量站會加重資料門檻）；保留「排除已知 bot」。
- **建 6–7 個 Exploration**：①主題/型態 engaged_time × read_complete 率排行 ②各 content_type 讀完 vs 略讀 ③相關文章點擊漏斗（含 link_position）④各主題回訪率/Cohort ⑤reading_time_bucket 長度甜蜜點與 completion_ratio 校準 ⑥證據等級 × reference 互動 ⑦未滿足需求（search_term + faq_open）。

## 驗證（端到端）

- `pnpm test` 全綠（含新 analytics 純邏輯測試）。
- `pnpm build` 零錯誤；`pnpm preview` + DevTools/GA DebugView：
  - 首載：**無** `googletagmanager.com/gtag/js` 請求、無 `_ga` cookie。
  - 按「接受」：恰一個 gtag 請求；捲動到 25/50/75/90 各發一次 `scroll`；停留並讀到底發 `read_complete`；點相關卡發 `select_content`；開 FAQ 發 `faq_open`；點來源連結發 `click(outbound)`；離開頁面發 `engaged_view`（sendBeacon）。
  - 按「拒絕」：以上全部零事件、零請求。
  - 隱私頁「變更我的選擇」清除後，下一頁橫幅重現。
- 三寬度（375/768/1280）確認橫幅版面；Lighthouse（warn）效能不退（未同意頁零 GA）。

## 風險/邊界（已納入設計）

- 同意 race：接受→gtag 下載期間事件入有界佇列、就緒後 flush；未同意事件丟棄不入佇列。
- 全頁載入（非 SPA）：每頁 island 重新掛載、狀態重置（per-page 正確）；投入時間務必 `pagehide`+sendBeacon flush。
- myths 無 related：`hasRelated=false` 完全跳過該委派；myths 的 reference/faq 選擇器找不到即靜默 no-op。
- gtag 載入失敗（adblock）：`script.onerror` 設旗標、trackEvent 廉價 no-op、清佇列。
- localStorage 不可用（Safari 無痕）：try/catch→視為 unset + session 內記憶體 fallback。
- 重複觸發：里程碑/read_complete/faq/各委派皆 latch；監聽於 `$effect` 掛載一次、cleanup 退掉。
- 效能：gtag `async`、同意後才載、`client:idle` 後；passive listeners；未同意頁零 GA bytes。
