# Playbook：改導覽列 TopNav

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/components/blocks/TopNav.astro`
- 改 navbar 的字體、字級、字重、line-height、間距
- 加 / 移除 / 重排導覽項目
- 改 hover、active、focus 行為
- 改 mobile menu（hamburger 展開選單）
- 改 navbar 高度、sticky 行為、backdrop blur

> **TopNav 是高度敏感元件**：字體、字級、文字位置都經多輪量測對齊。動之前看 `git log src/components/blocks/TopNav.astro` —— 特別是 `94428c5`、`0099cdd`、`1ce471a`、`11c2e78` 四個 commit。

## 鎖定參數（動之前必看）

### 字體三件套（跟 `.topnav__brand-zh` 與 h1 完全一致）

| 屬性 | 值 | 出處 |
|---|---|---|
| font-family | `var(--font-serif)` (Noto Serif TC, fallback Source Serif 4) | `src/styles/typography.css` |
| font-size | `clamp(1.05rem, 1.8vw, 1.45rem)` | 跟 brand-zh 同 |
| font-weight | `700` | 跟 brand-zh 與 h1 預設同 |
| line-height | `1.2` | 跟 brand-zh 同（baseline 對齊必要） |

### 文字位置

| 屬性 | 值 |
|---|---|
| 字底端距 navbar 底邊 | **20px（@900px 與 @1280px 都精確 20.00px）** |
| padding-bottom 公式 | `padding-bottom = 20 − half_leading`，其中 `half_leading = (lh − fs) / 2` |
| 實作 clamp | `clamp(1.106rem, calc(19.80px − 0.164vw), 1.145rem)` |
| align-items | `flex-end`（搭配 padding-bottom）|

### 佈局

| 屬性 | 值 |
|---|---|
| navbar min-height | `4.35rem`（≈69.6px）|
| nav 顯示斷點 | `≥900px`（mobile-first）|
| `<900px` 行為 | nav 隱藏、hamburger 顯示 |
| 點擊區 | `.topnav__link` 必須 `height: 100%` 撐滿 li |

### Hover / Active

| 狀態 | 樣式 |
|---|---|
| hover | `background-color: var(--color-teal-subtle)` + `color: var(--color-teal)` |
| transition | `background-color .15s ease, color .15s ease` |
| `.is-active` | `color: var(--color-teal)` |

## 修改流程

1. **啟動 dev server**：`pnpm dev`
2. **改前量測**（基準值）：用 Playwright + 下方腳本，在 `@1280px` 與 `@900px` 各跑一次，記下 baseline / glyph_bottom / distance
3. **改 CSS**
4. **改後重新量測**：對照鎖定參數，誤差 < 0.5px 才算通過
5. **視覺確認**：
   - 用 Playwright screenshot 全頁，`magick crop 1280x90+0+0` 切出 nav 區域
   - 對照 brand-zh 與 nav link 的字底是否在同一條視覺線上
6. **mobile 驗證**：resize 到 375px / 768px，確認 `.topnav__nav` display:none、`.topnav__hamburger` display:flex
7. **build**：`pnpm build` 零錯誤
8. **commit + push**

## 常見陷阱

- **「文字突然靠上」**：父層用 `align-items: stretch` 把 `<li>` 撐到 navbar 全高（69.6px），但忘了讓內層 `<a>` 也 `height: 100%`。anchor 自然高度只有文字高度（約 24px），會貼齊 li 頂端，距 navbar 底邊變成 45px 以上
- **改 font-size 或 line-height 沒重算 padding**：half_leading 變了，字底距 navbar 底邊就不再是 20px。永遠依公式 `pb = target − half_leading` 重算
- **`padding-top` + `align-items: flex-start` 控制位置**：跟「字底貼底邊」概念衝突，會推到頂端。改用 `padding-bottom` + `align-items: flex-end`
- **改 hover 只改 color 沒設 background**：全高點擊區會失去視覺反饋，使用者不知道 hover 到了哪個項目
- **斷點端誤差累積**：clamp 公式只在兩端正確，中間插值會偏。任何改動都要在 `@900px` 與 `@1280px` 兩個邊界都量
- **Playwright screenshot with selector 不會裁切**：實際存的是整視窗 1280×800 PNG。要看 nav 細節必須 `magick crop 1280x90+0+0` 自己裁
- **改字體 family 後忘了同步 line-height**：不同字體 ascent/descent 不同，baseline 對齊公式會失準。`--font-serif` 與 `--font-ui` 的 metric 差異 ~3-4px

## 驗證清單

```
- [ ] @1280px：字底距 navbar 底邊 = 20.00 ± 0.5 px（Playwright getComputedStyle 量測）
- [ ] @900px：字底距 navbar 底邊 = 20.00 ± 0.5 px
- [ ] @375px：.topnav__nav display: none、.topnav__hamburger display: flex
- [ ] @768px：同 @375px（hamburger 顯示）
- [ ] hover 任一 nav link：背景變 teal-subtle、文字變 teal
- [ ] 視覺確認 brand-zh 與 nav link 字體一致（同 family + size + weight）
- [ ] pnpm build 零錯誤
- [ ] git diff 只動到 TopNav.astro（沒誤動別處）
```

## 附錄：Playwright 量測腳本

把以下貼進 `mcp__playwright__playwright_evaluate` 的 script 參數。需要先 `playwright_navigate` 到 dev URL。

```javascript
(() => {
  function glyphBottom(el) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight);
    const pb = parseFloat(cs.paddingBottom);
    return rect.top + rect.height - pb - (lh - fs) / 2;
  }
  function baselineY(el) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(el.textContent.trim());
    const fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight);
    const pt = parseFloat(cs.paddingTop);
    return rect.top + pt + (lh - fs) / 2 + m.actualBoundingBoxAscent;
  }
  const inner = document.querySelector('.topnav__inner').getBoundingClientRect();
  const bz = document.querySelector('.topnav__brand-zh');
  const lk = document.querySelector(".topnav__nav .topnav__link[href='/articles/']");
  return JSON.stringify({
    vw: window.innerWidth,
    navbar_bottom: +(inner.top + inner.height).toFixed(2),
    brand_zh_baseline: +baselineY(bz).toFixed(2),
    link_glyph_bottom: +glyphBottom(lk).toFixed(2),
    distance_link_to_navbar_bottom: +(inner.top + inner.height - glyphBottom(lk)).toFixed(2),
    pb_actual: parseFloat(getComputedStyle(lk).paddingBottom)
  }, null, 2);
})()
```

## 相關文件

- 設計 token：[design-tokens.md](./design-tokens.md)
- CSS / RWD 通用規範：[../../README.md#css--rwd-修改規範](../../README.md)
- 字體變數定義：`src/styles/typography.css`
