# 交接：server 端 Claude 接手 /news 管線 + Audience Insights

> 給在**使用者 server 上、透過 `cron + claude -p`** 運行 `/news` 趨勢新聞管線的 Claude。
> 寫於 2026-06-16，開發機交接。先讀本檔，再讀下方「必讀」清單。

---

## 0. 你的執行環境（先搞清楚，別被舊文件誤導）

- 你在**使用者自己的 server** 上，用 `cron` 呼叫 `claude -p`（headless）跑管線。
- 這個環境**有 gcloud 服務帳號認證（`ga4-insights@yaocare.iam.gserviceaccount.com`）+ 對外網路**。不是沙箱。**可以即時打 GA4 / GSC / WebSearch。**
- ⚠️ **任何提到「Claude Code 雲端排程 / Trigger ID `trig_01...` / claude.ai/code/scheduled 管理介面 / RemoteTrigger」的敘述都是錯的、已作廢**（使用者 2026-06-16 明確否認從未有此排程）。`docs/news_sop.md` 第一節與 8.4/8.5 已修正為 server cron。若在舊 spec 看到，勿採信。
- 工作流：開發機把功能推上 GitHub `main` → 你在 server `git clone`/`git pull` 後運行。

---

## 1. 必讀（動手前）

| 檔案 | 為什麼 |
|---|---|
| `CLAUDE.md` | 硬規則（同步文件、讀 playbook、pnpm、台灣時區、build 零錯誤…）|
| `docs/news_sop.md` | 管線 7 階段 SOP；**新的 5.3「Audience Insights 注入」** |
| `docs/playbooks/audience-insights.md` | insights 功能的鎖定參數/陷阱/驗證清單 |
| `AGENTS.md`「撰寫趨勢文章」 | 含新插入的 **2.5 步驟**（跑 insights、分配三桶）|

---

## 2. 先驗證環境（接手第一件事）

```bash
pnpm install                      # 本次無新依賴，但保險
gcloud auth print-access-token \
  --account ga4-insights@yaocare.iam.gserviceaccount.com \
  --scopes https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly
# ↑ 能取到 token 才代表認證 OK

pnpm insights                     # 應印出含 generatedAt(+08:00) 的三桶 JSON
git status --short                # 確認 data/audience-insights.json 沒被追蹤（gitignore）
```

- 數據現在很稀疏（站剛上線 + 追蹤 6/16 才修好），insights 多為空或少量候選 → **正常**。
- 取不到 token / API 失敗時，腳本會**優雅退化印空桶、exit 0**——這是設計，不是壞掉。

---

## 3. 待辦（核心交接事項）：把 Phase 2 真正接上「指令層」

程式碼已就緒並在 main 上，但**「管線執行時實際去跑 insights 並運用其輸出」是 prompt/指令層的事**，需要你在管線執行流程中落實（程式不會自己被呼叫）。依 `news_sop.md` 5.3 / `AGENTS.md` 2.5：

1. **Phase 2 編輯企劃**：先照現狀用 WebSearch 建素材池，然後執行
   `node scripts/audience-insights.mjs`，讀其 stdout 的三桶。
2. `topicCandidates` → 併入素材池（標記來源 `internal-demand`）；五維度評分時
   **話題性(10%)維度改用候選的 `demandScore`**，其餘四維度照舊判定。
   標 `editorPickHint:true` 的候選可優先考慮主編選題。
3. `writingDirectives` → 注入 Phase 3 撰文 agent 的 prompt（有效寫法 / LLM 友善結構）。
4. `siteOptimizations` → 收進 run summary 給使用者人工檢視（**v1 不自動編輯既有文章**）。

---

## 4. 鐵則（違反會出事）

- **`data/audience-insights.json` 絕不 commit**：含 GSC 搜尋字詞、流量來源、選題策略等經營內幕；repo 與站台皆公開。已 gitignore，別破壞。
- **日期一律台灣時間 UTC+8**。
- **insights 抓不到資料 = 優雅退化成現狀，不可因此擋發稿**。
- tags 禁含 `/`；內容禁幽靈行內圖 `](images/`；`pnpm build` 零錯誤才算過。
- 改功能必同步文件（`README.md` 或 `docs/playbooks/*.md`），否則 CI `docs-sync-check` 擋。

---

## 5. 背景脈絡（想深入再看）

- 設計：`docs/superpowers/specs/2026-06-16-audience-insights-design.md`
- 實作計畫：`docs/superpowers/plans/2026-06-16-audience-insights.md`
- 上層 GEO 策略：`docs/superpowers/specs/2026-06-14-geo-strategy-design.md`（本案是其 D 區成效監測的閉環操作化）
- 8 策略：`llm-referral` / `search-gap` / `trend-radar` / `onsite-search`（→選題）、
  `completion-style` / `aeo-structure`（→寫法）、`question-faq` / `rank-boost`（→既有頁建議）。
  純函數在 `scripts/lib/insight-strategies.mjs`，門檻全在 `data/news-automation-config.json` 的 `audienceInsights`。
- 前置修復：Analytics 全站追蹤靜默 bug（`bootstrapAnalytics()`，commit `1875728`）——有意義的 GA4 數據從 6/16 才開始累積。
