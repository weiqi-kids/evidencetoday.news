# Analytics Playbook

> 功能：GA4 事件追蹤 + 使用者同意管理  
> 分支：feat/ga4-analytics（分階段實作）

---

## 架構概覽

```
src/data/analytics.ts        # 設定常數（MEASUREMENT_ID、滾動里程碑等）
src/utils/analytics.ts       # 純邏輯 helpers ＋ 副作用層（同一檔，分兩段）
src/utils/analytics.test.ts  # TDD 測試（vitest node 環境，含副作用層 stub 測試）
src/layouts/Base.astro       # 全站 inline <script> 每頁呼叫 bootstrapAnalytics()
```

> **2026-06-17 變更**：移除底部 Cookie 同意彈窗（`ConsentBanner.svelte`）與隱私頁退出控件（`ConsentReset.svelte`，兩檔已刪除）。GA4 改為**每頁無條件載入**，蒐集基本流量（page_view）與全部富事件（scroll / engaged_view 等）。`trackEvent` **不再 consent-gated**，只要 `MEASUREMENT_ID` 有值即送出（設 `''` 可全域停用）。同意狀態機（`setConsent` / `reduceConsent` / `onConsentChange` / `readConsent` / `isTrackable`）保留於 `analytics.ts`，純函數與測試不變，但已不接任何前台 UI、也不再參與 `trackEvent` 把關。

**設計原則：關注點分離**

- `src/data/analytics.ts` — 唯一常數來源；需調整閾值或 Measurement ID 只改這裡。
- `src/utils/analytics.ts` 第一段 — 純函數（pure logic）；不含任何 `window`/`document`/`localStorage`/`gtag` 存取。
- `src/utils/analytics.ts` 第二段 — 副作用層；唯一允許接觸 `window`/`localStorage`/`gtag`/`dataLayer` 的模組。所有全域存取均以 `typeof` guard 保護，SSR/Node import 不會拋出。

---

## 設定常數（`src/data/analytics.ts`）

| 常數 | 預設值 | 說明 |
|---|---|---|
| `MEASUREMENT_ID` | `'G-5JH83LM8X7'` | 設為 `''` 可全域停用追蹤 |
| `CONSENT_KEY` | `'et_consent'` | localStorage key |
| `CONSENT_EVENT` | `'et:consent-change'` | CustomEvent 名稱 |
| `SCROLL_MILESTONES` | `[25, 50, 75, 90]` | 觸發滾動事件的 % 閾值 |
| `READ_COMPLETE_THRESHOLD` | `90` | 「閱讀完成」判斷 % |
| `ENGAGED_IDLE_TIMEOUT_MS` | `15_000` | 無活動超過此值暫停投入計時 |
| `ENGAGED_MAX_MS` | `1_800_000` | 單頁投入時間上限（30 分） |
| `MAX_QUEUE` | `50` | 同意前事件佇列上限 |
| `GA_CONFIG` | `{ anonymize_ip: true, send_page_view: true }` | gtag config 預設值 |

---

## 純邏輯 helpers（`src/utils/analytics.ts`）

### `isTrackable(status, measurementId)`
只有在 `status === 'granted'` 且 `measurementId !== ''` 時才回傳 `true`。

### `computeScrollDepth(scrollY, viewportH, contentTop, contentHeight)`
計算內容元素已被閱讀的百分比：
```
((scrollY + viewportH - contentTop) / contentHeight) * 100
```
夾在 [0, 100]。`contentHeight <= 0` 時回傳 0。

### `pendingMilestones(depth, fired, milestones)`
回傳所有 `m <= depth` 且不在 `fired` 集合中的里程碑，升冪排列。
支援快速滾動補發（monotonic backfill）：一次滾到 95% 會補發 [25,50,75,90] 中未觸發的。

### `parseConsent(raw)` / `serializeConsent(status)`
`localStorage` 字串與 `ConsentStatus` 之間的轉換。
- `'granted'` ↔ `'granted'`
- `'denied'` ↔ `'denied'`
- 其餘（null、空字串、任意值）↔ `'unset'`（serialize 為 `''`）

### `reduceConsent(prev, action)`
同意狀態的確定性狀態機（deterministic FSM）：

| prev | action | status | effects |
|---|---|---|---|
| any (≠granted) | accept | granted | `['dispatch','load','flush']` |
| granted | accept | granted | `[]` |
| any (≠denied) | decline | denied | `['dispatch']` |
| denied | decline | denied | `[]` |
| any (≠unset) | reset | unset | `['dispatch']` |
| unset | reset | unset | `[]` |

effects 意義：`dispatch`=發出 CustomEvent、`load`=載入 gtag.js、`flush`=排空事件佇列。

### `buildEventEnvelope(params, pageMeta)`
合併 `pageMeta` 與 `params`（params 優先），移除值為 `undefined` 的 key。
`null`、`0`、`''` 刻意保留。

---

## 副作用層（`src/utils/analytics.ts` 第二段）

### 模組私有狀態

| 變數 | 型別 | 說明 |
|---|---|---|
| `consentCache` | `ConsentStatus \| null` | 避免重複讀 localStorage |
| `gtagReady` | `boolean` | gtag bootstrap 是否已執行 |
| `gtagFailed` | `boolean` | script 載入失敗旗標 |
| `queue` | `Array<{name, params}>` | 同意前 / gtag 未就緒的事件佇列（上限 MAX_QUEUE=50） |

### API

| 函數 | 說明 |
|---|---|
| `readConsent()` | 讀取同意狀態（cache → localStorage → 'unset'）。localStorage 拋出時回傳 'unset'，不快取失敗 |
| `loadGtag()` | 冪等。注入 gtag.js `<script>`，初始化 dataLayer/gtag shim，標記 gtagReady=true，執行 flushQueue |
| `trackEvent(name, params)` | `MEASUREMENT_ID===''`→丟棄；gtag 未就緒→佇列（超過上限忽略）；就緒→立即發送（無同意橫幅後不再受 consent 把關） |
| `flushQueue()` | 當 gtagReady=true 時清空佇列 |
| `setConsent(action)` | 執行狀態機轉換，持久化至 localStorage，按 effects 順序執行 dispatch/load/flush |
| `bootstrapAnalytics()` | **每頁載入時呼叫**：無條件執行 `loadGtag()`（無同意橫幅，GA4 每頁載入蒐集 page_view）。由 `Base.astro` 的 inline `<script>` 呼叫。`loadGtag` 冪等且受 `MEASUREMENT_ID` 守門 |
| `onConsentChange(cb)` | 訂閱 `CONSENT_EVENT`，回傳 unsubscribe 函數；SSR 環境回傳 no-op |
| `__resetAnalyticsForTest()` | **僅限測試使用**：重置全部模組私有狀態 |

### gtag 載入流程

本站為 Astro MPA，每次換頁都是全新 JS context，模組私有的 `gtagReady`/`queue` 會歸零，故**每頁都得重新 bootstrap**。`Base.astro` 的 inline `<script>` 在每頁呼叫 `bootstrapAnalytics()`：

1. `bootstrapAnalytics()` → 無條件 `loadGtag()`
2. `loadGtag()` — 建立 `<script async src="https://www.googletagmanager.com/gtag/js?id=...">` 並 append 至 `document.head`，呼叫 `gtag('js', ...)`、`gtag('config', MEASUREMENT_ID, GA_CONFIG)`（`send_page_view: true` 故 page_view 自動送出）
3. `gtagReady = true`（dataLayer 會緩衝事件直到遠端腳本載入）
4. `flushQueue()` — 清空佇列

> `loadGtag` 冪等：`gtagReady`/`gtagFailed` 任一為 true、`MEASUREMENT_ID === ''` 或 SSR 環境（`document` undefined）時提前返回。

### setConsent effects 對照

| effect | 行為 |
|---|---|
| `dispatch` | `window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { status } }))` |
| `load` | `loadGtag()` |
| `flush` | `flushQueue()` |

---

## 測試

```bash
pnpm test -- src/utils/analytics.test.ts   # 只跑 analytics
pnpm test                                   # 全套
```

測試以 TDD 撰寫（vitest node 環境），148 個 case：
- 純函數：isTrackable / computeScrollDepth / pendingMilestones / parseConsent / serializeConsent / reduceConsent / buildEventEnvelope 的 truth table 與邊界情況
- 副作用層：以 `globalThis` stub 模擬 localStorage / window / document，不需 jsdom。涵蓋 readConsent 快取、setConsent accept/decline、事件佇列 flush、onConsentChange 訂閱與取消

---

---

## 同意橫幅與退出控件（已移除）

`ConsentBanner.svelte`（全站底部 Cookie 同意橫幅）與 `ConsentReset.svelte`（隱私頁退出控件）已於 **2026-06-17 刪除**。原因：MPA 每頁換頁都重新顯示底部彈窗，嚴重干擾閱讀，文案也易使讀者產生被追蹤感。

現況：

- **全站 GA4 載入**改由 `src/layouts/Base.astro` 底部 inline `<script>` 負責，每頁無條件呼叫 `bootstrapAnalytics()`。
- 前台**不再有任何底部同意彈窗**（手機 / 桌機皆無）。
- 隱私頁（`src/pages/privacy.astro`）「Cookie 與分析工具」段落改為純說明文字，不再嵌入退出控件。
- 同意狀態機（`setConsent` / `reduceConsent` / `onConsentChange` / `readConsent` / `isTrackable`）保留於 `analytics.ts` 供未來需要時重新接線；目前無前台 UI 觸發 `setConsent`，`trackEvent` 也不再呼叫 `isTrackable`。富事件（scroll / engaged_view 等）每頁 `bootstrapAnalytics()` 載入 gtag 後即正常送出，與舊版（按「接受」後）收集的資料完整度一致，差別只在沒有同意橫幅。

### Base.astro 載入片段

```astro
<script>
  import { bootstrapAnalytics } from '@/utils/analytics';
  bootstrapAnalytics();
</script>
```

> 若未來要恢復同意流程，重新掛載一個呼叫 `setConsent('accept'|'decline')` 的 island，並把 `bootstrapAnalytics()` 改回 consent-gated 即可；純邏輯與測試仍齊備。

---

## 常見陷阱

- **🛑 gtag shim 必須 push `arguments`，不可 push 陣列（曾導致全站 GA4 靜默歸零）。** `loadGtag` 內建立的 gtag shim 要寫成 `window.gtag = function () { window.dataLayer.push(arguments); }`（Google 官方 canonical 形式）。**禁止**寫成 `(...args) => dataLayer.push(args)` 這種推普通陣列的形式：`gtag.js` 載入後回掃 `dataLayer` 佇列時，只把**原生 `arguments` 物件**當成有效指令，普通陣列會被當 data-layer 資料**靜默忽略**，於是 `config`（含 `send_page_view`）與所有 event 都不會送達 GA4 → 即時報表恆為 0、property 顯示「尚未收到資料」。此坑無 CSP/封鎖徵兆、`gtag/js` 仍回 200，極難從外部察覺；驗證法＝無痕開頁看 GA4 Realtime 是否跳人。測試用 `vi.fn` 取代 `window.gtag`，**不會覆蓋此 shim 分支**，故單元測試綠燈也擋不住——改 shim 後務必以真瀏覽器 Realtime 實測。
- **禁止**在純函數段（第一段）存取 `window`/`document`/`localStorage`/`gtag`——Node 環境 import 會爆。
- 副作用層所有全域存取均需 `typeof xxx !== 'undefined'` guard，SSR 不能拋出。
- `MEASUREMENT_ID` 設為 `''` 可全域停用追蹤，`isTrackable` 回傳 `false`，`loadGtag` 提前返回。
- `reduceConsent` 只回傳 `{ status, effects }`，不做儲存；`setConsent` 負責 localStorage 寫入與 effects 執行。
- `buildEventEnvelope` 移除 `undefined`（不是 `null`）——傳入 `null` 是刻意的「無值」標記，會被保留送往 GA4。
- `__resetAnalyticsForTest` 僅限測試 `beforeEach` 呼叫，生產環境禁用。

---

## ReadingEngagement island（`src/components/blocks/ReadingEngagement.svelte`）

閱讀互動追蹤島。**不渲染任何可見 UI**（純 `<script>` 區塊）。掛載於 article / myth / ingredient 單篇頁（`client:idle`）。

### 掛載位置（三個單篇頁）

| 頁面 | 檔案 | Props 對應 |
|---|---|---|
| articles | `src/pages/articles/[slug].astro` | `contentType="article"` `slug={slug}` `tags={data.tags}` `author={data.author}` `queryPattern={data.queryPattern}` `readingTime={data.readingTime}` `hasRelated={hasRelated}` |
| myths | `src/pages/myths/[slug].astro` | `contentType="myth"` `slug={entry.id.replace(...)}` `tags={d.topicTags}` `author={d.author}` `verdict={d.verdict}` `evidenceLevel={d.evidenceLevel}` `hasRelated={false}` |
| ingredients | `src/pages/ingredients/[slug].astro` | `contentType="ingredient"` `slug={slug}` `tags={data.tags}` `hasRelated={hasRelated}` |

- articles 的 `hasRelated` 由 `relatedMyths / relatedIngredients / relatedVideos / relatedPodcasts` 四個陣列長度計算（已在 frontmatter 中定義）。
- myths 無 related section，固定 `hasRelated={false}`；無 `readingTime` 與 `queryPattern` 欄位（省略，component 用預設值）。
- ingredients 無 `author`、`evidenceLevel`、`readingTime` 頁面欄位（省略）；`hasRelated` 由 `relatedArticles / relatedMyths / relatedVideos / relatedPodcasts` 計算。

### Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `contentType` | `string` | — | 內容種類（`'article'`、`'myth'`、`'ingredient'` 等） |
| `slug` | `string` | — | 文章 slug |
| `tags` | `string[]` | `[]` | 文章標籤；`tags[0]` 作為 `content_category` |
| `author` | `string` | `''` | 作者 |
| `queryPattern` | `string?` | — | AEO 問題模式 |
| `verdict` | `string?` | — | 闢謠判定（myths 用） |
| `evidenceLevel` | `string?` | — | 證據等級 |
| `readingTime` | `number` | `0` | 閱讀時間（分鐘）；用於計算 `read_complete` 時間門檻與 `reading_time_bucket` |
| `hasRelated` | `boolean` | `false` | 是否有「延伸閱讀」區塊（開啟 `select_content` 監聽） |

### pageMeta（自動組合，每個事件 envelope 均含）

```ts
{
  content_type, content_slug, content_category,  // tags[0] ?? ''
  author, query_pattern, verdict, evidence_level,
  reading_time_bucket  // '<3' | '3-6' | '6-10' | '10+'
}
```

### 追蹤事件一覽

| 事件名稱 | 觸發時機 | 主要參數 |
|---|---|---|
| `content_view` | 掛載後立即（once） | pageMeta |
| `scroll` | 捲動達 25 / 50 / 75 / 90% | `percent_scrolled` |
| `read_complete` | maxScroll ≥ 90% **且** engagedSec ≥ 時間門檻（once） | `engaged_time_sec`, `completion_ratio` |
| `engaged_view` | `pagehide` 或 `visibilitychange→hidden`（once，bfcache 重置） | `engaged_time_sec`, `max_scroll_percent`, `read_completed`, `reached_references`, `transport_type:'beacon'` |
| `read_skim` | flush 時 maxScroll ≥ 75% 且從未達時間門檻 | pageMeta |
| `select_content` | `.related-content__grid` 內連結被點擊（需 `hasRelated=true`） | `content_type:'related_card'`, `item_id`, `source_type/slug`, `target_type/slug`, `link_position`, `link_text` |
| `faq_open` | `.article-faq` 內 `details.faq-accordion__item` 展開（每個 index 觸發一次） | `faq_index`, `faq_question` |
| `click` | `.reference-list` 內 `a[target="_blank"]` 點擊 | `outbound:true`, `link_url`, `link_domain`, `reference_index` |
| `references_expand` | `details.reference-list` 展開（once） | pageMeta |

### read_complete 三道門檻

1. `maxScroll ≥ 90`
2. `engagedSec ≥ clamp(floor(readingTime * 60 * 0.5), 20, 240)`
3. 上述兩個條件同時成立時才觸發（latch，永不重複）

### 投入時間（engagedMs）計算規則

- `setInterval(1000)` 每秒 tick，只在以下三個條件全部成立時累加：
  1. `document.visibilityState === 'visible'`
  2. `document.hasFocus()`
  3. `Date.now() - lastActivity ≤ 15,000 ms`（ENGAGED_IDLE_TIMEOUT_MS）
- `lastActivity` 由 `scroll / keydown / pointermove / pointerdown / wheel / touchstart` 更新（passive）；`resetActivity()` **只更新 `lastActivity`**，不動 `lastTickTime`（避免縮短 tick delta）
- `visibilitychange→hidden` 與 `blur` 立即暫停計時；`visibilitychange→visible` 先呼叫 `resetActivity()` 再恢復計時（防止返回頁面被誤計為閒置）；`focus` 恢復計時
- 上限 1,800,000 ms（ENGAGED_MAX_MS = 30 分）
- bfcache 恢復（`pageshow` 且 `event.persisted`）：完整重置所有單次瀏覽計數器（`engagedMs / maxScroll / timeGateMet / readCompleteFired / reachedReferences / firedScrollMilestones / firedFaqIndexes / referenceExpandFired / engagedViewSent / lastActivity / lastTickTime`），再恢復計時

### DOM 選擇器依賴（頁面必須存在才會生效）

| 選擇器 | 功能 |
|---|---|
| `.article-content` | 捲動深度計算基準（fallback `document.documentElement`） |
| `.related-content__grid` | select_content 委派監聽（需 `hasRelated=true`） |
| `.article-faq` | FAQ 展開追蹤 |
| `details.faq-accordion__item` | FAQ 個別 item（在 `.article-faq` 內） |
| `.reference-list` 或 `.article-references` | 來源點擊 / 展開 / reached_references |

### 修改規則

- **所有事件必須經由 `trackEvent()`**，禁止直接呼叫 `window.gtag`。
- 全部 listener / observer / interval 在 `$effect` return 函數中清除。
- scroll 與 activity listeners 均加 `{ passive: true }`。
- SSR guard：`$effect` 頂層先檢查 `typeof window === 'undefined'`，是則立即返回。
- 不新增任何 npm 依賴。

## 為什麼有些頁進不了索引：內容厚度（2026-08-06 實測）

`ingredients` 索引率長期是主要分類裡最低的。查證過程與結論：

**排除掉的三個假設**
- 技術面：未索引頁的 canonical 正確自指、無 noindex、都在 sitemap、導覽列連結是真 `<a>`。與已索引頁逐項比對完全相同。
- 站內連結：已索引與未索引的入站連結中位數都是 8。未索引的 `milk-thistle`(15)、`vitamin-c`(14) 反而多於已索引的 `probiotics`(8)、`calcium`(9)。
- 新舊：長稿多集中在後期，會與「新的比較容易被索引」混淆——但方向其實相反，未索引的反而是**較早**的稿。

**⚠️ 更正（同日稍晚）：長度是代理指標，真因是跨頁樣板重複。**

初步只比對字數，得到「≈4,050 字為界、分類正確率 92%」的結論。實際打開檔案才發現，未索引頁的 body 有**中位 45%** 是與其他成分頁**一字不差**的樣板段落（已索引頁為 **0%**）。共 11 段，其中 4 段出現在全部 20 篇裡，例如「實際閱讀產品標示時，可以先做三個檢查……」「若屬必需營養素，官方建議量會依年齡、性別、孕哺狀態……**若屬草本或植化素**，通常沒有每日必需建議量」——後者連自己在寫哪一種成分都不知道，所以兩種情況都寫。同批頁面的參考資料也是佔位（`Primary reference for X`、連到 PubMed 首頁而非單篇）。

所以字數短是**症狀**：body 近半是填充樣板，真正屬於該成分的內容本來就少。這正是硬規則 8 禁的 AI 量產寫法，Google 不收錄是合理判斷。

**對後續工作的意義**：把這些頁「加長」會得到 20 篇更長的樣板，一樣不會被收錄。要做的是拆掉共用段落、改寫成只適用於該成分的內容。判斷有沒有做到的方法不是看字數，是看「這段話換一個成分名還讀得通嗎」——讀得通就是樣板。

以下為初次分析的原始記錄，保留作為「相關性不等於因果」的實例：

**站得住的只有內容長度**。以 49 篇已公開成分頁做門檻掃描，最佳分界 ≈ **4,050 字**（去空白純內文），分類正確率 92%：≥4,050 字的 25 頁**全部**已索引；<4,050 字的 24 頁只有 4 頁進索引。最長的未索引頁是 4,003 字，剛好卡在線下。

**關鍵反證**：`vitamin-e` 與 `vitamin-c`／`zinc`／`vitamin-k` 同屬最早那批（3 月），但它有 7,316 字而被索引，同批短稿全數未索引。只看 7 月前的舊稿，≥4,050 字的 3 頁（`astaxanthin`／`creatine`／`vitamin-e`）全部已索引。新舊因此不成立。

⚠️ **4,050 不是 Google 的規則**，更不是本案的病因（見上方更正），是這個站上觀察到的相關性；Google 沒有字數門檻，真正的機制是「有沒有值得收錄的獨立價值」，字數只是代理。**湊字數無效，寫厚才有效。**

⚠️ 這批未索引頁正好是搜尋量最大、競爭最激烈的通用詞（維生素 C／D、鋅、鎂、鐵、膠原蛋白、薑黃、Omega-3、葉酸、Q10、葉黃素）。被索引是入場券，不等於排得上去。

查法可複用：`pnpm index:coverage` 拿分類覆蓋率 → 對單一 collection 逐頁打 URL Inspection 取 `coverageState` → 與內文字數／references 數／入站連結／發布日交叉，並**務必在同一時期的稿內部再比一次**排除新舊混淆。

## `pnpm index:coverage` 現在會列出「沒被收錄的是哪幾頁」（2026-08-08）

原本只印彙總計數（245/345），回答不了最關鍵的那個問題：**Google 到底不收哪幾頁、為什麼。**
而那正是唯一能判斷「該衝內容量還是先修既有頁」的資料——如果新頁有兩成機率不被收，
「再多寫幾篇」就是錯的方向，因為每一頁不被收的薄頁對整站是負分。

現在會做兩件事：
1. 直接印出未收錄清單，依 `coverageState` 分組。
2. 逐 URL 明細（含 `lastCrawlTime`）寫到
   `/root/.config/evidencetoday-news/index-coverage-latest.json`，供交叉分析。

**兩種狀態的意義不同，不要混著看：**
- `Discovered - currently not indexed` —— Google 知道這頁但**選擇不收**。這是品質訊號，
  多半與內容量或跨頁重複有關。
- `URL is unknown to Google` —— 還沒被發現。這是內鏈或時間問題，不是品質問題。

會加這個是因為 2026-08-08 要做「已收錄 vs 未收錄差在哪」的分析時，發現歷史檔只有彙總，
得另外寫臨時腳本重跑一次 345 個 URL。URL Inspection API 有額度，重跑不是免費的。

## 「未索引＝還沒輪到」是錯的（2026-08-08 實測推翻）

`index:coverage` 原本在已索引數上升時一律建議「回補中，多屬時間問題，續觀察」。
把逐 URL 狀態對上 `publishDate` 之後，那句話站不住腳。

**依發布月份的索引率：**

| 月份 | 索引率 |
|---|---|
| 2026-03 | 76% |
| **2026-04** | **38%** |
| **2026-05** | **53%** |
| 2026-06 | 71% |
| **2026-07** | **97%** |
| 2026-08 | 84%（仍在排隊，會再上升） |

**索引率不隨時間單調上升，它跟著「發布當時的內容品質」走。** 近期產出幾乎全被收錄，
拖累總數的是 4–5 月那批——而它們已經上線 90–120 天，Google 不是還沒看，是看過了決定不收。
對這種頁「續觀察」等於永遠不處理。

**這對經營決策的意義：**「該不該再寫新內容」的答案是**該**。7 月的內容 97% 被收錄，
產能沒有被浪費。真正的拖累是一批特定的舊內容，那是另一件要分開處理的事，
不該讓它影響「要不要繼續產出」的判斷。

4–5 月未被收錄的 60 頁組成：news radar 21（自動產文）、articles 17、ingredients 11、
myths 6、videos 5。其中 ingredients 那 11 篇正是 2026-08-06 重寫過的那批，
是 8/21 驗證點的受測對象（見 `docs/reminders.md`），現在還太早看不出結果。

`pnpm index:coverage` 現在會直接印出這張月份表，不用再手動對。

**判讀原則：最近一兩個月偏低是正常的（還在排隊）；舊月份偏低才是品質訊號。**
