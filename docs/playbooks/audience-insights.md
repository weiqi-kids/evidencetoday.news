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
- GA4 property `541692554`、GSC `sc-domain:evidencetoday.news`、SA `ga4-insights@yaocare`
- 門檻全在 config `audienceInsights.thresholds`，勿散落程式碼

## 姊妹指令：`pnpm perf`（站整體效能快照）
- `scripts/perf-snapshot.mjs` — **唯讀**印出近 28 天 GA4（使用者/工作階段/Top 頁面/流量來源）+ GSC（點擊/曝光/CTR/排名、Top 查詢與著陸頁）。
- 與 `pnpm insights` 區別：insights 為 **/news 選題** 吐三桶 JSON；perf 給 **經營決策** 看的整體表現面板。
- 共用同一組認證（`getToken()` → `gcloud`），故同樣需要 PATH 含 `/snap/bin`（腳本已自動補上）。
- 只印 stdout、**不寫任何檔**（GSC 查詢詞屬商業內幕，不落地、不 commit）。
- **session 啟動慣例**：見 `CLAUDE.md`「§ session 啟動行為」——每次開工先跑 `pnpm perf` 給經營建議。

## 姊妹指令：`pnpm sitemap:submit`（提交 sitemap + 索引覆蓋率）
- `scripts/sitemap-submit.mjs` — 把 `sitemap-index.xml` 主動提交給 GSC，並印出 sitemap 處理狀態與「近 28 天有曝光頁數 / sitemap 234 頁」的覆蓋率訊號。`--check` 只查不提交。
- **為何存在**：2026-06-23 診斷發現 **GSC 從未提交過 sitemap** → 約 200 頁內容僅 26 頁有曝光，整批 myths/ingredients 經 URL 檢查 API 回報「URL is unknown to Google」（Google 連爬都沒爬）。robots.txt 雖已聲明 sitemap，但對權重低的新站不足以系統性發現全部頁。提交後 Google 會週期性重抓 sitemap、自動發現新頁——這是全站流量的最高槓桿動作，遠勝單頁 title/CTR 微調。
- **認證差異**：`pnpm perf`/`insights` 用唯讀 scope（`webmasters.readonly`，見 `insight-constants.mjs` 的 `SCOPES`）；**提交 sitemap 需寫入 scope**，故本腳本就地用 `gcloud ... --scopes https://www.googleapis.com/auth/webmasters` 取一顆獨立 token，不放寬其他唯讀流程的權限。SA `ga4-insights@yaocare` 已具該 GSC 屬性擁有者權限（已實測可提交，HTTP 204）。
- **自動化**：本機 cron 每週一重 ping 並記錄覆蓋率 → `/root/.config/evidencetoday-news/sitemap-submit.sh`（crontab `0 1 * * 1`，log 在 `/tmp/evidencetoday-sitemap.log`）。沿用既有 cron 慣例（`/snap/bin` PATH、UTC 寫死時間、Vixie 不支援 `CRON_TZ`）。
- 部署到 GitHub Pages 的 CI **沒有** gcloud 憑證，故此提交只能在本機/cron 跑，不在 deploy workflow 內。

## 姊妹指令：`pnpm index:coverage`（全站索引覆蓋率 + 歷史追蹤）
- `scripts/index-coverage.mjs` — 對 sitemap 全部 URL 逐一打 GSC **URL 檢查 API**，彙總 coverageState 分布與各 collection「已索引/總」，算真實索引率（只認 `Submitted and indexed`），並把快照記到歷史檔、印出與上次的差異。`--no-save` 只看不記。
- **為何存在**：2026-06-23 診斷出真正瓶頸是「Google 發現了卻不索引」——真實索引僅 25/233（11%），189 頁「Discovered - currently not indexed」（網域權重不足，非技術 bug；robots/canonical/noindex/GA4/schema 全驗過正常）。sitemap 當天才提交，需 2–4 週讓 Google 消化。本指令把一次性掃描變可重複量測，判斷索引數在「爬升中（時間問題）」還是「卡住（權重天花板，該投資站外）」。
- **唯讀**：URL 檢查 API 唯讀即可（與 perf/insights 共用唯讀 token，不需 sitemap:submit 的寫入 scope）。
- **歷史檔**：`/root/.config/evidencetoday-news/index-coverage-history.jsonl`（每行一筆 JSON 快照；僅彙總計數、非機密，存倉庫外不 commit）。掃描約 200+ 個 URL、受 API 速率限制，約 2–3 分鐘。
- **判讀**：已索引數逐次成長＝多屬時間問題、續觀察；停滯不動＝偏向權重天花板，全力投資站外權威（見 `docs/playbooks/geo-offsite.md`）。⚠️ 易誤判：`Discovered - currently not indexed` 的字串含 "indexed"，計數務必用「精確等於 `Submitted and indexed`」，勿用 `/indexed/` 比對。

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

## 驗證清單
- [ ] `pnpm exec vitest run` 全綠
- [ ] `pnpm insights` 本機實跑：有認證時印出三桶 JSON；無認證時印空桶不報錯
- [ ] `git status` 確認 `data/audience-insights.json` 未被追蹤
