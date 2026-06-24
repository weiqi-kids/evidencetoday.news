# Playbook：每日優化引擎（daily-optimize）

> 本檔是「每日自我優化迴圈」的權威方法論。cron 包裝 `/root/.config/evidencetoday-news/optimize-cron.sh`
> 以 headless `claude -p` 每日執行本 playbook。**情境分流屬 B（內容與曝光）**，但它會自動 commit/push，
> 故動到 `src/` 時仍須回到 A（開發維護）守 docs-sync。

## 0. 它是什麼、不是什麼

這是站內三支既有 cron 之外、唯一會**執行**既有頁面優化的角色：

| 既有 | 角色 | 會 commit？ |
|---|---|---|
| `news-cron.sh`（每日 06:17） | 產**新** news 內容；**不碰**既有頁、不執行 insights 的 `siteOptimizations` 桶 | ✅ |
| `sitemap-submit.sh`（每 3 天 09:00） | 重提交 sitemap + IndexNow + 記 index-coverage | ❌ |
| `perf-report.sh`（每 3 天 09:30） | **唯讀**經營分析 → `reports/` | ❌ |
| **`optimize-cron.sh`（每日 10:30）** | **執行者**：改既有頁／補競品內容缺口／推索引 → 過 gate → commit/deploy | ✅ |

它**不做**：產 news（歸 news-cron）；改 `src/` 互動功能（起步階段 B 源只補**內容**，不加計算器/圖表）；
站外權威累積（另有團隊負責，本迴圈不碰）。

## 1. 鎖定參數（改 cron 行為先確認這些）

- **每日改動硬上限**：`MAX_CHANGES=5`（寫在 cron prompt）。超過就只取分數最高的 5 項。
- **ledger 去重視窗**：近 **14 天**動過的頁不再選（除非索引仍掛 0 且為高 ROI）。
- **觸發時間**：台北 10:30 = UTC 02:30（吃當天 news 06:17 / sitemap+索引 09:00 / perf 09:30 的新鮮結果）。
- **允許 no-op**：當天沒有過 gate 的高 ROI 項目 → 靜默結束、不空 commit。
- **資料來源**：`pnpm perf`、`pnpm insights`（含 `queriesLast7`/`queriesPrev7` 週對週）、`pnpm index:coverage`。

## 2. 每日 7 步迴圈

### Step 0 — 取數據 + 讀帳本
cron 已把 `pnpm perf` + `pnpm insights` + `pnpm index:coverage` 原始輸出存進當日 raw 檔；
Read 它。再 Read `optimize-ledger.jsonl`，取近 14 天動過的 `slug` 集合作為**排除清單**。

### Step 1 — 選今日清單（四源打分，取 top ≤5）
對每個候選給 `score`（牽引力 × 可改善幅度 × 索引 ROI），高分優先。四個來源：

- **(A) 衝索引 — 主力**。從 index-coverage 的 `byCov` 找「Discovered - currently not indexed」「Crawled - currently not indexed」頁。
  動作只能是**真實補強**，不是灌水：① 從相關既有頁補 1–2 條**語意相關**的站內連結指向它；
  ② 若內容單薄則補一段有來源的實質內容；③ 確認它在 sitemap；④ 收進當日 IndexNow ping 清單。
  *判斷依據：index-coverage 一天能讓 indexed 25→45，這槓桿真的會動。*
- **(B) 競品補完 — 你的重點（起步只補內容）**。對近 7 天有牽引力、排名 5–15 的 query（看 `queriesLast7`
  且 `position` 在 5–15、`impressions` 有量）：用 WebSearch 跑該 query 的 SERP → 讀**前 3 名**競品頁 →
  找出**具體**內容缺口（缺的對照表/FAQ 條目/數據點/未涵蓋的子主題）→ 補進**我們對應的既有頁**。
  **禁止**：加互動功能（計算器/圖表/篩選器，那會動 `src/`，起步階段不做）；抄競品文字（只取「該談而我們沒談的點」，用自己的話＋自己的來源寫）。
- **(C) 站內微優化**。執行 insights 的 `siteOptimizations` 桶（news-cron 故意略過的那桶）：
  rank 5–15 query 的 title/`重點摘要`/FAQ 小修、補結構化資料缺口。
- **(D) 選題／新內容**。僅限**常青文章**（articles/ingredients/myths，**不是 news**），且要有 (B)/(C) 找到的明確缺口才做；低頻。

### Step 2 — 執行
對既有檔做 Edit（或偶爾 1 篇新常青文）。**先讀完整檔再改**（硬規則 2）。
日期一律台灣時間（cron 已設 `TZ=Asia/Taipei`，系統時鐘即台灣時間，**勿再 +8**）。

### Step 3 — 過 gate（硬性，未過即 abort 不 push）
1. `pnpm content:audit`（擋模板化開頭 + AI 句型 + 模糊引用）——命中必改到 pass。
2. 動到 myths → `pnpm check:myths`；動到 news → `pnpm check:news`。
3. `pnpm build` 零錯誤。
4. **若動到 `src/`**（理論上起步不會）→ 同步 `README.md` 或對應 playbook，否則 `docs-sync-check` fail。

### Step 4 — 收斂判斷
- 全綠且確有改動 → `git add` 只 add 真正改的內容檔（**禁** add `data/audience-insights.json`、raw 檔、run-log）
  → commit（訊息見 §3）→ `git push origin main`（觸發部署）。**IndexNow 不必手動跑**：`deploy.yml` 部署時已用
  `git diff` 對異動檔自動推 IndexNow（Bing/ChatGPT search 路徑）。(A) 衝索引的目標頁若想額外催 Google 重抓，可
  `node scripts/sitemap-submit.mjs`。最後把每個改過的 slug append 進 ledger。
- 沒有過 gate 的高 ROI 項目 → **no-op**，只寫 run-log、不 commit。

### Step 5 — run-log
Write run-log 到 **repo 外**的 `$REPORTS_DIR/optimize-YYYY-MM-DD.md`（cron 傳入絕對路徑，
與 perf 報告同目錄 `/root/.config/evidencetoday-news/reports/`，**不進 public repo**）：
改了哪些頁、屬哪個來源(A/B/C/D)、為何選它、（B 源要附）競品缺口依據、預期效益、索引前後數字。
stdout 印 3 行內摘要。

## 3. commit 訊息慣例

```
optimize(<area>): <一句話今日做了什麼>

- <slug>: <來源 A/B/C/D> <理由一句>
...
🤖 daily-optimize 自動優化
```
`<area>` 用 `index` / `serp-gap` / `onpage` / `content`。

## 4. 常見陷阱

- **churn / AI 量產判定**：守 `MAX_CHANGES=5` + ledger 去重 + 允許 no-op，三者缺一就可能每天硬改同幾頁 → YMYL 致命。
- **誤碰 news**：news 由 news-cron 全權負責；本迴圈 (D) 源**只做常青**，別寫成新聞稿。
- **B 源越界加功能**：起步階段只補內容；要加互動功能須先人工把該功能上線穩定，再開 prompt 的功能旗標（屆時走 A 情境 + docs-sync）。
- **commit 進不該進的檔**：`data/audience-insights.json`、`reports/*.raw.txt`、raw 快照一律不 commit（`.gitignore` 已涵蓋部分，仍要顯式只 add 改動檔）。
- **+8 重複時差**：cron 已 `TZ=Asia/Taipei`，再 +8 會讓日期/檔名多 8 小時。
- **gate 沒過硬 push**：任何 gate fail 一律 abort，寧可 no-op 也不部署壞站。

## 5. 驗證清單（改完 cron / playbook 後）

- [ ] `bash -n optimize-cron.sh` 語法過。
- [ ] 乾跑：手動 `DRY_RUN=1 optimize-cron.sh`（prompt 收到 DRY_RUN 時只產 run-log、**不 commit/push**）→ 看 `reports/optimize-*.md` 合理。
- [ ] crontab 時間為 UTC（Vixie 不支援 `CRON_TZ`），台北 10:30 = UTC 02:30，與 06:17/09:00/09:30 錯開。
- [ ] 連續觀察數日 run-log：改動數 ≤5、無重複頁、no-op 日確實沒 commit。

## 相關

- 資料來源與認證：`docs/playbooks/audience-insights.md`、記憶 `ga4-insights-auth-setup`
- 索引瓶頸背景：記憶 `sitemap-indexation-bottleneck`
- cron 部署坑：記憶 `news-cron-deploy`
- 內容鐵則：`docs/content-guide.md`
