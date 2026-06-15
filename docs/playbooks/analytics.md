# Analytics Playbook

> 功能：GA4 事件追蹤 + 使用者同意管理  
> 分支：feat/ga4-analytics（分階段實作）

---

## 架構概覽

```
src/data/analytics.ts                     # 設定常數（MEASUREMENT_ID、同意鍵值、滾動里程碑等）
src/utils/analytics.ts                    # 純邏輯 helpers ＋ 副作用層（同一檔，分兩段）
src/utils/analytics.test.ts              # TDD 測試（vitest node 環境，含副作用層 stub 測試）
src/components/blocks/ConsentBanner.svelte # Cookie 同意橫幅 island（client:idle）
src/layouts/Base.astro                     # 全站掛載 ConsentBanner
```

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
| `trackEvent(name, params)` | 未同意→丟棄；同意但 gtag 未就緒→佇列（超過上限忽略）；就緒→立即發送 |
| `flushQueue()` | 當 gtagReady=true 時清空佇列 |
| `setConsent(action)` | 執行狀態機轉換，持久化至 localStorage，按 effects 順序執行 dispatch/load/flush |
| `onConsentChange(cb)` | 訂閱 `CONSENT_EVENT`，回傳 unsubscribe 函數；SSR 環境回傳 no-op |
| `__resetAnalyticsForTest()` | **僅限測試使用**：重置全部模組私有狀態 |

### gtag 載入流程

1. `setConsent('accept')` → `reduceConsent` 回傳 effects `['dispatch','load','flush']`
2. `loadGtag()` — 建立 `<script async src="https://www.googletagmanager.com/gtag/js?id=...">` 並 append 至 `document.head`
3. `gtagReady = true`（dataLayer 會緩衝事件直到遠端腳本載入）
4. `flushQueue()` — 清空佇列

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

## ConsentBanner island（`src/components/blocks/ConsentBanner.svelte`）

全站 Cookie 同意橫幅，掛載於 `src/layouts/Base.astro`（`<ConsentBanner client:idle />`，在 `<Footer />` 之後）。

### 職責劃分

- **Banner 只負責 UI**：不直接操作 localStorage / gtag / dataLayer。
- **全部同意邏輯委由 `analytics.ts`**：`readConsent()`、`setConsent()`、`onConsentChange()`。

### 運作方式

```
mount → readConsent()          → status = 'granted'|'denied'|'unset'
      → onConsentChange(cb)    → 訂閱外部同意變更（返回 unsubscribe，於 $effect cleanup 呼叫）
status === 'unset' → 顯示橫幅
按下「接受」→ status = 'granted'（本地立即隱藏）+ setConsent('accept')（持久化＋載入 gtag）
按下「拒絕」→ status = 'denied'（本地立即隱藏）+ setConsent('decline')（持久化）
```

### 修改規則

- 不在 Banner 內直接讀寫 `localStorage`，不直接呼叫 `window.gtag`。
- 按鈕文字為「接受」/「拒絕」；說明文字須維持台灣繁體中文、禁聳動用語。
- 樣式只用 `tokens.css` CSS custom properties，禁止寫死 oklch/hex 色值或 `!important`。
- 若需新增文案連結，目標應為 `/privacy/` 或其他站內政策頁。

---

## 常見陷阱

- **禁止**在純函數段（第一段）存取 `window`/`document`/`localStorage`/`gtag`——Node 環境 import 會爆。
- 副作用層所有全域存取均需 `typeof xxx !== 'undefined'` guard，SSR 不能拋出。
- `MEASUREMENT_ID` 設為 `''` 可全域停用追蹤，`isTrackable` 回傳 `false`，`loadGtag` 提前返回。
- `reduceConsent` 只回傳 `{ status, effects }`，不做儲存；`setConsent` 負責 localStorage 寫入與 effects 執行。
- `buildEventEnvelope` 移除 `undefined`（不是 `null`）——傳入 `null` 是刻意的「無值」標記，會被保留送往 GA4。
- `__resetAnalyticsForTest` 僅限測試 `beforeEach` 呼叫，生產環境禁用。
