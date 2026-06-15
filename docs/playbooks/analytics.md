# Analytics Playbook

> 功能：GA4 事件追蹤 + 使用者同意管理  
> 分支：feat/ga4-analytics（分階段實作）

---

## 架構概覽

```
src/data/analytics.ts       # 設定常數（MEASUREMENT_ID、同意鍵值、滾動里程碑等）
src/utils/analytics.ts      # 純邏輯 helpers（無 DOM、無 gtag、可在 Node 單元測試）
src/utils/analytics.test.ts # TDD 測試（vitest node 環境）
```

**設計原則：關注點分離**

- `src/data/analytics.ts` — 唯一常數來源；需調整閾值或 Measurement ID 只改這裡。
- `src/utils/analytics.ts` — 純函數（pure logic）；不引入任何 `window`/`document`/`localStorage`/`gtag`，可在 node 環境直接 `vitest run`。
- 未來的副作用層（`readConsent`、`setConsent`、`loadGtag`、`trackEvent`）獨立於上述兩層，放在 Svelte island 或另一個 `analytics.side-effects.ts`。

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

## 測試

```bash
pnpm test -- src/utils/analytics.test.ts   # 只跑 analytics
pnpm test                                   # 全套
```

測試以 TDD 撰寫（先 failing 再實作），47 個 case 涵蓋全部純函數的 truth table 與邊界情況。

---

## 常見陷阱

- **禁止**在 `src/utils/analytics.ts` 的 module 頂層或純函數內存取 `window`/`document`/`localStorage`/`gtag`——這些只能在副作用層（Svelte island）引入。
- `MEASUREMENT_ID` 設為 `''` 可全域停用追蹤，`isTrackable` 會回傳 `false`。
- `reduceConsent` 不做 localStorage 讀寫，只回傳 `{ status, effects }`；呼叫方負責實際儲存與副作用執行。
- `buildEventEnvelope` 移除 `undefined`（不是 `null`）——傳入 `null` 是刻意的「無值」標記，會被保留送往 GA4。
