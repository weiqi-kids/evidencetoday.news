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

## 全域動效與無障礙（2026-07-15 介面優化 Phase 1）

- **`prefers-reduced-motion` 全域降級**：`src/styles/global.css` 末端有一段 `@media (prefers-reduced-motion: reduce)` reset，關閉平滑捲動並把所有 `animation`/`transition` 壓到 0.01ms（卡片 hover 位移、Hero 粒子等一律降級）。這是無障礙業界標準 reset（WCAG 2.3.3）。
- **`!important` 例外**：硬規則「禁 `!important`」的語意是針對版面覆蓋 hack；reduced-motion 降級需可靠覆蓋任意元件的 transition/animation，屬**公認例外**，僅允許出現在這段媒體查詢內，其他地方仍禁用。
- **d3 島嶼各自把關**：canvas/SVG 動畫（`HeroParticles.svelte`、`TrendBubbles.svelte`）無法只靠 CSS 降級，需在元件內以 `window.matchMedia('(prefers-reduced-motion: reduce)')` 判斷：命中時只畫一張靜態幀、不啟動 `d3-timer`。新增 d3 動畫島嶼一律比照。

## 相關文件

- 設計 spec：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`
- 字體變數定義：`src/styles/typography.css`
- CSS / RWD 通用規範：[../../README.md](../../README.md)
- 全域 CSS 規則：`src/styles/global.css`

## OG 圖品牌系統維護規則

`scripts/generate-og.mjs` 是全站分享圖的生成來源，因 satori 不支援 `oklch()`，OG 圖可以使用 `src/styles/tokens.css` 的 hex 近似值，但不得自行發展脫離本站 CI 的新色系。全站 OG 應視為品牌門面：乾淨、字大、字粗、清楚，優先讓手機聊天縮圖可讀。

### 版型與安全區

| 模板 | 適用頁面 | 設計重點 |
|---|---|---|
| `home` | `/` | 中央放最大「本日有據」，下方只放 `Evidence Today`；不放副標、說明字或裝置示意。 |
| `section` | `/news/`、`/ingredients/`、`/podcasts/`、`/videos/`、`/articles/`、`/myths/`、標籤入口 | 左上角「本日有據」清楚可讀，中央放專區主字，右下角只放 `Evidence Today`。 |
| `content` | 單篇文章、成分、Podcast、短影音、新聞、迷思查證 | 左上角品牌固定，中央以標題／主題為主，分類 pill 只做類型辨識，右下角只放 `Evidence Today`。 |
| `static` | 關於、政策、作者頁、聯絡與條款頁 | 使用與 section 同家族的中央主字版型，避免把政策說明塞進圖卡。 |

安全區採「手機優先」：主標置中且不貼邊，左上品牌與右下英文品牌都留在 1200×630 內框之內。若改版型，必須用 `pnpm run og:preview` 檢查手機 240px、平板 480px、桌機 720px 三種尺寸。

### 字級、字重與標題規則

- 首頁主字約 150px；section 主字約 126–148px；static 主字約 108–126px；content 依行數約 68–106px。
- 主字使用 `NotoSansTC-Bold-static.ttf` 並以 1px 多層疊字加重，確保小縮圖裡不會太細。
- content 標題最多 3 行，先依標點換行；過長時先移除「關於／你所需要知道的／完整指南」等冗語，再改成「重點整理」式短題，避免留下半句殘標題。
- metadata title 可用較短社群標題，但 OG image 的 `ogTitle` 預設使用完整標題，由產圖流程負責合理換行與精簡。

### 品牌與禁用元素

- 色彩只能來自 `src/styles/tokens.css` 的品牌／分類色近似值：paper、paperWarm、white、ink、navy、teal 與各 category color。
- 左上角固定「本日有據」，右下角固定 `Evidence Today`；正式 OG 不出現「健康議題編輯平台」、「手機優先分享圖」或任何內部設計說明文字。
- 禁止在 OG 圖裡放手機、平板、裝置框、preview mockup、AI 海報式素材或無助於辨識的大型裝飾。只保留品牌外框與兩段 CI 色角線。

### 預覽工具與 binary 防呆

- 先執行 `pnpm run og:generate` 產生 `public/og/**`。
- 再執行 `pnpm run og:preview [可選 OG 路徑...]`，會輸出 `public/og-preview/index.html` 與縮圖檔。
- `public/og/**/*.png`、`public/og-preview/` 與其他 OG binary 副檔名均由 `.gitignore` 排除；PR 不應包含任何產生出的 PNG/JPG/WebP/GIF/PDF/ZIP 或 `dist/` 產物。
- 預設代表頁包含首頁、`/videos/`、`/ingredients/`、`/news/`、`/podcasts/`、一篇短影音、一篇成分解析與一篇 Podcast 單集。
