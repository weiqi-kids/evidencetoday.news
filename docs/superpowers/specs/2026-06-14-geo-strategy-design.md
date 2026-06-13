# GEO 策略地圖 — 讓 AI 搜尋主動引用本站

**日期**：2026-06-14
**狀態**：設計定稿，待實作
**目標**：使用者在 ChatGPT / Perplexity / Google AI Overviews / Claude 詢問健康議題時，AI 的回答主動引用、連結到 evidencetoday.news。
**範圍**：完整 GEO（Generative Engine Optimization）地圖，分四區塊 A 站內技術 / B 內容答案化 / C 站外權威 / D 成效監測。其中 A、B 站內項目可直接動 codebase，抽成獨立實作清單；C、D 多為站外/流程，給執行建議。

---

## 背景：現況盤點

「讓 AI 抓得到、讀得懂」這層已完成，**不需重做**：

- `robots.txt` 已放行主流 AI 爬蟲：OAI-SearchBot、ChatGPT-User、ClaudeBot、Claude-SearchBot、PerplexityBot。
- `llms.txt`、`llms-full.txt`、每篇內容 `.txt` 純文字端點（articles / myths / ingredients / podcasts）。
- Schema JSON-LD、RSS、sitemap。

GEO 要做的是更進一步：從「被索引」到「被主動引用」。

### 已修復（2026-06-14，本次前置）

`public/llms.txt`（靜態）與 `src/pages/llms.txt.ts`（動態路由）同路徑衝突。Astro 5 路由覆蓋靜態檔，導致 2026-05-25 對 `public/llms.txt` 的策展更新從未上線。已將動態路由設為唯一來源、併入策展內容、刪除靜態檔、修正「原料 → 成分解析」命名，`pnpm build` 零錯誤驗證通過。

### 兩個影響策略的現實限制

1. **GitHub Pages 純靜態託管，無 server log** → 無法在現有架構分析 AI 爬蟲的 user-agent 造訪紀錄。可行監測只剩 referrer 分析與人工抽測（見 D）。要拿爬蟲層 log 須在前面加 Cloudflare proxy（D 區塊列為選配評估）。
2. **ChatGPT 搜尋走 Bing 索引** → Bing Webmaster 收錄是 Taiwan 市場最常被忽略、CP 值最高的一招（見 C）。

---

## A. 站內技術可引用性

> 原則：讓 AI 容易**抽取**單一自足的答案區塊，且容易**判斷來源權威**。

### A1. Schema JSON-LD 升級（最高優先）

- **闢謠頁加 `ClaimReview`（金礦）**：當使用者問「X 是真的嗎」，帶 `ClaimReview` 結構化資料的闢謠頁最容易被 AI 與 Google 引用。欄位：`claimReviewed`（被檢驗的說法）、`reviewRating`（含 `ratingValue` / `bestRating` / `worstRating` / `alternateName` 如「錯誤」「部分正確」）、`itemReviewed`（含 `author`）、`author`（本站 Organization）。
  - 須在 myths schema（`src/content.config.ts`）補可選欄位承載評級與被檢驗說法，並在闢謠頁模板輸出 JSON-LD。**注意 myths 單篇版型是刻意簡化**，此處只加 `<script type="application/ld+json">`，**不得**新增任何前台可見區塊（遵守 article-layout playbook）。
- **文章用 `MedicalWebPage`**（或 `Article` + `MedicalWebPage`）：標示 `lastReviewed`、`reviewedBy`、`medicalAudience`。
- **作者 `Person` 補 credential**：`jobTitle`、`knowsAbout`、`sameAs`（外部權威連結，見 C 的 entity）。AI 用作者專業度判斷可信度。
- **`FAQPage`**：文章內既有 FAQ 區塊輸出 `FAQPage` schema，對應 AI 的「People Also Ask」抽取。
- **`Organization` 補方法論**：`Organization` 加 `sameAs`（Wikidata/社群）、首頁標示編輯方法論連結。

### A2. llms.txt / llms-full.txt 強化

- llms.txt 補一段「**方法論 / 為何可信**」：證據分級、利益揭露、主編判讀流程的一句話摘要 + 連結。這是 AI 判斷來源權威的關鍵訊號。
- llms-full.txt 確認涵蓋核心內容的標題 + 描述（目前動態生成，維持）。

### A3. `.txt` 純文字端點答案化

- 每篇 `.txt` **開頭即 TL;DR 答案**（self-contained，不依賴上下文即可被整段引用）。
- 文末附**原始研究/官方來源 URL 清單**，讓 AI 連帶引用一手出處、提升本站「彙整可信來源」的定位。

### A4. 可抽取性基本盤（多為既有，驗證即可）

- 「重點摘要」AEO 區塊置頂、自足。
- 穩定 URL、canonical、`lastmod`（AI 偏好新鮮內容，sitemap 帶 lastmod）。

---

## B. 內容答案化（寫作 SOP）

> 原則：每篇內容直接命中使用者會問的自然語言問題，用「可被原文引用、附證據出處」的句子來寫。健康 + 證據定位在這塊優勢最大。

納入 `docs/content-guide.md` 的新增/修改流程，並在 `pnpm content:audit` 可涵蓋處加檢查：

- **標題即真實問句**：H1/H2 用使用者真的會打的自然語言問句（「維他命 C 真的能預防感冒嗎？」），而非名詞短語。
- **段落首句先給結論（BLUF / 倒金字塔）**：AI 抽取的是段落首句，結論不可埋在段末。
- **可引用短斷言**：短、自足、**附數字 + 出處**的句子（「根據 2020 年 Cochrane 回顧，常規補充對一般人群感冒病程縮短約 8%」）。AI 偏好引用這種句子。
- **對比表格 / 清單**：AI 容易結構化抽取。
- **闢謠是 GEO 殺手鐧**：與 A1 的 `ClaimReview` 搭配，「X 是真的嗎」類查詢命中率最高。
- **FAQ 段**：對應 People Also Ask，與 A1 `FAQPage` 搭配。

---

## C. 站外權威訊號

> 原則：LLM 偏好「全網被廣泛引用」的來源。站外經營，多須使用者執行；本區給優先序與做法。

- **C1. Bing Webmaster Tools 收錄（最高優先、CP 值最高）**：提交 sitemap 至 Bing。ChatGPT 搜尋走 Bing 索引，這是直接影響 ChatGPT 是否引用本站的關卡。Google Search Console 同步確認收錄無誤。
- **C2. 建立機構 entity**：Wikidata item（Organization）+ 視情況維基百科可靠來源引用，讓 AI 有可連結的實體；entity 的 `sameAs` 回填進 A1 的 Schema，形成閉環。
- **C3. 跨站有機提及**：PTT / Dcard / Threads / 論壇等以內容價值有機被提及（非灌水）。
- **C4. 權威 backlink**：與其他健康媒體、機構互相連結；投稿或被新聞引用。

---

## D. 成效監測

> 現實：GitHub Pages 靜態無 server log。以下為此限制下可行的方案。

- **D1. Referrer 分析（可建置）**：前端 analytics 偵測 referrer 來自 `chat.openai.com` / `perplexity.ai` / `gemini.google.com` 等，證明「AI 已導流進站」。這是最直接、可量化的成效證據。
- **D2. 人工抽測 checklist（流程）**：固定一組代表性健康問題（對應本站既有內容），定期（如每月）至 ChatGPT / Perplexity / Gemini / Claude 詢問，記錄是否引用本站、引用位置/排序。做成記錄表追蹤趨勢。
- **D3.（選配評估）Cloudflare proxy**：若要爬蟲層級 log（哪家 bot、抓哪頁、頻率），須在 GitHub Pages 前加 Cloudflare。屬擴大架構決定，先列為評估項，非本期必做。

---

## 站內可建置清單（→ writing-plans 實作範圍）

依優先級，僅含可直接動 codebase 者：

1. **A1 ClaimReview**：myths schema 加欄位 + 闢謠頁輸出 JSON-LD（不動前台版型）。
2. **A1 其他 Schema**：文章 `MedicalWebPage`、作者 `Person` credential、`FAQPage`、`Organization` `sameAs`。
3. **A3 `.txt` 答案化**：端點開頭 TL;DR + 文末出處清單。
4. **A2 llms.txt 方法論段**。
5. **D1 Referrer 分析**：前端 analytics 偵測 AI 來源。
6. **B 寫作 SOP**：更新 `docs/content-guide.md`，`content:audit` 可涵蓋處加檢查。

站外/流程（不進 codebase，給使用者執行）：C1 Bing 收錄、C2 Wikidata entity、C3/C4 提及與 backlink、D2 人工抽測 checklist、D3 Cloudflare 評估。

---

## 優先級總覽

| 優先 | 項目 | 區塊 | 性質 |
|---|---|---|---|
| P0 | ClaimReview schema（闢謠） | A1 | 站內 |
| P0 | Bing Webmaster 收錄 | C1 | 站外 |
| P1 | 文章/作者/FAQ Schema 升級 | A1 | 站內 |
| P1 | `.txt` 答案化（TL;DR + 出處） | A3 | 站內 |
| P1 | 寫作 SOP 答案化 | B | 站內(流程) |
| P2 | llms.txt 方法論段 | A2 | 站內 |
| P2 | Referrer 監測 | D1 | 站內 |
| P2 | Wikidata entity | C2 | 站外 |
| P3 | 人工抽測 checklist | D2 | 流程 |
| P3 | 跨站提及 / backlink | C3/C4 | 站外 |
| 評估 | Cloudflare proxy（爬蟲 log） | D3 | 架構 |

---

## 硬規則對齊（避免踩坑）

- 改 myths 頁只加 JSON-LD，**不得**新增前台可見區塊（version 版型刻意簡化，見 article-layout playbook）。
- 動到 `src/pages|components|content.config.ts` 須同步 docs（`docs-sync-check`）。
- 日期一律台灣時間（UTC+8）。
- 內容禁聳動用語、具體醫療建議、醫療承諾；可引用斷言須附出處、用詞保守。
- tags 禁含 `/`；內容禁幽靈行內圖。
