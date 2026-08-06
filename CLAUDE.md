# 本日有據 Evidence Today — 專案指令

健康議題編輯平台「把健康議題講得有根據，也講得讓人看得懂」。
本檔為**每次 session 必讀的高訊號指令層**；詳細參考見 `README.md` 與 `docs/`。

- 網站：https://evidencetoday.news ｜ Repo（public）：https://github.com/weiqi-kids/evidencetoday.news
- 技術棧：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 套件管理器：**pnpm**（不是 npm）
- 部署：GitHub Pages，push `main` 自動觸發（build → Pagefind 索引 → 連結檢查 → 部署）

---

## 你是來做哪一種維護？（先對號入座）

> 本專案維護分兩種情境。**先判斷自己屬於哪一種，再照該情境的入口走。** 三份入口文件（`CLAUDE.md` / `README.md` / `AGENTS.md`）此區塊內容一致，不論先讀到哪一份都該得到相同分流。

### 🛠️ A. 開發維護 — 改程式 / 版面 / CI / 效能
動到 `src/`（元件/版面/樣式/工具/路由邏輯）、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`content.config.ts`、`package.json`。

1. 先 `pnpm build` 立基線（確認動手前是綠的）
2. **查「任務索引」找對應 playbook**，照其「鎖定參數/修改流程/常見陷阱/驗證清單」走
3. 守「硬規則」＋「CSS/RWD 規範」
4. 改完 `pnpm build` 零錯誤 → **同步文件**（硬規則 1，否則 `docs-sync-check` fail）
- 主檔：本檔「任務索引」、`README.md`、`docs/playbooks/*`、`docs/architecture.md`

### 📝 B. 內容與曝光 — 加內容 / 選題 / 看流量 / 自動發文
動到 `src/content/`、`src/data/policies/`、`public/images/`（不觸發 docs-sync）。

1. **session 一開始先 `pnpm perf`**（近 28 天 GA4+GSC 曝光快照，給經營建議；見下方「§ session 啟動行為」）
2. 要做數據驅動選題再 `pnpm insights`（吐三桶 JSON）
3. 依內容類型找 playbook：一般內容 → `docs/content-guide.md`；趨勢新聞自動化 → `docs/news_sop.md` + `AGENTS.md`；曝光/選題寫法 → `docs/playbooks/audience-insights.md`、`analytics.md`；站外權威/GEO → `docs/playbooks/geo-offsite.md`
4. 發布：push `main` 自動部署
- 主檔：`docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/{audience-insights,analytics,geo-offsite,news-article,editor-*}.md`

---

## 硬規則（違反會擋 PR 或弄壞站）

1. **改功能 = 同步文件**。動到 `src/components|layouts|pages(.astro/.ts/.svelte)|styles|lib|utils`、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`src/content.config.ts`、`package.json`(scripts/deps) 任一路徑，**必須同時**更新 `README.md` 或 `docs/playbooks/*.md` 對應檔，否則 CI `docs-sync-check` fail。例外才加 `[skip docs]`（限 typo / 純測試 / build 設定微調）。純內容變動（`src/content/`、`src/data/policies/`、`public/images/`）不在此規則內。
2. **改碼前先讀完整檔案**，先分析問題流程，禁止 trial-and-error。
3. **改任何東西先找對應 playbook**（見下方任務索引），照其「鎖定參數 / 修改流程 / 常見陷阱 / 驗證清單」走。
4. **日期一律台灣時間（UTC+8）**。遠端 agent 預設 UTC，需明確指示 +8。
5. **tags 禁止含 `/`**（如 `ME/CFS` 會導致 build 失敗）。
6. **內容禁止幽靈圖片引用** `![...](images/N.png|svg)`：本站慣例不用行內圖，Rollup 無法解析會讓全站 build 失敗。
7. 語言用台灣繁體中文，禁中國用語；禁聳動用語、具體醫療建議、醫療承諾。
7a. **禁 AI 量產寫法（YMYL 致命傷，違反會被 Google 拒絕索引）**：禁模板化第一人稱開頭「我一直覺得／我最近／老實講／朋友最常問我／我發現／我觀察」（開頭第一句直接給具體價值，每篇都要不同）；禁 AI 感句型「不是…而是／不只是…更是／換句話說／真正的問題是」。守門＝統一引擎 `scripts/check-content.mjs`（2026-07-21 取代舊 `audit-ai-tone.mjs`）：`pnpm check:content`（= 相容別名 `pnpm content:audit`）掃變動檔、`pnpm check:content:all` 全站盤點；已串進 `pnpm build`（`check-design && check-content && astro build`），提交前即擋。寫／改內容後必跑到全綠。細節見 `docs/content-guide.md`「鐵則」。
8. 不得把網站改成商城 / 診所 / 產品頁 / 政府宣導頁 / AI 模板站；圖像不得自動加十字架元素（除非明確要求）。
8a. **免責與揭露：一頁一次、放角落、降彩度、絕不重複**。通用醫療免責**只在頁尾一處**（`Article.astro` 的 `showMedicalDisclaimer` 預設 `false`）；**禁止在 MDX 內文自己再寫一次免責句**；揭露類文字只放一行連到 `/disclosure`，完整條文寫在政策頁。字級不得低於 `var(--text-meta)`（設計規範 ⑥ 擋，且無更小級距），低干擾靠**降彩度與位置**達成，不靠縮字。醫療審閱者署名極簡（`審閱：姓名＋職稱`，無圖示無徽章），且**審閱者＝作者時不顯示**。細節見 `docs/playbooks/legal-notices.md`。
9. `pnpm build` 零錯誤才算通過。

---

## 常用指令

```bash
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 開發伺服器 localhost:4321
pnpm build          # 建置至 dist/（prebuild 會跑 sync:youtube + used-images）
pnpm preview        # 預覽建置結果
pnpm check:content  # 去 AI 味守門（統一引擎 check-content.mjs，= 別名 content:audit）；掃相對 origin/main 變動檔
pnpm check:content:all  # 全站去 AI 味盤點（恆 exit 0，人工普查用）
pnpm check:myths    # 闢謠內容品質 gate（發布 myths 前必跑）
pnpm check:news     # 趨勢新聞來源連結 gate（每篇須有可點 references/sourceUrl/pmid；CI 已接）
pnpm check:design   # 設計規範守門 v2（pnpm build 自動先跑；六條規則見「CSS / RWD 規範」）
pnpm check:schedule # 發文排程健檢：破洞擋、跑道不足警告（news 只查破洞，見 docs/content-guide.md）
pnpm perf           # 近 28 天 GA4+GSC 效能快照（唯讀，經營決策用；需 gcloud token）
pnpm insights       # GA4/GSC 驅動 /news 選題（吐三桶 JSON 給新聞管線）
```

---

## § session 啟動行為（每次開工先做）

**內容/經營類 session（分流 B）一開始先跑 `pnpm perf` 抓真實 GA4+GSC 數據，據此給「經營建議」再進入任務；純開發/改碼 session（分流 A）不需要**（省 gcloud token，且數據已有每 3 天的 `perf-report` cron 自動產報告）。

- 指令：`pnpm perf`（`scripts/perf-snapshot.mjs`，唯讀、不寫檔；認證見 `docs/playbooks/audience-insights.md` 與記憶 `ga4-insights-auth-setup`）。
- 建議聚焦：① 哪些查詢在第一頁邊緣（排名 5–15）可小幅優化即進前段；② 哪個主題叢集有曝光牽引力、值得擴寫；③ 流量/曝光趨勢與 AI 導流（referrer）變化；④ 舊→新 slug 改名後的索引回補狀況。
- 數據為 0 或極低屬正常（站早期）；此時建議偏「衝索引/權威」（見 `docs/playbooks/geo-offsite.md`）而非站內微調。
- 失敗（無 token/網路）不擋工作：說明一聲、改用既有 GSC/GA4 認知續行。

---

## § 自動化與帳號（cron / headless）

- **兩個帳號分工**：`claude`(dev，lightman 本人) 只做**互動改碼**；**全部 cron 自動化跑營運帳號 `claude-appi`**（=vegeta1260，wrapper 設 `CLAUDE_CONFIG_DIR=~/.claude-appi`），**與 appi.news 共用同一個週限額**——撞限額時 evidencetoday 會一起空跑。
- **排程／日誌／邏輯**：cron 排程在 `/etc/cron.d/evidencetoday`（單檔一專案，**不在** user crontab）、log 在 `/var/log/evidencetoday/<job>.log`、邏輯在 `ops/`（一律經 `bootstrap.sh`→`claude-run.sh`；後者撞限額會寫冷卻旗標，bootstrap 冷卻期內只跳過 claude 型 job、純資料型照跑）。
- **省 token 鐵則**：headless 撰寫派子代理（`Agent` 工具）**一律帶 `model='sonnet'`**，不帶會默默落到 opus（見「踩過的坑」）。
- 看 cron 現況：`/etn-cron`（= `ops/cron-status.sh`，出「名稱/台北時間/模型/現況」表）。權威細節：`ops/README.md`。

---

## 任務索引（先找 playbook 再動手）

| 任務 | 看哪份 |
|---|---|
| ⭐ 選題／寫新文章前先讀（能贏的文章模子·六基因） | `docs/playbooks/winning-article-formula.md` |
| 新增/修改/刪除 文章·闢謠·成分解析·Podcast·短影音·趨勢新聞 | `docs/content-guide.md` |
| 撰寫趨勢新聞（自動化 SOP / 7 步驟） | `docs/news_sop.md`、`AGENTS.md`「撰寫趨勢文章」 |
| 維護趨勢文章結構與前台（/news） | `docs/playbooks/news-article.md` |
| 新增 Content Collection 類型 | `docs/playbooks/new-content-type.md` |
| 改導覽列 TopNav | `docs/playbooks/topnav.md` |
| 改 design tokens（顏色/字體/間距） | `docs/playbooks/design-tokens.md` |
| 改文章/闢謠/成分解析排版（Article.astro variant） | `docs/playbooks/article-layout.md` |
| 改首頁 / Hero | `docs/playbooks/home-hero.md` |
| 改/新增 d3 圖表 | `docs/playbooks/d3-charts.md` |
| 串接外部 API（YouTube / PubMed / WebSearch） | `docs/playbooks/external-apis.md` |
| CI/CD 與 deploy.yml | `docs/playbooks/ci-cd.md` |
| 架構 / SEO / AEO / 無障礙總覽 | `docs/architecture.md` |
| Corporate Identity / 視覺一致性 | `docs/brand-guidelines.md`、`docs/ci-audit-checklist.md` |
| GA4/GSC 數據驅動選題與寫法（audience insights） | `docs/playbooks/audience-insights.md` |
| 每日自我優化迴圈（讀數據→定清單→改既有頁/補競品/衝索引→自動部署） | `docs/playbooks/daily-optimize.md` |

完整設計規格：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`（v1.3）、新聞自動化：`docs/superpowers/specs/2026-05-08-news-automation-design.md`。

---

## 內容類型與架構

- 6 種 Content Collection：`articles` / `myths` / `ingredients` / `podcasts` / `videos` / `news`。Schema（Zod）定義在 `src/content.config.ts`。內容存 repo（Markdown/MDX），不用 CMS。
- 前台命名：成分解析（URL/collection 仍為 `ingredients`，避免大型路由遷移）。
- 文章開頭 AEO 區塊前台統一標題「重點摘要」；不顯示「問題/答案/適用對象/證據基礎/最後更新」欄位標籤。
- Svelte islands：d3 圖表（Hero particles、Evidence Scale、TrendBubbles）、FAQ accordion、TOC scroll spy、Pagefind search。
- OG 圖：每個 collection 一張靜態圖 `public/og-static/*.png`（版本常數 `OG_IMAGE_VERSION`，由 `src/utils/social-meta.mjs` 的 `ogImageForCollection()` 指派）；社群分享不做逐篇差異化。已無 `pnpm og:generate` 指令與 `src/pages/og/[...slug].png.ts` endpoint；satori 相依仍在，`scripts/generate-author-og.ts` 為一次性作者頁 OG 工具。

```
src/
  content.config.ts   # 6 種類型 Zod schema
  content/            # 內容（md/mdx）
  components/{ui,blocks,charts,seo}/
  layouts/            # Base / Article(prose|cards) / Media / List / Policy
  pages/              # 路由
  styles/             # variables.css(oklch tokens) / global.css（typography/rwd-fixes 已併入）
  utils/
data/                 # news-automation-config.json、processed-sources.json
docs/                 # architecture / content-guide / news_sop / playbooks/
```

---

## CSS / RWD 規範（改版面前必讀）

- **斷點只用 4 個，全部 `min-width`（mobile-first）**：sm 640 / md 768 / lg 1024 / xl 1280。禁 `max-width` media query、禁自創斷點、禁同元件混用 min/max。
- **Spacing 用 `clamp()` fluid**，禁止寫死 px 再用 media query 分段覆蓋。
- **Layout 管骨架（grid/sidebar），Page 管皮膚（背景/padding/圓角）**；不要用 `:global()` 覆蓋 layout class，改用 variant prop。
- Article.astro variant：`prose`（白底卡片+雙欄 sidebar，用於 articles/ingredients）、`cards`（透明背景+`max-width:none`，用於 myths）。
- **設計規範 v2（2026-07-20 全站統一，`scripts/check-design.mjs` 守門，`pnpm build` 自動先跑、違規即 fail）六條**：① 禁 px 定 font-size（用 `var(--text-*)`）② 顏色只准出現在 `src/styles/variables.css`（元件用 `var(--color-*)`）③ 禁 `!important`（遷移期遞延中，見 check-design.mjs 檔頭 TODO）④ 禁外部 CDN（@fontsource 自託管不受影響）⑤ css 檔白名單只准 `src/styles/{variables,global}.css`（元件樣式用 scoped `<style>`）⑥ `--text-*` 值一律 ≥18px（1.125rem），clamp() 以最小值計，禁用 token 值開小門繞過（字級階梯定義在 `variables.css`）。另：不得直接改 `variables.css` oklch 色值（4 輪審查定案）。
- 改完 CSS 必在 375px / 768px / 1280px 三寬度確認 + `pnpm build` 零錯誤。

---

## 踩過的坑（避免重蹈）

- tags 含 `/` → build 失敗。
- 內容插入不存在的行內圖 `](images/` → Rollup 解析失敗、全站部署連續 fail。
- Article.astro `cards` variant 曾遺漏 `max-width: none` → blocks 被限制在 68ch。
- myths 單篇版型是**刻意簡化**：只渲染固定區塊，勿再加「更新與更正紀錄」「延伸閱讀」等（playbook 把關，check-myth-quality 掃不到模板層）。**例外：FAQ 是刻意保留的固定區塊**（48 篇 frontmatter 皆手寫 4 組 Q&A，前台渲染 + FAQPage JSON-LD）。2026-07-21 前 `mythsSchema` 漏宣告 `faq` 欄，Zod 靜默剝除 → FAQ 從未顯示、FAQPage 也無法輸出；補欄位後生效，勿再移除。
- **Astro 5 content-layer 快取**：改 `content.schemas.ts` 欄位後，本機 `pnpm build` 可能沿用 `.astro/data-store.json` 舊解析結果（新欄位仍被剝除、前台看不到）。驗證 schema 改動請先 `rm -rf .astro dist` 再 build。CI 每次全新 checkout 無此問題。
- Podcast 連結 slug 一律用 `stripPodcastSlug()`，不可用 `stripExt()`。
- **排程稿可見性只有 HTML 路由套 `isPublicEntry`，`.txt`／RSS／`llms-full.txt`／tags 頁曾只濾 `!data.draft`** → 未來日期排程稿會提前洩全文（2026-07-12 修，全站公開面統一改用 `isPublicEntry`）。新增前台讀 collection 的路由**一律用 `isPublicEntry(data)`，禁裸 `!data.draft`**；`src/utils/visibility.test.ts` 有防回歸測試會擋。
- 遠端 CCR 環境 WebFetch 被沙箱封鎖（PubMed/RSS 403），新聞管線為 WebSearch-only，用 `site:` 定向搜尋。
- **news 排程不可被「拉開節奏」波及**：radar 稿的**檔名與標題都自帶日期**（`radar-2026-08-05-…` ／「健康雷達 2026-08-05」）。2026-08-04 把全站排程從 4 篇/天改成 1 篇/天時，news 一併被拉開 → 標題寫 08-10 的稿被排到 09-28 才發，最遲遲 54 天，等於發一批一上線就過期的新聞。**重排全站排程時 news 必須排除在外，一律回到檔名的名目日期**（見 `docs/playbooks/news-article.md`）。要調整發文量請動 evergreen（articles/ingredients/myths）。
- **跨 collection 比 CTR 會得到相反結論**：各 collection 的平均排名差很多（articles ≈ 5–8、myths ≈ 9–12、ingredients ≈ 15–25），直接比原始 CTR 會把「排名差異」誤讀成「標題爛」。2026-08-04 就這樣誤判過一次，說 ingredients／myths 標題該全面改寫、可換 +35 clicks；用位置校正期望值重算後，達成率其實是 articles 123%、ingredients 87%、myths 52%、news 165%，真正缺口僅約 7 clicks。**談 CTR 一律先做位置校正**（`docs/playbooks/audience-insights.md` 有算法）。
- **OG 圖字型「Bold」曾其實是細體**：`src/assets/fonts/NotoSansTC-Bold-static.ttf` 原檔是可變字型（fvar）直接複製、沒有真的 instance 成 wght=700，satori 渲染時字重等於 Regular（2026-08-04 修，連帶重生 `public/og-static/author-luo-yang.png`）。以後若要更新這兩個 `*-static.ttf`，須用 `fonttools varLib.instancer NotoSansTC-Regular.ttf wght=400/700 -o ...` 產生真正定死權重的靜態實例，不能只是複製可變字型或改檔名；驗證方法：渲染一段 `fontWeight:700` 文字比對是否真的比 400 粗。
- **headless 派子代理不帶 model＝默默用 opus、燒爆額度**：cron orchestrator 雖 `--model sonnet`，但它派出的撰寫/審核 `Agent` 不帶 model 會落到帳號預設 opus。撰寫委員會一律 `model='sonnet'`（見 `AGENTS.md` 並行紀律、`ops/README.md` 鐵則 6）。談「cron 燒 token」先查子代理 model。

---

## ⏰ 到期提醒：news 發文頻率重新評估（約 2026-09-01，每次 session 檢查日期）

**每次 session 若今天 ≥ 2026-09-01，主動提醒使用者做這件事**（未到期則不必提，避免噪音）。

2026-08-05 使用者決定：**發文維持原本節奏（4 篇/天，四類各 1 篇），news 不減量**。理由是趨勢新聞有時效性，壓著不發等於作廢；且當時網站正處陡峭成長期（曝光 118→1,124→4,381，連續三個 28 天），不宜在高峰期亂動結構。同時撤回 2026-08-04 規劃的 news 降頻（門檻已還原 5.0/7.0/6.0，主機 cron 始終是每日、那道 `sed` 從未執行也不該執行）。

**到期要做的評估**：08-05→08-22 這批 72 篇屆時已全數發完並累積約一週數據。跑 `pnpm perf` 與 `pnpm index:coverage`，對照下表判斷 news 是否該減量：

| 指標 | 2026-08-05 基準 | 判讀 |
|---|---|---|
| news 每頁曝光 | 2.8（articles 28.1） | 若仍 <5，減量的理由成立 |
| news 未索引比例 | 33/85（39%） | 若未改善，代表產出未被 Google 採納 |
| 全站曝光趨勢 | 4,381／28 天且仍在加速 | 若仍在成長，優先「別亂動」 |
| news 位置校正 CTR 達成率 | 165%（全站最高） | 這是**反對**減量的證據，別忽略 |

⚠️ 評估時務必先做**位置校正**再談 CTR（見 `docs/playbooks/audience-insights.md`），跨 collection 直接比原始 CTR 會得到相反結論。

## ✅ 醫療審閱者：黃子彥中醫師（SOP 已定案，不要再來回確認）

**🚫 最重要的一條：使用者交付給你的內容，預設「已經黃醫師審閱過」。直接掛 `reviewer: "黃子彥"` 執行，不要再叫使用者去問醫師、不要再確認一次。**

2026-08-06 使用者明確指示：「我之後給你的內容，都已經是黃醫師看過的了，你不要再重複叫我去問他，你這樣會造成工作 SOP 混亂。」先前 CLAUDE.md 寫「每次 session 主動追問審閱進度」，導致每個 session 都去問同一件事——**該指示已撤除**。審閱窗口是使用者，不是你；你的角色是收到指令就執行。

**現況（2026-08-06）**：40 篇已掛署名（第一批 20 + 第二批 20），逐篇進度在 `docs/medical-review-queue.md`。前台顯示「審閱：黃子彥中醫師」連到 `/disclosure`，並輸出 Person 級 `reviewedBy` 含 `hasCredential`（中醫師／衛福部）。

**審閱者資料**：黃子彥，中醫師，中國醫藥大學中西醫學訓練背景，現任社團法人中華民國上醫預防醫學發展協會理事長，另任上一生物醫學研發長。`src/data/authors.ts` 的 `AUTHORS` 已建好。

**掛署名的執行流程**（使用者說「這批審好了」就照做，不必再問）：
1. 對目標檔在 `author:` 下一行插入 `reviewer: "黃子彥"`
2. **先跑 `node scripts/check-content.mjs <檔案>`**——守門會重掃「任何被碰到的檔案全文」，既有內文只因不在 diff 裡而被 grandfather，掛署名的那一刻才會爆。有 ERROR 就同一個 commit 修掉
3. `pnpm build` 零錯誤 → commit → push

⚠️ 兩件已澄清，不要再問或寫錯：①**上一生物醫學是研發公司、無自有產品**（使用者 2026-08-06 確認），無直接商業利益衝突，`/disclosure` 第 3 點保留為保險條款即可，選篇不必迴避保健品題材。②「臺南市立醫院中醫部主任」是**錯誤資訊**，已移除，不要再寫回去。

機制已就緒：`content.schemas.ts` 有 `reviewer` 欄、`articles/[slug].astro:88-91` 已實作「審閱者≠作者才輸出 Person 級 `reviewedBy`」。

---

## 上線前 Blocker — ✅ 已全數完成（2026-06-30 核對）

利益揭露 / 隱私權 / 使用條款 / 聯絡信箱 / Logo（PNG）皆已就位，內容量遠超標（文章 83 / 闢謠 34）。詳見 `README.md`「待補齊項目」。剩餘僅「上線後可迭代」項（editorial-policy 補完整、Logo SVG 版、pathwaySteps、Pagefind 動態載入）。
