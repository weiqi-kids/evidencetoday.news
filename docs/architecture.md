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
| 結構化資料實體圖（@id） | `src/layouts/Base.astro` + `src/utils/schema-org.ts` | **每頁**由 Base layout 輸出 `@graph`：`Organization`（`@id` `…/#organization`，含 logo / `SITE_SAMEAS`）+ `WebSite`（`@id` `…/#website`，含 SearchAction）。內容頁的 `publisher` / `isPartOf` 只以 `{ '@id': … }` 參照，讓搜尋引擎與 AI 跨頁合併實體。常數與 builder 集中在 `schema-org.ts`（`ORG_ID` / `WEBSITE_ID` / `PUBLISHER_REF` / `WEBSITE_REF` / `buildSiteGraph`）。 |
| Schema.org JSON-LD（內容頁） | 每個頁面的 `<head>` | Article+MedicalWebPage（multi-type，帶 `@id …#article`、`mainEntityOfPage`）、FAQPage、VideoObject、BreadcrumbList；文章/闢謠頁 author 透過 `buildPerson()` 帶 `@id`（`…/#person`）與 sameAs；publisher→`ORG_ID`、isPartOf→`WEBSITE_ID`；`references` 透過 `buildCitations()` 輸出 schema.org `citation`（CreativeWork：name/url/publisher/date/genre/doi）；成分解析頁 author/reviewedBy/publisher 皆為 `ORG_ID` 參照，含 `lastReviewed`、`medicalAudience`（Patient）；myths 頁額外輸出 ClaimReview（`buildClaimReview`）；健康專題頁（`/topics/`）輸出 CollectionPage + ItemList + FAQPage；作者頁輸出 Person（`buildPerson`，**羅揚為牙醫學學歷背景，非執業牙醫師，無 `hasCredential` 執照宣稱**） |
| Open Graph + Twitter Card | `src/layouts/Base.astro` | og:title, og:description, og:type, twitter:card；og:image 用各頁 `/og-static/*.png`（分類圖手動上傳；作者頁專屬 `author-luo-yang.png` 由 `scripts/generate-author-og.ts` 經 satori→sharp 一次性生成，文案/版面變更時重跑、commit 入 git） |
| 靜態頁 SERP title / description | `src/utils/social-meta.mjs`（`STATIC_SOCIAL`） | 首頁/政策頁/聯絡/**作者頁**的 `<title>`、`<meta description>`、OG 皆取自 `STATIC_SOCIAL`；作者頁 `src/pages/authors/luo-yang/index.astro` 直連 `Base`、**無 articles 的 `seoTitle` 機制**，改 snippet ＝改此處字串。**作者頁文案 COI 鐵則**：權威錨定「實務經驗」（長年身處營養保健產業、看穿行銷話術），**禁把「樂地滋負責人」當招牌、禁證照/牙醫式宣稱**；COI 以經驗化敘述＋ `/disclosure` 處理（見 commit 203172a） |
| Canonical URL | `src/layouts/Base.astro` | 每頁自動設定 |
| sitemap.xml | `@astrojs/sitemap` + `serialize` | 每篇內容頁輸出 `lastmod`（`updatedDate ?? publishDate`，來源 `scripts/lib/content-dates.mjs` 掃 frontmatter）；`/admin`、`/tags/*`（noindex,follow）以 `filter` 排除；舊 slug 轉址不進 sitemap |
| 前台可見性（draft / 未來 publishDate / under-review） | `src/utils/visibility.ts`（`isPublicEntry`） | 首頁分類數字、各分類列表、內容頁 `getStaticPaths`、健康專題頁共用單一判斷，確保數字一致且不外露未發布內容 |
| robots.txt | `public/robots.txt` | 允許所有爬蟲含 GPTBot、ClaudeBot、PerplexityBot |
| RSS Feeds | `src/pages/rss.xml.ts` + 各分類 | 主 feed + articles/myths/podcasts/videos 個別 feed |
| llms.txt | `src/pages/llms.txt.ts` | AI 爬蟲索引（build time 動態生成） |
| llms-full.txt | `src/pages/llms-full.txt.ts` | 全站內容摘要索引 |
| 純文字版 | `src/pages/*/[slug].txt.ts` | 每篇內容提供 .txt 版本供 AI 讀取（開頭重點摘要 + 文末來源） |

## 分析與量測（Analytics）

| 功能 | 實作位置 | 說明 |
|---|---|---|
| GA4（無同意橫幅） | `src/utils/analytics.ts`、`src/data/analytics.ts`、`src/layouts/Base.astro` inline script | GA4（`G-5JH83LM8X7`）**每頁載入**蒐集基本流量（page_view）；無底部 Cookie 同意彈窗。`Base.astro` 的 `<script>` 每頁呼叫 `bootstrapAnalytics()`。設 `MEASUREMENT_ID=''` 可全域停用 |
| 閱讀互動追蹤 | `ReadingEngagement.svelte`（掛 articles/myths/ingredients 單篇頁） | content_view、scroll(25/50/75/90)、read_complete（三閘）、engaged_view（真實投入時間）、select_content（下一篇）、faq_open、reference_click；全走 `trackEvent`，**無同意橫幅後不再 consent-gated**，只要 `MEASUREMENT_ID` 有值即送出 |

> 完整事件分類、自訂維度、GA4 後台設定與報表配方見 **`docs/playbooks/analytics.md`**。

### Audience Insights（閉環選題回饋）

`/news` 管線 Phase 2 執行 `scripts/audience-insights.mjs`，即時讀 GA4（讀完率/AI 轉介/站內搜尋）+ GSC（搜尋需求/排名），跑 8 策略產出 topicCandidates（選題）/writingDirectives（寫法）/siteOptimizations（人工建議）。輸出 `data/audience-insights.json` 為私密、gitignore。詳見 playbook 與 spec（2026-06-16）。

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
