# Playbook: Audience Insights（GA4/GSC 驅動 /news 選題與寫法）

> 功能：`scripts/audience-insights.mjs` 即時抓 GA4+GSC，跑 8 策略，吐三桶供 /news 管線 Phase 2 使用。
> Spec：`docs/superpowers/specs/2026-06-16-audience-insights-design.md`

## 結構
- `scripts/audience-insights.mjs` — 組裝層 entrypoint（`pnpm insights`）
- `scripts/lib/insight-fetch.mjs` — token + GA4/GSC + 正規化
- `scripts/lib/insight-strategies.mjs` — 8 純函數策略
- `scripts/lib/content-index.mjs` — 站內內容索引
- `scripts/lib/assemble.mjs` — 合併 + dataHealth
- 設定：`data/news-automation-config.json` → `audienceInsights`
- 輸出：`data/audience-insights.json`（**gitignore，不公開**）

## 鎖定參數（改前先確認）
- GA4 property `541692554`、GSC `sc-domain:evidencetoday.news`、SA `etn-insights@evidencetoday`（2026-08-06 換帳號：站長專案 `evidencetoday` 專屬 SA，舊共用 `ga4-insights@yaocare` 已無本站權限）
- 門檻全在 config `audienceInsights.thresholds`，勿散落程式碼

## 認證：兩條路，同一個 `getToken()`（2026-08-04 起）

`scripts/lib/insight-fetch.mjs` 的 `getToken()` 是全部 5 支腳本（`perf-snapshot` / `audience-insights` / `index-coverage` / `googlenews-watch` / `sitemap-submit`）的唯一取 token 入口。優先序：

| 順位 | 來源 | 用在哪 |
|---|---|---|
| 1 | **服務帳號金鑰**：`GOOGLE_SERVICE_ACCOUNT_KEY`（原始 JSON 或 base64）或 `GOOGLE_APPLICATION_CREDENTIALS`（金鑰檔路徑） | 遠端環境（Claude Code on the web／CI）——**沒有 gcloud 的地方** |
| 2 | `gcloud auth print-access-token` | 主機 cron（行為與過去完全相同，未受影響） |

金鑰路徑走 JWT-bearer flow（RFC 7523）：用 `node:crypto` 以 RS256 簽 assertion 換 access token，**不需要任何新相依套件**。取不到 token 一律回 `null`，各腳本自行退化成空輸出，不會 crash。

⚠️ `getToken()` 已改為 **async**，呼叫端必須 `await`。新增呼叫點時別忘了。

### 在遠端環境啟用

**逐步操作說明（給非工程背景，含每一個要點的按鈕）：[`docs/setup-google-data-access.md`](../setup-google-data-access.md)**

摘要：GCP Console 產服務帳戶 JSON 金鑰 → GA4「資源存取管理」加該 SA 為檢視者 → GSC「使用者和權限」加該 SA 為完整權限 → 把整份 JSON 貼進 Claude Code on the web 的環境變數 `GOOGLE_SERVICE_ACCOUNT_KEY`。

`GOOGLE_SERVICE_ACCOUNT_KEY` 接受原始 JSON 或 base64。⚠️ 但 **Claude Code on the web 的環境變數欄位是 `.env` 格式（一行一個 `KEY=value`），多行 JSON 會壞掉——那裡一律用 base64**；原始 JSON 只在支援多行的地方（CI secret、本機 shell）能用。設好之後任何 session 直接 `pnpm perf`、`pnpm insights`、`pnpm index:coverage` 都會有真實數據。

⚠️ 關鍵觀念（最常卡住的一點）：**金鑰不在 GA4 或 GSC 介面裡**，那兩處只負責授權；金鑰要到 **Google Cloud Console** 產生。

**診斷指令 `pnpm check:google`**（`scripts/check-google-access.mjs`）：逐項檢查憑證來源、token 交換、GA4 與 GSC 讀取，並把每個失敗對應回設定文件的哪一段（例：GSC 403 → 服務帳戶沒加進「使用者和權限」；GA4 404 → GA4_PROPERTY 常數與實際資源對不上）。唯讀，不印出任何搜尋查詢內容。設定過程卡住時先跑它。
⚠️ 第 1 關檢查的是**憑證來源**，金鑰與 gcloud **兩條都算通過**——主機 cron 本來就沒有 `GOOGLE_SERVICE_ACCOUNT_KEY`，早期版本在這裡硬 exit 會給出「找不到金鑰」的假警報（2026-08-05 修）。
⚠️ 環境變數欄位是 `.env` 格式（`名稱=值`）。**漏打 `GOOGLE_SERVICE_ACCOUNT_KEY=` 而只貼 base64，整串值會被當成「變數名」、值為空字串**，症狀是 `check:google` 說「找不到」但 `env` 裡看得到一個超長的變數名（2026-08-05 實際踩過）。

**權限需求**：該 SA 需在 GA4 資源有「檢視者」、在 GSC 資源有使用者權限。`sitemap-submit` 另需 `webmasters` **寫入** scope。

**安全性**：服務帳號私鑰是真憑證。只貼進環境變數設定介面，**不要貼進對話或 commit 進 repo**（本 repo 為 public）。金鑰可隨時在 GCP Console 撤銷、重發。⚠️ 環境變數欄位**不是加密保管庫**——官方文件明載「Anyone who uses the environment can read the values, and cloud environments have no dedicated secrets store」。要收斂風險就把 GSC 權限降成「受限」（唯讀），代價只是 `sitemap:submit` 不能自動提交。

## 姊妹指令：`pnpm perf`（站整體效能快照）
- `scripts/perf-snapshot.mjs` — **唯讀**印出近 28 天 GA4（使用者/工作階段/Top 頁面/流量來源）+ GSC（點擊/曝光/CTR/排名、Top 查詢與著陸頁）。
- 與 `pnpm insights` 區別：insights 為 **/news 選題** 吐三桶 JSON；perf 給 **經營決策** 看的整體表現面板。
- 共用同一組認證（`getToken()` → `gcloud`），故同樣需要 PATH 含 `/snap/bin`（腳本已自動補上）。
- 只印 stdout、**不寫任何檔**（GSC 查詢詞屬商業內幕，不落地、不 commit）。
- **session 啟動慣例**：見 `CLAUDE.md`「§ session 啟動行為」——每次開工先跑 `pnpm perf` 給經營建議。
- **⚠️ GSC rowLimit 的排序陷阱（2026-08-04 修，會導出完全錯誤的結論）**：`gscQuery()` 沒帶 `orderBy`，GSC `searchAnalytics` 預設**依點擊排序**。舊版 `rowLimit: 15` 拿到的是「點擊最高的 15 筆」而非「曝光最高的 15 筆」，那 15 筆合計曝光僅 122／全站 4,112（3%），且**「有曝光、零點擊」的查詢會被結構性全數濾掉**——那正是 CTR 優化的對象。現在一次抓 `GSC_ROWS = 1000` 列回本地再各自排序，新增「⭐ 機會查詢（排名 5–20 且曝光 ≥20）」與「⚠️ 高曝光低 CTR」兩張表。改 rowLimit 前先想清楚這件事。
- **⚠️ 頁面榜單一律先剔除 `#` fragment 列（2026-09-08 修）**：GSC page 維度會把「跳至章節」sitelinks 當成獨立的列回傳，但那不是獨立結果——它隨母頁的同一則 SERP 結果一起曝光（**曝光與母頁重複計算**），且只有使用者特意點那一條才記點擊，所以 **CTR 恆趨近 0、排名幾乎等同母頁**。放進榜單必定誤導：曾把全站表現最好的那一頁的錨點列送上「高曝光低 CTR」榜首，觸發一輪不該做的內容搶救。現在「Top 著陸頁」「高曝光低 CTR 頁面」「排名 >12 的低 CTR 頁」三張表都只吃非 fragment 列，剔除筆數會標在 Top 著陸頁標題上；被剔除的列**不丟掉**，另闢「ℹ️ 章節跳轉 sitelinks」一區依母頁彙總並寫明不可判讀，讓下一個人不必再查一次「這些曝光跑去哪了」。**站台層級總計（點擊／曝光／CTR／平均排名）不受影響也不要改**——那是 GSC 直接給的站台數字，沒有重複計算。查詢維度已實測沒有同類問題（GSC 不會在 query 維度回傳 fragment）。判讀細節見 `docs/pitfalls.md`「資料與判讀」。
- **GSC 查詢層資料天生殘缺**：即使 rowLimit 拉到 1000，2026-08-04 實測只回 172 列、涵蓋 588 曝光＝**全站 14%**。其餘 86% 是 GSC 為隱私隱藏的稀有查詢，API 拿不到。**故選題與改寫優先序要以「頁面層」為準，查詢層只當佐證**——頁面層沒有這個匿名化缺口。

## 姊妹指令：`pnpm sitemap:submit`（提交 sitemap + 索引覆蓋率）
- `scripts/sitemap-submit.mjs` — 把 `sitemap-index.xml` 主動提交給 GSC，並印出 sitemap 處理狀態與「近 28 天有曝光頁數 / sitemap 234 頁」的覆蓋率訊號。`--check` 只查不提交。
- **為何存在**：2026-06-23 診斷發現 **GSC 從未提交過 sitemap** → 約 200 頁內容僅 26 頁有曝光，整批 myths/ingredients 經 URL 檢查 API 回報「URL is unknown to Google」（Google 連爬都沒爬）。robots.txt 雖已聲明 sitemap，但對權重低的新站不足以系統性發現全部頁。提交後 Google 會週期性重抓 sitemap、自動發現新頁——這是全站流量的最高槓桿動作，遠勝單頁 title/CTR 微調。
- **認證差異**：`pnpm perf`/`insights` 用唯讀 scope（`webmasters.readonly`，見 `insight-constants.mjs` 的 `SCOPES`）；**提交 sitemap 需寫入 scope**，故本腳本就地用 `gcloud ... --scopes https://www.googleapis.com/auth/webmasters` 取一顆獨立 token，不放寬其他唯讀流程的權限。SA `etn-insights@evidencetoday` 為該 GSC 屬性完整使用者（2026-08-06 實測可提交 sitemap）。
- **自動化**：本機 cron 每週一重 ping 並記錄覆蓋率 → `ops/sitemap-submit.sh`（crontab `0 1 * * 1`，log 在 `/tmp/evidencetoday-sitemap.log`）。沿用既有 cron 慣例（`/snap/bin` PATH、UTC 寫死時間、Vixie 不支援 `CRON_TZ`）。
- 部署到 GitHub Pages 的 CI **沒有** gcloud 憑證，故此提交只能在本機/cron 跑，不在 deploy workflow 內。

## 姊妹指令：`pnpm index:coverage`（全站索引覆蓋率 + 歷史追蹤）
- `scripts/index-coverage.mjs` — 對 sitemap 全部 URL 逐一打 GSC **URL 檢查 API**，彙總 coverageState 分布與各 collection「已索引/總」，算真實索引率（只認 `Submitted and indexed`），並把快照記到歷史檔、印出與上次的差異。`--no-save` 只看不記。
- **為何存在**：2026-06-23 診斷出真正瓶頸是「Google 發現了卻不索引」——真實索引僅 25/233（11%），189 頁「Discovered - currently not indexed」（網域權重不足，非技術 bug；robots/canonical/noindex/GA4/schema 全驗過正常）。sitemap 當天才提交，需 2–4 週讓 Google 消化。本指令把一次性掃描變可重複量測，判斷索引數在「爬升中（時間問題）」還是「卡住（權重天花板，該投資站外）」。
- **唯讀**：URL 檢查 API 唯讀即可（與 perf/insights 共用唯讀 token，不需 sitemap:submit 的寫入 scope）。
- **歷史檔**：`/root/.config/evidencetoday-news/index-coverage-history.jsonl`（每行一筆 JSON 快照；僅彙總計數、非機密，存倉庫外不 commit）。掃描約 200+ 個 URL、受 API 速率限制，約 2–3 分鐘。
- **判讀**：已索引數逐次成長＝多屬時間問題、續觀察；停滯不動＝偏向權重天花板，全力投資站外權威（見 `docs/playbooks/geo-offsite.md`）。⚠️ 易誤判：`Discovered - currently not indexed` 的字串含 "indexed"，計數務必用「精確等於 `Submitted and indexed`」，勿用 `/indexed/` 比對。
- **URL 來源與遠端沙箱 403（2026-08-04 修）**：優先抓線上 sitemap，取不到才退回 `dist/`。遠端沙箱（Claude Code on the web／CCR）的 egress allowlist 不含本站網域，`fetch` 會回 **403 純文字**「Host not in allowlist」而**不丟例外**——舊版沒驗證內容，解析出 0 個 `<loc>` 仍往下跑，印出「真實索引：0/0（NaN%）」，看起來像索引全掛。現在兩者都取不到會**硬失敗 exit 1**，勿把這個保護拿掉。遠端要跑就先 `pnpm build` 產 `dist/`（GSC API 本身走 googleapis.com，不受 allowlist 影響）。

### 索引率基準線（歷史量測紀錄，**不是現況**）

> 這是本檔唯一容許出現數字的地方：GSC 不保留這段歷史，指令跑不出來，所以只能存檔。
> **要看現況一律跑 `pnpm index:coverage`**，不要拿下表的數字當今天的狀態。每次量測往下追加，不要覆蓋。

| 日期 | 已索引/總 | 索引率 | 備註 |
|---|---|---|---|
| 2026-06-23 | 25/233 | 11% | sitemap 當天才首次提交 |
| 2026-08-04 | 222/326 | **68%** | 6 週後；分項：articles 80/105、news 53/85、myths 43/53、ingredients 25/46、topics 11/17、podcasts 3/4、**videos 0/6** |

判讀：已索引頁數 25→222（9 倍），**「網域權重天花板」假設不成立**，站內動作有效，續做站內。剩餘 82 頁 `Discovered - currently not indexed`、20 頁 `URL is unknown to Google`。
⚠️ 分母會隨內容量變動（233→326），比較時**看已索引的絕對數**比看百分比可靠。用 `dist/` 當來源時，分母含尚未部署到線上的頁，那些會落在 "unknown to Google"。

## ⚠️ 談 CTR 一律先做位置校正（否則結論會相反）

各 collection 的平均排名差距很大（articles ≈ 5–8、myths ≈ 9–12、ingredients ≈ 15–25），**直接比原始 CTR 會把「排名差異」誤讀成「標題品質差異」**。2026-08-04 就這樣誤判過：原始 CTR 是 articles 4.4% vs ingredients 1.4%／myths 1.3%，據此得出「這兩類標題該全面改寫、可換 +35 clicks」——**錯的**。

做法：用產業通用 CTR 曲線把排名除掉，比「實際點擊 ÷ 位置校正期望點擊」的達成率。

```js
const curve = [0,.28,.15,.11,.08,.06,.045,.035,.03,.025,.022,.018,.016,.014,.013,.012,.011,.010,.009,.008,.007];
const expCtr = (p) => p <= 20 ? curve[Math.max(1, Math.round(p))] : p <= 30 ? .005 : .002;
// 每頁：expected = impressions * expCtr(position)；達成率 = clicks / expected
```

2026-08-04 實測結果（近 28 天）：

| 類型 | 曝光 | 實際點擊 | 位置校正期望 | 達成率 |
|---|---|---|---|---|
| articles | 2,975 | 130 | 105.7 | 123% |
| ingredients | 706 | 10 | 11.5 | 87% |
| myths | 460 | 6 | 11.5 | 52% |
| news | 239 | 14 | 8.5 | 165% |

真正的缺口只有約 7 clicks／28 天，**標題不是瓶頸，排名才是**。判讀原則：
- **達成率 ≥100%** → 標題沒問題，要更多點擊只能靠拉排名或拉曝光。
- **達成率明顯 <100% 且曝光夠大（≥300）** → 才值得改標題／描述。
- **單頁曝光 <100 時不要下結論**：位置 10 名、50 次曝光的期望點擊本來就只有約 1 次，拿到 0 次完全在雜訊範圍內，不構成「這個標題壞了」的證據。

### 同一個陷阱在腳本裡也踩過一次（2026-08-06 修）

`perf-snapshot.mjs` 的**查詢**表一直有 `position <= 10` 過濾，**頁面**表卻沒有，於是「⚠️ 高曝光低 CTR 頁面」把排名 24.7 的 `/ingredients/taurine/`、排名 59.2 的 `/articles/onion-phytochemicals-quercetin-heart/` 也列了進去——那種位置的 CTR 趨近 0 是必然，照著改標題是白工。14 筆裡有 3 筆是這種假陽性。

現在頁面表也套 `position <= 12`（放寬到 12 是為了納入第 2 頁前段，那裡曝光仍可觀、標題確實影響點擊），並把排名更後面的另外列成一張表，標題直接寫明「這些是排名問題，不是標題問題」。**改這個門檻前先讀本節。**

### 第三種外衣：page 維度的 `#` fragment 列（2026-09-08）

前兩種是「拿排名很後面的頁比 CTR」與「跨 collection 比原始 CTR」，這一種更難察覺，因為它的**排名看起來很前面**——sitelinks 繼承母結果的位置，所以錨點列會排在母頁旁邊，卻幾乎零點擊，完美偽裝成「排第 4 名卻沒人點＝標題爛」。

判準三條，符合任一條就不要拿它的 CTR 做判斷：

1. URL 含 `#`。
2. 它的排名與同一頁母體那一列幾乎同值。
3. 同一母頁一次冒出好幾條（Google 章節跳轉連結一則結果最多顯示 4 條）。

要看那一頁的真實表現，把錨點列的點擊併回母頁、除以**母頁的曝光**（不是兩者相加的曝光）。腳本端已處理；自己寫一次性分析時要記得補這道過濾，否則依 collection 彙總、每頁曝光、全站 CTR 全都會被灌水的分母拉低。現況跑 `pnpm perf`，看輸出最後那一區。

## 各 collection 產出效率（每頁曝光）

同一份 GSC 頁面資料按 collection 彙總（排除 `#錨點` 重複計算），是決定「該多寫哪一類」的依據。2026-08-04：

| 類型 | 頁數 | 曝光 | 佔比 | 每頁曝光 |
|---|---|---|---|---|
| articles | 106 | 2,975 | 66.6% | **28.1** |
| ingredients | 46 | 706 | 15.8% | 15.3 |
| myths | 53 | 460 | 10.3% | 8.7 |
| **news** | **85** | **239** | **5.4%** | **2.8** |
| topics | 17 | 10 | 0.2% | 0.6 |
| videos | 6 | 0 | 0% | 0 |

⚠️ news 佔 26% 頁數只換到 5.4% 曝光（每頁效率是 articles 的 1/10），而且是**唯一要燒 token 的類型**（與 appi.news 共用週限額）——news 自動化降頻的正當理由是這個，不是「爬取預算」（那個假設已被 68% 索引率推翻）。
⚠️ `#錨點` URL 會被 GSC 單獨計曝光但幾乎不產生點擊（2026-08-04：單篇 3 個錨點共 632 曝光、0 點擊），彙總時務必濾掉，否則會低估全站 CTR。

## 撞題比對 `queryHasExistingPage()`（決定一則查詢算不算「站內缺口」）

住在 `scripts/lib/content-index.mjs`。三支策略（`strategySearchGap` / `strategyOnsiteSearch` / `strategyRankBoost`）
都靠它判斷「這則查詢站上有沒有對應頁」，**判錯就會把已經寫過的題目當成缺口再提一次**。

比對來源只讀 frontmatter，不讀正文：

| 規則 | 資料來源 | 比對方式 |
|---|---|---|
| 1. 中文詞包含 | `title` + `tags` | query 以空白切詞，任一詞（長度 ≥2）是 haystack 的子字串 |
| 2. 英文名／slug | `slug`、`titleEn`（整串＋括號／冒號拆段）、英數 `tags` | query 的「連續英數詞 n-gram」與名字**等值**比對，兩邊都先正規化（小寫、去連字號／空白／撇號） |
| 3. 別名表 | `EXTRA_ALIASES` | 表裡的中文別名出現在 query 中 |

規則 2 是 2026-09-08 補的。原本只有規則 1，於是**整群英文成分名查詢全部漏判**——
站上成分頁的 `title` 是中文（「猴頭菇菌絲體」），讀者打的是 `lion's mane`，字串包不到。
用的是 ingredients **既有的 `titleEn` 欄位**（`src/content.schemas.ts` 已定義），沒有為此改 schema。

⚠️ **為什麼是「片語等值」而不是「子字串包含」**：名字若拿去做子字串比對，`iron` 會命中 `environment`、
`tg` 會命中一堆東西。等值比對讓 `alpha lipoic acid` 對得上 `alpha-lipoic-acid`，同時不會把不相干的查詢吃進來。
改這段前先想清楚這個取捨。

### `EXTRA_ALIASES` 誰維護

`slug` / `title` / `titleEn` / `tags` 四個欄位都推不出來的說法（頁面只在正文提到的次要成分名、
簡體寫法、俗名，以及沒有 `titleEn` 欄位的 articles／myths 的英文縮寫）才進這張表。

- **維護責任：內容／經營 session（分流 B）。**
- 觸發時機：跑 `pnpm insights` 看到某則查詢明明站上有頁、卻仍被列進 `topicCandidates`。
- **先問能不能改頁面**：把英文名補進該頁的 `titleEn` 或 `tags` 才是正解，別名表是最後手段——
  補進 frontmatter 對讀者與搜尋引擎也有用，別名表只有這支腳本看得到。
- 加完在 `content-index.test.mjs` 補一條測試，確認沒把不相干的查詢也吃進來。

### 怎麼驗證改動

```bash
pnpm exec vitest run scripts/lib/content-index.test.mjs
```

要拿真實查詢驗，用 `data/topic-backlog.local.json` 裡那些 `relatedQueries`（`ingredient-english-name-queries`
那筆就是專門記漏判群的），逐則丟進 `queryHasExistingPage()` 看判成什麼；本地層不在就退回手動列幾則英文成分名。

## 修改流程（加新策略）
1. 在 `insight-strategies.mjs` 加 `(data,cfg)=>Bucket` 純函數，回 `emptyBucket()` 起手
2. 在 `insight-strategies.test.mjs` 先寫失敗測試（命中 + 空資料 + 門檻邊界）
3. 在 `audience-insights.mjs` 的策略陣列註冊
4. 若需新數據，於 entrypoint 加對應 `ga4Report`/`gscQuery` 拉取並放入 `data`

## 常見陷阱
- vitest 只收 `scripts/**/*.test.mjs`（已在 `vitest.config.ts` include）；測試副檔名必須 `.test.mjs`
- `data/audience-insights.json` **絕不可 commit**（含經營內幕；已在 .gitignore）
- 時區一律台灣 (UTC+8)：用 entrypoint 的 `tw()/nowTw()`，勿用裸 `new Date()`
- API/token 失敗一律回空桶 + exit 0，**不可擋發稿**
- **拿 `topicCandidates` 當「站上沒有」的結論**：`queryHasExistingPage()` 只看 frontmatter，中文長尾（沒有空白可切詞的整句查詢）仍會漏判。最終判準是 `data/topic-backlog.json` 的 `collisionCheck`，見 [`topic-backlog.md`](./topic-backlog.md)
- **改 `parseContentIndex()` 回傳欄位卻沒動測試**：`content-index.test.mjs` 用 `toEqual` 比對整個物件，加欄位一定要同步

## 驗證清單
- [ ] `pnpm exec vitest run` 全綠
- [ ] `pnpm insights` 本機實跑：有認證時印出三桶 JSON；無認證時印空桶不報錯
- [ ] `git status` 確認 `data/audience-insights.json` 與 `data/topic-backlog.local.json` 未被追蹤
- [ ] 動過 `content-index.mjs` 就抽幾則英文成分名查詢實跑 `queryHasExistingPage()`，確認判成「站上已有」，並抽幾則不相干查詢確認沒被誤判成已有
