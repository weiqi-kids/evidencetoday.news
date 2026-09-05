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
| `gate-lib.sh` | 發佈產線共用函式庫（型別對應、Slack/Worker 讀寫）。被 draft/publish source。 | `slack-approval-gate.md` |
| `slack-notify.sh` | 通用 Slack 發訊（`chat.postMessage`，含 `--thread`）。 | `slack-approval-gate.md` |
| `draft-cron.sh <type>` | 撰寫出草稿→暫存→**自動標 approved（2026-08-06 業主裁示直接發佈制，不再發按鈕等人工 ✅）**。**articles 選題受「能贏的文章模子」六基因約束**（SELECT_BLOCK 已注入，見鐵則 8）。**news 維持每日、受標題形狀約束**（見鐵則 9），但**定位已改為選題雷達而非流量來源**（2026-08-11 實測：佔全站 28% 篇數只換到 5% 曝光、3.6/篇，六成從未有曝光；同期 myths 27.5、articles 38.6）——選到決策價值長期的題目要在 run summary 標記「建議升格為 articles 常青決策文」交給週一產線。**所有頁面型產線另受「七月標準」約束**（來源數／正文長度／articles 站內連結，`pnpm check:spec` 擋新增檔）。**零產出連續達 `ZERO_ALERT_AT` 次會發 Slack 警報**（計數檔 `$CONF_DIR/zero-streak-<type>.txt`，有產出即歸零）——零產出本身是門檻制允許的結局，但「連續」零產出是故障訊號。 | `slack-approval-gate.md`、`winning-article-formula.md` |
| `publish-approved.sh` | 讀狀態→過完整 gate→發佈→連結生效後**直接發頻道**「已上線+連結」（直接發佈制，無 thread 錨點）。 | `slack-approval-gate.md` |
| `news-cron.sh` | （備援，已停用）原 /news 全自動發布。 | `news_sop.md` |
| `optimize-cron.sh` | 每日自我優化引擎（改既有頁→部署→發優化報報）。 | `daily-optimize.md` |
| `perf-report.sh` | 每 3 天 GA4+GSC 經營建議（避開 optimize 已做的事，發優化報報）。 | `audience-insights.md` |
| `sitemap-submit.sh` | 每 3 天對 GSC 重提交 sitemap + 索引覆蓋率快照。 | — |
| `googlenews-watch.sh` | 每週 Google News 曝光監測。 | — |
| `cron-status.sh` | **唯讀**狀態速覽：讀 cron.d＋log＋冷卻旗標，印「名稱/台北時間/模型/現況」表。`/etn-cron` skill 的後端。 | — |

## 帳號（headless 跑哪個帳號）

- **全部 cron 自動化跑營運帳號 `claude-appi`**（=vegeta1260，wrapper 在 `/usr/local/bin/claude-appi` 設 `CLAUDE_CONFIG_DIR=~/.claude-appi`，再呼叫同一個 `claude` binary）。`claude`(dev/lightman) 只做互動改碼，不跑 cron。
- ⚠️ **`claude-appi` 與 appi.news 自動化共用同一個週限額**——撞限額時 evidencetoday 會一起空跑；`claude-run.sh` 偵測到就寫冷卻旗標、`bootstrap.sh` 冷卻期內跳過 claude 型 job（純資料型照跑）。看現況用 `cron-status.sh`／`/etn-cron`。

## articles 選題的三個來源（2026-08-08 補第二順位）

`draft-cron.sh articles` 的 SELECT_BLOCK 現在有三條選題來源，順序有意義：

1. **擴寫已有牽引力的主題叢集**（原有）——把單點頁擴成叢集，每個子題仍須獨立通過六基因。
   並受**題型硬規則**約束：優先 decision-guide／ingredient-explainer／audience-stage-guide，嚴禁在 articles 寫 myth-check（闢謠題進 myths collection）。依據見 `docs/playbooks/winning-article-formula.md`「六基因不只預測排名，也預測會不會被索引」。
2. **把 news 抓到的重大轉向升格為常青決策文**（新增）——掃近 14 天 `src/content/news/`，
   挑「指引更新／法規變動／重大證據反轉」且站上沒有對應決策文的題目。
3. **GSC 排名 5–15 的 query 缺口**（原有，輔助）。

**為什麼要加第二條**：兩條產線本來不通。news 每天在讀文獻，articles 選題卻只看
既有叢集與 GSC。結果是重大題目進了一日新聞就被埋掉。
2026-08-08 的實例：FDA 移除更年期荷爾蒙治療黑框警語（20 年來最大的一次轉向）
只產出一則 08-22 的 radar，而站上 6 篇更年期文章全是保健品，沒有一篇談這個醫療決定。
那是一個有時間窗的決定（停經 10 年內／60 歲前），時效性比一日新聞長得多。

**同時補上「動筆前的排除檢查」**：必須直接列 `src/content/articles/` 確認排程稿沒在寫同一題。
排程稿不在 `dist` 裡，用網站搜尋與 GSC 都看不到。2026-08-08 就是漏了這一步，
在既有文裡加了一節，跟一篇 08-25 的排程稿打對台（見 commit 77d8da6）。

## 設計鐵則（改這裡前必讀）

1. **ops 腳本一律不自我 `git pull`**——交給 `bootstrap.sh`。在 repo 內自我 pull 會執行中覆寫自身。
2. **機密/狀態走 `$CONF_DIR`**，永不寫進 repo（`slack-bot-token` 是機密；`pending/` 等是 runtime）。
3. **路徑參數化**：`REPO` 從腳本位置推導（`$(dirname BASH_SOURCE)/..`）、`CONF_DIR` 取 env（預設主機路徑）。勿再 hardcode `/mnt/customer/evidencetoday.news`。
4. crontab 一律經 `bootstrap.sh <script> [args]` 呼叫，不直接呼叫個別腳本。
5. **headless `claude` 一律經 `claude-run.sh` 呼叫**，不直接呼叫 `claude-appi`（否則撞額度時不會寫冷卻旗標、會每趟空跑）。
6. **子代理模型｜省成本鐵則**：撰寫類 prompt（draft/news）凡用 `Agent` 工具派 sub-agent，**一律顯式帶 `model='sonnet'`**（審核委員會亦同，比照 `docs/news_sop.md` 設計 Sonnet x n）；**嚴禁用預設模型——預設會落到 opus（最貴）**。純機械性檢查（連結驗 200/檔名）才可降 `model='haiku'`。orchestrator 自身由各腳本 `--model claude-sonnet-4-6` 鎖定。
7. **`draft-cron.sh` 與 `publish-approved.sh` 共用 `src/content` 互斥鎖**（`CONTENT_LOCK`，定義在 `gate-lib.sh`）。原因：draft 撰稿期間草稿是 `src/content/<type>/` 下的**未追蹤檔**，還沒搬進暫存區；而 publish 每 10 分鐘一輪，結尾會 `git clean -fdq -- src/content` 清殘留——會把還在寫、耗時 >10 分鐘的草稿整篇洗掉（**2026-07-10 draft-myths 事故**：bone-broth / plant-milk 草稿各被誤刪一次，靠審核 Agent 留底才救回）。約定：**draft 端頁面型撰稿全程持鎖**（`flock -w 600`，等值得，稿件型 podcast/videos 走 repo 外 scratch 不需要）；**publish 端 `flock -n` 搶不到就跳過本輪**（10 分鐘後自動重試，發布延遲可接受、弄丟草稿不可接受）。
8. **articles 選題＝「能贏的文章模子」**：`draft-cron.sh` 的 `articles` SELECT_BLOCK 已注入 `docs/playbooks/winning-article-formula.md` 的六基因鐵律（單一具體決定／「現在」觸發點／台灣在地限定／權威站沒寫的角度／切身後果／答案先行＋範圍狠收）。改選題邏輯時，這兩處（SELECT_BLOCK 與 playbook）要一起改，別讓自動管線與方法論分岔。
9. **news 產出頻率與標題形狀**：
   - **頻率＝維持每日**（`17 22 * * 0-6`）。2026-08-04 曾規劃降為週二/四/六，**2026-08-05 撤回，從未套用到主機**。撤回理由：當初的前提（索引率低、灌新 URL 會稀釋權重）已被後續數據推翻，且趨勢新聞位置校正後的 CTR 達成率是全站最高的一群。更關鍵的是**趨勢新聞有時效性——壓著不發等於作廢**，稿子排完就該送出去。
   - **門檻**：`data/news-automation-config.json` 的 `scoreThreshold` / `soloArticleMinScore` 與 SELECT_BLOCK 的加權門檻，皆維持原值（2026-08-05 由降頻期的暫時提高值還原）。**實際數值以 `news-automation-config.json` 為準，不在本檔複述**。
   - **標題**（此項與降頻無關，保留）：`titleDisplay` 必須是讀者會實際打進搜尋框的問句，**嚴禁「健康雷達 YYYY-MM-DD」日報流水句型**、嚴禁把期刊名或研究設計當標題主體；並確認前 18 字單獨看讀得通（`social-meta.mjs` 的 `shortTitle()` 會截到 18 字）。
   - ⚠️ **news 的 `publishDate` 一律等於檔名的名目日期**（`radar-YYYY-MM-DD`），不可為了調整全站發文量而延後——2026-08-04 曾把 news 一併拉開，導致標題日期與實際發布日差了一個多月，等於發一批上線即過期的新聞。要調發文量請動 evergreen（articles/ingredients/myths）。
   - **⏰ 何時重新評估頻率**：到期日在 `docs/reminders.md`，評估流程與判準在 `docs/playbooks/news-cadence-review.md`。**判準用的數字一律當場跑指令取得**（`pnpm perf` / `pnpm index:coverage` / `pnpm stats`），不要在本檔寫死基準。
   - 改動時三處要一起改：本檔 crontab 區塊、`draft-cron.sh` 的 news SELECT_BLOCK、`news-automation-config.json`。

## crontab（在 `/etc/cron.d/evidencetoday`，單檔一專案；系統 TZ=UTC，排程以 UTC 寫，台北＝UTC+8）

> 改排程＝改 `/etc/cron.d/evidencetoday`（**不在** user crontab）。日誌統一在 `/var/log/evidencetoday/<job>.log`。
> 各行格式含 user 欄位：`分 時 日 月 週  root  /mnt/customer/evidencetoday.news/ops/bootstrap.sh <script> [args] >> /var/log/evidencetoday/<job>.log 2>&1`
>
> ✅ **主機不需要任何改動（2026-08-05）**：2026-08-04 曾規劃把 news 降為 `1,3,5` 並提示在主機執行 `sed`，**該降頻已撤回，且那道指令從未執行過**，主機上的 `/etc/cron.d/evidencetoday` 一直是每日 `0-6`，正是現在要的狀態。**不要執行那道 sed。**

```
CRON_TZ=UTC
17 22 * * 0-6    draft-cron.sh news       # 台北每日 06:17 趨勢草稿（2026-08-04 曾規劃降頻，08-05 撤回，主機始終是每日）
35 23 * * 0    draft-cron.sh articles     # 台北週日→一 07:35
35 23 * * 2    draft-cron.sh ingredients  # 台北週二→三 07:35
35 23 * * 4    draft-cron.sh myths        # 台北週四→五 07:35
# 35 23 * * 1  draft-cron.sh podcast      # 【2026-07-07 用戶要求停用】台北週一→二 07:35（1 份講稿）
# 35 23 * * 3  draft-cron.sh videos       # 【2026-07-07 用戶要求停用】台北週三→四 07:35（3 份短影音腳本）
*/10 * * * *   publish-approved.sh        # 每 10 分掃自動核准草稿→gate→發佈→貼上線連結（2026-08-06 直接發佈制）
0 1  */3 * *   sitemap-submit.sh          # 每 3 天 sitemap+索引覆蓋率（台北 09:00）
30 1 */3 * *   perf-report.sh             # 每 3 天經營建議（台北 09:30）
30 2 *   * *   optimize-cron.sh           # 每日自我優化（台北 10:30）
45 1 *   * 1   googlenews-watch.sh        # 每週一 Google News 監測（台北 09:45）
```
