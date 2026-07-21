# 全站 SEO / AEO / GEO 稽核報告

- 日期：2026-07-21（台灣時間）
- 範圍：技術 SEO、AEO（答案引擎）、GEO（生成引擎）、內容品質、效能、無障礙、架構
- 方法：讀取 `src/` 版面/路由/schema 全鏈、`build` 實際輸出（1,100 頁）、四項內容 gate、跨檔統計
- 基線：`pnpm build` 零錯誤、`check:myths`（48 篇）/`check:news`（80 篇）/`content:audit` 全數通過

---

## 一句話結論

**技術地基非常成熟（entity graph、ClaimReview、llms.txt、news sitemap 都到位），扣分集中在三處可補齊的缺口：文章結構化資料缺 `image`、闢謠頁缺 FAQPage/麵包屑、以及 YMYL 網站最關鍵的「掛名醫療審閱＋引用覆蓋率」。**

---

## 總評分（各面向）

| 面向 | 分數 | 一句話 |
|---|---:|---|
| 技術 SEO | **8.5 / 10** | entity graph、canonical、雙 sitemap、301 都是教科書級；缺 `image`、闢謠麵包屑 |
| AEO 答案引擎 | **8.0 / 10** | 重點摘要前置、FAQ 全覆蓋、ClaimReview；短答欄位已接線但 0 篇填、闢謠缺 FAQPage |
| GEO 生成引擎 | **7.5 / 10** | llms.txt / .txt / Wikidata 實體圈是同級最強；但醫療審閱與引用覆蓋率拉低可信度 |
| 內容品質 | **8.0 / 10** | 引用真實可解析、醫療聲明謹慎、無 build 地雷；~23 處第一人稱 AI 味、3 篇褪黑激素近重複 |
| 效能 / CWV | **7.0 / 10** | aspect-ratio 防 CLS、字型自託管、選擇性 hydration；但圖片未走 astro:assets、無 width/height |
| 無障礙 | **8.0 / 10** | skip link、aria、語意標籤、原生 details；列表頁 h1→h3 跳級 |
| 架構 / 可維護性 | **9.0 / 10** | 單一真相 schema、isPublicEntry 防回歸測試、design/content gate、playbook 完整 |
| **加權總分** | **≈ 8.1 / 10** | 上線品質之上、離「被 AI 當權威引用」還差臨門幾腳 |

---

## 做得好的地方（別動）

- **去重複的 JSON-LD 實體圖**：`Organization`(NewsMediaOrganization) + `WebSite` 帶穩定 `@id`，每頁輸出一次，內容頁以 `@id` 參照 publisher/isPartOf（`schema-org.ts:16-55`）。
- **闢謠 ClaimReview**：48/48 皆帶數值化 `reviewRating` + 人可讀判定（`schema-org.ts:112-137`）。
- **Google News sitemap**：`news:publication`/date/title、48h 視窗、1000 上限、排程稿正確排除（`sitemap-news.xml.ts`）。
- **GEO 管線同級最強**：`llms.txt` + `llms-full.txt` + 每頁 `.txt`，robots 明列 GPT/Claude/Perplexity bot，Wikidata 機構(Q140265345)＋作者(Q140319371) 實體閉環。
- **誠實的 reviewedBy**：reviewer=author 時退回機構級，主動避開「自我審閱」反模式（`articles/[slug].astro:75-80`）。
- **內容紀律**：抽查引用皆真實可解析（PMID/DOI/gov）、醫療誇大詞全在闢謠語境、無 `](images/` 地雷、無 tag 含 `/`、無中國用語、gate 全過。

---

## 優化清單（依優先序）

### P0 — 低成本高槓桿（建議先做）

1. **文章／成分 JSON-LD 補 `image`**〔SEO·高〕
   103/103 文章與 41/41 成分都有 `coverImage`，卻沒進 `Article`/`MedicalWebPage` 的 `image` 欄位（news/myths/videos 都有）。`articles/[slug].astro:82-98`、`ingredients/[slug].astro:54-75`。→ 直接把 `data.coverImage` 塞進 schema `image`。（社群 OG 用統一靜態圖是刻意設計，不必動；這裡只補結構化資料。）

2. **闢謠頁補 BreadcrumbList + 補齊麵包屑中間層**〔SEO·高〕
   `myths/[slug].astro:86` 只輸出 `[articleLd, claimReview]`，缺麵包屑 schema；可見麵包屑也只有「首頁 > 標題」，漏掉「迷思查證」。闢謠是本站最高價值 SEO 資產。→ 比照 `articles/[slug].astro:112-120`。

3. **闢謠頁補 FAQPage schema**〔AEO·高〕
   48/48 闢謠頁已渲染可見 Q&A（`myths/[slug].astro:142`），卻沒輸出 `FAQPage`（只有 articles/topics 有）。已符合 Google「答案可見」硬規則，白白放掉 rich result。→ 複用文章的 `faqSchema`。

4. **填 `aiAnswer` 短答，讓「重點摘要」以 1–2 句可截取答案開頭**〔AEO·中高〕
   `articles/[slug].astro:39-45` 已接線 `aiAnswer||quickAnswer||citationAnswer||summary||tldr`，但 0/103 有填，全部 fall through 到長段 `tldr`（~230 字）。→ 每篇補一句 40–60 字直球答案，voice/AI Overview 命中率最直接。

5. **內容頁 schema 補 `inLanguage`**〔SEO·中〕
   只有 `WEBSITE` 有 `inLanguage`；Article/MedicalWebPage/NewsArticle 都缺；媒體頁用的是 `zh-TW` 與站上 `zh-Hant-TW` 不一致。→ 統一 `zh-Hant-TW`。

6. **`/search`、`/404` 移出 sitemap**〔SEO·中〕
   `astro.config.mjs:68` filter 只排除 `/admin`、`/tags/`，但 `search.astro` 是 noindex 卻仍進 sitemap。→ filter 加 `/search`。

### P1 — 內容可信度（YMYL 核心，成效最大但需人力）

7. **導入掛名、具資格的醫療審閱者**〔GEO·高〕
   目前 1/103 文章有 `reviewer:`，且該 reviewer 就是作者本人（非臨床背景）。schema 與誠實 reviewedBy 機制都已備好（`schema-org.ts:139-155`），只缺「人」與資料。→ 即使外包一位 RD/藥師/醫師掛審閱，對「被 AI 當權威引用」是最大單一槓桿。

8. **補齊 27 篇零引用文章的 `references`，並把泛搜連結換成具體 PMID**〔GEO/內容·高〕
   27/103 文章無 `references:`，前台無引用列表、也不產 schema.org `citation`（正是讓頁面可被引用的訊號），其中不乏癌症、幹細胞、GLP-1 等高風險題（如 `berberine-natural-ozempic-myth.mdx`、`curcumin-anticancer-claims-myth.mdx`、`stem-cell-supplements-pseudoscience.mdx`）。部分內文連的是 PubMed「泛搜結果」而非單篇，GEO 價值低。

9. **改寫 ~23 處第一人稱 AI 味開場**〔內容·中〕
   `content:audit` 只掃「第一句開頭」故通過，但硬規則 7a 列的 `我觀察／我發現／我最近` 大量出現在第 2–3 段。代表例：`aging-starts-when-you-stop-chewing.mdx:29`「這件事我觀察很久了」、`nmn-anti-aging-expectations-reality.mdx:78`、`curcumin-anticancer-claims-myth.mdx:43`、`liver-supplement-comparison-...mdx:37`、`iron-deficiency-anemia-women-supplements.mdx:55` 等。（好消息：`不是…而是`、`換句話說`、`說白了` 等句型 0 命中。）
   → 附帶建議：把 `check-content.mjs` 的 7a 掃描從「僅開頭」擴到「全文」，讓 gate 能擋。

10. **利益揭露的結構性風險**〔GEO·高，已部分緩解〕
    主編經營保健食品公司（樂地滋）卻大量寫成分／保健題。`/disclosure` 已誠實揭露且接進 `worksFor`/`sameAs`（正確做法），但這仍是 LLM 日益看重的信任負債。可考慮在成分／保健類文章頁尾就近顯示一行揭露連結。

### P2 — 打磨（有餘力再做）

11. **成分引用結構化**〔GEO·中〕：0/41 成分用 `journal`/`pmid`/`doi`，全塞在 `title` 字串裡，`buildCitations` 因此少了 DOI/PMID 的 `sameAs`。
12. **前台把已有的引用細節秀出來**〔GEO·中〕：`ReferenceList.astro:22-31` 只渲染 title+type，丟掉 frontmatter 已有的 journal/year/doi/pmid；闢謠的 `quotedExcerpt` 從不顯示。可被 LLM 直接引用的逐字句與期刊年份藏著沒用。
13. **`quotedExcerpt` 與 `mainFinding` 幾乎逐字相同**〔內容·中〕：多數闢謠兩欄是同一段中文改寫、非原文逐字引，讀來像量產樣板，削弱可查證性。
14. **圖片走 `astro:assets` / 補 `width`/`height`／`srcset`**〔效能·中〕：目前全是裸 `<img>`（含遠端 unsplash）無尺寸，卡片縮圖有 LCP/CLS 風險；`sharp` 只在 devDependency。
15. **字型載入**〔效能·中〕：head 匯入 8 個 fontsource（含 2 套 CJK）render-blocking、無 preload；建議 preload 主要內文字型子集。
16. **列表頁 h1→h3 跳級**〔無障礙·低〕：卡片標題一律 `<h3>`，List 版面 h1 後直接接 h3，缺 h2。
17. **每頁 `.txt` 補上 FAQ Q&A、闢謠頁補 sourceType 中文標籤**〔AEO·低〕：`.txt` 目前不含 frontmatter `faq`；news 參考清單未顯示研究類型（闢謠已有 `sourceTypeLabels` 對照可複用）。
18. **Lighthouse CI 覆蓋內頁並升級為 error**〔效能·低〕：`lighthouserc.json` 只測 4 個列表/首頁、全 `warn`；圖片/iframe/JSON-LD 實際渲染的內頁沒測到。
19. **統一日期格式與精簡欄位**〔內容·低〕：文章用完整 ISO、闢謠用日期字串且有 5 個重複日期欄位（`publishedAt/updatedAt/datePublished/dateModified/publishDate/updatedDate` 同值），有漂移風險。
20. **robots.txt 明列 GPTBot / Google-Extended / Applebot-Extended**〔GEO·低〕：目前靠 `*` 萬用允許，明列可對特判 UA 的爬蟲移除歧義。

---

## 內容有沒有錯誤？

**沒有事實性或安全性錯誤。** 抽查 15+ 篇：醫療誇大詞（治癒/根治/100%）全部出現在「闢謠、破除」語境；引用連結真實可解析（BMJ PMID 32132002、ISSN PMC5469049、HPA/FDA gov 站等）；無聳動行銷語、無具體醫療建議、無醫療承諾。

實際「問題」都屬品質層，非錯誤：
- **AI 味第一人稱**（清單第 9 項，~23 處）——最該處理。
- **近重複**：`buy-melatonin-taiwan-legal-options` / `import-melatonin-taiwan-customs` / `melatonin-prescription-taiwan-gray-market` 三篇同談「台灣褪黑激素合法取得」，建議人工去重，避免 thin/自我競食。
- **borderline 用語**：`網絡`（維生素 C/E 的「抗氧化網絡」）台灣較常用「網路/系統」，請 TW 用語審閱定奪。
- **raw-enum 警告**（news 的 `type: rct/observational`）為 frontmatter 合法值、前台未外露，非問題。

---

## 一眼看懂：各頁型 schema 覆蓋

| 頁型 | 已輸出 | 缺口 |
|---|---|---|
| articles/[slug] | Article+MedicalWebPage、FAQPage(條件)、Breadcrumb | **缺 image**、缺 inLanguage、短答未填 |
| myths/[slug] | Article、ClaimReview | **缺 BreadcrumbList**、麵包屑跳級、**缺 FAQPage**、缺 inLanguage |
| ingredients/[slug] | Article+MedicalWebPage、Breadcrumb | **缺 image**、引用未結構化、缺 inLanguage |
| news/[slug] | NewsArticle、Breadcrumb | 佳（有 image / editor Person） |
| podcasts/[slug] | PodcastEpisode、Breadcrumb | 缺 episode image |
| videos/[slug] | VideoObject、Breadcrumb | 佳 |
| topics/[slug] | CollectionPage+ItemList、FAQPage、Breadcrumb | ItemList 只含文章 |
| 首頁 | Organization + WebSite | 無 ItemList/WebPage |

---

## 實作紀錄（P0 已完成，2026-07-21）

本輪把 P0 六項一次做完並驗證（`pnpm build` 零錯誤、`check:myths`/`content:audit` 通過）：

1. ✅ **文章／成分 JSON-LD 補 `image`**：取 frontmatter `coverImage`，以 `new URL(...)` 轉絕對網址（成分多為 `/images/...` 相對路徑，schema.org 需絕對）。103 文章＋41 成分全數帶 image。
2. ✅ **闢謠頁補 BreadcrumbList + 補「迷思查證」中間層**（`myths/[slug].astro`）。
3. ✅ **闢謠頁補 FAQPage** —— 過程中發現**潛在 bug**：`mythsSchema` 從未宣告 `faq` 欄，48 篇手寫的 Q&A 被 Zod 靜默剝除，導致前台 FAQ 區塊（模板早已寫好）與 FAQPage **從來沒出現過**。補上 schema 欄位後，42 篇公開闢謠的可見 FAQ 與 FAQPage 一併生效（FAQPage rich result 要求答案頁面可見，兩者必須同時）。
4. ✅ **內容頁 schema 補 `inLanguage: zh-Hant-TW`**，並把 podcasts/videos 原本的 `zh-TW` 統一。
5. ✅ **`/search`、`/404` 移出 sitemap** filter。
6. ⏸ **填 `aiAnswer` 短答**：屬 103 檔逐篇編輯內容（非程式），機械量產會踩 YMYL／AI 味鐵則，留待正式內容批次處理，未納入本輪。

> 註：改 `content.schemas.ts` 欄位後本機需 `rm -rf .astro dist` 再 build，否則 content-layer 快取會沿用舊解析（新欄位仍被剝除）。CI 全新 checkout 無此問題。

P1／P2 仍待處理（掛名醫療審閱、27 篇補引用、AI 味改寫等），見上方清單。
