# News Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立全自動健康新聞產出管線，透過 Claude Code scheduled trigger 定時抓取、撰寫、審核、發布文章。

**Architecture:** 純 AI agent 編排系統，無應用程式碼。建立 2 個資料檔（config + dedup tracking），手動驗證管線各階段可行後，設定 Claude Code scheduled trigger 自動執行。Spec 文件本身就是 agent 的執行指南。

**Tech Stack:** Claude Code CLI, Scheduled Triggers, WebFetch, Tavily MCP, Git/GitHub CLI

---

### Task 1: 建立設定檔

**Files:**
- Create: `data/news-automation-config.json`
- Create: `data/processed-sources.json`

- [ ] **Step 1: 建立 data 目錄**

```bash
mkdir -p data
```

- [ ] **Step 2: 建立 news-automation-config.json**

建立 `data/news-automation-config.json`，內容完全照 spec §12.2：

```json
{
  "version": 1,
  "schedule": {
    "cron": "0 0,6,12,18 * * *",
    "timezone": "Asia/Taipei"
  },
  "pubmed": {
    "reldate": 1,
    "retmax": 50,
    "meshTerms": [
      "Nutritional Sciences", "Diet", "Dietary Supplements",
      "Food Safety", "Public Health", "Chronic Disease",
      "Mental Health", "Exercise", "Sleep", "Gut Microbiome"
    ],
    "publicationTypes": [
      "systematic review", "meta-analysis",
      "randomized controlled trial", "practice guideline"
    ]
  },
  "rssFeeds": [
    {
      "name": "WHO",
      "url": "https://www.who.int/rss-feeds/news-english.xml",
      "enabled": true
    },
    {
      "name": "FDA Press",
      "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
      "enabled": true
    },
    {
      "name": "FDA Safety",
      "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/safety/rss.xml",
      "enabled": true
    },
    {
      "name": "衛福部",
      "url": "https://www.mohw.gov.tw/rss-16.html",
      "enabled": true
    }
  ],
  "tavily": {
    "queries": [
      "health nutrition research latest",
      "public health announcement WHO FDA",
      "dietary supplement safety study",
      "mental health gut microbiome research",
      "food safety recall alert",
      "exercise sleep chronic disease new study"
    ],
    "includeDomains": [
      "nih.gov", "who.int", "fda.gov",
      "nature.com", "thelancet.com", "bmj.com",
      "medpagetoday.com", "statnews.com",
      "mohw.gov.tw", "cdc.gov.tw"
    ],
    "maxResults": 10
  },
  "editorial": {
    "scoreThreshold": 5.0,
    "maxMaterialsPerArticle": 5,
    "minMaterialsPerGroupedArticle": 2,
    "soloArticleMinScore": 7.0
  },
  "review": {
    "nonConvergenceThreshold": 3
  },
  "dedup": {
    "retentionDays": 90
  }
}
```

- [ ] **Step 3: 建立空的 processed-sources.json**

建立 `data/processed-sources.json`：

```json
{
  "version": 1,
  "lastRun": null,
  "processed": {}
}
```

- [ ] **Step 4: Commit**

```bash
git add data/news-automation-config.json data/processed-sources.json
git commit -m "chore: add news automation config and dedup tracking files"
```

---

### Task 2: 驗證 PubMed API 抓取

**Files:**
- Read: `data/news-automation-config.json`
- Read: `docs/superpowers/specs/2026-05-08-news-automation-design.md` §3.2

此 task 不產出檔案，純驗證 API 可用性。

- [ ] **Step 1: 測試 PubMed esearch**

用 WebFetch 呼叫 PubMed esearch API，驗證查詢語法正確且有回傳結果：

```
URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&datetype=edat&reldate=1&retmax=5&sort=date&retmode=json&term=(systematic+review[pt]+OR+meta-analysis[pt]+OR+randomized+controlled+trial[pt])+AND+(%22Nutritional+Sciences%22[MeSH]+OR+%22Diet%22[MeSH]+OR+%22Dietary+Supplements%22[MeSH]+OR+%22Public+Health%22[MeSH]+OR+%22Mental+Health%22[MeSH])
```

Expected: JSON 回應含 `esearchresult.idlist`（PMID 陣列），至少有 1 筆。

- [ ] **Step 2: 測試 PubMed efetch**

取 Step 1 回傳的第一個 PMID，用 efetch 取得文章資料：

```
URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={PMID}&retmode=xml
```

Expected: XML 回應含 `<Article>` 節點，內有 `<ArticleTitle>`、`<AbstractText>`。

- [ ] **Step 3: 記錄測試結果**

記下成功取得的 PMID 數量和一篇範例文章的 title，確認 API 端到端可通。

---

### Task 3: 驗證 RSS Feeds 抓取

**Files:**
- Read: `data/news-automation-config.json`

此 task 不產出檔案，純驗證 RSS feeds 可存取。

- [ ] **Step 1: 測試 WHO RSS Feed**

用 WebFetch 存取 `https://www.who.int/rss-feeds/news-english.xml`。

Expected: 回傳 XML，含 `<item>` 節點，每個 item 有 `<title>`、`<link>`、`<pubDate>`。

- [ ] **Step 2: 測試 FDA Press RSS Feed**

用 WebFetch 存取 `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml`。

Expected: 回傳 RSS XML 或重導向後的有效 feed。如果此 URL 失效，記錄下來並在 config 中標記 `enabled: false`。

- [ ] **Step 3: 測試 FDA Safety RSS Feed**

用 WebFetch 存取 `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/safety/rss.xml`。

Expected: 同 Step 2。

- [ ] **Step 4: 測試衛福部 RSS Feed**

用 WebFetch 存取 `https://www.mohw.gov.tw/rss-16.html`。

Expected: 回傳 RSS XML，含繁體中文新聞條目。

- [ ] **Step 5: 更新失效的 Feed URL**

如果有 feed 失效，在 `data/news-automation-config.json` 中將該 feed 的 `enabled` 設為 `false`，或替換為正確的 URL。Commit 修改。

---

### Task 4: 驗證 Tavily Search

**Files:**
- Read: `data/news-automation-config.json`

此 task 不產出檔案，純驗證 Tavily MCP 可用。

- [ ] **Step 1: 測試 Tavily 搜尋**

使用 MCP `tavily_search` 工具，執行一組測試查詢：

```
query: "health nutrition research latest"
search_depth: "advanced"
max_results: 5
include_domains: ["nih.gov", "who.int", "nature.com"]
```

Expected: 回傳搜尋結果，每筆含 title、url、content。

- [ ] **Step 2: 記錄測試結果**

確認回傳結果的品質和相關性。記下回傳了幾筆結果、來源網域分布。

---

### Task 5: 端到端 dry-run（手動執行完整管線）

**Files:**
- Read: `docs/superpowers/specs/2026-05-08-news-automation-design.md`（完整 spec）
- Read: `data/news-automation-config.json`
- Read: `data/processed-sources.json`
- Read: `src/content/news/weekly-radar-2026-w18.md`（參考現有格式）
- Create: `src/content/news/radar-{YYYY}-{MM}-{DD}-{HH}-01.md`（dry-run 產出）
- Modify: `data/processed-sources.json`

這是最核心的 task：手動走一遍完整管線，驗證每個 phase 的 Sonnet agent 都能正確執行。

- [ ] **Step 1: Phase 1 — 平行抓取三管道**

依 spec §3 的規則，平行抓取：
1. PubMed API（esearch + efetch）
2. 所有 enabled 的 RSS Feeds
3. Tavily Search（全部 6 組 queries）

將結果轉換為 spec §3.1 的 `RawMaterial` 統一格式。

- [ ] **Step 2: 去重過濾**

讀取 `data/processed-sources.json`，比對素材池：
- PubMed 以 `PMID:{id}` 為 key
- RSS/Tavily 以 `url:sha256:{hash}` 為 key
- 過濾掉已存在的來源
- 如果素材池為空 → 記錄 lastRun → 結束

- [ ] **Step 3: Phase 2 — 編輯企劃**

啟動一個 Sonnet agent，傳入素材池和 spec §5 的完整評分規則、分組邏輯、editorPick 判定規則、交叉連結配對規則。

Agent 應輸出：
- 每則素材的五維度評分和加權總分
- 通過閾值（>= 5.0）的素材清單
- 分組結果（每篇文章包含哪些素材）
- n 份撰文工單（spec §5.5 格式）

如果 n = 0 → 結束。

- [ ] **Step 4: Phase 3 — 平行撰文**

每份工單啟動一個 Sonnet agent（model: sonnet），傳入工單 + spec §6.2 撰文規則。

每個 agent 輸出一份完整的 markdown 檔案（spec §6.3 格式）。

- [ ] **Step 5: Phase 4 — 連結驗證**

用 WebFetch 驗證每篇文章正文中所有外部超連結：
- HTTP 200-399 → 通過
- HTTP 400+ 或 timeout → 失敗

依 spec §7.3 處理失敗連結。

- [ ] **Step 6: Phase 5 — 動態審核委員會**

對每篇文章，啟動一個 Sonnet agent（model: sonnet），傳入文章內容 + spec §8.1 角色生成規則。

Agent 輸出審核角色清單（JSON 格式）。

- [ ] **Step 7: Phase 6 — 審核迴圈**

對每篇文章執行審核迴圈：
1. 每個審核角色各啟動一個 Sonnet agent（model: sonnet，可平行），傳入文章 + spec §9.3 審核 prompt
2. 彙整所有建議，記錄 totalSuggestions 和 criticalCount
3. 如果 totalSuggestions = 0 且 criticalCount = 0 → 通過
4. 否則啟動一個 Sonnet agent（model: sonnet），傳入文章 + 建議 + spec §9.4 修改 prompt
5. 修改後回到步驟 1
6. 依 spec §9.2 判定收斂

- [ ] **Step 8: Phase 7 — 輸出**

依審核結果：
- 通過：將 markdown 寫入 `src/content/news/radar-{YYYY}-{MM}-{DD}-{HH}-{NN}.md`，`draft: false`
- 未收斂：寫入同路徑但 `draft: true`

更新 `data/processed-sources.json`：
- 將本次處理的所有素材 ID 寫入 `processed`
- 更新 `lastRun`

- [ ] **Step 9: 驗證產出**

檢查產出的 markdown 檔案：
1. frontmatter 符合 `src/content.config.ts` 的 news schema
2. 所有 related slugs 對應到實際存在的 content entries
3. 正文中所有連結已通過驗證
4. 語言為台灣繁體中文，無中國用語

- [ ] **Step 10: Commit dry-run 結果**

```bash
git add src/content/news/radar-*.md data/processed-sources.json
git commit -m "news: dry-run health radar - validate automation pipeline"
```

---

### Task 6: Git + GitHub CLI 驗證

**Files:** 無新增

此 task 驗證 git push 和 gh pr create 可正常執行。

- [ ] **Step 1: 確認 git remote 設定**

```bash
git remote -v
```

Expected: origin 指向 `https://github.com/weiqi-kids/evidencetoday.news`

- [ ] **Step 2: 確認 GitHub CLI 可用**

```bash
gh auth status
```

Expected: 已登入且有 repo 權限。如果未安裝或未登入，記錄下來供用戶處理。

- [ ] **Step 3: 測試 push 能力**

將 Task 5 的 commit push 到 main：

```bash
git push origin main
```

Expected: push 成功，GitHub Actions deploy workflow 被觸發。

- [ ] **Step 4: 確認 deploy 成功**

等待 GitHub Actions 完成，確認新的 radar 文章出現在網站上。

---

### Task 7: 設定 Claude Code Scheduled Trigger

**Files:**
- Read: `docs/superpowers/specs/2026-05-08-news-automation-design.md` §11.1

- [ ] **Step 1: 建立排程觸發器**

使用 Claude Code 的 `schedule` 功能，建立排程遠端代理：

```
cron: "0 0,6,12,18 * * *"
```

Trigger prompt（來自 spec §11.1）：

```
你是「本日有據」新聞自動化 agent。請嚴格依照以下 spec 文件執行：
docs/superpowers/specs/2026-05-08-news-automation-design.md

執行步驟：
1. 讀取 spec 文件，了解完整流程規則
2. 讀取 data/news-automation-config.json 取得抓取設定
3. 讀取 data/processed-sources.json 取得已處理來源
4. 執行 Phase 1：平行抓取三個管道（PubMed API、RSS Feeds、Tavily Search）
5. 去重後產出素材池。若素材池為空 → 更新 lastRun → 結束
6. 執行 Phase 2：依 spec §5 的評分規則和分組邏輯，產出撰文工單。若 n=0 → 結束
7. 執行 Phase 3：每份工單啟動一個 sonnet agent 平行撰文，prompt 使用 spec §6.2 的撰文規則
8. 執行 Phase 4：用 WebFetch 驗證所有外部連結，依 spec §7.3 處理失敗連結
9. 執行 Phase 5：依 spec §8.1 的規則動態組成審核委員會
10. 執行 Phase 6：審核迴圈，依 spec §9.2 判定收斂
11. 執行 Phase 7：依審核結果 commit+push（通過）或開 PR（未收斂）
12. 更新 processed-sources.json

模型配置參考 spec §11.2，sub-agent 一律使用 sonnet。
```

- [ ] **Step 2: 確認排程已建立**

列出目前的排程，確認新聞自動化 trigger 存在且 cron 正確。

- [ ] **Step 3: 手動觸發一次確認**

手動執行一次 trigger，觀察執行結果。確認：
1. 管線完整執行（或因素材池為空而靜默結束）
2. 無未預期的錯誤
3. 如果有產出，文章品質符合預期
