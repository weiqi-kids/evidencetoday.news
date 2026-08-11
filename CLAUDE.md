# 本日有據 Evidence Today — 專案指令

健康議題編輯平台「把健康議題講得有根據，也講得讓人看得懂」。
本檔是**每次 session 必讀的指令層**：只放「規則」與「去哪裡找」，不放專案現況。

- 網站：https://evidencetoday.news ｜ Repo（public）：https://github.com/weiqi-kids/evidencetoday.news
- 技術棧：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 套件管理器：**pnpm**（不是 npm）
- 部署：GitHub Pages，push `main` 自動觸發（build → Pagefind 索引 → 連結檢查 → 部署）

---

## ⛔ 本檔的寫作規則（改本檔或任何 docs 前先讀）

1. **禁止把「現況」寫進文件**：篇數、覆蓋率、曝光量、排名、索引率、完成度、進度百分比、「目前有 N 篇」「已完成 M/N」——一律不准寫成文字，改成「跑哪一道指令去查」。數字寫進 md 的當下就開始腐爛，後來的人（含 AI agent）會照過期數字做決策。
2. **例外只有一種**：規格常數（斷點 640/768/1024/1280、字級下限 18px、OG 尺寸 1200x630 這類「規則本身就是那個數字」的）。判準是「它會不會隨時間變動」——會變的是現況，不變的是規格。
3. **一件事只寫在一個地方**：本檔只放高訊號規則與路由。SOP、頁面規則、踩坑紀錄、運維細節各有其檔，不在本檔展開。
4. **不同類別的事不混在同一段講**：內容規則歸內容、版面規則歸版面、運維歸運維。

---

## 你是來做哪一種維護？（先對號入座）

> 本專案維護分兩種情境。**先判斷自己屬於哪一種，再照該情境的入口走。** 三份入口文件（`CLAUDE.md` / `README.md` / `AGENTS.md`）此區塊內容一致，不論先讀到哪一份都該得到相同分流。

### 🛠️ A. 開發維護 — 改程式 / 版面 / CI / 效能
動到 `src/`（元件/版面/樣式/工具/路由邏輯）、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`content.config.ts`、`package.json`。

1. 先 `pnpm build` 立基線（確認動手前是綠的）
2. **查「任務索引」找對應 playbook**，照其「鎖定參數/修改流程/常見陷阱/驗證清單」走
3. 守「硬規則」＋ `docs/playbooks/css-rwd.md`
4. 改完 `pnpm build` 零錯誤 → **同步文件**（硬規則 1，否則 `docs-sync-check` fail）
- 主檔：本檔「任務索引」、`README.md`、`docs/playbooks/*`、`docs/architecture.md`

### 📝 B. 內容與曝光 — 加內容 / 選題 / 看流量 / 自動發文
動到 `src/content/`、`src/data/policies/`、`public/images/`（不觸發 docs-sync）。

1. **session 一開始先 `pnpm perf`**（見下方「§ session 啟動行為」）
2. 要做數據驅動選題再 `pnpm insights`
3. 依內容類型找 playbook：一般內容 → `docs/content-guide.md`；趨勢新聞自動化 → `docs/news_sop.md` + `AGENTS.md`；曝光/選題寫法 → `docs/playbooks/audience-insights.md`、`analytics.md`；站外權威/GEO → `docs/playbooks/geo-offsite.md`
4. 發布：push `main` 自動部署
- 主檔：`docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/{audience-insights,analytics,geo-offsite,news-article,editor-*}.md`

---

## 硬規則（違反會擋 PR 或弄壞站）

1. **改功能 = 同步文件**。動到 `src/components|layouts|pages(.astro/.ts/.svelte)|styles|lib|utils`、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`src/content.config.ts`、`package.json`(scripts/deps) 任一路徑，**必須同時**更新 `README.md` 或 `docs/**` 對應檔，否則 CI `docs-sync-check` fail。例外才加 `[skip docs]`（限 typo / 純測試 / build 設定微調）。純內容變動（`src/content/`、`src/data/policies/`、`public/images/`）不在此規則內。
2. **改碼前先讀完整檔案**，先分析問題流程，禁止 trial-and-error。
3. **改任何東西先找對應 playbook**（見「任務索引」），照其「鎖定參數 / 修改流程 / 常見陷阱 / 驗證清單」走。
4. **日期一律台灣時間（UTC+8）**。遠端 agent 預設 UTC，需明確指示 +8。
5. **tags 禁止含 `/`**（會導致 build 失敗）。
6. **內容禁止幽靈圖片引用** `![...](images/N.png|svg)`：本站慣例不用行內圖，Rollup 無法解析會讓全站 build 失敗。
7. 語言用台灣繁體中文，禁中國用語；禁聳動用語、具體醫療建議、醫療承諾。
8. **禁 AI 量產寫法**（YMYL 致命傷，違反會被 Google 拒絕索引）：禁模板化第一人稱開頭、禁 AI 感句型。守門＝`pnpm check:content`，寫／改內容後必跑到全綠。細則與句型清單見 `docs/content-guide.md`「鐵則」。
9. 不得把網站改成商城 / 診所 / 產品頁 / 政府宣導頁 / AI 模板站；圖像不得自動加十字架元素（除非明確要求）。
10. **免責與揭露：一頁一次、放角落、降彩度、絕不重複**。通用醫療免責只在頁尾一處，禁止在 MDX 內文自己再寫一次；字級不得低於 `var(--text-meta)`，低干擾靠降彩度與位置達成，不靠縮字。細節見 `docs/playbooks/legal-notices.md`。
11. **使用者交付的內容，預設「已經醫療審閱過」**，直接執行掛署名，不要再叫使用者去問醫師。流程見 `docs/playbooks/medical-review.md`。
12. **前台讀 collection 一律用 `isPublicEntry(data)`**，禁裸 `!data.draft`（排程稿會提前洩全文）。
13. **禁跨頁樣板**：同一段文字（frontmatter 欄位值或正文段落）不得在 5 篇以上逐字相同。守門＝`pnpm check:boilerplate`（已接進 `pnpm build`）。判準不是「寫得好不好」，是「這句話對這一頁成不成立」——一段話如果 20 篇都適用，那它對這 20 篇都沒有資訊量。改法是刪掉或換成只有這一篇成立的內容，不是改幾個字繞過。渲染端用 `src/utils/boilerplate.ts` 的 `dropIfBoilerplate` / `filterBoilerplateItems` 過濾。
14. **頁型必須有站內出口**：每個內容頁型的站內出站連結中位數 ≥2，零出口頁 ≤10%。守門＝`pnpm check:site`（CI 已接）。樣板連結（`/disclosure/` 等每頁都有的）與資產連結不算出口。
15. `pnpm build` 零錯誤才算通過。

---

## 常用指令

```bash
# — 開發 / 建置 —
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 開發伺服器 localhost:4321
pnpm build          # 建置至 dist/（會先跑 check:design + check:content + check:boilerplate）
pnpm preview        # 預覽建置結果
pnpm test           # vitest

# — 品質 gate（提交前）—
pnpm check:content      # 去 AI 味守門，掃相對 origin/main 變動檔（= 別名 content:audit）
pnpm check:content:all  # 全站去 AI 味盤點（恆 exit 0，人工普查用）
pnpm check:myths        # 闢謠內容品質 gate（發布 myths 前必跑）
pnpm check:news         # 趨勢新聞來源連結 gate（CI 已接）
pnpm check:design       # 設計規範守門 v2（pnpm build 自動先跑）
pnpm check:schedule     # 發文排程健檢：破洞擋、跑道不足警告
pnpm check:site         # 全站結構守門（掃 dist/：頁型站內出口、唯一 h1、canonical/JSON-LD、sitemap 與 noindex 一致、死連結）
pnpm check:boilerplate  # 跨檔樣板守門（欄位成批複製、正文跨檔重複率；pnpm build 自動先跑）
```

---

## § 查現況一律用指令（禁止憑記憶或憑文件裡的數字回答）

被問到「現在有幾篇 / 表現如何 / 排到哪天 / 索引了沒」時，**先跑指令再回答**：

| 想知道什麼 | 跑哪道指令 | 詳解 |
|---|---|---|
| 各類型篇數、已公開/排程中/草稿/送審中、已掛審閱署名、最後排程日 | `pnpm stats` | `scripts/content-stats.mjs` |
| 排程有沒有破洞、跑道剩幾天 | `pnpm check:schedule` | `docs/content-guide.md` |
| 曝光 / 點擊 / 排名 / 流量來源（近 28 天） | `pnpm perf` | `docs/playbooks/audience-insights.md` |
| Google 索引涵蓋率、哪些頁沒被收錄 | `pnpm index:coverage`（**看依發布月份的分佈，不要只看總數**；最近一兩個月偏低是正常的，舊月份偏低才是品質訊號） | `docs/playbooks/analytics.md` |
| 選題候選、寫作指令、站內優化建議 | `pnpm insights` | `docs/playbooks/audience-insights.md` |
| Google 資料權限有沒有掉 | `pnpm check:google` | `docs/setup-google-data-access.md` |
| cron 自動化跑得如何、有沒有撞限額 | `/etn-cron`（= `ops/cron-status.sh`） | `ops/README.md` |
| 逐篇醫療審閱進度 | 讀 `docs/medical-review-queue.md` | `docs/playbooks/medical-review.md` |

`pnpm perf` / `insights` / `index:coverage` 需要 gcloud token；失敗不擋工作，說明一聲改用其他來源續行。

---

## § session 啟動行為（每次開工先做）

1. **檢查 `docs/reminders.md`**：有到期項就主動提醒使用者，未到期不必提（避免噪音）。
2. **內容／經營類 session（分流 B）先跑 `pnpm perf`**，據此給經營建議再進入任務。純開發／改碼 session（分流 A）不需要（省 gcloud token；另有 `perf-report` cron 定期產報告）。
   - 建議聚焦：① 排名在第一頁邊緣、小幅優化即可前進的查詢；② 有曝光牽引力、值得擴寫的主題叢集；③ 流量趨勢與 AI 導流（referrer）變化；④ 舊→新 slug 改名後的索引回補狀況。
   - 數據極低時建議偏「衝索引／權威」（見 `docs/playbooks/geo-offsite.md`）而非站內微調。

---

## 任務索引（先找 playbook 再動手）

### 內容
| 任務 | 看哪份 |
|---|---|
| ⭐ 選題／寫新文章前先讀（能贏的文章模子·六基因；含 queryPattern 的索引率與曝光產出對照） | `docs/playbooks/winning-article-formula.md` |
| 新增/修改/刪除 文章·闢謠·成分解析·Podcast·短影音·趨勢新聞 | `docs/content-guide.md` |
| 撰寫趨勢新聞（自動化 SOP / 7 步驟） | `docs/news_sop.md`、`AGENTS.md`「撰寫趨勢文章」 |
| 文章配圖（封面＋內文情境圖／圖庫優先） | `docs/playbooks/editor-images.md` |
| 健康專題（topic hub） | `docs/playbooks/topic-hubs.md` |
| 醫療審閱署名（掛 `reviewer`） | `docs/playbooks/medical-review.md` |
| 免責 / 揭露 / 審閱者署名的呈現規範 | `docs/playbooks/legal-notices.md` |

### 版面 / 視覺
| 任務 | 看哪份 |
|---|---|
| CSS / RWD 規範、設計規範 v2 六條 | `docs/playbooks/css-rwd.md` |
| 改 design tokens（顏色/字體/間距） | `docs/playbooks/design-tokens.md` |
| 改文章/闢謠/成分解析排版（Article.astro variant） | `docs/playbooks/article-layout.md` |
| 改導覽列 TopNav | `docs/playbooks/topnav.md` |
| 改首頁 / Hero | `docs/playbooks/home-hero.md` |
| 改/新增 d3 圖表 | `docs/playbooks/d3-charts.md` |
| Corporate Identity / 視覺一致性 | `docs/brand-guidelines.md`、`docs/ci-audit-checklist.md` |

### 前台頁面規則（各分類自己的規矩）
| 任務 | 看哪份 |
|---|---|
| /about 與主編頁定位 | `docs/page-rules/about-and-editor.md` |
| /myths 列表與單篇 | `docs/page-rules/myths.md` |
| /ingredients 成分解析 | `docs/page-rules/ingredients.md` |
| /podcasts 頻道與單集 | `docs/page-rules/podcasts.md` |
| /videos 短影音 | `docs/page-rules/videos.md` |
| /news 趨勢文章結構與前台 | `docs/playbooks/news-article.md` |
| SEO meta / JSON-LD / RSS / OG / AEO | `docs/page-rules/seo-and-feeds.md` |

### 架構 / 運維 / 數據
| 任務 | 看哪份 |
|---|---|
| 新增 Content Collection 類型 | `docs/playbooks/new-content-type.md` |
| 串接外部 API（YouTube / PubMed / WebSearch） | `docs/playbooks/external-apis.md` |
| CI/CD 與 deploy.yml、字型子集化 | `docs/playbooks/ci-cd.md` |
| 架構 / SEO / AEO / 無障礙總覽 | `docs/architecture.md` |
| GA4/GSC 數據驅動選題與寫法 | `docs/playbooks/audience-insights.md` |
| GA4/GSC 分析腳本與報表 | `docs/playbooks/analytics.md` |
| 站外權威 / GEO / LLM 推薦曝光 | `docs/playbooks/geo-offsite.md` |
| 每日自我優化迴圈 | `docs/playbooks/daily-optimize.md` |
| cron 自動化 / 帳號分工 / token 紀律 | `ops/README.md` |

---

## 別再踩同一個坑

**動手前先掃 `docs/pitfalls.md`**（分類記錄：內容撰寫 / 排程與可見性 / 版面樣式 / 資料判讀 / 自動化與 token / 資產產出）。每一條都是實際壞過一次才寫下來的。

---

## 文件地圖

| 層級 | 檔案 | 放什麼 |
|---|---|---|
| 入口 | `CLAUDE.md` / `README.md` / `AGENTS.md` | 分流、硬規則、指令、任務索引 |
| 內容 | `docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/winning-article-formula.md` | 怎麼寫、怎麼選題 |
| 頁面 | `docs/page-rules/*` | 各分類前台頁面的維護規矩 |
| 任務 | `docs/playbooks/*` | 「我要改 X」的操作手冊 |
| 架構 | `docs/architecture.md`、`docs/superpowers/specs/*` | 系統設計與規格 |
| 運維 | `ops/README.md` | cron、帳號、token 紀律 |
| 紀錄 | `docs/pitfalls.md`、`docs/reminders.md`、`docs/roadmap.md`、`docs/audits/*` | 踩坑、到期提醒、待辦、稽核 |
