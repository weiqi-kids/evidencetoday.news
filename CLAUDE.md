# 本日有據 Evidence Today — 專案指令

健康議題編輯平台「把健康議題講得有根據，也講得讓人看得懂」。
本檔為**每次 session 必讀的高訊號指令層**；詳細參考見 `README.md` 與 `docs/`。

- 網站：https://evidencetoday.news ｜ Repo（public）：https://github.com/weiqi-kids/evidencetoday.news
- 技術棧：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 套件管理器：**pnpm**（不是 npm）
- 部署：GitHub Pages，push `main` 自動觸發（build → Pagefind 索引 → 連結檢查 → 部署）

---

## 硬規則（違反會擋 PR 或弄壞站）

1. **改功能 = 同步文件**。動到 `src/components|layouts|pages(.astro/.ts/.svelte)|styles|lib|utils`、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`src/content.config.ts`、`package.json`(scripts/deps) 任一路徑，**必須同時**更新 `README.md` 或 `docs/playbooks/*.md` 對應檔，否則 CI `docs-sync-check` fail。例外才加 `[skip docs]`（限 typo / 純測試 / build 設定微調）。純內容變動（`src/content/`、`src/data/policies/`、`public/images/`）不在此規則內。
2. **改碼前先讀完整檔案**，先分析問題流程，禁止 trial-and-error。
3. **改任何東西先找對應 playbook**（見下方任務索引），照其「鎖定參數 / 修改流程 / 常見陷阱 / 驗證清單」走。
4. **日期一律台灣時間（UTC+8）**。遠端 agent 預設 UTC，需明確指示 +8。
5. **tags 禁止含 `/`**（如 `ME/CFS` 會導致 build 失敗）。
6. **內容禁止幽靈圖片引用** `![...](images/N.png|svg)`：本站慣例不用行內圖，Rollup 無法解析會讓全站 build 失敗。
7. 語言用台灣繁體中文，禁中國用語；禁聳動用語、具體醫療建議、醫療承諾。
8. 不得把網站改成商城 / 診所 / 產品頁 / 政府宣導頁 / AI 模板站；圖像不得自動加十字架元素（除非明確要求）。
9. `pnpm build` 零錯誤才算通過。

---

## 常用指令

```bash
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 開發伺服器 localhost:4321
pnpm build          # 建置至 dist/（prebuild 會跑 sync:youtube + og:generate）
pnpm preview        # 預覽建置結果
pnpm content:audit  # 掃描內容 AI 感句型 / 模糊引用 / raw enum 外露
pnpm check:myths    # 闢謠內容品質 gate（發布 myths 前必跑）
pnpm og:generate    # 生成 OG 圖至 public/og/（1200x630，不提交 repo）
```

---

## 任務索引（先找 playbook 再動手）

| 任務 | 看哪份 |
|---|---|
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

完整設計規格：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`（v1.3）、新聞自動化：`docs/superpowers/specs/2026-05-08-news-automation-design.md`。

---

## 內容類型與架構

- 6 種 Content Collection：`articles` / `myths` / `ingredients` / `podcasts` / `videos` / `news`。Schema（Zod）定義在 `src/content.config.ts`。內容存 repo（Markdown/MDX），不用 CMS。
- 前台命名：成分解析（URL/collection 仍為 `ingredients`，避免大型路由遷移）。
- 文章開頭 AEO 區塊前台統一標題「重點摘要」；不顯示「問題/答案/適用對象/證據基礎/最後更新」欄位標籤。
- Svelte islands：d3 圖表（Hero particles、Evidence Scale、TrendBubbles）、FAQ accordion、TOC scroll spy、Pagefind search。
- OG 圖：satori+sharp build-time PNG，endpoint `src/pages/og/[...slug].png.ts`（satori 不支援 oklch，OG 模板用 hex 近似為唯一例外）。

```
src/
  content.config.ts   # 6 種類型 Zod schema
  content/            # 內容（md/mdx）
  components/{ui,blocks,charts,seo}/
  layouts/            # Base / Article(prose|cards) / Media / List / Policy
  pages/              # 路由
  styles/             # tokens.css(oklch) / typography.css / global.css
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
- 禁：`!important`、px 定 font-size、新增外部 CDN（全站自託管字體）、直接改 `tokens.css` oklch 色值。
- 改完 CSS 必在 375px / 768px / 1280px 三寬度確認 + `pnpm build` 零錯誤。

---

## 踩過的坑（避免重蹈）

- tags 含 `/` → build 失敗。
- 內容插入不存在的行內圖 `](images/` → Rollup 解析失敗、全站部署連續 fail。
- Article.astro `cards` variant 曾遺漏 `max-width: none` → blocks 被限制在 68ch。
- myths 單篇版型是**刻意簡化**：只渲染固定區塊，勿再加「更新與更正紀錄」「延伸閱讀」等（playbook 把關，check-myth-quality 掃不到模板層）。
- Podcast 連結 slug 一律用 `stripPodcastSlug()`，不可用 `stripExt()`。
- 遠端 CCR 環境 WebFetch 被沙箱封鎖（PubMed/RSS 403），新聞管線為 WebSearch-only，用 `site:` 定向搜尋。

---

## 上線前 Blocker（README「待補齊項目」）

利益揭露內容、隱私權/使用條款正式文案、聯絡信箱、社群連結、Logo SVG、實際內容量（≥10–15 篇文章 + 5 篇闢謠）。
