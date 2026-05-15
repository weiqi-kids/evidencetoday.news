# Playbook：串接外部 API（YouTube / PubMed / WebSearch）

## 何時看這份

任務涉及以下任一情況：

- 修改 `scripts/sync-youtube-shorts.mjs` 或 `src/lib/youtube.ts`
- 串接新的外部 API（醫學資料庫、Podcast 平台、社群 API）
- 改 `data/news-automation-config.json` 搜尋查詢
- debug 為什麼 `WebFetch` 拿不到資料但 `WebSearch` 可以
- 改去重邏輯 `data/processed-sources.json`

> **遠端 CCR 環境**（趨勢新聞自動化跑的 sandbox）**封鎖 WebFetch**：PubMed API、RSS feeds 都會 403。**內建的 `WebSearch` 走 Anthropic 通道可用**。設計新整合時必須先想「能否用 WebSearch site: 運算子取代直接 API 呼叫」。

## 鎖定參數（動之前必看）

### 環境差異

| 環境 | WebFetch | WebSearch | 直接 HTTP（fetch/axios） |
|---|---|---|---|
| 本機開發 | ✓ | ✓ | ✓ |
| GitHub Actions runner | ✓ | （沒有此工具） | ✓ |
| 遠端 CCR（趨勢新聞排程） | **✗ 403** | ✓ | **✗ 沙箱封鎖** |

設計原則：**遠端跑的整合必須能用 WebSearch + `site:` 達成**。

### 現有整合

#### YouTube Data API

- 檔案：`scripts/sync-youtube-shorts.mjs` + `src/lib/youtube.ts`
- 模式：**Data API + 分頁**（`pageToken` 迴圈直到 `nextPageToken` 為空）
- 用途：抓 channel 的 Shorts 列表，寫進 `src/data/youtube-shorts.json`
- 觸發：手動跑或 cron
- **歷史踩坑**：曾經沒做完整分頁，只拿第一頁（commit `23f48a4` 修）
- API key：環境變數 `YOUTUBE_API_KEY`

#### 趨勢新聞自動化（WebSearch only）

- spec：`docs/superpowers/specs/2026-05-08-news-automation-design.md`
- config：`data/news-automation-config.json`（v2）
- 8 組 site-restricted query：`site:pubmed.ncbi.nlm.nih.gov` 等
- 去重：`data/processed-sources.json`（key 為 PMID 或完整 URL）
- 排程：`17 4,10,16,22 * * *` UTC = 台灣 06:17/12:17/18:17/00:17

### 去重 (`processed-sources.json`)

格式：

```json
{
  "PMID:12345678": {
    "processedAt": "2026-05-15T14:00:00+08:00",
    "outputFile": "src/content/news/radar-2026-05-15-14-01.md"
  },
  "https://example.com/article-url": {
    "processedAt": "...",
    "outputFile": "..."
  }
}
```

- PubMed 用 `PMID:{id}` 作 key
- 其他來源用完整 URL（**不是**人工縮短名稱）

## 修改流程

### 新增 API 整合

1. **先問**：「這個整合會在遠端 CCR 環境跑嗎？」
   - 會 → 必須是 WebSearch-only 設計
   - 不會（只本機 / GitHub Actions）→ 可用 WebFetch 或直接 HTTP
2. **設計查詢策略**：WebSearch 用 `site:` + 關鍵字，限制在 8 組以內（太多會超 rate limit）
3. **寫整合 script**：放 `scripts/{name}.mjs`，CLI 可手動跑
4. **加 env var 文件**：在 README 或 `.env.example` 註明需要的環境變數
5. **加去重邏輯**：避免重複處理同一筆資料，跟 `processed-sources.json` 格式一致
6. **加錯誤處理**：API 失敗不能 crash，必須 fallback
7. **dry-run 模式**：加 `--dry-run` flag，輸出會抓什麼但不寫檔
8. **本機測試**：跑 dry-run + 真實 run 各一次
9. **遠端測試**：透過 trigger 跑一次，看 CCR 環境是否正常

### 改 YouTube Data API 查詢

1. **永遠走 Data API 分頁迴圈**，不要用 RSS 或 web scraping（commit `23f48a4` 教訓）
2. **每個 channelId 都呼叫完整分頁**直到 `nextPageToken` 為空
3. **記 log**：每頁抓了幾筆、總筆數，方便確認分頁完整
4. **rate limit**：YouTube quota 是每天 10,000 units，每個 `search.list` 約 100 units
5. **失敗重試**：429 / 500 要 exponential backoff

### 改趨勢新聞查詢

看 [../news_sop.md](../news_sop.md) 完整流程。

## 常見陷阱

- **遠端跑 WebFetch**：CCR 封 403，整個流程死掉 → 永遠檢查環境，只用 WebSearch
- **YouTube 只拿第一頁**：缺漏 70%+ 的 Shorts → 必須 `nextPageToken` 完整迴圈
- **去重 key 用人工命名**：「pubmed-paper-1」這種 key 沒法跟新抓的對比 → 用 PMID 或完整 URL
- **加 fetch / axios 在 remote 跑**：CCR 沙箱封鎖 → 用 WebSearch 替代
- **沒加 dry-run**：debug 時實際寫進 `processed-sources.json`，弄髒去重資料 → 任何寫入操作都要有 dry-run
- **API key 寫死進 code**：被 git 抓到 → 用 env var，加 `.env` 進 `.gitignore`
- **rate limit 沒處理**：被 ban 一天 → 加 backoff + retry
- **抓的內容沒 normalize**：不同來源時區、html escape 不同 → 寫進檔案前必須統一格式
- **改 config 沒測 build**：JSON schema 錯誤 → 改完跑 `pnpm build` 確認 Astro content collections 不爆

## 驗證清單

新整合上線前：

```
- [ ] 確認跑的環境（本機 / GH Actions / CCR）
- [ ] 若 CCR：只用 WebSearch，不用 WebFetch / 直接 HTTP
- [ ] 有 dry-run 模式
- [ ] 有去重邏輯（PMID / URL key）
- [ ] 有錯誤處理 + retry
- [ ] env var 已加進 .env.example（不寫死 key）
- [ ] log 完整（每步抓了幾筆、寫進哪個檔）
- [ ] 本機 + 遠端各跑一次成功
- [ ] pnpm build 零錯誤
- [ ] schema 驗證通過（若整合產出 Content Collection 內容）
```

## 相關文件

- 趨勢新聞 SOP：[../news_sop.md](../news_sop.md)
- 趨勢新聞 spec：`docs/superpowers/specs/2026-05-08-news-automation-design.md`
- YouTube 整合：`scripts/sync-youtube-shorts.mjs` + `src/lib/youtube.ts`
