# Playbook：Slack 按鈕核准閘半自動發布（slack-approval-gate）

> 六型內容分兩類，**機制完全不同**：
> - **頁面型**（news／articles／ingredients／myths）：自動撰寫 →（暫存 + Slack 按鈕）**核准** → **發布上站**。
> - **稿件型**（podcast／videos）：自動選題＋寫稿 → **直接把稿發到頻道當通知**（**無核准閘、無按鈕、不進 repo、不建站內頁、不跑 build、不經 publish-approved**）。真人看通知自行錄/拍。
> 腳本在 repo 內 `ops/`（經 `ops/bootstrap.sh` 由 cron 啟動）；互動端點在 `workers/ai-suggest/`（Cloudflare Worker）。
> 機密與執行期狀態在主機 `$CONF_DIR`（預設 `/root/.config/evidencetoday-news`）：`slack-bot-token`、`pending/`、`awaiting-live/`、`reports/`、`used-topics-<type>.txt`、`*-ledger.jsonl`。見 `ops/README.md`。
> 情境分流屬 **B（內容與曝光）**，但頁面型 publish 端會 commit/push 故發布前仍守全 gate。

## 全頻道半自動規則（六型定稿）

| 型別 (頻道) | 自動端角色 | 選題第一順位 | 節奏 | 品質 gate | 核准後 |
|---|---|---|---|---|---|
| 趨勢 news (`C0BCAC0GKBR`) | 選題＋撰寫 | **門檻制**：五維加權 **≥6.0** 才出，不夠零產出 | 每日 06:17、不保底量 | audit+build+check:news | ✅→自動發布上站 |
| 文章 articles (`C0BCVEYG5HS`) | 選題＋撰寫 | **先擴寫有牽引力叢集**（melatonin 等），新題為輔 | 週一 11:30｜1–2 篇 | audit+build | ✅→自動發布 |
| 成分解析 ingredients (`C0BCRS08DMG`) | 選題＋撰寫 | **站內連結缺口優先**（常被提到卻無成分頁） | 週三 11:30｜1–2 篇 | audit+build | ✅→自動發布 |
| 闢謠 myths (`C0BCKFMLS9Z`) | 選題＋撰寫 | **當下流傳的謠言優先**（社群/搜尋熱） | 週五 11:30｜1–2 篇 | audit+build+check:myths | ✅→自動發布 |
| Podcast (`C0BCPPE14T0`) | **選題＋寫講稿** | 熱門健康/營養題材、健康為主可踩熱點 | 週二 11:30｜**1 稿** | 語感自檢（YMYL＋禁 AI 模板，prompt 層；**不跑 build**） | **直接發頻道**（純通知，無核准） |
| 短影音 videos (`C0BDL4TMTKJ`) | **選題＋寫腳本** | 料理/食材技巧為主、可戳闢謠 | 週四 11:30｜**3 腳本**（批次） | 語感自檢（prompt 層；**不跑 build**） | **直接發頻道**（純通知，無核准） |

稿件型**沒有核准動作**：稿子產出後直接發到頻道（`slack-notify.sh`），標題即時寫進 `used-topics-<type>.txt` 去重。真人看通知自行錄/拍；真正的站內落地頁（podcasts/videos collection，需 Firstory 音檔／youtubeId）等錄/拍上架後另開流程。

## 0. 它是什麼

「比照 news 全管線的自動撰寫」＋「Slack 按鈕人工核准」拆兩段，中間用 **Cloudflare Worker + KV** 當狀態機：

```
draft-cron.sh <type>（主機，出草稿）
  選題→平行撰寫→配圖→審核委員會→在 src/content 原地過 gate（content:audit/型別/build）
  → 過了搬進暫存區 pending/<type>/<slug>/（main 不留）
  → 發「帶按鈕訊息」到該型頻道（📄預覽全文 / ✅確認發佈 / ❌退稿）
  → PUT 草稿全文到 Worker KV（state=pending）→ git 清回乾淨
        │
   （你在頻道：點 📄 開預覽網頁看全文 → 點 ✅ 或 ❌）
        │
Worker /slack/interact（按鈕回呼）
  ✅ → KV state=approved + 訊息就地改「已核准，發佈中…」
  ❌ → KV state=rejected + 訊息改「已退稿」
  📄（連結按鈕）→ 瀏覽器開 GET /gate/preview 渲染的草稿 HTML 預覽頁（不改狀態、不塞進 Slack）
        │
publish-approved.sh（主機，每 ~10 分輪詢）
  GET /gate/state 讀狀態：
   approved → copy 進 src/content → 過 build/型別 gate → commit → push → 寫 awaiting-live 標記
   rejected → 刪草稿
   逾期(>TTL) → 刪草稿 + thread 回貼
  另每輪掃 awaiting-live：上線網址回 200 → thread 回貼「已上線+連結」+ KV state=published
```

四型一致走此閘（含 news——由「過 gate 自動發布」改為按鈕核准後才發）。

## 1. 元件與檔案

| 檔案 | 角色 |
|---|---|
| `workers/ai-suggest/src/slack-gate.ts` | Worker：驗簽、按鈕互動（核准／退稿）、/gate/preview 預覽頁、KV 狀態機。 |
| `workers/ai-suggest/src/index.ts` | 路由：`POST /slack/interact`、`PUT /gate/draft`、`GET/PUT /gate/state`。 |
| `ops/gate-lib.sh` | 共用：型別→頻道/目錄/副檔名/gate 對應；`gate_post_buttons`、`gate_put_draft`、`gate_get_state`、`gate_set_state`、`WORKER_URL`。 |
| `ops/draft-cron.sh <type>` | 出草稿：撰寫→原地 gate→搬暫存→發按鈕訊息→存 Worker→記 ts→清工作樹。 |
| `ops/publish-approved.sh` | 發布：輪詢 KV 狀態→approved 發布→等連結生效→回貼上線連結。自鎖（flock）。 |
| `ops/slack-notify.sh` | 通用發訊（thread 回貼、優化報報共用）。 |
| `$CONF_DIR/pending/<type>/<slug>/` | 主機暫存區：`content.<ext>` + `meta.json`（含 id/channel/slack_ts）。 |
| `…/awaiting-live/<id>.json` | 已 push、等連結 200 的標記。 |

型別對應（gate-lib.sh `gate_channel`/`gate_ext`/`gate_is_script`）：
- 頁面型：articles→文章 `C0BCVEYG5HS`/.mdx；ingredients→成分解析 `C0BCRS08DMG`/.mdx；myths→闢謠 `C0BCKFMLS9Z`/.mdx（+check:myths）；news→趨勢 `C0BCAC0GKBR`/.md（+check:news）。
- 稿件型（`gate_is_script`=true）：podcast→Podcast `C0BCPPE14T0`/.md；videos→短影音 `C0BDL4TMTKJ`/.md。無型別 gate、不跑 build；核准後不進 src。
完整見記憶 `slack-channels`。

## 2. 鎖定參數

- **核准訊號**：Slack 按鈕 `gate_confirm`(✅)／`gate_reject`(❌)／`gate_preview`(📄)，`value` 帶草稿 id（`<type>::<slug>`）。狀態存 Worker KV `gate:<id>`，TTL 8 天。
- **逾期**：`GATE_TTL_DAYS=7`（主機端本地逾期清除）。
- **輪詢**：publish 每 ~10 分；按 ✅ 後最多 ~10 分發布，部署 ~3–5 分後回貼連結。
- **狀態查詢/寫入**：主機用 `gh auth token`（GitHub push 權）認證 `/gate/*`；Worker 驗 Slack 簽章（`SLACK_SIGNING_SECRET`）+ 用 `SLACK_BOT_TOKEN` 回呼 Slack。
- **每輪草稿量**：常青型每次 1–2 個最高 ROI 主題（寧少勿濫，YMYL）。

## 3. Worker 端（slack-gate.ts）

- `verifySlackSignature`：HMAC-SHA256，basestring `v0:ts:body`，逾 5 分拒（防重放）。
- `/slack/interact`：解析 `payload`（block_actions）→ 核准/退稿改狀態＋`chat.update` 原訊息（📄 預覽是連結按鈕、不進此端點）。
- `/gate/preview?id=`：把 KV 草稿 markdown 渲染成 HTML 預覽頁（noindex、公開、瀏覽器開）。
- KV 紀錄 `GateRecord`：{id,type,slug,title,summary,content,channel,slack_ts,state,by,url}。content 供 /gate/preview 渲染成 HTML 預覽頁。
- 需 secret：`SLACK_SIGNING_SECRET`、`SLACK_BOT_TOKEN`（皆 `wrangler secret put`）。沿用 KV binding `GEN_JOBS`，key 前綴 `gate:`。

## 4. 主機端細節

- **出草稿**：claude 只把「過 gate 的成品」留在 `src/content/<type>/`，**不 commit**；wrapper 偵測未追蹤新檔→搬暫存→`gate_post_buttons`→`gate_put_draft`→寫 meta→清工作樹。news 的 `processed-sources.json` 由 wrapper 單獨 commit+push。
- **發布**：approved→`cp` 進 src→**重跑 content:audit→型別 gate→build**→任一失敗即還原、回貼「gate 失敗」、meta 標 `.gatefail`（不洗版重試）→pass 才 commit；全部處理完**一次 push**→寫 `awaiting-live` 標記。
- **等連結生效**：每輪掃 `awaiting-live`，`curl -I` 上線網址回 200→thread 回貼「已上線+連結」+`gate_set_state published`；逾 40 分仍非 200→提醒一次後停止重貼。
- **稿件型（podcast/videos）— 純通知，不走核准閘**：`gate_is_script` 為 true。claude 把稿寫到 repo 外 scratch（`mktemp -d`，不碰 git），wrapper 用 `post_script_file()` 剝 frontmatter→`slack-notify.sh "$CH"` **直接發整篇稿到頻道**（無按鈕、不存 Worker、不進 pending）。發送成功即把標題寫進 `$CONF_DIR/used-topics-<type>.txt`；draft 端下次讀末 30 筆注入 prompt 去重。**完全不經 publish-approved.sh / Worker / build**。debug：`DRAFT_TEST_FILE=<某.md> draft-cron.sh podcast`（會真的發一則到 Podcast 頻道）。
- **除錯**：`DRAFT_TEST_FILE=<某既有檔> draft-cron.sh <type>` 跳過 claude，拿既有檔當假草稿驗證 搬移+發按鈕+存 Worker（稿件型給 `.md` 檔即可）；`DRY_RUN=1 publish-approved.sh` 只讀狀態不動作。

## 5. 常見陷阱

- **Worker 未部署 / secret 未設**：按鈕點了無反應（驗簽失敗回 401）或預覽顯示「草稿不存在」。先確認 Worker 已部署且兩個 secret 已設、Slack App Interactivity Request URL 指向 `…workers.dev/slack/interact`。
- **草稿沒 slack_ts**：發按鈕訊息失敗時 meta 無 ts，publish 略過直到補上；查 `/tmp/evidencetoday-draft-*.log`。
- **gatefail 卡住**：被標 `.gatefail` 不再自動重試；人工修 `pending/<type>/<slug>/content.<ext>` 後把 `meta.json.gatefail` 改回 `meta.json`。
- **news 時效性**：改走核准閘後新聞要等你按 ✅ 才上線；趕時效就即時去頻道核准。
- **scope**：bot 需 chat:write + channels:join + channels:history（views.open/chat.update 用 bot token 即可，免額外 scope）。

## 6. 排程（crontab，系統 TZ=UTC，排程以 UTC 寫；台北＝UTC+8。一律經 `ops/bootstrap.sh` 啟動）

```
17 22 * * *  ops/bootstrap.sh draft-cron.sh news         # 台北每日 06:17（門檻制≥6.0，不夠零產出）
30 3  * * 1  ops/bootstrap.sh draft-cron.sh articles     # 台北週一 11:30
30 3  * * 2  ops/bootstrap.sh draft-cron.sh podcast      # 台北週二 11:30（稿件型，1 份講稿）
30 3  * * 3  ops/bootstrap.sh draft-cron.sh ingredients  # 台北週三 11:30
30 3  * * 4  ops/bootstrap.sh draft-cron.sh videos       # 台北週四 11:30（稿件型，3 份短影音腳本）
30 3  * * 5  ops/bootstrap.sh draft-cron.sh myths        # 台北週五 11:30
*/10 * * * * ops/bootstrap.sh publish-approved.sh        # 每 10 分輪詢狀態 + 等連結生效回貼
```
稿件型（podcast/videos）走同一條 publish-approved.sh 輪詢；核准後不發布、只回「已採用」並記 used-topics。
（路徑前綴 `/root/evidencetoday.news/`。為何經 bootstrap：repo 內腳本不可自我 `git pull`，見 `ops/README.md`。）

## 相關
- 頻道對照與發送：記憶 `slack-channels`；token 位置 `secrets.md` § Slack；Worker 部署事實 `editor-ai-worker-deploy`。
- 撰寫鐵則：`docs/content-guide.md`、`docs/news_sop.md`、`AGENTS.md`。
- 優化通報（同 slack-notify.sh）：`docs/playbooks/daily-optimize.md` Step 6。
