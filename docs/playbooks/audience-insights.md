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
