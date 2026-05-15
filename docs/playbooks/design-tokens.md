# Playbook：改 design tokens（顏色 / 字體 / 間距）

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/styles/tokens.css` 任何一行
- 修改 `src/styles/typography.css` 字體 stack 或 fluid type scale
- 新增 brand color、category color、verdict color
- 換掉 Noto Serif TC / Noto Sans TC / Inter / Source Serif 4 任一字體
- 改 `--space-*` 或 `--radius-*`、`--shadow-*`

> **整套設計 token 經 4 輪審查定案**（spec：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`）。color 與 spacing 的數值是商品決策，不是技術決策，**動之前先問人**。

## 鎖定參數（動之前必看）

### 色彩系統

| 規則 | 細節 |
|---|---|
| 唯一定義方式 | `oklch()`，**沒有 hex fallback** |
| 衍生色 | 必須用 `color-mix(in oklch, A, B)`，禁止寫死 |
| OG image 例外 | `src/pages/og/[...slug].png.ts` 因 satori 不支援 oklch，使用 hex 近似值 — 這是**全站唯一允許 hex 的場景** |
| Mermaid 圖表 | 用 hex（Mermaid 不支援 oklch）— 全域規則 |

### 字體系統

| 變數 | 字體 stack | 用途 |
|---|---|---|
| `--font-serif` | `'Noto Serif TC', 'Source Serif 4', serif` | 標題、brand-zh、nav link |
| `--font-sans` | `'Noto Sans TC', 'Inter', sans-serif` | body 文字、h2+ |
| `--font-ui` | `'Inter', 'Noto Sans TC', sans-serif` | meta、UI 按鈕 |
| `--font-display` | `'Source Serif 4', 'Noto Serif TC', serif` | EVIDENCE TODAY 西文 logo |

**自託管要求**：

- 字體由 fontsource 套件提供，在 `src/layouts/Base.astro` frontmatter import
- **禁止用 Google Fonts CDN 或任何外部 CDN**
- CJK 字體有 unicode-range subsetting（Noto Sans TC ~210 rules, Noto Serif TC ~108 rules）
- satori OG image 用 `src/assets/fonts/` 的 static TTF（fontsource woff2 不適用 satori）

### Fluid type scale

```
--text-h1: clamp(2rem, 1.5rem + 2vw, 3rem)
--text-h2: clamp(1.625rem, 1.25rem + 1.5vw, 2rem)
--text-h3: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)
--text-body: clamp(1.0625rem, 1rem + 0.25vw, 1.125rem)
--text-lead: clamp(1.125rem, 1rem + 0.5vw, 1.25rem)
--text-meta: clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)
```

**禁止用 `px` 寫死 font-size**。永遠用 token 或 `clamp()`。

### Spacing scale

```
--space-page-x: clamp(1rem, 0.5rem + 2vw, 2rem)        # 頁面左右 padding
--space-page-y: clamp(2rem, 1.5rem + 2vw, 3rem)        # 頁面上下 padding
--space-card-gap: clamp(0.75rem, 0.5rem + 1vw, 1.25rem) # 卡片之間
--space-section-gap: clamp(2.5rem, 2rem + 2vw, 4rem)   # 區塊之間
```

**禁止用寫死 px + media query 覆蓋的方式做 spacing**（README CSS/RWD 規範第 2 條）。

## 修改流程

1. **問人**：色彩、字級、spacing 屬於設計決策，動之前確認用戶授權
2. **看 spec**：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md` 看當初決定的理由
3. **改 token**
4. **跑全站視覺檢視**：`pnpm build && pnpm preview`，至少看 5 個頁面（首頁、文章、闢謠、原料、政策）
5. **檢查衍生色**：用 `color-mix` 的變數會自動連動，但要確認對比度
6. **跑 Lighthouse CI**：a11y 分數不能降（色彩對比是常見扣分點）
7. **檢查 OG image**：如果改了主色，`src/pages/og/[...slug].png.ts` 內的 hex 近似值要同步更新
8. **commit + push**

## 常見陷阱

- **加 hex fallback**：`color: oklch(...); /* fallback */ color: #abc;` —— 不要，現代瀏覽器都支援 oklch。fallback 會混淆設計來源
- **跳過 color-mix 寫死衍生色**：teal-subtle 是 teal + paper 的混合，數值改一處兩處不一致 → 永遠用 `color-mix`
- **加 Google Fonts CDN**：違反自託管原則。fontsource 才是唯一字體來源
- **改 font-family 變數時忘了動 OG image static TTF**：滿足 satori 的 TTF 在 `src/assets/fonts/`，獨立於 fontsource，要分開更新
- **Mermaid 用 oklch**：不支援，會渲染失敗 — Mermaid 永遠用 hex
- **改 fluid scale 沒測 ≥1280px 與 ≤375px 兩端**：clamp 在中段平滑，邊界要實測
- **加新 token 沒加註解**：未來人不知道用途，token 散沙化
- **改 spacing 用 media query 覆蓋**：違反 mobile-first 與 fluid 原則，用 `clamp` 取代

## 驗證清單

```
- [ ] 沒有用 hex（除了 OG image 與 Mermaid）
- [ ] 衍生色都用 color-mix，沒手動算
- [ ] 字體沒加 Google Fonts CDN
- [ ] 改了主色 → OG image hex 近似值同步更新
- [ ] 改了 fluid scale → @375 與 @1280 兩端視覺檢查
- [ ] pnpm build 零錯誤
- [ ] Lighthouse CI a11y ≥ 95（對比度不降）
- [ ] git diff 只動到 tokens.css / typography.css（不誤動別處）
```

## 相關文件

- 設計 spec：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`
- 字體變數定義：`src/styles/typography.css`
- CSS / RWD 通用規範：[../../README.md](../../README.md)
- 全域 CSS 規則：`src/styles/global.css`
