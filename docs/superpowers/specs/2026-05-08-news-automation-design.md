# News Automation Design Spec v1.0

> 將「健康議題雷達」與 `/news/` 頁面的 news content collection，從手動撰寫改為全自動排程產出。

## 1. 目標

- 定時掃描多個外部來源（PubMed、WHO/FDA/衛福部 RSS、一般健康新聞）
- 由 AI 以總編輯視角企劃文章，決定本次產出幾篇、每篇涵蓋哪些素材
- 多篇文章平行撰寫，每篇經過動態組成的審核委員會反覆審核
- 審核通過 → 自動 commit + push → GitHub Actions 部署
- 審核未收斂 → 存為草稿 → 開 PR → 人工審核
- **執行階段全程使用 Sonnet/Haiku，不使用 Opus**

## 2. 架構總覽

```
Cron（每 6 小時，可調）
  │
  ▼
Phase 1：資料抓取（平行三管道）
  ├─ PubMed E-utilities API
  ├─ RSS Feeds（WHO / FDA / 衛福部）
  └─ Tavily Search（一般健康新聞）
  │
  ▼
去重過濾（比對 data/processed-sources.json）
  │
  ▼
素材池（本次新抓到的所有素材）
  │   若素材池為空 → 靜默結束
  ▼
Phase 2：編輯企劃（Sonnet × 1）
  照預定義規則評分、分組、產出 n 份撰文工單
  │   若 n = 0 → 靜默結束
  ▼
Phase 3：平行撰文（Sonnet × n）
  每個 agent 拿一份工單，照指令撰寫 markdown
  │
  ▼
Phase 4：連結驗證（WebFetch）
  逐一驗證所有外部連結可連線，死連結剔除或替換
  │
  ▼
Phase 5：動態審核委員會（Sonnet × 動態角色數）
  根據文章內容動態決定審核角色與人數
  │
  ▼
Phase 6：審核迴圈
  ├─ 所有角色零建議 → commit main → auto deploy
  └─ 連續 3 輪建議數未減少 → draft: true → 開 PR
  │
  ▼
Phase 7：收尾
  更新 processed-sources.json，記錄本次已處理的來源
```

## 3. Phase 1：資料抓取層

三個管道平行執行，各自回傳統一格式的素材物件。

### 3.1 統一素材格式

```typescript
interface RawMaterial {
  id: string;              // PMID 或 URL hash
  source: string;          // "PubMed" | "WHO" | "FDA" | "衛福部" | 媒體名稱
  sourceUrl: string;       // 原文連結
  title: string;           // 原文標題（原語言）
  abstract: string;        // 摘要或全文前 500 字（原語言）
  publishDate: string;     // ISO 8601
  language: string;        // "en" | "zh-TW" | 其他
  type: string;            // "systematic-review" | "meta-analysis" | "rct" | "guideline" | "news" | "announcement"
  meshTerms?: string[];    // PubMed 限定
  fetchedAt: string;       // 抓取時間 ISO 8601
}
```

### 3.2 PubMed E-utilities

**API 端點：**
- 搜尋：`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
- 擷取：`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`

**搜尋策略：**
```
查詢條件：
  db = pubmed
  datetype = edat（Entrez date，入庫日期）
  reldate = 1（PubMed API 最小粒度為天，無法指定小時。每 6 小時排程會重複看到同日結果，由 §4 去重機制處理重疊）
  retmax = 50
  sort = date

篩選 publication type（PT filter）：
  - systematic review[pt]
  - meta-analysis[pt]
  - randomized controlled trial[pt]
  - practice guideline[pt]

主題篩選（MeSH terms，OR 組合）：
  - "Nutritional Sciences"[MeSH]
  - "Diet"[MeSH]
  - "Dietary Supplements"[MeSH]
  - "Food Safety"[MeSH]
  - "Public Health"[MeSH]
  - "Chronic Disease"[MeSH]
  - "Mental Health"[MeSH]
  - "Exercise"[MeSH]
  - "Sleep"[MeSH]
  - "Gut Microbiome"[MeSH]

查詢範例（節錄部分 MeSH terms，實際執行時使用 config 中全部 terms）：
  (systematic review[pt] OR meta-analysis[pt] OR randomized controlled trial[pt])
  AND ("Nutritional Sciences"[MeSH] OR "Diet"[MeSH] OR "Dietary Supplements"[MeSH]
       OR "Public Health"[MeSH] OR "Mental Health"[MeSH])
  AND reldate=1
```

**efetch 回傳格式：** `retmode=xml`，解析 `<Article>` 節點取 Title、Abstract、PMID、PublicationType、MeshHeadingList。

### 3.3 RSS Feeds

| 來源 | Feed URL | 解析方式 |
|------|----------|----------|
| WHO News | `https://www.who.int/rss-feeds/news-english.xml` | 標準 RSS 2.0 |
| FDA Press Announcements | `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml` | RSS 2.0 |
| FDA Safety Alerts | `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/safety/rss.xml` | RSS 2.0 |
| 衛福部新聞 | `https://www.mohw.gov.tw/rss-16.html` | RSS 2.0 |

**篩選：** 取最近 24 小時內的條目（比對 `<pubDate>` 或 `<updated>`）。與 PubMed 同理，重疊部分由 §4 去重機制處理。

**注意：** RSS feed URL 可能隨機構改版而變動，寫在設定檔 `data/news-automation-config.json` 中，方便修改。

### 3.4 Web Search（一般健康新聞）

使用 WebSearch 工具（Claude Code 內建，本機與遠端環境皆可用），執行多組關鍵字搜尋。若環境有 Tavily MCP 可用，亦可使用 `tavily_search` 作為替代。

對 config 中 `tavily.queries` 的每組關鍵字，執行一次 WebSearch：

```
WebSearch({
  query: "health nutrition research latest {current_year}",
  allowed_domains: ["nih.gov", "who.int", "fda.gov",
    "nature.com", "thelancet.com", "bmj.com",
    "medpagetoday.com", "statnews.com",
    "mohw.gov.tw", "cdc.gov.tw"]
})
```

**關鍵字清單** 存在 `data/news-automation-config.json`，可隨時調整。

## 4. 去重機制

### 4.1 processed-sources.json 結構

```json
{
  "version": 1,
  "lastRun": "2026-05-08T06:00:00Z",
  "processed": {
    "PMID:39876543": {
      "processedAt": "2026-05-08T06:15:00Z",
      "outputFile": "src/content/news/radar-2026-05-08-06-01.md"
    },
    "url:sha256:abc123...": {
      "processedAt": "2026-05-08T06:15:00Z",
      "outputFile": "src/content/news/radar-2026-05-08-06-01.md"
    }
  }
}
```

### 4.2 比對邏輯

- PubMed：以 PMID 為 key
- RSS / Tavily：以 URL 的 SHA-256 hash 為 key
- 已存在於 `processed` 中的來源 → 跳過
- 每次執行結束後，將本次處理的來源寫入 `processed`

### 4.3 清理策略

每次執行開始時（Phase 1 之前），清除 `processed` 中 `processedAt` 超過 90 天的條目，避免檔案無限膨脹。

## 5. Phase 2：編輯企劃（Sonnet × 1）

### 5.1 輸入

素材池中所有 `RawMaterial` 物件（去重後）。

### 5.2 評分規則（寫入 prompt）

Sonnet 依以下規則對每則素材評分（1-10）：

| 維度 | 權重 | 說明 |
|------|------|------|
| 證據等級 | 30% | meta-analysis/systematic review = 10, RCT = 8, guideline = 9, observational = 5, news = 3 |
| 影響範圍 | 25% | 影響全球/全台人口 = 10, 特定族群 = 6, 小眾 = 3 |
| 新穎性 | 20% | 挑戰或修正主流觀點 = 10, 補充既有證據 = 7, 確認已知結論 = 3（依素材 abstract 內容判斷，無需外部歷史資料） |
| 實用性 | 15% | 有明確行動建議 = 10, 需進一步研究 = 5, 純理論 = 2 |
| 話題性 | 10% | 大眾關注度高 = 10, 一般關注 = 6, 專業領域限定 = 3 |

**閾值：** 加權總分 >= 5.0 的素材才進入後續流程。

### 5.3 分組邏輯

Sonnet 將通過閾值的素材分組為文章：

1. **主題關聯性**：同一疾病領域、同一成分、同一公衛議題的素材歸為一組
2. **互補性**：正反觀點、不同角度的素材優先放在同一篇
3. **獨立性**：與其他素材無關聯的高分素材（加權總分 >= 7.0）可以單獨成篇
4. **數量限制**：組合成篇的文章包含 2-5 則素材；單獨成篇僅限高分素材

### 5.4 editorPick 判定規則

`editorPick: true` 的條件（符合任一即可）：

1. 包含官方權威機構（WHO、FDA、衛福部）的政策更新或指引變動
2. 包含 meta-analysis 或 systematic review 等級的素材，且結論挑戰或修正主流觀點
3. 文章加權總分平均 >= 8.0
4. 涉及食品安全警示或緊急公衛事件

不符合以上任何條件 → `editorPick: false`。

### 5.5 撰文工單格式

每篇文章產出一份工單，結構如下：

```json
{
  "workOrderId": "wo-2026-05-08-06-01",
  "theme": "WHO 更新人工甜味劑指引與代糖安全性研究",
  "angle": "從公衛政策變動切入，連結最新臨床證據",
  "materials": [
    {
      "id": "PMID:39876543",
      "source": "PubMed",
      "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/39876543/",
      "title": "Non-sugar sweeteners and long-term weight management...",
      "abstract": "Background: The WHO conditional recommendation...",
      "role": "主要素材",
      "useAs": "核心研究結果"
    },
    {
      "id": "url:sha256:abc123",
      "source": "WHO",
      "sourceUrl": "https://www.who.int/news/item/...",
      "title": "WHO updates guidance on non-sugar sweeteners",
      "abstract": "The World Health Organization today released...",
      "role": "補充素材",
      "useAs": "官方立場佐證"
    }
  ],
  "suggestedTags": ["人工甜味劑", "WHO", "代糖", "糖尿病"],
  "editorPick": true,
  "editorPickReason": "符合 editorPick 條件：官方權威機構指引更新，影響全球飲食建議",
  "suggestedRelated": {
    "articles": ["omega-3-guide"],
    "myths": ["vitamin-c-cold"],
    "ingredients": ["vitamin-c"],
    "podcasts": ["ep01-supplements"]
  },
  "crossLinkReasoning": "omega-3-guide 同為營養補充主題；vitamin-c 為相關成分條目"
}
```

### 5.6 交叉連結配對規則

Sonnet 依以下規則從現有 content collections 中配對 `relatedArticles`、`relatedMyths`、`relatedIngredients`、`relatedVideos`、`relatedPodcasts`：

1. **讀取所有現有內容的 frontmatter**（title、tags、description）
2. **比對方式：** tags 交集 >= 2 個，或主題語義高度相關
3. **每個欄位最多 3 個連結**，避免過度連結
4. **必須寫出配對理由**（`crossLinkReasoning`），確保不是隨機配對
5. **找不到合理配對 → 留空**，不硬配

## 6. Phase 3：平行撰文（Sonnet × n）

### 6.1 執行方式

- 每份工單啟動一個獨立的 Sonnet agent
- 所有 agent 平行執行
- 每個 agent 的 prompt 包含：工單（已內嵌素材的 title、abstract、sourceUrl）+ 撰文規則（§6.2）

### 6.2 撰文規則（寫入每個 agent 的 prompt）

```
你是「本日有據」健康新聞編輯。根據以下工單和素材撰寫一篇健康新聞雷達文章。

【格式要求】
- 輸出完整的 Astro Content Collection markdown 檔案
- frontmatter 欄位定義：
  title: string（必填）
  source: string（必填，固定為「本日有據編輯室」）
  publishDate: date（必填，YYYY-MM-DD）
  tags: string[]（必填）
  summary: string（必填，100-150 字）
  editorPick: boolean（選填，預設 false）
  editorComment: string（選填）
  relatedArticles: string[]（選填，slug 清單）
  relatedMyths: string[]（選填）
  relatedIngredients: string[]（選填）
  relatedVideos: string[]（選填）
  relatedPodcasts: string[]（選填）
  draft: boolean（必填，設為 false）
- 無配對的 related 欄位整個省略，不要寫空陣列
- 正文使用 ## 標題分隔每個議題
- 每個議題包含：研究發現摘要、研究方法簡述、研究限制

【語言要求】
- 全文使用台灣繁體中文
- 使用台灣慣用醫學術語（如「第2型糖尿病」非「II型糖尿病」）
- 專有名詞首次出現時附英文原文，如「丁酸（butyrate）」
- 不使用中國用語（如「視頻」→「影片」、「信息」→「資訊」）

【內容要求】
- summary：100-150 字，涵蓋所有議題重點
- editorComment：以「主編觀點」語氣撰寫，整合涵蓋所有議題，指出：
  1. 這些研究/公告的實際意義（不要過度解讀）
  2. 一般人應該怎麼理解（避免恐慌或過度樂觀）
  3. 研究限制或需注意的地方
  （多議題文章的 editorComment 應綜合評論，不是逐篇拆開寫）
- 正文每個議題必須包含「研究限制」段落
- 禁止使用「震驚」「突破性」「革命性」等聳動用語
- 禁止給出具體醫療建議（如「應該每天吃 X mg」），改為「建議諮詢醫療團隊」

【引用要求】
- 每個議題必須標明來源（期刊名稱、機構名稱）
- PubMed 來源使用 PMID 連結格式：https://pubmed.ncbi.nlm.nih.gov/{PMID}/
- 所有連結必須是素材中提供的原始 URL，禁止自行編造連結
```

### 6.3 輸出的 markdown 結構

以下為實際輸出範例（撰文 agent 應產出可直接存檔的完整 markdown）：

```markdown
---
title: "健康雷達 2026-05-08 06：WHO 更新人工甜味劑指引、腸道菌相與憂鬱症新證據"
source: "本日有據編輯室"
publishDate: 2026-05-08
tags: ["人工甜味劑", "WHO", "腸道菌相", "憂鬱症"]
summary: "本週重要健康新聞：世界衛生組織發布人工甜味劑使用新版指引..."
editorPick: true
editorComment: "WHO 對人工甜味劑的立場進一步收緊，但要注意這並非「禁用」..."
relatedArticles:
  - omega-3-guide
relatedMyths:
  - vitamin-c-cold
relatedIngredients:
  - vitamin-c
relatedPodcasts:
  - ep01-supplements
draft: false
---

## WHO 更新人工甜味劑指引

世界衛生組織於 2026 年 5 月 7 日發布...

來源：[WHO News](https://www.who.int/news/item/...)

### 研究限制

本指引基於...

## 腸道菌相與憂鬱症：新大規模研究

刊登於 Nature Medicine 的最新研究...

來源：[PubMed](https://pubmed.ncbi.nlm.nih.gov/39876543/)

### 研究限制

觀察性設計無法建立因果關係...
```

**注意事項：**
- `sourceUrl` 欄位省略（schema 中為 optional）
- `relatedVideos` 等無配對時整個欄位省略，不要寫空陣列
- `tags` 從工單的 `suggestedTags` 取用
- `editorPick` 從工單取用
- 所有連結必須來自素材的 `sourceUrl`，禁止自行編造

### 6.4 檔名規則

一律使用序號格式，無論產出幾篇：

```
src/content/news/radar-{YYYY}-{MM}-{DD}-{HH}-{NN}.md
```

範例：
```
src/content/news/radar-2026-05-08-06-01.md
src/content/news/radar-2026-05-08-06-02.md
```

即使只有一篇也是 `-01`。

## 7. Phase 4：連結驗證

### 7.1 驗證範圍

文章正文中所有外部超連結（markdown `[text](url)` 格式）。

### 7.2 驗證方式

使用 WebFetch 對每個 URL 發送 HEAD 請求：
- HTTP 200-399 → 通過
- HTTP 400+ 或 timeout → 標記為失敗

### 7.3 失敗處理

- 失敗的連結從文章中移除
- 如果移除連結後該議題失去主要來源引用 → 整個議題從文章中刪除
- 如果刪除議題後文章只剩 0 個議題 → 取消該篇文章
- 取消的文章中使用的素材仍標記為已處理（避免下次重複抓取無效來源）
- 只剩 1 個議題的文章仍然保留（單一議題也有獨立價值）

## 8. Phase 5：動態審核委員會

### 8.1 角色生成規則（寫入 prompt）

```
你是「本日有據」的審核委員會召集人。根據以下文章內容，決定需要哪些審核角色。

【角色類型】

1. 臨床角色：根據文章涉及的醫學領域，指定對應專科
   - 判斷方式：文章提及哪些疾病、器官系統、治療方式
   - 範例：內分泌科個管師、心臟科個管師、精神科個管師、營養師、藥師
   - 每個相關專科各指定一位

2. 受眾角色：根據文章內容推估誰會閱讀
   - 判斷方式：這篇文章會影響哪些人群的日常決策？
   - 考量面向：年齡、健康狀況、生活角色、資訊素養
   - 範例：第二型糖尿病患者、正在減重的上班族、家有學齡兒童的家長、
           銀髮族照顧者、健身愛好者、孕婦
   - 每個受影響的人群各指定一位

3. 媒體角色：根據文章的傳播風險決定
   - 固定一位：健康線記者（檢查標題聳動性、資訊平衡性）
   - 若文章涉及爭議議題，加一位：事實查核編輯

【輸出格式】

每個角色包含：
{
  "roleId": "reviewer-01",
  "type": "clinical" | "audience" | "media",
  "title": "內分泌科個管師",
  "persona": "你是一位在醫學中心工作 10 年的內分泌科個案管理師...",
  "focusAreas": ["胰島素相關描述是否正確", "劑量建議是否安全", "轉介建議是否適當"],
  "readingHabit": "會仔細看每一個數據和建議，特別注意可能誤導患者自行調藥的描述"
}
```

### 8.2 執行方式與角色數量

- **逐篇獨立**：每篇文章各自產生自己的審核委員會，不共用角色
- 多篇文章的審核委員會可平行運作
- 角色數量沒有固定上限，由文章內容決定
- 通常預期 4-10 個角色

## 9. Phase 6：審核迴圈

### 9.1 單輪審核流程

```
每個審核角色各自獨立審核（可平行）
  │
  ▼
每個角色輸出：
{
  "roleId": "reviewer-01",
  "approved": false,
  "suggestions": [
    {
      "severity": "critical" | "major" | "minor",
      "location": "editorComment 第 2 句",
      "issue": "描述了具體劑量建議，可能誤導患者自行用藥",
      "suggestion": "改為『建議諮詢內分泌科醫師，討論個人化的甜味劑使用方式』"
    }
  ]
}
  │
  ▼
彙整所有建議 → 交給 Sonnet 修改
  │
  ▼
修改後的文章 → 進入下一輪審核
```

### 9.2 收斂判定

追蹤每輪的「未解決建議總數」：

```
Round 1: 12 suggestions
Round 2: 7 suggestions   ← 有減少，繼續
Round 3: 4 suggestions   ← 有減少，繼續
Round 4: 2 suggestions   ← 有減少，繼續
Round 5: 0 suggestions   ← 歸零，通過！
```

**收斂判定追蹤兩個指標：**
- `totalSuggestions`：所有建議總數
- `criticalCount`：critical 等級建議數量

**收斂失敗的定義：連續 3 輪 totalSuggestions 沒有嚴格減少（等於或大於上輪都算「沒減少」）。**

```
Round 1: 12 total (2 critical)
Round 2: 10 total (1 critical)  ← 有減少
Round 3: 10 total (1 critical)  ← 沒減少（計數 1）
Round 4: 11 total (1 critical)  ← 沒減少（計數 2）
Round 5: 10 total (1 critical)  ← 沒減少（計數 3）→ 未收斂！
```

**額外規則：** 即使 totalSuggestions 持續減少，若 criticalCount 連續 3 輪沒有減少，也視為未收斂。Critical 建議有獨立的收斂追蹤。

### 9.3 審核角色的 prompt 規則

```
你是 {persona}。

請審核以下健康新聞文章，從你的專業角度和閱讀習慣出發。

【審核標準】
- critical：可能造成健康危害、嚴重誤導、違反醫學倫理
- major：資訊不完整、描述不精確、可能引起不必要的恐慌或誤解
- minor：用詞可改進、語句不夠流暢、排版建議

【審核重點】
{focusAreas}

【你的閱讀習慣】
{readingHabit}

【禁止事項】
- 不要提出風格偏好的建議（如「我覺得標題可以更吸引人」）
- 不要提出超出你角色專業的建議
- 如果文章在你的審核範圍內沒有問題，請回報 approved: true，不要硬找問題
```

### 9.4 修改 agent 的 prompt 規則

```
你是「本日有據」的文章修改編輯。以下是審核委員會的建議，請逐一修改文章。

【修改規則】
- critical 和 major 建議必須處理
- minor 建議盡量處理，除非會影響文章流暢度
- 每項修改必須嚴格依照建議的方向，不要自行發散
- 修改後不要引入新的問題（不要為了修一個地方而破壞另一個地方）
- 保持原文的整體結構和語氣一致性

【語言與內容約束（修改時同樣適用）】
- 全文使用台灣繁體中文，台灣慣用醫學術語
- 不使用中國用語（如「視頻」→「影片」、「信息」→「資訊」）
- 禁止使用「震驚」「突破性」「革命性」等聳動用語
- 禁止給出具體醫療建議，改為「建議諮詢醫療團隊」
- 所有連結必須來自原始素材，禁止自行編造
```

## 10. Phase 7：輸出與發布

### 10.1 審核通過（零建議）

```bash
# 只 add 本次產出的特定檔案（由流程記錄檔名清單），不用 glob
git add src/content/news/radar-2026-05-08-06-01.md data/processed-sources.json
git commit -m "news: auto-generated health radar YYYY-MM-DD HH:MM"
git push origin main
# GitHub Actions deploy.yml 自動觸發 build + deploy
```

**多篇文章的處理：** 同一次排程產出多篇文章時，每篇獨立判定。通過的直接 commit 到 main，未收斂的各自開 PR。一次排程可能同時有直接發布和開 PR 的文章。

### 10.2 審核未收斂

```bash
# 設定 frontmatter draft: true
# 分支名包含序號，避免同次排程多篇未收斂時衝突
git checkout -b news/draft-YYYY-MM-DD-HH-NN
git add src/content/news/radar-2026-05-08-06-02.md data/processed-sources.json
git commit -m "news(draft): health radar needs review YYYY-MM-DD HH:MM #NN"
git push origin news/draft-YYYY-MM-DD-HH-NN
# 透過 GitHub CLI 開 PR
gh pr create \
  --title "News Draft: YYYY-MM-DD HH:MM - 需人工審核" \
  --body "此文章經過 N 輪自動審核仍有 M 項未解決建議。\n\n## 未解決建議\n{列出所有剩餘建議}" \
  --base main
```

### 10.3 commit message 格式

- 自動通過：`news: auto-generated health radar 2026-05-08 06:00`
- 草稿 PR：`news(draft): health radar needs review 2026-05-08 06:00`

## 11. 排程設定

### 11.1 Claude Code Scheduled Trigger

使用 Claude Code 的 `schedule` 功能建立排程遠端代理。

**排程：** 每 6 小時（可調）
```
cron: "0 0,6,12,18 * * *"
```

**觸發 prompt：**

觸發 prompt 需指向本 spec 文件，讓 agent 有完整的執行規則可依循：

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

### 11.2 模型配置

| Phase | 模型 | 原因 |
|-------|------|------|
| Phase 1 抓取 | 工具呼叫 | 不需要推理 |
| Phase 2 編輯企劃 | Sonnet | 規則明確，照規則評分分組 |
| Phase 3 撰文 | Sonnet | 照工單指令寫，不需發散 |
| Phase 4 連結驗證 | 工具呼叫 | 不需要推理 |
| Phase 5 角色生成 | Sonnet | 照規則分析文章、產出角色 |
| Phase 6 審核 | Sonnet | 照 persona 和 checklist 審核 |
| Phase 6 修改 | Sonnet | 照建議改，不需發散 |
| Phase 7 輸出 | 工具呼叫 | git 操作 |

## 12. 檔案結構異動

### 12.1 新增檔案

```
data/
  news-automation-config.json    ← 抓取設定（關鍵字、RSS URLs、MeSH terms）
  processed-sources.json         ← 去重追蹤

docs/superpowers/specs/
  2026-05-08-news-automation-design.md  ← 本文件
```

### 12.2 news-automation-config.json 結構

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

### 12.3 不修改的檔案

- `src/content.config.ts` — news schema 不變，現有欄位已足夠
- `src/pages/news/index.astro` — 不變，自動產出的 markdown 符合現有 schema
- `src/pages/index.astro` — 不變
- `src/components/charts/TrendBubbles.svelte` — 不變
- `src/utils/tag-stats.ts` — 不變

## 13. 錯誤處理

| 情境 | 處理方式 |
|------|----------|
| PubMed API 無回應 | 跳過此管道，用其他管道的素材繼續 |
| RSS Feed 解析失敗 | 跳過此 feed，記錄錯誤 |
| Tavily 搜尋失敗 | 跳過此管道 |
| 三個管道全部失敗 | 靜默結束，不產出檔案 |
| 撰文 agent 失敗 | 跳過該篇文章，其他篇正常進行 |
| git push 失敗 | 記錄錯誤，下次執行時重試 |
| GitHub CLI 不可用 | 將草稿 commit 到分支，但跳過 PR 建立 |

## 14. 驗收標準

1. 排程可正常觸發，每 6 小時執行一次
2. 能從至少兩個管道成功抓取素材
3. 產出的 markdown 通過 Astro content collection schema 驗證
4. 所有外部連結經過驗證可連線
5. 審核通過的文章自動出現在網站上
6. 審核未收斂的文章以 PR 形式呈現，含未解決建議清單
7. 不會產出重複文章（去重機制有效）
8. 素材池為空時不產出任何檔案
