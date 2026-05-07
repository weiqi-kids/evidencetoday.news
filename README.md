# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push main 自動部署）

---

## 快速開始

```bash
pnpm install        # 安裝依賴
pnpm dev            # 啟動開發伺服器 (localhost:4321)
pnpm build          # 建置靜態網站 (輸出至 dist/)
pnpm preview        # 預覽建置結果
```

---

## 專案結構

```
src/
  content.config.ts          # Content Collections schema 定義
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
    ui/                      # 原子元件（Button, Badge, CategoryTag 等）
    blocks/                  # 區塊元件（Card, FAQ, TOC, CTA 等）
    charts/                  # d3.js Svelte 互動元件
    seo/                     # JsonLd 結構化資料元件
  layouts/
    Base.astro               # HTML shell（所有頁面繼承）
    Article.astro            # 文章/闢謠/原料（雙欄 + sidebar）
    Media.astro              # Podcast/短影音（單欄 + embed）
    List.astro               # 列表頁
    Policy.astro             # 政策頁
  pages/                     # 路由頁面
  styles/
    tokens.css               # oklch design tokens
    typography.css            # 字體系統
    global.css               # 全域樣式
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

### 更新政策頁

直接編輯 `src/data/policies/` 下的 Markdown 檔案：

- `about.md` — 關於本站
- `editorial-policy.md` — 編輯政策
- `medical-disclaimer.md` — 醫療聲明
- `disclosure.md` — 利益揭露政策

`privacy.astro` 和 `terms.astro` 為 inline 內容，直接編輯 `src/pages/` 下的 `.astro` 檔案。

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

## SEO / AEO 自動產出

以下檔案在 `pnpm build` 時自動產生，不需手動維護：

- `/sitemap.xml` — 全站 sitemap
- `/rss.xml` — 主 RSS feed（最新 20 篇）
- `/articles/rss.xml`、`/myths/rss.xml`、`/podcasts/rss.xml`、`/videos/rss.xml` — 分類 RSS
- `/llms.txt` — AI 爬蟲索引
- `/llms-full.txt` — AI 爬蟲完整內容索引
- `/articles/[slug].txt`、`/myths/[slug].txt` 等 — 每篇內容的純文字版（供 AI 讀取）
- Schema.org JSON-LD — 自動嵌入每個頁面的 `<head>`

---

## 待補齊項目（上線前 Blocker）

- [ ] **Favicon** — 放入 `public/` 目錄：`favicon.svg`、`favicon.ico`、`apple-touch-icon.png`
- [ ] **利益揭露具體內容** — 編輯 `src/data/policies/disclosure.md`，填入與特定公司的實際關係
- [ ] **隱私權政策正式文案** — 編輯 `src/pages/privacy.astro`
- [ ] **使用條款正式文案** — 編輯 `src/pages/terms.astro`
- [ ] **Email 信箱建立** — corrections@、editor@、hello@、transparency@ evidencetoday.news
- [ ] **社群連結** — 在 `src/components/blocks/Footer.astro` 填入 LINE、YouTube、Podcast 平台 URL
- [ ] **Logo SVG** — 替換 `src/components/blocks/TopNav.astro` 中的 CSS placeholder logo

## 待補齊項目（上線後可迭代）

- [ ] **OG Image 自動生成** — 使用 satori 在 build time 產出分享預覽圖
- [ ] **趨勢頁 d3 熱詞圖表** — 目前顯示「即將推出」placeholder
- [ ] **原料頁代謝路徑互動圖** — Phase 2 d3.js 視覺化
- [ ] **Lighthouse CI** — 取消 `.github/workflows/deploy.yml` 中的 Lighthouse 註解
- [ ] **自託管字體** — 下載 Google Fonts woff2 到 `public/fonts/`，替換 CDN `<link>`

---

## 設計規格

完整設計規格（經四輪審查通過）：
`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`

涵蓋：品牌定位、色彩系統（oklch）、字體系統、所有頁面規格、元件系統、Schema.org、無障礙、CI/CD。
