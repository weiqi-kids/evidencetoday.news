# ops/ — 站台維運自動化腳本（版控）

本目錄是 evidencetoday.news 所有 cron 自動化的**邏輯**，進 repo 以便版控、review、可攜（換機器 `git clone` 就帶走）。
**機密與執行期狀態不在這裡**（見下）。權威方法論散見 `docs/playbooks/`。

## 三類東西分家

| 類別 | 放哪 | 例子 |
|---|---|---|
| **邏輯**（腳本/函式庫）| ✅ 本目錄 `ops/`（repo） | 下表所有 .sh |
| **機密** | ❌ `$CONF_DIR`（主機，預設 `/root/.config/evidencetoday-news`） | `slack-bot-token` |
| **執行期狀態** | ❌ `$CONF_DIR`（主機 runtime 資料） | `pending/`、`awaiting-live/`、`reports/`、`*-ledger.jsonl`、`*-history.jsonl`、`.rate-limited-until`（額度冷卻旗標）、crontab 備份 |
| **cron 排程** | ❌ `/etc/cron.d/evidencetoday`（主機，單檔一專案） | 見下方「crontab」 |
| **cron 日誌** | ❌ `/var/log/evidencetoday/<job>.log`（主機，持久、好稽核） | `draft-news.log`、`optimize.log`… |

## 腳本一覽

| 檔案 | 角色 | 對應 playbook |
|---|---|---|
| `bootstrap.sh` | **所有 cron 的統一入口**：設環境→`git pull`→**額度冷卻閘**→`exec` 指定腳本。根除「repo 內腳本自我 pull」風險。 | 本檔 |
| `claude-run.sh` | **所有 headless `claude` 呼叫的統一包裝**（跑 `claude-appi`、偵測 weekly/usage limit→寫冷卻旗標）。draft/news/optimize/perf 皆經此呼叫，勿再直接呼叫 `claude-appi`。 | 本檔 |
| `gate-lib.sh` | 核准閘共用函式庫（型別對應、Slack/Worker 讀寫）。被 draft/publish source。 | `slack-approval-gate.md` |
| `slack-notify.sh` | 通用 Slack 發訊（`chat.postMessage`，含 `--thread`）。 | `slack-approval-gate.md` |
| `draft-cron.sh <type>` | 半自動撰寫出草稿→暫存→發按鈕→存 Worker。 | `slack-approval-gate.md` |
| `publish-approved.sh` | 讀核准狀態→發佈→等連結生效回貼。 | `slack-approval-gate.md` |
| `news-cron.sh` | （備援，已停用）原 /news 全自動發布。 | `news_sop.md` |
| `optimize-cron.sh` | 每日自我優化引擎（改既有頁→部署→發優化報報）。 | `daily-optimize.md` |
| `perf-report.sh` | 每 3 天 GA4+GSC 經營建議（避開 optimize 已做的事，發優化報報）。 | `audience-insights.md` |
| `sitemap-submit.sh` | 每 3 天對 GSC 重提交 sitemap + 索引覆蓋率快照。 | — |
| `googlenews-watch.sh` | 每週 Google News 曝光監測。 | — |
| `cron-status.sh` | **唯讀**狀態速覽：讀 cron.d＋log＋冷卻旗標，印「名稱/台北時間/模型/現況」表。`/etn-cron` skill 的後端。 | — |

## 帳號（headless 跑哪個帳號）

- **全部 cron 自動化跑營運帳號 `claude-appi`**（=vegeta1260，wrapper 在 `/usr/local/bin/claude-appi` 設 `CLAUDE_CONFIG_DIR=~/.claude-appi`，再呼叫同一個 `claude` binary）。`claude`(dev/lightman) 只做互動改碼，不跑 cron。
- ⚠️ **`claude-appi` 與 appi.news 自動化共用同一個週限額**——撞限額時 evidencetoday 會一起空跑；`claude-run.sh` 偵測到就寫冷卻旗標、`bootstrap.sh` 冷卻期內跳過 claude 型 job（純資料型照跑）。看現況用 `cron-status.sh`／`/etn-cron`。

## 設計鐵則（改這裡前必讀）

1. **ops 腳本一律不自我 `git pull`**——交給 `bootstrap.sh`。在 repo 內自我 pull 會執行中覆寫自身。
2. **機密/狀態走 `$CONF_DIR`**，永不寫進 repo（`slack-bot-token` 是機密；`pending/` 等是 runtime）。
3. **路徑參數化**：`REPO` 從腳本位置推導（`$(dirname BASH_SOURCE)/..`）、`CONF_DIR` 取 env（預設主機路徑）。勿再 hardcode `/root/evidencetoday.news`。
4. crontab 一律經 `bootstrap.sh <script> [args]` 呼叫，不直接呼叫個別腳本。
5. **headless `claude` 一律經 `claude-run.sh` 呼叫**，不直接呼叫 `claude-appi`（否則撞額度時不會寫冷卻旗標、會每趟空跑）。
6. **子代理模型｜省成本鐵則**：撰寫類 prompt（draft/news）凡用 `Agent` 工具派 sub-agent，**一律顯式帶 `model='sonnet'`**（審核委員會亦同，比照 `docs/news_sop.md` 設計 Sonnet x n）；**嚴禁用預設模型——預設會落到 opus（最貴）**。純機械性檢查（連結驗 200/檔名）才可降 `model='haiku'`。orchestrator 自身由各腳本 `--model claude-sonnet-4-6` 鎖定。

## crontab（在 `/etc/cron.d/evidencetoday`，單檔一專案；系統 TZ=UTC，排程以 UTC 寫，台北＝UTC+8）

> 改排程＝改 `/etc/cron.d/evidencetoday`（**不在** user crontab）。日誌統一在 `/var/log/evidencetoday/<job>.log`。
> 各行格式含 user 欄位：`分 時 日 月 週  root  /root/evidencetoday.news/ops/bootstrap.sh <script> [args] >> /var/log/evidencetoday/<job>.log 2>&1`

```
CRON_TZ=UTC
17 22 * * 0-6  draft-cron.sh news         # 台北每日 06:17 趨勢草稿
35 23 * * 0    draft-cron.sh articles     # 台北週日→一 07:35
35 23 * * 2    draft-cron.sh ingredients  # 台北週二→三 07:35
35 23 * * 4    draft-cron.sh myths        # 台北週四→五 07:35
35 23 * * 1    draft-cron.sh podcast      # 台北週一→二 07:35（1 份講稿）
35 23 * * 3    draft-cron.sh videos       # 台北週三→四 07:35（3 份短影音腳本）
*/10 * * * *   publish-approved.sh        # 每 10 分核准→發佈→回貼
0 1  */3 * *   sitemap-submit.sh          # 每 3 天 sitemap+索引覆蓋率（台北 09:00）
30 1 */3 * *   perf-report.sh             # 每 3 天經營建議（台北 09:30）
30 2 *   * *   optimize-cron.sh           # 每日自我優化（台北 10:30）
45 1 *   * 1   googlenews-watch.sh        # 每週一 Google News 監測（台北 09:45）
```
