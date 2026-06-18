# 趨勢新聞自動化 SOP

> 「健康議題雷達」（`/news/`）的內容由自動化管線全自動產出。
> 本文件說明完整流程、日常維運操作、以及常見問題排除。

---

## 一、排程與觸發

| 項目 | 設定 |
|------|------|
| 執行方式 | 使用者 server 上的 `cron` 呼叫 `claude -p`（headless）|
| 環境 | 具 gcloud 服務帳號認證 + 對外網路；可即時呼叫 GA4／GSC／WebSearch |
| 排程 | 由 server crontab 設定（建議每日數次，與內容節奏對齊）|
| 手動觸發 | 於 server 直接執行管線指令 |

---

## 二、自動化流程總覽

```
排程觸發
  │
  ├─ Phase 1：資料抓取
  │   └─ 用 WebSearch 對 8 組查詢平行搜尋
  │
  ├─ 去重過濾
  │   └─ 比對 data/processed-sources.json，跳過已處理來源
  │   └─ 素材池為空 → 靜默結束
  │
  ├─ Phase 2：編輯企劃（Sonnet x1）
  │   ├─ 執行 `node scripts/audience-insights.mjs`（即時抓 GA4+GSC → 8 策略）
  │   ├─ topicCandidates 併入素材池（來源標記 internal-demand）
  │   ├─ 五維度加權評分（話題性維度改吃候選 demandScore）→ 分組 → 撰文工單
  │   └─ 無工單 → 靜默結束
  │
  ├─ Phase 3：平行撰文（Sonnet x n）
  │   └─ 每份工單一個 agent，照撰文規則 + 注入 writingDirectives 產出 markdown
  │
  ├─ Phase 4：連結驗證
  │   └─ 確認所有外部連結可連線，死連結剔除
  │
  ├─ Phase 5：動態審核委員會（Sonnet x 動態角色數）
  │   └─ 依文章內容決定審核角色（臨床 / 受眾 / 媒體）
  │
  ├─ Phase 6：審核迴圈
  │   ├─ 零建議 → 通過
  │   └─ 連續 3 輪未收斂 → 標為草稿
  │
  └─ Phase 7：發布
      ├─ 通過 → commit + push main → GitHub Actions 自動部署
      └─ 未收斂 → draft: true → 開 PR → 等人工審核
```

---

## 三、資料來源（8 組查詢）

設定檔：`data/news-automation-config.json`

| # | 名稱 | 搜尋目標 | 筆數上限 |
|---|------|---------|---------|
| 1 | PubMed 學術文獻 | `site:pubmed.ncbi.nlm.nih.gov` — 系統性回顧、統合分析 | 10 |
| 2 | PubMed RCT | `site:pubmed.ncbi.nlm.nih.gov` — 隨機對照試驗 | 10 |
| 3 | WHO 公告 | `site:who.int` — 健康、營養、食品安全 | 5 |
| 4 | 衛福部新聞 | `site:mohw.gov.tw` — 健康、食安 | 5 |
| 5 | 衛福部疾管署 | `site:cdc.gov.tw` — 疫情、傳染病 | 5 |
| 6 | Nature/Lancet/BMJ | 營養、健康、臨床試驗 | 10 |
| 7 | 健康新聞媒體 | Medscape、ScienceDaily、EurekAlert | 5 |
| 8 | 腸道菌/睡眠/運動 | 跨來源主題搜尋 | 5 |

### 新增或修改來源

編輯 `data/news-automation-config.json` 的 `webSearch.queries` 陣列：

```json
{
  "name": "查詢名稱",
  "query": "site:example.com keyword1 keyword2 2026",
  "allowed_domains": ["example.com"],
  "max_results": 5
}
```

Commit + push 後，下次排程自動使用新設定。

---

## 四、去重機制

檔案：`data/processed-sources.json`

| 來源類型 | Key 格式 | 範例 |
|---------|---------|------|
| PubMed | `PMID:{id}` | `PMID:42098536` |
| 其他來源 | 完整 URL | `https://www.who.int/news/item/...` |

- 已存在的 key → 自動跳過，不會重複撰文
- 超過 90 天的條目 → 每次執行時自動清除
- 即使素材未產出文章，仍會記錄為已處理（避免反覆嘗試無效來源）

---

## 五、評分與企劃規則

### 5.1 素材評分（五維度加權）

| 維度 | 權重 | 10 分條件 |
|------|------|---------|
| 證據等級 | 30% | meta-analysis / systematic review |
| 影響範圍 | 25% | 影響全球或全台人口 |
| 新穎性 | 20% | 挑戰或修正主流觀點 |
| 實用性 | 15% | 有明確行動建議 |
| 話題性 | 10% | 大眾關注度高 |

**閾值：** 加權總分 >= 5.0 才進入撰文流程。

### 5.2 分組成篇

- 同主題素材合併為一篇（2-5 則素材）
- 高分素材（>= 7.0）可單獨成篇
- 每篇自動判定 `editorPick`（官方政策更新、高證據等級結論修正、平均分 >= 8.0、食安緊急事件）

### 5.3 Audience Insights 注入（GA4/GSC 數據驅動）

Phase 2 執行 `node scripts/audience-insights.mjs`，讀其輸出三桶：
- **topicCandidates** → 併入素材池一同評分；**話題性(10%)維度改用候選的 `demandScore`**（真實搜尋需求/AI 轉介），其餘四維度照舊。標記 `editorPickHint` 的候選可優先考慮主編選題。
- **writingDirectives** → Phase 3 撰文 agent 的 prompt 注入。
- **siteOptimizations** → 寫入 run summary，純人工建議，**不自動編輯既有文章**。

資料空（站點初期）時三桶皆空 → 行為等同未接入。設定見 `data/news-automation-config.json` 的 `audienceInsights`。詳見 `docs/playbooks/audience-insights.md`。

---

## 六、產出的文章格式

### 6.1 檔名

```
src/content/news/radar-{YYYY}-{MM}-{DD}-{HH}-{NN}.md
```

日期和小時以**台灣時間**（UTC+8）為準。`NN` 為序號，從 01 開始。

### 6.2 Frontmatter 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| title | 是 | 原始標題（可含「健康雷達」前綴，前台會自動清理） |
| titleDisplay | 否 | 口語化前台標題（優先於自動清理） |
| subtitle | 否 | 一句話副標（15-30 字） |
| category | 否 | 主分類（會從 tags 自動推斷） |
| source | 是 | 固定為「本日有據編輯室」 |
| publishDate | 是 | YYYY-MM-DD（台灣日期） |
| tags | 是 | 標籤陣列（**禁止含 `/`**） |
| summary | 是 | 100-150 字摘要 |
| intro | 否 | 2-4 句白話開頭介紹 |
| termBox | 否 | 專有名詞科普（`[{term, definition}]`） |
| evidenceNote | 否 | 2-3 句白話證據提醒 |
| pmid | 否 | PubMed ID |
| heroImage | 否 | 文章主圖路徑 |
| thumbnail | 否 | 列表縮圖路徑 |
| editorPick | 是 | 是否為主編選題 |
| editorComment | 否 | 我的觀點與行動建議（前台以此名稱顯示） |
| relatedArticles | 否 | 相關文章 slug |
| relatedMyths | 否 | 相關闢謠 slug |
| relatedIngredients | 否 | 相關原料 slug |
| relatedVideos | 否 | 相關影片 slug |
| relatedPodcasts | 否 | 相關 Podcast slug |
| draft | 是 | 草稿狀態 |

### 6.3 前台呈現邏輯

- **標題**：優先 `titleDisplay` → 自動清理 `title`（移除「健康雷達 YYYY-MM-DD HH：」前綴）
- **分類**：優先 `category` → 從 `tags` 關鍵字自動推斷
- **圖片**：優先 `heroImage`/`thumbnail` → 分類 fallback SVG（`public/images/news/`）
- **前台不顯示**：「本日有據編輯室」來源標示

---

## 七、審核機制

### 7.1 動態審核委員會

每篇文章依內容自動組成審核角色（通常 4-10 位）：

| 類型 | 說明 | 範例 |
|------|------|------|
| 臨床角色 | 依文章涉及的醫學領域 | 內分泌科個管師、營養師、藥師 |
| 受眾角色 | 依目標讀者群 | 糖尿病患者、健身愛好者、家長 |
| 媒體角色 | 固定一位健康線記者，爭議議題加事實查核編輯 | 健康線記者 |

### 7.2 收斂判定

- 追蹤每輪「未解決建議總數」和「critical 數量」
- 建議數持續減少 → 繼續審核
- 連續 3 輪未減少 → 判定未收斂
- critical 數連續 3 輪未減少 → 也判定未收斂

### 7.3 結果

| 結果 | 處理 |
|------|------|
| 零建議 | 自動 commit + push main → 自動部署上線 |
| 未收斂 | `draft: true` → 開 PR → 等人工審核 |

---

## 八、日常維運操作

### 8.1 審核未收斂的 PR

1. 至 [GitHub PR 列表](https://github.com/weiqi-kids/evidencetoday.news/pulls) 找標題為 `News Draft: ...` 的 PR
2. PR body 列出所有未解決的審核建議
3. 在 PR branch 上修改文章
4. 將 `draft` 改為 `false`
5. Merge PR → 自動部署

### 8.2 手動修改已發布的文章

```bash
# 直接編輯文章
vim src/content/news/radar-YYYY-MM-DD-HH-NN.md

# 推送
git add src/content/news/radar-YYYY-MM-DD-HH-NN.md
git commit -m "news: 修改 xxx 文章"
git push origin main
```

自動化管線不會覆蓋已存在的檔案（去重機制保護）。

### 8.3 手動下架文章

將 frontmatter 的 `draft` 設為 `true`，commit + push 即可。

### 8.4 調整排程頻率

編輯 server 上的 crontab（`crontab -e`），調整 `claude -p` 的執行頻率（cron expression）。

### 8.5 手動觸發一次

於 server 直接執行管線指令（`claude -p` 帶對應 prompt）。

---

## 九、撰文內容規範

### 9.1 語言規範

- 全文台灣繁體中文
- 台灣慣用醫學術語（如「第2型糖尿病」非「II型糖尿病」）
- 專有名詞首次出現附英文：「丁酸（butyrate）」
- 禁止中國用語（「視頻」→「影片」、「信息」→「資訊」）

### 9.2 內容禁忌

- 禁止聳動用語：「震驚」「突破性」「革命性」
- 禁止具體醫療建議：「應該每天吃 X mg」→「建議諮詢醫療團隊」
- 禁止醫療承諾：「可以治療」「一定有效」「證實可以改善」
- 統一使用保守說法：「研究發現相關」「可能有關」「仍需更多研究確認」
- tags 禁止含 `/`（會導致 Astro 路由錯誤）

### 9.3 引用規範

- 所有連結必須來自素材原始 URL，禁止編造
- PubMed 使用 PMID 連結：`https://pubmed.ncbi.nlm.nih.gov/{PMID}/`
- 每個議題必須標明來源

---

## 十、相關檔案一覽

| 檔案 | 用途 |
|------|------|
| `data/news-automation-config.json` | 搜尋查詢、評分閾值、去重天數設定 |
| `data/processed-sources.json` | 去重追蹤（自動維護） |
| `docs/superpowers/specs/2026-05-08-news-automation-design.md` | 完整技術設計規格 |
| `src/content.config.ts` | News schema 定義 |
| `src/utils/news.ts` | 標題清理、分類推斷、fallback 圖片 |
| `src/pages/news/index.astro` | 趨勢列表頁 |
| `src/pages/news/[slug].astro` | 趨勢文章頁模板 |
| `src/components/blocks/NewsItem.astro` | 首頁/標籤頁的新聞卡片元件 |
| `public/images/news/*.svg` | 分類 fallback 圖片（9 張） |

---

## 十一、遠端環境限制

排程 agent 跑在 Anthropic 雲端沙箱，有以下限制：

| 工具 | 可用？ | 說明 |
|------|--------|------|
| WebSearch | 可用 | 走 Anthropic 內建通道 |
| WebFetch | 不可用 | HTTP 請求被沙箱封鎖（403） |
| PubMed API | 不可用 | 同上 |
| RSS Feeds | 不可用 | 同上 |
| Tavily MCP | 不可用 | 本機 MCP server，遠端無法存取 |
| Agent (sub-agent) | 可用 | 可派 sonnet sub-agent 平行工作 |
| Bash (git) | 可用 | 可 commit + push + gh pr create |

因此管線只使用 WebSearch，透過 `site:` 運算子定向搜尋各來源。

---

## 十二、常見問題排除

| 問題 | 原因 | 解法 |
|------|------|------|
| 排程沒有產出文章 | 素材池為空或所有素材已處理 | 正常行為，不需處理 |
| Build 失敗 | tags 含 `/` 或 YAML 格式錯誤 | 檢查 frontmatter，修正後 push |
| 文章重複 | 去重 key 不一致 | 檢查 processed-sources.json 的 key 格式 |
| publishDate 差一天 | 遠端 agent 用 UTC 而非台灣時間 | trigger prompt 已指示用 UTC+8，若仍有問題手動修正 |
| 主圖未顯示 | 未提供 heroImage/thumbnail | 正常，會使用分類 fallback SVG |
| 標題仍帶「健康雷達」 | 未設定 titleDisplay | 正常，前台 cleanNewsTitle() 會自動清理前綴 |
| PR 一直沒人處理 | 審核未收斂的草稿 | 定期檢查 GitHub PR 列表 |
| 某組查詢整組 0 命中/報錯 | `allowed_domains` 內含**封鎖 Anthropic 爬蟲**的網域（如 medpagetoday.com），WebSearch 回 400「domains are not accessible」，**整組查詢全滅**（非只略過該網域） | 移除被封網域；新增來源前先單獨測該網域可搜。已知可用：medscape.com、sciencedaily.com、eurekalert.org、nature.com、pubmed |
| 檔名/標題小時數多 8（如 06 變 14/15） | agent 把已是台灣時間的系統時鐘又 +8 | cron 腳本 prompt 已註明「TZ 已是台灣，直接用 `date`，勿再 +8」 |
