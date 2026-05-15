# Playbook：改 / 新增 d3 圖表

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/components/charts/*.svelte` 任一檔（HeroParticles、EvidenceScale、TrendBubbles、PathwayDiagram）
- 新增 d3 互動圖表元件
- 改圖表的高度、寬度、響應式行為
- 改 d3-force simulation 參數

> **高度傳遞是 d3 圖表反覆踩坑的點**。已有 4+ commit 修這同一個問題（`289382a`、`52605d4`、`1e16328`、`ad6d5a0`、`f8cd2eb`）。**新加圖表前看完這份**。

## 鎖定參數（動之前必看）

### 既有四個圖表

| 元件 | 技術 | 用途 | hydration |
|---|---|---|---|
| `HeroParticles.svelte` | canvas 2D（不是 d3） | 首頁 hero 浮動粒子 | `client:visible`，desktop only |
| `EvidenceScale.svelte` | d3 | 證據等級視覺化 | `client:visible` |
| `TrendBubbles.svelte` | d3-force | 熱詞泡泡 | `client:visible` |
| `PathwayDiagram.svelte` | 純 SVG + Svelte（**不用 d3**） | 原料代謝路徑 | `client:visible` |

### 高度傳遞鎖定模式（重要）

**永遠不要**用 `height: 100%` 鏈式傳遞高度。Svelte island 透過 `<astro-island>` 包裹，預設 `display: inline`，會破壞 height chain。

**正確做法**：

1. **容器（page / parent）給明確 CSS 高度**：`height: 50vh` 或 `height: clamp(...)`
2. **astro-island 也要明確 height**：`astro-island > .chart { height: 100%; display: block }` 不夠，要 `astro-island { display: block; height: 100% }`
3. **元件內**：用 `ResizeObserver` 監聽 container 實際 size，不靠 CSS chain

範例（TrendBubbles）：

```css
/* page */
.trend-bubbles-wrapper {
  height: 50vh;          /* 明確高度 */
  position: relative;
}
.trend-bubbles-wrapper astro-island {
  display: block;        /* 不是 inline！ */
  height: 100%;
  width: 100%;
}
.trend-bubbles-wrapper svg {
  display: block;
  width: 100%;
  height: 100%;
}
```

### canvas（HeroParticles 模式）

- 用 `getBoundingClientRect()` 動態取尺寸
- 用 `ResizeObserver` 響應視窗變化
- canvas 內部設 `canvas.width = rect.width; canvas.height = rect.height`（DPR 倍率視需要）
- mobile 不渲染：`if (window.innerWidth < 768) return`（省電）

### d3-force simulation（TrendBubbles 模式）

- 用 `d3.forceSimulation()` + `forceCollide()` + `forceCenter()`
- 不要動態改 viewBox（會讓泡泡跳）→ **scale positions 而非 viewBox**（commit `52605d4`）
- bubble radius range：20-60px（spec 規定，commit `bec8d9f`）

## 修改流程

1. **看 git log**：`git log --oneline src/components/charts/{元件}.svelte`，了解歷史修法
2. **改前實測**：在 dev mode 看當前行為，了解是 height collapse、stale state 還是 layout bug
3. **改前先理解 hydration**：Svelte island 預設 inline，動到 layout 要記得改 `display: block`
4. **改 d3-force 參數**：每改一個 force 都要 `pnpm dev` 看 simulation 是否收斂
5. **mobile 行為**：HeroParticles 在 mobile 不該跑，新加 canvas 圖表預設 desktop only
6. **a11y**：圖表必須有文字 fallback 或 `aria-label`，純視覺資訊扣 a11y 分
7. **build**：`pnpm build` 零錯誤
8. **Lighthouse**：圖表頁 Perf ≥ 90

## 常見陷阱

- **`height: 100%` 鏈式失敗**：`<astro-island>` 預設 inline，整條鏈斷掉 → 必須在 astro-island 顯式 `display: block`
- **改 viewBox 而非 scale positions**：d3-force bubble 會跳動 → 永遠 scale，不動 viewBox（commit `52605d4`）
- **canvas 用 `100vh` / `100vw`**：手機 chrome 切換 url bar 時會跳 → 用 `getBoundingClientRect` + `ResizeObserver`
- **client:load 而非 client:visible**：載入即跑，首屏阻塞 → 都用 `client:visible`
- **mobile 也跑 HeroParticles**：手機 CPU 撐不住，掉禎且耗電 → `if (window.innerWidth < 768) return`
- **沒設 DPR**：retina 螢幕字模糊 → `canvas.width = rect.width * devicePixelRatio; ctx.scale(dpr, dpr)`
- **d3-force 沒 simulation.stop()**：頁面切換後 simulation 還在跑 → unmount 必須 stop
- **新加 d3 圖表不知道用哪個 force**：先看 EvidenceScale 簡單範例，再看 TrendBubbles 複雜範例
- **圖表沒 aria-label**：螢幕閱讀器只報 SVG，使用者完全不知圖表內容 → 必須加 `<title>` 或 `aria-label`

## 驗證清單

```
- [ ] 圖表在 @375 / @768 / @1280 都正常顯示
- [ ] HeroParticles 在 mobile 不渲染（DOM 不要也不要 canvas）
- [ ] d3-force 圖表 simulation 收斂（不會永遠抖動）
- [ ] canvas 圖表 retina 螢幕清晰（DPR 處理）
- [ ] 圖表有 aria-label 或 <title> 文字描述
- [ ] 頁面 unmount 時 simulation.stop() 已呼叫
- [ ] pnpm build 零錯誤
- [ ] Lighthouse CI Perf ≥ 90
- [ ] @1280 desktop 不掉幀（chrome devtools Performance tab 看 60fps）
```

## 相關文件

- 首頁 / Hero：[home-hero.md](./home-hero.md)
- 架構與已實作功能：[../architecture.md](../architecture.md)
- 既有圖表原始碼：`src/components/charts/`
