# Playbook：CSS / RWD 規範

**改任何版面前必讀。** 這是全站 CSS 規範的**單一來源**——`CLAUDE.md` / `README.md` / `AGENTS.md` 只指到這裡，不再各自複述。

守門：`scripts/check-design.mjs`，`pnpm build` 會自動先跑（也可單獨 `pnpm check:design`），違規直接 build fail，CI 同步擋部署。

---

## 1. 斷點：只有 4 個，全部 `min-width`（mobile-first）

| 名稱 | 值 | 用途 |
|---|---|---|
| `sm` | `640px` | 手機 → 大手機 |
| `md` | `768px` | 手機 → 平板 |
| `lg` | `1024px` | 平板 → 桌面 |
| `xl` | `1280px` | 桌面 → 寬螢幕 |

**禁止**：`max-width` media query（那是 desktop-first）／自創斷點（760px、600px、960px…）／同一元件混用 `min-width` 與 `max-width`。

## 2. Spacing 用 fluid `clamp()`

```css
/* 正確：一條 clamp() 搞定，手機到桌面連續過渡 */
padding: clamp(1rem, 0.5rem + 2vw, 2rem);

/* 禁止：寫死後用 media query 分段覆蓋 */
padding: 2rem;
@media (max-width: 768px) { padding: 1rem; }
```

## 3. Layout 管骨架，Page 管皮膚

- **Layout**（`Article.astro`、`Media.astro`）只負責骨架（grid、sidebar），不寫內容樣式。
- **Page**（`myths/[slug].astro` 等）負責自己的視覺（`.block` 的背景、padding、圓角）。
- 不要用 `:global()` 覆蓋 layout 的 class — 改用 **variant prop**。
- 不要在全域 CSS 加頁面特定樣式。
- Article.astro 的 variant 系統見 [`article-layout.md`](./article-layout.md)。

## 4. 設計規範 v2 — 六條硬規則（2026-07-20 全站統一）

`check-design.mjs` 掃 `src/` 全部 `.css/.astro/.svelte`：

1. **禁 `px` 定義 font-size** — 一律用 `var(--text-*)` 階梯（`clamp()` 內的 px 邊界暫不在掃描範圍）
2. **顏色（hex / rgb() / hsl()）只准出現在 `src/styles/variables.css`** — 元件一律 `var(--color-*)`
3. **禁 `!important`** — ⚠️ 遷移期遞延中，存量與清零進度見 `check-design.mjs` 檔頭 TODO
4. **禁外部 CDN**（fonts.googleapis / cdnjs / unpkg / jsdelivr）— 字體用 `@fontsource` 自託管，不受影響
5. **css 檔白名單** — `src/` 下的 `.css` 只准 `src/styles/{variables,global}.css`，元件樣式寫 scoped `<style>`
6. **`--text-*` 字級下限 ≥18px（1.125rem）** — `clamp()` 以最小值計；`checkLadder()` 掃 `variables.css`（字級階梯定義處）強制，禁止改 token 值開小門繞過

另沿用的慣例（掃描器抓不到，靠 review）：

- 不要把整個 `<style>` 壓成一行（不可讀、不可維護）
- **不要直接修改 `variables.css` 的 oklch 色值**（經 4 輪審查定案，見 [`design-tokens.md`](./design-tokens.md)）

## 5. 改完必驗

三個寬度都要看：

1. **375px**（iPhone SE）— 單欄、無 sidebar
2. **768px**（iPad）— 過渡斷點
3. **1280px**（桌面）— 完整版面

```bash
pnpm check:design   # 六條規則
pnpm build          # 零錯誤才算通過
```

**只跑 gate 不夠——要量渲染結果。** 2026-08-07 的教訓：`check-design` 規則 1 原本只擋
`font-size: NNpx` 字面值，`font-size: 0.7rem` 完全合法；規則 6 又只掃 `variables.css`，
管不到「根本不用 token 的人」。兩條規則之間有一道洞，18px 下限形同虛設——實測站上有
24 種規則的文字低於下限，最小 11.2px（`.news-item__tag` 0.7rem、`.article-card__topic`
0.76rem 共 195 處）。用 Playwright 開實際頁面量 `getComputedStyle` 才發現。
規則已改為「算出來的值 < 18px 即擋」（規則 1a，無例外）＋「字級須走 `var(--text-*)`」
（規則 1b，可凍結遞延），但判準要記住的是：**下限用算出來的值守，不是用有沒有寫 px 守。**

## 6. 字級階梯（唯一來源）

字級只有一個來源＝`src/styles/variables.css` 的 `--text-*`。元件內不得出現原始數值。

| token | 值 | 用途 |
|---|---|---|
| `--text-h1` / `--text-h2` / `--text-h3` | clamp | 標題三級 |
| `--text-lead` | clamp(1.125rem …) | 引言、卡片摘要 |
| `--text-body` | 1.125rem | 正文 |
| `--text-meta` / `--text-caption` / `--text-badge` | 1.125rem | meta／圖說／標籤（同值，差異靠字重與彩度） |
| `--text-brand` | clamp(1.125rem, 1.8vw, 1.45rem) | 站名。獨立成 token 是因為 TopNav scoped style 與 global.css 的 topnav 守衛必須同值 |

`clamp(A, B, C)` 的下限是 **第一個參數 A**，不是式子裡最小的數字。
`clamp(1.3rem, 1.1rem + 0.8vw, 1.8rem)` 的最小值是 1.3rem（20.8px）不是 1.1rem。

## 7. 行長（measure）

中文舒適閱讀約 30–45 字／行。

- `variant="prose"`（文章／成分）：`.article-content` 有 `max-width: 68ch`，實測 43 字／行。
  1024px 以上右側那一欄**不是**留白，是 sticky 目錄（`.article-sidebar`，6–11 個連結）。
  量到「右邊空很多」先確認是不是它，不要急著加置中。
- `variant="cards"`（闢謠）：Article.astro 對 `--cards` 解除了 `.prose` 的 68ch 上限，
  好讓卡片格線吃滿寬。但正文段落也會跟著吃滿——2026-08-07 實測 1280px 下 64 字／行。
  `myths/[slug].astro` 對 `.block` 內的文字流加 `max-width: 40em`（格線與卡片除外），
  收斂到 40 字／行。加新的文字區塊時記得它要落在那條規則涵蓋範圍內。

---

## 相關檔案

| 檔案 | 作用 |
|---|---|
| `src/styles/variables.css` | oklch design tokens、字體與字級階梯（唯一可寫顏色的地方） |
| `src/styles/global.css` | typography 變數 + reset + prose + container + RWD fixes |
| `scripts/check-design.mjs` | 六條規則的守門實作 |
