# 架構與已實作功能總覽

> 修改本專案前，請先閱讀此文件，避免重複建設或誤判現狀。

## 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Astro 5 (static output) | 預設零 JS，build time 靜態生成 |
| 互動 | Svelte 5 islands | 僅互動元件載入 JS（FAQ、TOC、d3 圖表、搜尋） |
| 視覺化 | d3.js 子模組 | 按需引入（d3-timer, d3-scale 等），不引入整包 |
| 色彩 | oklch（唯一定義，無 hex fallback） | CSS custom properties + color-mix() 派生色 |
| 內容 | Astro Content Collections | Markdown/MDX + Zod schema 驗證 |
| 搜尋 | Pagefind | Build time 索引，零後端 |
| 部署 | GitHub Pages + GitHub Actions | main push → 自動 build + deploy |

## 已實作的 SEO / AEO（不需要再做）

| 功能 | 實作位置 | 說明 |
|------|---------|------|
| Schema.org JSON-LD | 每個頁面的 `<head>` | Article+MedicalWebPage（multi-type）、FAQPage、VideoObject、BreadcrumbList、Organization；文章頁 author/reviewedBy 透過 `buildPerson()` 帶 credential 與 sameAs；myths 頁額外輸出 ClaimReview（`src/utils/schema-org.ts` buildClaimReview）；作者頁（`/authors/luo-yang/`）輸出 Person（`src/utils/schema-org.ts` buildPerson） |
| Open Graph + Twitter Card | `src/layouts/Base.astro` | og:title, og:description, og:type, twitter:card |
| Canonical URL | `src/layouts/Base.astro` | 每頁自動設定 |
| sitemap.xml | `@astrojs/sitemap` 自動生成 | |
| robots.txt | `public/robots.txt` | 允許所有爬蟲含 GPTBot、ClaudeBot、PerplexityBot |
| RSS Feeds | `src/pages/rss.xml.ts` + 各分類 | 主 feed + articles/myths/podcasts/videos 個別 feed |
| llms.txt | `src/pages/llms.txt.ts` | AI 爬蟲索引（build time 動態生成） |
| llms-full.txt | `src/pages/llms-full.txt.ts` | 全站內容摘要索引 |
| 純文字版 | `src/pages/*/[slug].txt.ts` | 每篇內容提供 .txt 版本供 AI 讀取 |

## 已實作的內容互連（不需要再做）

| 功能 | 說明 |
|------|------|
| 交叉連結 | 10 組雙向 `related*` frontmatter 欄位，頁面自動渲染相關內容卡片 |
| 標籤彙整 | `tags` 自動產生 `/tags/[tag]/` 頁面，跨類型匯集 |
| 首頁焦點 | `featured: true` 的內容自動顯示在首頁 Hero 區 |

## 已實作的效能優化（不需要再做）

| 功能 | 說明 |
|------|------|
| Svelte hydration 策略 | `client:visible`（FAQ、EvidenceScale）、`client:media`（HeroParticles, desktop only）、`client:idle`（TOC）— 已是最佳策略，不需要再調整 |
| YouTube 嵌入 | 使用 iframe lazy embed，非直接載入 |
| Astro 靜態輸出 | 零 JS baseline，只有互動元件產生 JS bundle |
| d3.js 按需引入 | 只引入 d3-timer、d3-scale 等子模組 |
| font-display: swap | `src/styles/typography.css` 所有 `@font-face` 已設定 `font-display: swap` |

## 容易搞混的元件

| 元件 | 位置 | 說明 |
|------|------|------|
| `SearchBar.astro` | `src/components/ui/` | **純展示用的搜尋輸入框**（用在 404 頁等地方），不含搜尋邏輯 |
| `search.astro` | `src/pages/` | **實際搜尋結果頁**，整合了 Pagefind UI（CSS + JS + 搜尋索引） |
| `TopNav.astro` | `src/components/blocks/` | 導覽列中的搜尋圖示連結到 `/search/`，不是 SearchBar 元件 |

## 已實作的無障礙

| 功能 | 說明 |
|------|------|
| Skip to content | 頁頂鍵盤可見跳轉連結 |
| Focus ring | 所有互動元素有 2px --color-teal focus ring |
| 語意 HTML | nav、main、article、aside、footer、section |
| aria 屬性 | FAQ accordion (aria-expanded)、breadcrumb (aria-label, aria-current) |
| 觸控面積 | 按鈕最小 44px、FAQ 觸控區 48px |

## 已實作的 CI/CD

| 步驟 | 工具 | 說明 |
|------|------|------|
| Build | Astro | `pnpm build` |
| 搜尋索引 | Pagefind | `pagefind --site dist` |
| 站內連結檢查 | lychee | 失敗會擋部署 |
| 站外連結檢查 | lychee | 失敗不擋部署（warning） |
| 部署 | actions/deploy-pages | 自動部署至 GitHub Pages |
