# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push `main` 自動部署）
- 套件管理器：**pnpm**（不是 npm）

---

## 你是來做哪一種維護？（先對號入座）

> 本專案維護分兩種情境。**先判斷自己屬於哪一種，再照該情境的入口走。** 三份入口文件（`CLAUDE.md` / `README.md` / `AGENTS.md`）此區塊內容一致，不論先讀到哪一份都該得到相同分流。

### 🛠️ A. 開發維護 — 改程式 / 版面 / CI / 效能
動到 `src/`（元件/版面/樣式/工具/路由邏輯）、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`content.config.ts`、`package.json`。

1. 先 `pnpm build` 立基線（確認動手前是綠的）
2. **查下方「任務索引」找對應 playbook**，照其「鎖定參數/修改流程/常見陷阱/驗證清單」走
3. 守「修改紀律」＋ [`docs/playbooks/css-rwd.md`](./docs/playbooks/css-rwd.md)
4. 改完 `pnpm build` 零錯誤 → **同步文件**（否則 `docs-sync-check` fail）
- 主檔：本檔「任務索引」、`docs/playbooks/*`、`docs/architecture.md`

### 📝 B. 內容與曝光 — 加內容 / 選題 / 看流量 / 自動發文
動到 `src/content/`、`src/data/policies/`、`public/images/`（不觸發 docs-sync）。

1. **session 一開始先 `pnpm perf`**（近 28 天 GA4+GSC 曝光快照，給經營建議）
2. 要做數據驅動選題再 `pnpm insights`
3. 依內容類型找 playbook：一般內容 → `docs/content-guide.md`；趨勢新聞自動化 → `docs/news_sop.md` + `AGENTS.md`；曝光/選題寫法 → `docs/playbooks/audience-insights.md`、`docs/playbooks/analytics.md`；站外權威/GEO → `docs/playbooks/geo-offsite.md`
4. 發布：push `main` 自動部署
- 主檔：`docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/{audience-insights,analytics,geo-offsite,news-article,editor-*}.md`

---

## 快速開始

```bash
# — 開發 / 建置 —
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 開發伺服器 localhost:4321
pnpm build          # 建置至 dist/（prebuild 跑 sync:youtube + used-images；build 先跑 check:design + check:content + check:boilerplate）
pnpm preview        # 預覽建置結果
pnpm test           # vitest

# — 品質 gate（提交前）—
pnpm check:content      # 去 AI 味守門，掃相對 origin/main 變動檔（= 別名 content:audit）
pnpm check:content:all  # 全站去 AI 味盤點（恆 exit 0，人工普查用）
pnpm check:myths        # 闢謠內容品質 gate（發布 myths 前必跑）
pnpm check:news         # 趨勢新聞來源連結 gate（CI 已接）
pnpm check:design       # 設計規範守門 v2（pnpm build 自動先跑）
pnpm check:schedule     # 發文排程健檢：破洞（擋）與跑道不足（警告）
pnpm check:site         # 全站結構守門（掃 dist/：頁型站內出口、唯一 h1、canonical/JSON-LD、sitemap 與 noindex 一致、死連結）
pnpm check:boilerplate  # 跨檔樣板守門（欄位成批複製、正文跨檔重複率；pnpm build 自動先跑）
```

## 查站況（唯讀，一律用指令查，不要憑文件裡的數字）

```bash
pnpm stats           # 各類型篇數／已公開／排程中／草稿／審閱署名覆蓋／最後排程日
pnpm check:schedule  # 排程破洞與跑道
pnpm perf            # 近 28 天 GA4+GSC 效能快照（需 gcloud token）
pnpm insights        # GA4/GSC 驅動選題（吐三桶 JSON 給新聞管線）
pnpm index:coverage  # Google 索引涵蓋率
pnpm check:google    # Google 資料存取權限自檢
```

> 情境 B（內容與曝光）每個 session 建議**先跑 `pnpm perf`** 再決定選題；認證設定見 [`docs/playbooks/audience-insights.md`](./docs/playbooks/audience-insights.md)。

---

## 修改紀律（必讀）

**功能改動必須同步文件。** 動到以下任一路徑：

- `src/components/`、`src/layouts/`、`src/styles/`、`src/lib/`、`src/utils/`
- `src/pages/` 內的 `.astro` / `.ts` / `.svelte`
- `scripts/`、`.github/workflows/`
- `astro.config.mjs`、`src/content.config.ts`、`package.json` 的 scripts/dependencies
- `ops/*.sh`（對應文件是 `ops/README.md`）

…就**必須同時更新** `README.md`、`AGENTS.md` 或 `docs/` 內對應檔案。沒有同步 → CI `docs-sync-check` 會 fail，PR 無法合併。例外請在 PR body 或 commit message 加 `[skip docs]`（限 typo / 純測試 / build 設定微調）。

純內容變動（`src/content/`、`src/data/policies/`、`public/images/` 等）不在此規則內。

**寫文件時的規則**：不要把「現況數字」寫進 md（篇數、覆蓋率、曝光量、索引率、完成度）。這類資訊一律改成「跑哪道指令去查」——寫死的數字隔天就過期，後來的人會照著它做錯決策。例外只有規格常數（斷點值、字級下限、OG 尺寸這類「規則本身就是那個數字」的）。

---

## 任務索引

> 改任何東西**先找到對應 playbook** 再動手。每個 playbook 列出「鎖定參數、修改流程、常見陷阱、驗證清單」。

### 內容

| 任務 | 看哪份 |
|---|---|
| ⭐ 選題／寫新文章前先讀（能贏的文章模子·六基因） | [docs/playbooks/winning-article-formula.md](./docs/playbooks/winning-article-formula.md) |
| 新增 / 修改 / 刪除 各類內容 | [docs/content-guide.md](./docs/content-guide.md) |
| 撰寫趨勢新聞 SOP（自動化排程） | [docs/news_sop.md](./docs/news_sop.md)、[AGENTS.md](./AGENTS.md)「撰寫趨勢文章」 |
| 內容區塊結構（AEO 自然段落 / FAQ 規範） | [docs/content-guide.md](./docs/content-guide.md)「內容區塊結構」 |
| 文章配圖（封面＋內文情境圖／圖庫優先） | [docs/playbooks/editor-images.md](./docs/playbooks/editor-images.md) |
| 健康專題（topic hub） | [docs/playbooks/topic-hubs.md](./docs/playbooks/topic-hubs.md) |
| 文章骨架 / MDX 文件 / lint（編輯器系列） | [editor-spine.md](./docs/playbooks/editor-spine.md)、[editor-mdx-doc.md](./docs/playbooks/editor-mdx-doc.md)、[editor-lint.md](./docs/playbooks/editor-lint.md) |
| 醫療審閱署名（掛 `reviewer`） | [docs/playbooks/medical-review.md](./docs/playbooks/medical-review.md) |
| 免責 / 揭露 / 署名的呈現規範 | [docs/playbooks/legal-notices.md](./docs/playbooks/legal-notices.md) |

### 排版 / 視覺

| 任務 | 看哪份 |
|---|---|
| CSS / RWD 規範、設計規範 v2 六條 | [docs/playbooks/css-rwd.md](./docs/playbooks/css-rwd.md) |
| 改 design tokens（顏色 / 字體 / 間距） | [docs/playbooks/design-tokens.md](./docs/playbooks/design-tokens.md) |
| 改文章 / 闢謠 / 成分解析排版（Article.astro variant） | [docs/playbooks/article-layout.md](./docs/playbooks/article-layout.md) |
| 改導覽列 TopNav | [docs/playbooks/topnav.md](./docs/playbooks/topnav.md) |
| 改首頁 / Hero | [docs/playbooks/home-hero.md](./docs/playbooks/home-hero.md) |
| 改 / 新增 d3 圖表 | [docs/playbooks/d3-charts.md](./docs/playbooks/d3-charts.md) |
| Corporate Identity / 視覺一致性 | [docs/brand-guidelines.md](./docs/brand-guidelines.md)、[docs/ci-audit-checklist.md](./docs/ci-audit-checklist.md) |

### 前台頁面規則（各分類自己的規矩）

| 頁面 | 看哪份 |
|---|---|
| `/about` 與主編頁 | [docs/page-rules/about-and-editor.md](./docs/page-rules/about-and-editor.md) |
| `/myths` 闢謠 | [docs/page-rules/myths.md](./docs/page-rules/myths.md) |
| `/ingredients` 成分解析 | [docs/page-rules/ingredients.md](./docs/page-rules/ingredients.md) |
| `/podcasts` Podcast | [docs/page-rules/podcasts.md](./docs/page-rules/podcasts.md) |
| `/videos` 短影音 | [docs/page-rules/videos.md](./docs/page-rules/videos.md) |
| `/news` 趨勢新聞 | [docs/playbooks/news-article.md](./docs/playbooks/news-article.md) |
| SEO meta / JSON-LD / RSS / OG / AEO | [docs/page-rules/seo-and-feeds.md](./docs/page-rules/seo-and-feeds.md) |

### 整合 / 運維 / 數據

| 任務 | 看哪份 |
|---|---|
| 新增 Content Collection 類型 | [docs/playbooks/new-content-type.md](./docs/playbooks/new-content-type.md) |
| 串接外部 API（YouTube / PubMed / WebSearch） | [docs/playbooks/external-apis.md](./docs/playbooks/external-apis.md) |
| `reader-index.json` / 文章頁 ReadingBeacon（餵 LINE 官方帳號推薦後端） | [docs/playbooks/reader-index-and-beacon-contract.md](./docs/playbooks/reader-index-and-beacon-contract.md) |
| CI/CD、deploy.yml、字型子集化 | [docs/playbooks/ci-cd.md](./docs/playbooks/ci-cd.md) |
| 架構 / SEO / AEO / 無障礙總覽 | [docs/architecture.md](./docs/architecture.md) |
| GA4/GSC 數據驅動選題與寫法 | [docs/playbooks/audience-insights.md](./docs/playbooks/audience-insights.md) |
| GA4/GSC 分析腳本與報表 | [docs/playbooks/analytics.md](./docs/playbooks/analytics.md) |
| 站外權威 / GEO / LLM 推薦曝光 | [docs/playbooks/geo-offsite.md](./docs/playbooks/geo-offsite.md) |
| 每日自我優化迴圈 | [docs/playbooks/daily-optimize.md](./docs/playbooks/daily-optimize.md) |
| news 發文頻率評估 | [docs/playbooks/news-cadence-review.md](./docs/playbooks/news-cadence-review.md) |
| cron 自動化 / 帳號分工 / token 紀律 | [ops/README.md](./ops/README.md) |

---

## 專案結構

```
src/
  content.config.ts          # Content Collections schema（6 種類型 Zod 驗證）
  content/                   # articles / myths / ingredients / podcasts / videos / news
  components/
    ui/                      # 原子元件（Button, Badge, CategoryTag 等）
    blocks/                  # 區塊元件（各類 Card, FaqAccordion, ShareButtons 等）
    charts/                  # d3.js Svelte 互動元件
    seo/                     # JsonLd 結構化資料
  layouts/
    Base.astro               # HTML shell（meta/OG/fonts/skip-to-content）
    Article.astro            # 文章 / 闢謠 / 成分解析（prose vs cards variant）
    Media.astro              # Podcast / 短影音
    List.astro               # 列表頁
    Policy.astro             # 政策頁
  pages/                     # 路由
  styles/
    variables.css            # oklch design tokens + 字體/字級階梯（唯一可寫顏色處）
    global.css               # typography 變數 + reset + prose + container + RWD fixes
  utils/                     # 共用工具（visibility / schema-org / social-meta 等）
public/                      # 靜態資源（CNAME、favicon、images、og-static）
data/
  news-automation-config.json  # 趨勢新聞搜尋查詢
  processed-sources.json       # 去重追蹤
scripts/                     # 建置前後處理、品質 gate、數據抓取
ops/                         # cron 自動化（bootstrap / claude-run / 各 job）
docs/                        # 見下方文件索引
```

---

## 發佈流程

```
1. 本地新增 / 編輯內容
2. pnpm dev                    → 本地預覽確認
3. pnpm build                  → 零錯誤（gate 全綠）
4. git add . && git commit
5. git push origin main        → 觸發自動部署
```

GitHub Actions 自動執行：build → Pagefind 索引 → 連結檢查 → 部署。
部署狀態：https://github.com/weiqi-kids/evidencetoday.news/actions

---

## 文件索引

| 層級 | 文件 | 放什麼 |
|---|---|---|
| 入口 | `CLAUDE.md` / `README.md` / `AGENTS.md` | 分流、硬規則、指令、任務索引 |
| 內容 | [docs/content-guide.md](./docs/content-guide.md) | 內容維護指南（新增 / 修改 / 刪除各類內容） |
| 內容 | [docs/news_sop.md](./docs/news_sop.md)、[docs/news-prompt-architecture.md](./docs/news-prompt-architecture.md) | 趨勢新聞自動化 SOP 與 prompt 架構 |
| 內容 | [docs/playbooks/winning-article-formula.md](./docs/playbooks/winning-article-formula.md) | 能贏的文章模子（選題方法論） |
| 頁面 | [docs/page-rules/](./docs/page-rules/) | 各分類前台頁面的維護規矩 |
| 任務 | [docs/playbooks/](./docs/playbooks/) | 「我要改 X」的操作手冊 |
| 架構 | [docs/architecture.md](./docs/architecture.md) | 架構、SEO / AEO、無障礙、CI/CD 總覽 |
| 架構 | [docs/superpowers/specs/](./docs/superpowers/specs/) | 完整設計規格、新聞自動化技術設計 |
| 品牌 | [docs/brand-guidelines.md](./docs/brand-guidelines.md)、[docs/ci-audit-checklist.md](./docs/ci-audit-checklist.md) | CI 使用規範與視覺一致性檢查 |
| 運維 | [ops/README.md](./ops/README.md) | cron、帳號分工、token 紀律 |
| 紀錄 | [docs/pitfalls.md](./docs/pitfalls.md) | 踩過的坑（分類） |
| 紀錄 | [docs/reminders.md](./docs/reminders.md) | 到期提醒（session 啟動時掃） |
| 紀錄 | [docs/roadmap.md](./docs/roadmap.md) | 待辦 / 可迭代項目 |
| 紀錄 | [docs/medical-review-queue.md](./docs/medical-review-queue.md)、[docs/audits/](./docs/audits/) | 審閱進度、稽核報告 |
