# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push main 自動部署）
- 套件管理器：**pnpm**（不是 npm）

> **給 AI 和新進開發者：修改或優化本專案前，必須先讀完「架構與已實作功能總覽」和「已知效能瓶頸」兩個段落。** SEO（JSON-LD、OG、canonical、sitemap、RSS）、AEO（llms.txt、.txt endpoints）、Svelte hydration 策略（client:visible / client:media / client:idle）、無障礙（skip-to-content、focus ring、aria）、font-display: swap 都已經實作完成。不要重複建議這些。真正需要修的東西列在「已知效能瓶頸」段落，每個都有精確的檔案路徑和修復步驟。

---

## 快速開始

```bash
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 啟動開發伺服器 (localhost:4321)
pnpm build          # 建置靜態網站 (輸出至 dist/)
pnpm preview        # 預覽建置結果
```

---

## 架構與已實作功能總覽

> 修改本專案前，請先閱讀此段，避免重複建設或誤判現狀。

### 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Astro 5 (static output) | 預設零 JS，build time 靜態生成 |
| 互動 | Svelte 5 islands | 僅互動元件載入 JS（FAQ、TOC、d3 圖表、搜尋） |
| 視覺化 | d3.js 子模組 | 按需引入（d3-timer, d3-scale 等），不引入整包 |
| 色彩 | oklch（唯一定義，無 hex fallback） | CSS custom properties + color-mix() 派生色 |
| 內容 | Astro Content Collections | Markdown/MDX + Zod schema 驗證 |
| 搜尋 | Pagefind | Build time 索引，零後端 |
| 部署 | GitHub Pages + GitHub Actions | main push → 自動 build + deploy |

### 已實作的 SEO / AEO（不需要再做）

| 功能 | 實作位置 | 說明 |
|------|---------|------|
| Schema.org JSON-LD | 每個頁面的 `<head>` | Article、FAQPage、VideoObject、MedicalWebPage、BreadcrumbList、Organization |
| Open Graph + Twitter Card | `src/layouts/Base.astro` | og:title, og:description, og:type, twitter:card |
| Canonical URL | `src/layouts/Base.astro` | 每頁自動設定 |
| sitemap.xml | `@astrojs/sitemap` 自動生成 | |
| robots.txt | `public/robots.txt` | 允許所有爬蟲含 GPTBot、ClaudeBot、PerplexityBot |
| RSS Feeds | `src/pages/rss.xml.ts` + 各分類 | 主 feed + articles/myths/podcasts/videos 個別 feed |
| llms.txt | `src/pages/llms.txt.ts` | AI 爬蟲索引（build time 動態生成） |
| llms-full.txt | `src/pages/llms-full.txt.ts` | 全站內容摘要索引 |
| 純文字版 | `src/pages/*/[slug].txt.ts` | 每篇內容提供 .txt 版本供 AI 讀取 |

### 已實作的內容互連（不需要再做）

| 功能 | 說明 |
|------|------|
| 交叉連結 | 10 組雙向 `related*` frontmatter 欄位，頁面自動渲染相關內容卡片 |
| 標籤彙整 | `tags` 自動產生 `/tags/[tag]/` 頁面，跨類型匯集 |
| 首頁焦點 | `featured: true` 的內容自動顯示在首頁 Hero 區 |

### 已實作的效能優化（不需要再做）

| 功能 | 說明 |
|------|------|
| Svelte hydration 策略 | `client:visible`（FAQ、EvidenceScale）、`client:media`（HeroParticles, desktop only）、`client:idle`（TOC）— 已是最佳策略，不需要再調整 |
| YouTube 嵌入 | 使用 iframe lazy embed，非直接載入 |
| Astro 靜態輸出 | 零 JS baseline，只有互動元件產生 JS bundle |
| d3.js 按需引入 | 只引入 d3-timer、d3-scale 等子模組 |
| font-display: swap | `src/styles/typography.css` 所有 `@font-face` 已設定 `font-display: swap` |

### 容易搞混的元件

| 元件 | 位置 | 說明 |
|------|------|------|
| `SearchBar.astro` | `src/components/ui/` | **純展示用的搜尋輸入框**（用在 404 頁等地方），不含搜尋邏輯 |
| `search.astro` | `src/pages/` | **實際搜尋結果頁**，整合了 Pagefind UI（CSS + JS + 搜尋索引） |
| `TopNav.astro` | `src/components/blocks/` | 導覽列中的搜尋圖示連結到 `/search/`，不是 SearchBar 元件 |

### 已實作的無障礙

| 功能 | 說明 |
|------|------|
| Skip to content | 頁頂鍵盤可見跳轉連結 |
| Focus ring | 所有互動元素有 2px --color-teal focus ring |
| 語意 HTML | nav、main、article、aside、footer、section |
| aria 屬性 | FAQ accordion (aria-expanded)、breadcrumb (aria-label, aria-current) |
| 觸控面積 | 按鈕最小 44px、FAQ 觸控區 48px |

### 已實作的 CI/CD

| 步驟 | 工具 | 說明 |
|------|------|------|
| Build | Astro | `pnpm build` |
| 搜尋索引 | Pagefind | `pagefind --site dist` |
| 站內連結檢查 | lychee | 失敗會擋部署 |
| 站外連結檢查 | lychee | 失敗不擋部署（warning） |
| 部署 | actions/deploy-pages | 自動部署至 GitHub Pages |

---

## 已知效能瓶頸（優化方向）

以下是**目前已知但尚未處理**的效能問題，依優先順序排列：

### 1. Google Fonts CDN 阻塞渲染（最大瓶頸）

目前透過外部 `<link>` 載入 4 個字體家族，是首屏最大阻塞資源。

**現狀**：`src/layouts/Base.astro:58-64` 有 Google Fonts `<link>` 標籤。`src/styles/typography.css` 已寫好 `@font-face` 宣告指向 `/fonts/*.woff2`，但 `public/fonts/` 目錄不存在。

**修復步驟**：
1. 從 Google Fonts 下載以下 woff2 檔案到 `public/fonts/`：
   - Noto Sans TC: 400, 700
   - Noto Serif TC: 700
   - Inter: 400, 500, 700
   - Source Serif 4: 600, 700
2. 確認 `src/styles/typography.css` 中的 `@font-face` `src` 路徑與檔名一致
3. 刪除 `src/layouts/Base.astro:58-64` 的 Google Fonts `<link>` 和 `preconnect` 標籤
4. 在 Base.astro `<head>` 加入首屏關鍵字體 preload：
   ```html
   <link rel="preload" href="/fonts/NotoSansTC-Regular.woff2" as="font" type="font/woff2" crossorigin />
   <link rel="preload" href="/fonts/NotoSerifTC-Bold.woff2" as="font" type="font/woff2" crossorigin />
   ```

### 2. Favicon 完全缺失

`public/` 目錄無任何 favicon 檔案。`src/layouts/Base.astro:53-56` 已有 `<link>` 標籤指向這些路徑。

**修復步驟**：放入以下檔案到 `public/`：
- `favicon.svg` — SVG 格式主 favicon
- `favicon.ico` — ICO 格式（16x16, 32x32）
- `apple-touch-icon.png` — Apple 觸控圖示（180x180）

### 3. OG Image 缺失

`src/layouts/Base.astro:17` 預設 ogImage 為 `/og-default.jpg`，但此檔案不存在。所有頁面的 og:image 指向不存在的圖片。

**修復步驟**：
- 短期：設計一張 1200x630 的預設 OG 圖，放入 `public/og-default.jpg`
- 中期：為各篇內容的 frontmatter `coverImage` 欄位補上實際圖片
- 長期：使用 satori 在 build time 自動生成（品牌色底 + 標題文字 + 分類標籤）

### 4. Lighthouse CI 未啟用

`.github/workflows/deploy.yml:57-62` 已寫好 Lighthouse 步驟但被註解。

**修復步驟**：取消該段的 `#` 註解即可。建議在前三項修復完成後再啟用，作為回歸基準線。

### 5. Pagefind 搜尋頁 CSS/JS

`src/pages/search.astro` 直接在 `<head>` 載入 Pagefind CSS/JS。對非搜尋頁無影響，但搜尋頁本身的首屏會被阻塞。

**修復步驟**：改為動態 import，在用戶實際造訪搜尋頁時才載入。優先順序最低。

---

## 專案結構

```
src/
  content.config.ts          # Content Collections schema 定義（6 種類型的 Zod 驗證）
  content/
    articles/                # 文章（Markdown/MDX）
    myths/                   # 闢謠
    ingredients/             # 原料
    podcasts/                # Podcast 單集
    videos/                  # 短影音
    news/                    # 趨勢新聞
  data/
    policies/                # 政策頁 Markdown（非 Content Collection）
  components/
    ui/                      # 原子元件（Button, Badge, CategoryTag, VerdictBadge, Breadcrumb, SearchBar）
    blocks/                  # 區塊元件（6 種 Card, FaqAccordion, TOC, TldrBox, ReferenceList, MedicalDisclaimer, CtaStrip 等）
    charts/                  # d3.js Svelte 互動元件（HeroParticles, EvidenceScale）
    seo/                     # JsonLd 結構化資料輸出元件
  layouts/
    Base.astro               # HTML shell（所有頁面繼承，含 meta/OG/fonts/skip-to-content）
    Article.astro            # 文章/闢謠/原料（雙欄 + sticky sidebar + TOC）
    Media.astro              # Podcast/短影音（單欄 + embed player）
    List.astro               # 列表頁
    Policy.astro             # 政策頁（單欄 68ch）
  pages/                     # 路由頁面（47 頁）
  styles/
    tokens.css               # oklch design tokens（品牌色、分類色、結論色、派生色、間距、圓角、陰影）
    typography.css           # 字體 custom properties + clamp() 流暢字級
    global.css               # reset + prose + container + sr-only + skip-to-content
public/
  CNAME                      # GitHub Pages custom domain
  robots.txt                 # 爬蟲規則（含 AI bot 允許）
```

---

## 內容維護作業流程

### 新增文章

1. 在 `src/content/articles/` 建立新的 `.mdx` 檔案，檔名即為 URL slug（例如 `my-article.mdx` → `/articles/my-article/`）

2. 在檔案開頭加入 frontmatter（所有必填欄位）：

```yaml
---
title: "文章標題"
description: "155 字以內的摘要，用於 SEO meta description"
author: "作者名"
reviewer: "審稿人"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤A", "標籤B"]
tldr: "一段 TL;DR 重點摘要"
readingTime: 8
editorReviewed: true
featured: false                          # true = 首頁焦點置頂
draft: false                             # true = 不發佈
# --- 選填 ---
disclosure: "利益揭露聲明（若有）"
coverImage: "/images/articles/xxx.jpg"    # OG 分享圖
faq:
  - question: "常見問題？"
    answer: "回答。"
references:
  - title: "研究標題"
    url: "https://doi.org/..."
    type: meta-analysis                  # meta-analysis | rct | observational | review | guideline | other
relatedMyths: ["myth-slug"]
relatedIngredients: ["ingredient-slug"]
relatedVideos: ["video-slug"]
relatedPodcasts: ["podcast-slug"]
---
```

3. 在 frontmatter 下方撰寫 Markdown 內文（使用 `##` H2 和 `###` H3 標題）

4. 本地預覽：`pnpm dev`，確認頁面正確顯示

5. 推送：`git add . && git commit -m "content: 新增文章 xxx" && git push`

6. GitHub Actions 自動建置部署（約 2-3 分鐘），會自動檢查所有連結是否正確

### 新增闢謠

在 `src/content/myths/` 建立 `.mdx` 檔案：

```yaml
---
title: "迷思原句（例：吃 XX 一定有效？）"
description: "155 字以內摘要"
verdict: contextual                      # true | false | insufficient | contextual
verdictSummary: "2-3 句結論摘要"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤"]
whyItSpreads: "為什麼會流傳的分析"
actionAdvice: "一般人怎麼做最安全的建議"
featured: false
draft: false
evidence:                                # 至少一筆（必填）
  - level: meta-analysis                 # meta-analysis | rct | observational | animal | in-vitro
    summary: "該等級的研究結論摘要"
references:                              # 必填
  - title: "引用來源標題"
    url: "https://..."
    type: meta-analysis
relatedArticles: ["article-slug"]
relatedIngredients: ["ingredient-slug"]
---
```

### 新增原料

在 `src/content/ingredients/` 建立 `.mdx` 檔案：

```yaml
---
title: "原料中文名"
titleEn: "English Name"
sortKey: "ㄨ"                            # 注音首字母，用於索引排序
description: "155 字以內摘要"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤"]
introduction: "白話介紹這個原料是什麼"
featured: false
draft: false
uses:                                    # 研究常討論的用途
  - purpose: "用途名稱"
    evidenceLevel: rct
    summary: "該用途的研究摘要"
safety:                                  # 選填
  general: "一般安全性說明"
  interactions:
    - substance: "交互作用物質"
      description: "說明"
  populations:
    - group: "特殊族群（如孕婦）"
      note: "注意事項"
references:
  - title: "引用來源"
    type: guideline
relatedArticles: ["article-slug"]
relatedMyths: ["myth-slug"]
---
```

### 新增 Podcast 單集

在 `src/content/podcasts/` 建立 `.mdx` 檔案：

```yaml
---
title: "單集標題"
description: "155 字以內摘要"
episodeNumber: 2
publishDate: 2026-05-08
duration: "32:15"
embedUrl: "https://open.spotify.com/embed/episode/..."
tags: ["標籤"]
featured: false
draft: false
chapters:                                # 選填
  - time: "00:00"
    title: "開場"
  - time: "05:30"
    title: "第一段主題"
showNotes:                               # 選填
  - "重點一"
  - "重點二"
references:                              # 選填
  - title: "引用來源"
    type: review
relatedArticles: ["article-slug"]
---
```

### 新增短影音

在 `src/content/videos/` 建立 `.mdx` 檔案：

```yaml
---
title: "影片標題"
description: "155 字以內摘要"
youtubeId: "實際的YouTube影片ID"         # 從 YouTube URL 取得
duration: "0:30"                         # 選填
publishDate: 2026-05-08
tags: ["標籤"]
tldr: "30 秒重點摘要"
draft: false
transcript: "完整文字稿（選填）"
relatedArticles: ["article-slug"]
---
```

### 新增趨勢新聞

在 `src/content/news/` 建立 `.md` 檔案：

```yaml
---
title: "新聞標題"
source: "來源媒體名稱"
sourceUrl: "https://原始新聞連結"
publishDate: 2026-05-08
tags: ["標籤"]
summary: "一句話摘要"
editorPick: false                        # true = 主編選題，會顯示在趨勢頁頂部
editorComment: "主編評語（editorPick 為 true 時填寫）"
draft: false
relatedArticles: ["article-slug"]
relatedMyths: ["myth-slug"]
relatedIngredients: ["ingredient-slug"]
---
```

### 修改既有內容

1. 找到要修改的檔案：
   - 文章：`src/content/articles/{slug}.mdx`
   - 闢謠：`src/content/myths/{slug}.mdx`
   - 原料：`src/content/ingredients/{slug}.mdx`
   - Podcast：`src/content/podcasts/{slug}.mdx`
   - 短影音：`src/content/videos/{slug}.mdx`
   - 趨勢新聞：`src/content/news/{slug}.md`
   - 不確定 slug？用 `grep -r "文章標題關鍵字" src/content/` 搜尋

2. 修改 frontmatter 或內文後，更新 `updatedDate` 為今天日期

3. 本地預覽 → commit → push

### 刪除內容

**暫時下架（推薦）：** 將 frontmatter 的 `draft` 設為 `true`，檔案保留但不會出現在網站上。日後可隨時改回 `false` 重新上架。

**永久刪除：** 直接刪除檔案。刪除前確認：
- 其他內容的 `related*` 欄位是否引用了這個 slug（用 `grep -r "slug-name" src/content/` 檢查），有的話一併移除引用
- commit message 說明刪除原因

### 更新政策頁

直接編輯 `src/data/policies/` 下的 Markdown 檔案：

- `about.md` — 關於本站
- `editorial-policy.md` — 編輯政策
- `medical-disclaimer.md` — 醫療聲明
- `disclosure.md` — 利益揭露政策

`privacy.astro` 和 `terms.astro` 為 inline 內容，直接編輯 `src/pages/` 下的 `.astro` 檔案。

### 新增政策頁

1. 在 `src/data/policies/` 建立新的 `.md` 檔案（如 `cookie-policy.md`）
2. 在 `src/pages/` 建立對應的 `.astro` 頁面（如 `cookie-policy.astro`），參考 `src/pages/about.astro` 的結構，使用 `Policy` layout
3. 在 `src/components/blocks/Footer.astro` 加入新頁面的連結

### 圖片管理

| 用途 | 存放位置 | 命名規則 |
|------|---------|---------|
| 文章封面 / OG 分享圖 | `public/images/articles/` | `{slug}.jpg`（1200x630） |
| 闢謠封面 | `public/images/myths/` | `{slug}.jpg` |
| 原料封面 | `public/images/ingredients/` | `{slug}.jpg` |
| 全站預設 OG | `public/og-default.jpg` | 固定檔名 |

在 frontmatter 中以 `coverImage: "/images/articles/{slug}.jpg"` 引用。目前 `public/images/` 目錄尚未建立，首次使用時需先 `mkdir -p public/images/articles`。

### 新聞自動化管線的手動介入

**審核未收斂的 PR：**
1. 至 [GitHub PR 列表](https://github.com/weiqi-kids/evidencetoday.news/pulls) 找到標題為 `News Draft: ...` 的 PR
2. PR body 會列出所有未解決的審核建議
3. 在 PR 的 branch 上修改文章（修正建議指出的問題）
4. 將 frontmatter 的 `draft` 改為 `false`
5. Merge PR → 自動部署上線

**修改自動產出的文章：**
- 直接編輯 `src/content/news/radar-*.md`，commit + push 即可
- 自動化管線不會覆蓋已存在的檔案（去重機制保護）

**調整抓取關鍵字：**
- 編輯 `data/news-automation-config.json` 的 `webSearch.queries` 陣列
- 每組查詢可調整 `query`（搜尋字串）、`allowed_domains`（來源過濾）、`max_results`
- commit + push 後，下次排程自動使用新設定

**調整排程頻率：**
- 至 [Claude Code Scheduled](https://claude.ai/code/scheduled) 修改 cron expression

### Schema 驗證失敗排錯

`pnpm build` 或 `pnpm dev` 時如果出現 Content Collection schema 錯誤，常見原因：

| 錯誤訊息 | 原因 | 修正方式 |
|---------|------|---------|
| `Required at "title"` | 必填欄位缺失 | 補上該欄位 |
| `Expected string, received number` | 型別錯誤 | 檢查值的格式（如日期要用 `2026-05-08` 不是 `20260508`） |
| `Invalid enum value` | 列舉值不在允許範圍 | 檢查 `src/content.config.ts` 中允許的值（如 verdict 只接受 true/false/insufficient/contextual） |
| `Array must contain at least 1 element(s)` | 必填陣列為空 | myths 的 `evidence` 和 `references` 至少要有一筆 |
| `String must contain at most 155 character(s)` | description 超過 155 字 | 縮短 description |

Schema 定義檔：`src/content.config.ts`，所有欄位的型別、必填/選填、允許值都在這裡。

---

## 發佈流程

```
1. 本地新增/編輯內容
2. pnpm dev                    → 本地預覽確認
3. git add .
4. git commit -m "content: 新增 xxx"
5. git push origin main        → 觸發自動部署
```

GitHub Actions 會自動執行：
1. 安裝依賴
2. 建置 Astro 靜態網站
3. 建立 Pagefind 搜尋索引
4. 檢查站內連結（失敗會擋部署）
5. 檢查站外連結（失敗不擋部署，僅警告）
6. 部署到 GitHub Pages

部署狀態：https://github.com/weiqi-kids/evidencetoday.news/actions

---

## 交叉連結規則

所有內容類型都可以透過 frontmatter 的 `related*` 欄位互相連結。值為對方的檔名（不含副檔名）：

```
relatedArticles: ["omega-3-guide"]       # 連到 src/content/articles/omega-3-guide.mdx
relatedMyths: ["vitamin-c-cold"]         # 連到 src/content/myths/vitamin-c-cold.mdx
relatedIngredients: ["vitamin-c"]        # 連到 src/content/ingredients/vitamin-c.mdx
relatedPodcasts: ["ep01-supplements"]    # 連到 src/content/podcasts/ep01-supplements.mdx
relatedVideos: ["sprouted-potato"]       # 連到 src/content/videos/sprouted-potato.mdx
```

建議雙向設定（A 連 B 時，B 也連 A）。

---

## 標籤（Tags）

所有內容的 `tags` 欄位會自動產生 `/tags/[tag]/` 彙整頁。跨內容類型的同標籤會匯集在同一頁。

建議統一標籤命名（例如用「維他命C」而非混用「維生素C」）。

---

## 待補齊項目（上線前 Blocker）

- [ ] **Favicon** — 放入 `public/` 目錄：`favicon.svg`、`favicon.ico`、`apple-touch-icon.png`
- [ ] **利益揭露具體內容** — 編輯 `src/data/policies/disclosure.md`，填入與特定公司的實際關係
- [ ] **隱私權政策正式文案** — 編輯 `src/pages/privacy.astro`
- [ ] **使用條款正式文案** — 編輯 `src/pages/terms.astro`
- [ ] **Email 信箱建立** — corrections@、editor@、hello@、transparency@ evidencetoday.news
- [ ] **社群連結** — 在 `src/components/blocks/Footer.astro` 填入 LINE、YouTube、Podcast 平台 URL
- [ ] **Logo SVG** — 替換 `src/components/blocks/TopNav.astro` 中的 CSS placeholder logo
- [ ] **實際內容** — 目前每種類型僅 1 篇範例，至少需 10-15 篇文章 + 5 篇闢謠才適合正式上線

## 待補齊項目（上線後可迭代）

- [ ] **自託管字體** — 下載 Google Fonts woff2 到 `public/fonts/`，替換 CDN `<link>`（**目前最大效能瓶頸**）
- [ ] **OG Image 自動生成** — 使用 satori 在 build time 產出分享預覽圖
- [ ] **趨勢頁 d3 熱詞圖表** — 目前顯示「即將推出」placeholder
- [ ] **原料頁代謝路徑互動圖** — Phase 2 d3.js 視覺化
- [ ] **Lighthouse CI** — 取消 `.github/workflows/deploy.yml` 中的 Lighthouse 註解

---

## 新聞自動化管線

「健康議題雷達」（`/news/`）的內容由 Claude Code scheduled trigger 全自動產出，每 6 小時執行一次。

### 運作流程

```
Cron（台灣 06:17 / 12:17 / 18:17 / 00:17）
  │
  ├─ 資料抓取（WebSearch 多組定向查詢）
  │   ├─ PubMed 學術文獻（site:pubmed.ncbi.nlm.nih.gov）
  │   ├─ WHO / FDA / 衛福部 / 疾管署官方公告（site: 各機構）
  │   ├─ Nature / Lancet / BMJ 研究期刊
  │   └─ 健康新聞媒體（MedPage Today、STAT News 等）
  │
  ├─ 去重過濾（比對 data/processed-sources.json）
  ├─ 編輯企劃（五維度加權評分 → 分組 → 撰文工單）
  ├─ 平行撰文（每份工單一個 Sonnet agent）
  ├─ 連結驗證（確認所有引用連結存在且內容相符）
  ├─ 動態審核委員會（依文章內容決定臨床/受眾/媒體角色與人數）
  ├─ 審核迴圈（反覆審修，直到零建議或判定未收斂）
  │
  └─ 發布
      ├─ 通過 → commit + push main → auto deploy
      └─ 未收斂 → draft: true → 開 PR → 人工審核
```

### 去重機制

`data/processed-sources.json` 記錄已處理的來源，避免重複撰文：
- PubMed 結果：以 `PMID:{id}` 為 key
- 其他來源：以完整 URL 為 key
- 超過 90 天的條目自動清除

### 審核收斂規則

- 審核角色由 AI 根據文章內容動態決定（不固定）
- 每輪追蹤建議總數（totalSuggestions）和 critical 數量
- 零建議 → 自動發布
- 連續 3 輪未收斂 → 開 PR 等人工審核

### 相關檔案

| 檔案 | 用途 |
|------|------|
| `docs/superpowers/specs/2026-05-08-news-automation-design.md` | 完整設計規格 |
| `data/news-automation-config.json` | 抓取設定（WebSearch 查詢、domain 過濾、評分閾值） |
| `data/processed-sources.json` | 去重追蹤 |

### 手動調整

- 修改抓取關鍵字 / RSS feeds → 編輯 `data/news-automation-config.json`
- 修改排程頻率 → [Claude Code Scheduled](https://claude.ai/code/scheduled)
- 修改撰文 / 審核規則 → 編輯 spec 文件

---

## 設計規格

完整設計規格（經四輪審查通過）：
`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`

涵蓋：品牌定位、色彩系統（oklch）、字體系統、所有頁面規格、元件系統、Schema.org、無障礙、CI/CD。
