# Agent Instructions

本專案為健康議題編輯平台「本日有據」（evidencetoday.news）。

本檔只放**代理人專屬**的東西：自動化任務流程與並行紀律。專案硬規則看 `CLAUDE.md`，任務索引看 `README.md`。

## 你是來做哪一種維護？（先對號入座）

> 本專案維護分兩種情境。**先判斷自己屬於哪一種，再照該情境的入口走。** 三份入口文件（`CLAUDE.md` / `README.md` / `AGENTS.md`）此區塊內容一致，不論先讀到哪一份都該得到相同分流。

### 🛠️ A. 開發維護 — 改程式 / 版面 / CI / 效能
動到 `src/`（元件/版面/樣式/工具/路由邏輯）、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`content.config.ts`、`package.json`。

1. 先 `pnpm build` 立基線（確認動手前是綠的）
2. **查 `README.md` 的「任務索引」找對應 playbook**，照其「鎖定參數/修改流程/常見陷阱/驗證清單」走
3. 守下方「修改紀律」＋ `docs/playbooks/css-rwd.md`
4. 改完 `pnpm build` 零錯誤 → **同步文件**（否則 `docs-sync-check` fail）
- 主檔：`README.md`「任務索引」、`docs/playbooks/*`、`docs/architecture.md`

### 📝 B. 內容與曝光 — 加內容 / 選題 / 看流量 / 自動發文
動到 `src/content/`、`src/data/policies/`、`public/images/`（不觸發 docs-sync）。

1. **session 一開始先 `pnpm perf`**（近 28 天 GA4+GSC 曝光快照，給經營建議）
2. 要做數據驅動選題再 `pnpm insights`（下方「撰寫趨勢文章」步驟 2.5 會用到）
3. 依內容類型找 playbook：一般內容 → `docs/content-guide.md`；趨勢新聞自動化 → `docs/news_sop.md` + 下方「撰寫趨勢文章」；曝光/選題寫法 → `docs/playbooks/audience-insights.md`、`docs/playbooks/analytics.md`；站外權威/GEO → `docs/playbooks/geo-offsite.md`
4. 發布：push `main` 自動部署
- 主檔：`docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/{audience-insights,analytics,geo-offsite,news-article,editor-*}.md`

## 套件管理器

使用 **pnpm**（不是 npm）。常用指令見 `README.md`「快速開始」。

## 站況一律用指令查

被問到「現在有幾篇 / 表現如何 / 排到哪天 / 索引了沒」時**先跑指令再回答**，不要憑記憶、也不要引用文件裡的數字（文件裡不該有數字）：

| 想知道什麼 | 跑什麼 |
|---|---|
| 篇數 / 已公開 / 排程中 / 審閱署名覆蓋 | `pnpm stats` |
| 排程破洞與跑道 | `pnpm check:schedule` |
| 曝光 / 點擊 / 排名 | `pnpm perf` |
| 索引涵蓋率 | `pnpm index:coverage` |
| cron 自動化現況 | `ops/cron-status.sh` |

## 修改紀律（任何 AI agent 都必須遵守）

**改功能程式碼時，必須同步更新文件**。命中以下任一路徑 = 功能改動：

- `src/components/`、`src/layouts/`、`src/styles/`、`src/lib/`、`src/utils/`
- `src/pages/` 內 `.astro` / `.ts` / `.svelte`
- `scripts/`、`.github/workflows/`
- `astro.config.mjs`、`src/content.config.ts`、`package.json`（scripts/dependencies）
- `ops/*.sh`（對應 `ops/README.md`）

→ **必須同時**改 `README.md`、`AGENTS.md` 或 `docs/**` 對應檔案。沒同步的 PR 會被 `docs-sync-check` 擋下。例外在 PR body / commit message 加 `[skip docs]`（限 typo / 純測試 / build 設定微調）。

純內容變動（`src/content/`、`src/data/policies/`、`public/images/` 等）不在此規則內。

**寫文件時**：禁止把現況數字（篇數、覆蓋率、曝光量、索引率、完成度）寫進 md，一律改成「跑哪道指令去查」。

---

## 常用任務

### 撰寫趨勢文章

收到「撰寫趨勢文章」指令時，依 `docs/news_sop.md` 執行完整 7 步驟流程：

1. **準備** — 讀取 `data/news-automation-config.json` 與去重紀錄 `data/processed-sources.json`
2. **搜尋素材** — 依 config 定義的查詢組，平行執行
2.5. **`pnpm insights`** — 取得 topicCandidates / writingDirectives / siteOptimizations。topicCandidates 併入素材池（話題性維度用 demandScore）；writingDirectives 於撰文時注入；siteOptimizations 列入結尾報告供人工檢視。資料空時略過。
3. **評分與選題** — 五維度加權 → 分組 → **產出 n 份工單，有多少合格素材就寫多少篇**
4. **撰寫文章** — **每份工單各一篇**，用 sub-agent 並行（見下方並行紀律）
4.5. **配圖** — 每篇 1 封面 + 2 內文情境圖，併入該篇撰文 sub-agent 一起做。**先找圖庫、沒有才生成**：打 AI worker `/stock`（`gh auth token` 認證）取圖庫圖；【人物用台灣人】故圖庫圖優先食物/物件/情境、避開明顯非亞洲人臉，非真人不可且圖庫無合適亞洲人物時才走 `/generate-async`（生圖端點內建台灣人鐵律）。封面寫 `heroImage`/`coverAlt`/`coverImageCredit`；內文 2 張用 `![攝影師](full "creditUrl")` 各自獨立成段插進 body 不同小節。每張圖 URL 驗 200、避開已用圖、**嚴禁本地行內圖 `](images/...)`**。細節見 [`editor-images.md`](./docs/playbooks/editor-images.md) 第三、六節。
5. **自動審核** — 每篇獨立審核（build + frontmatter + 內容品質），不通過就修正；連續 3 輪未改善才判定未收斂。每輪的各審核角色也用 sub-agent 並行
6. **更新去重紀錄**
7. **發布** — push `main` 或開 PR

**關鍵要求：不要只寫一篇。** 有多少合格素材就分組成多少篇。步驟 5 全部通過才能進入步驟 6。開出的 PR 應該是可以直接 merge 的狀態。

### 並行紀律（撰稿委員會）

- 步驟 4 撰文與步驟 5 每輪審核都用 sub-agent（`Agent` 工具，`subagent_type=general-purpose`）。
- **一律顯式帶 `model='sonnet'`** — 嚴禁用預設模型，預設會落到 opus（最貴）。純機械性檢查（連結驗 200 / 檔名格式）才可降 `model='haiku'`。
- **在同一則訊息內一次發起多個 sub-agent**（3 篇撰文就一次發 3 個），不要逐一發起等前一個結束。
- 審核的多輪收斂（輪1 → 修稿 → 輪2 → 修稿）本質上是**串行**的：每輪內的多個角色並行，但輪與輪之間必須等修稿完成。這是品質收斂成本，不是並行缺陷，無人值守凌晨跑可接受。

### 重要規則（代理人最常違反的幾條）

- 日期一律台灣時間（UTC+8）
- tags 禁止含 `/`（會導致 build 失敗）
- 禁止聳動用語、具體醫療建議、醫療承諾；使用台灣繁體中文，禁中國用語
- 修改程式碼前必須先讀取完整檔案
- **⭐ 選題第一順位＝「能贏的文章模子」**：撰寫或改寫任何文章前先讀 `docs/playbooks/winning-article-formula.md`。題目必須同時具備六基因（單一具體決定／「現在」觸發點／台灣在地限定／權威站沒寫的角度／切身後果／答案先行＋範圍狠收），否則會退化成排不上去的百科泛論。互動與 cron 自動撰稿都適用。
- **🚫 禁止模板化第一人稱開頭與 AI 感句型**：開頭第一句直接給具體價值（數據、明確主張、具體情境），每篇都要不一樣。在 YMYL 健康類，這些指紋會被 Google 判為 AI 量產而拒絕索引。發布前必跑 `pnpm check:content`，命中 `ai-phrase` 一律改掉。句型清單見 `docs/content-guide.md`「鐵則」。
- **來源連結一律寫進 frontmatter 結構化 `references`**（每筆 `{title, type, url}`，`url` 可點），不可只放在 body 文字；每篇至少 1 筆含 `url`（或具 `sourceUrl`/`pmid`），否則 `pnpm check:news` gate 會擋下部署。真的暫無來源才設 `sourcePending:true` + `sourcePendingReason`。
- Schema 定義在 `src/content.config.ts`
- **動手前掃 `docs/pitfalls.md`**，特別是「內容撰寫」「排程與可見性」「自動化與 token」三節

完整 SOP：`docs/news_sop.md`；prompt 架構與把關：`docs/news-prompt-architecture.md`。
