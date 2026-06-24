# ops/ — 站台維運自動化腳本（版控）

本目錄是 evidencetoday.news 所有 cron 自動化的**邏輯**，進 repo 以便版控、review、可攜（換機器 `git clone` 就帶走）。
**機密與執行期狀態不在這裡**（見下）。權威方法論散見 `docs/playbooks/`。

## 三類東西分家

| 類別 | 放哪 | 例子 |
|---|---|---|
| **邏輯**（腳本/函式庫）| ✅ 本目錄 `ops/`（repo） | 下表所有 .sh |
| **機密** | ❌ `$CONF_DIR`（主機，預設 `/root/.config/evidencetoday-news`） | `slack-bot-token` |
| **執行期狀態** | ❌ `$CONF_DIR`（主機 runtime 資料） | `pending/`、`awaiting-live/`、`reports/`、`*-ledger.jsonl`、`*-history.jsonl`、crontab 備份 |

## 腳本一覽

| 檔案 | 角色 | 對應 playbook |
|---|---|---|
| `bootstrap.sh` | **所有 cron 的統一入口**：設環境→`git pull`→`exec` 指定腳本。根除「repo 內腳本自我 pull」風險。 | 本檔 |
| `gate-lib.sh` | 核准閘共用函式庫（型別對應、Slack/Worker 讀寫）。被 draft/publish source。 | `slack-approval-gate.md` |
| `slack-notify.sh` | 通用 Slack 發訊（`chat.postMessage`，含 `--thread`）。 | `slack-approval-gate.md` |
| `draft-cron.sh <type>` | 半自動撰寫出草稿→暫存→發按鈕→存 Worker。 | `slack-approval-gate.md` |
| `publish-approved.sh` | 讀核准狀態→發佈→等連結生效回貼。 | `slack-approval-gate.md` |
| `news-cron.sh` | （備援，已停用）原 /news 全自動發布。 | `news_sop.md` |
| `optimize-cron.sh` | 每日自我優化引擎（改既有頁→部署→發優化報報）。 | `daily-optimize.md` |
| `perf-report.sh` | 每 3 天 GA4+GSC 經營建議（避開 optimize 已做的事，發優化報報）。 | `audience-insights.md` |
| `sitemap-submit.sh` | 每 3 天對 GSC 重提交 sitemap + 索引覆蓋率快照。 | — |
| `googlenews-watch.sh` | 每週 Google News 曝光監測。 | — |

## 設計鐵則（改這裡前必讀）

1. **ops 腳本一律不自我 `git pull`**——交給 `bootstrap.sh`。在 repo 內自我 pull 會執行中覆寫自身。
2. **機密/狀態走 `$CONF_DIR`**，永不寫進 repo（`slack-bot-token` 是機密；`pending/` 等是 runtime）。
3. **路徑參數化**：`REPO` 從腳本位置推導（`$(dirname BASH_SOURCE)/..`）、`CONF_DIR` 取 env（預設主機路徑）。勿再 hardcode `/root/evidencetoday.news`。
4. crontab 一律經 `bootstrap.sh <script> [args]` 呼叫，不直接呼叫個別腳本。

## crontab（系統 TZ=UTC，排程以 UTC 寫；台北＝UTC+8）

```
CRON_TZ=UTC
17 22 * * *  ops/bootstrap.sh draft-cron.sh news         # 台北每日 06:17 趨勢草稿
30 3  * * 1  ops/bootstrap.sh draft-cron.sh articles     # 台北週一 11:30
30 3  * * 3  ops/bootstrap.sh draft-cron.sh ingredients  # 台北週三 11:30
30 3  * * 5  ops/bootstrap.sh draft-cron.sh myths        # 台北週五 11:30
*/10 * * * * ops/bootstrap.sh publish-approved.sh        # 每 10 分核准→發佈→回貼
0 1  */3 * * ops/bootstrap.sh sitemap-submit.sh          # 每 3 天 sitemap+索引覆蓋率
30 1 */3 * * ops/bootstrap.sh perf-report.sh             # 每 3 天經營建議
30 2 *   * * ops/bootstrap.sh optimize-cron.sh           # 每日自我優化
45 1 *   * 1 ops/bootstrap.sh googlenews-watch.sh        # 每週一 Google News 監測
```
（路徑前綴 `/root/evidencetoday.news/`。）
