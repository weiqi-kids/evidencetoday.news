# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push main 自動部署）
- 套件管理器：**pnpm**（不是 npm）

---

## 你是來做哪一種維護？（先對號入座）

> 本專案維護分兩種情境。**先判斷自己屬於哪一種，再照該情境的入口走。** 三份入口文件（`CLAUDE.md` / `README.md` / `AGENTS.md`）此區塊內容一致，不論先讀到哪一份都該得到相同分流。

### 🛠️ A. 開發維護 — 改程式 / 版面 / CI / 效能
動到 `src/`（元件/版面/樣式/工具/路由邏輯）、`scripts/`、`.github/workflows/`、`astro.config.mjs`、`content.config.ts`、`package.json`。

1. 先 `pnpm build` 立基線（確認動手前是綠的）
2. **查下方「我要做什麼？（任務索引）」找對應 playbook**，照其「鎖定參數/修改流程/常見陷阱/驗證清單」走
3. 守「修改紀律」＋「CSS / RWD 通用規範」
4. 改完 `pnpm build` 零錯誤 → **同步文件**（否則 `docs-sync-check` fail）
- 主檔：本檔「任務索引」、`docs/playbooks/*`、`docs/architecture.md`

### 📝 B. 內容與曝光 — 加內容 / 選題 / 看流量 / 自動發文
動到 `src/content/`、`src/data/policies/`、`public/images/`（不觸發 docs-sync）。

1. **session 一開始先 `pnpm perf`**（近 28 天 GA4+GSC 曝光快照，給經營建議）
2. 要做數據驅動選題再 `pnpm insights`（吐三桶 JSON）
3. 依內容類型找 playbook：一般內容 → `docs/content-guide.md`；趨勢新聞自動化 → `docs/news_sop.md` + `AGENTS.md`；曝光/選題寫法 → `docs/playbooks/audience-insights.md`、`docs/playbooks/analytics.md`；站外權威/GEO → `docs/playbooks/geo-offsite.md`
4. 發布：push `main` 自動部署
- 主檔：`docs/content-guide.md`、`docs/news_sop.md`、`docs/playbooks/{audience-insights,analytics,geo-offsite,news-article,editor-*}.md`

---

## 修改紀律（必讀）

**功能改動必須同步文件**。動到以下任一路徑：

- `src/components/`、`src/layouts/`、`src/pages/` 內非 [slug] 的元件邏輯
- `src/styles/`、`src/lib/`、`src/utils/`
- `scripts/`、`.github/workflows/`
- `astro.config.mjs`、`src/content.config.ts`、`package.json` 的 scripts/dependencies

…就**必須同時更新** `README.md` 或 `docs/` 內對應的 playbook。沒有同步 → CI `docs-sync-check` 會 fail，PR 無法合併。例外場景請在 PR body 或 commit message 加 `[skip docs]`（適用 typo / 純測試 / build 設定微調）。

純內容變動（`src/content/`、`src/data/policies/`、`public/images/` 等）不在此規則內。


## 文章重點摘要區塊

- 文章開頭的 AEO 區塊前台標題統一為「重點摘要」。
- 不顯示「問題」「答案」「適用對象」「證據基礎」「最後更新」等欄位標籤。
- 摘要內容應優先寫成人也容易閱讀的要點式文字。
- 若文章主題是「5 件事」「3 個重點」等形式，`aiAnswer` / `citationAnswer` 建議使用編號或條列格式。
- 醫療聲明、證據來源與更新日期由文章其他區塊承接，不在重點摘要框重複。

---

## 成分解析命名規則

- 前台顯示統一使用「成分解析」。
- 舊有稱呼不再作為使用者可見名稱。
- 目前為避免大型路由遷移，URL 與 collection 暫時保留 `/ingredients/` 與 `ingredients`。
- `IngredientCard`、`category="ingredient"`、`.ingredient-*` class 屬於內部命名，可暫時保留。
- 若未來要將 URL 從 `/ingredients/` 遷移為新路徑，需另開 migration PR，處理 redirect、sitemap、RSS、內部連結、canonical 與 Search Console。
- 短影音單支內容頁與 AEO 介紹頁將另案處理。

---

## 關於我們頁維護規則

- `/about/` 定位為本日有據的網站理念與健康知識處理方法介紹頁。
- 不應把 `/about/` 寫成保健食品觀念頁、商品導購頁或主編個人履歷頁。
- 關於我們頁應說明網站宗旨、健康資訊處理方法、證據與主編觀點分層、內容形式與聯絡方式。
- 若涉及保健食品，只能作為健康議題中的其中一類，不可成為頁面主軸。
- 主編個人方法的詳細說明應連到 `/authors/luo-yang/`。

---

## 主編頁維護規則

- 主編頁定位為「主編介紹與內容信任頁」，不是個人履歷頁，也不是保健食品說明頁。
- 頁面應說明創辦原因、主編角色與把關方式、Podcast 與代表內容（文章與短影音）。
- 主編頁文字以自然、可對讀者直接溝通的語氣為主，可適度使用第一人稱說明動機與方法；段落長度以手機可快速掃讀為優先。
- 「Podcast 與代表內容」建議維持精選列表（約 6–8 篇），避免一次列出全部文章造成閱讀壓力。
- 主編頁可依內容重疊度刪減段落，優先保留必要信任訊號（身分、背景、Podcast、聯絡與精選內容）。
- 主編觀點可作為第五層判讀，但不得包裝成研究結論。
- 主編頁不應反覆聚焦保健食品，也不應寫成商品導購或個人廣告。
- 醫療聲明與利益揭露政策由全站政策頁承接，不應在主編頁重複堆疊。

---


## 短影音單頁維護規則

- `/videos/` 是短影音列表與分類頁。
- `/videos/[slug]/` 是精選短影音站內整理頁。
- 不需要所有 YouTube Shorts 都有站內頁；只有精選或需要 AEO 的影片建立內容頁。
- 有站內頁的短影音需包含 YouTube 影片、重點摘要、30 秒重點、文字摘要、逐字稿與延伸閱讀。
- 前台摘要標題使用「重點摘要」，不要使用「可引用答案」作為視覺標題。
- `transcript` 可放完整逐字稿，前台以 details 預設收合。
- references 不可憑空新增；沒有可靠來源時可以省略。
- relatedArticles / relatedMyths / relatedIngredients / relatedPodcasts 必須連到實際存在內容。
- YouTube 影片列表仍可顯示全部影片；站內頁優先服務 SEO / AEO 與精選內容整理。

---
## 短影音分類與搜尋頁維護

- `/videos/` 使用 YouTube API 產生的 `youtube-shorts.json`。
- 短影音分類由 `src/utils/videos.ts` 根據標題自動判斷。
- 自動分類不準時，使用 `VIDEO_CATEGORY_OVERRIDES` 以 YouTube video id 手動指定分類。
- 本階段只做短影音分類導覽，尚未建立單支影片內容頁（短影音分類為第一步；單支影片內容頁將於後續建立）。
- 搜尋頁熱門標籤使用 `getTopTags()` 動態產生，不應硬寫固定標籤。
- 趨勢頁 `editorComment` 前台標題使用「主編判讀」，避免過度個人部落格語氣。
- 趨勢頁 `TrendBubbles` 需保留較寬鬆的上下留白，避免圖形被裁切；手機版高度需降到約 17rem，並支援 `prefers-reduced-motion`。
- 趨勢卡片字級下限：分類標籤 13px、標題 18px、摘要 15px、日期 13px，維持一般讀者可讀性。
- 趨勢單篇頁固定段落順序：重點摘要 → 先看懂這個詞（可選）→ 研究內容 → 主編判讀（列點）→ 來源。

---

## 我要做什麼？（任務索引）

> 改任何東西**先找到對應 playbook**，再動手。每個 playbook 列出「鎖定參數、修改流程、常見陷阱、驗證清單」。

### 內容類

| 任務 | 看哪份 |
|---|---|
| ⭐ 選題／寫新文章前先讀（能贏的文章模子·六基因） | [docs/playbooks/winning-article-formula.md](./docs/playbooks/winning-article-formula.md) |
| 新增文章 / 闢謠 / 成分解析 / Podcast / 短影音 / 趨勢新聞 | [docs/content-guide.md](./docs/content-guide.md) |
| 修改、刪除既有內容 | [docs/content-guide.md](./docs/content-guide.md) |
| 撰寫趨勢新聞 SOP（自動化排程） | [docs/news_sop.md](./docs/news_sop.md)、[AGENTS.md](./AGENTS.md)「撰寫趨勢文章」 |
| 維護趨勢文章結構與前台（/news） | [docs/playbooks/news-article.md](./docs/playbooks/news-article.md) |
| 新增 Content Collection 類型 | [docs/playbooks/new-content-type.md](./docs/playbooks/new-content-type.md) |
| 健康專題（topic hub）/ 主題整理頁 | [docs/playbooks/topic-hubs.md](./docs/playbooks/topic-hubs.md) |
| 內容區塊結構（AEO 自然段落 / FAQ 規範） | [docs/content-guide.md](./docs/content-guide.md)「內容區塊結構」 |
| 文章配圖（封面+內文情境圖／圖庫優先） | [docs/playbooks/editor-images.md](./docs/playbooks/editor-images.md) |
| 主編 / 作者頁維護 | [docs/playbooks/editor-author-page.md](./docs/playbooks/editor-author-page.md) |
| 文章骨架 / MDX 文件 / lint（編輯器系列） | [docs/playbooks/editor-spine.md](./docs/playbooks/editor-spine.md)、[editor-mdx-doc.md](./docs/playbooks/editor-mdx-doc.md)、[editor-lint.md](./docs/playbooks/editor-lint.md) |

### 排版 / 視覺類

| 任務 | 看哪份 |
|---|---|
| 改導覽列 TopNav | [docs/playbooks/topnav.md](./docs/playbooks/topnav.md) |
| 改 design tokens（顏色 / 字體 / 間距） | [docs/playbooks/design-tokens.md](./docs/playbooks/design-tokens.md) |
| 改文章 / 闢謠 / 成分解析排版（Article.astro variant） | [docs/playbooks/article-layout.md](./docs/playbooks/article-layout.md) |
| 闢謠單篇頁（`src/pages/myths/[slug].astro`）色彩調整 | 沿用 CI tokens（`--color-paper/ink/fog/teal/navy/coral/cat-myth`）與 `color-mix`，禁止新增 pastel hex；僅調整視覺，不改內容結構。 |
| 闢謠判讀標籤（`VerdictBadge` / `MythCard`） | `VerdictBadge` 僅能使用 CI token + `color-mix`（禁止硬寫 pastel hex）；`MythCard` 的 `verdict` 型別必須引用 `@/utils/myths/schema` 的 `MythVerdict`。 |
| 改首頁 / Hero | [docs/playbooks/home-hero.md](./docs/playbooks/home-hero.md) |
| 改 / 新增 d3 圖表 | [docs/playbooks/d3-charts.md](./docs/playbooks/d3-charts.md) |
| 通用 CSS / RWD 規範 | 本檔下方「CSS / RWD 通用規範」 |

### 整合 / 運維類

| 任務 | 看哪份 |
|---|---|
| 串接外部 API（YouTube / PubMed / WebSearch） | [docs/playbooks/external-apis.md](./docs/playbooks/external-apis.md) |
| CI/CD 與 deploy.yml 維護 | [docs/playbooks/ci-cd.md](./docs/playbooks/ci-cd.md) |
| 看架構 / SEO / AEO / 無障礙總覽 | [docs/architecture.md](./docs/architecture.md) |
| 結構化資料實體圖（Organization / WebSite / Person / Article 的 @id）/ citation | [docs/architecture.md](./docs/architecture.md)「結構化資料」、`src/utils/schema-org.ts` |
| sitemap lastmod / 前台可見性（draft·未來日期·under-review） | `astro.config.mjs` + `scripts/lib/content-dates.mjs`；`src/utils/visibility.ts` |

### 曝光量 / 內容運營類（情境 B）

| 任務 | 看哪份 |
|---|---|
| 每 session 看真實曝光（`pnpm perf`）給經營建議 | [docs/playbooks/audience-insights.md](./docs/playbooks/audience-insights.md) |
| GA4/GSC 數據驅動選題與寫法（`pnpm insights`） | [docs/playbooks/audience-insights.md](./docs/playbooks/audience-insights.md) |
| GA4/GSC 分析腳本與報表 | [docs/playbooks/analytics.md](./docs/playbooks/analytics.md) |
| 站外權威 / GEO / LLM 推薦曝光 | [docs/playbooks/geo-offsite.md](./docs/playbooks/geo-offsite.md) |



### /myths 列表頁篩選與排序（前端互動）

- 篩選順序：`searchQuery` → `verdict` → `topicTags` → `evidenceLevel`，採交集邏輯。
- 排序順序：對篩選後結果依 `updatedDate` 排序（`new` 新到舊、`old` 舊到新），日期解析失敗 fallback 為 `0`。
- 搜尋欄位：`title`、`mythClaim`、`verdictSummary`、`summary`、`topicTags`、`tldr`（大小寫不敏感，先 `trim`）。
- 空狀態：當結果為 `0` 時僅顯示「目前沒有符合條件的闢謠文章，請調整搜尋或篩選條件。」且不渲染卡片。
- 顯示切換使用 `style.display`（避免 `hidden` 屬性被頁面樣式覆寫），確保空狀態與卡片列表互斥。

## Corporate Identity 維護規則

- 本階段只記錄與檢查既有品牌語言，不調整字體與配色。
- 修改頁面視覺前，應先參考 `docs/brand-guidelines.md`。
- 視覺修改完成後，應用 `docs/ci-audit-checklist.md` 自查。
- 不得把網站改成商城、診所、產品頁、政府宣導頁或 AI 模板站。
- 圖像設計不得自動加入十字架元素，除非使用者明確要求。

---
## Base SEO meta 與 WebSite schema

- Base.astro 統一輸出 `theme-color`（`#103B44`）。
- Base.astro 輸出 RSS alternate link `/rss.xml`。
- Base.astro 輸出 WebSite JSON-LD。
- WebSite schema 的 SearchAction 使用 `/search/?q={search_term_string}`。
- `src/pages/search.astro` 必須支援 URL query `q`，否則不可啟用 SearchAction。
- `query` 可作為備用 query string，但 schema target 使用 `q`。
- 不得加入不存在的社群、Logo、Product、Rating 或商業 schema。

## RSS feed

- `/rss.xml` 由 `src/pages/rss.xml.ts` 產生。
- 收錄公開 articles / myths / ingredients / podcasts / news。
- Podcast slug 必須使用 `stripPodcastSlug()`。
- feed item 以 `updatedDate ?? publishDate` 排序，最多輸出 50 筆。
- Footer RSS 入口與 Base alternate link 都指向 `/rss.xml`。
- Footer「資源」欄另有「在 Google News 追蹤」外連（出版品 ID `CAowh4bHDA` → `https://news.google.com/publications/CAowh4bHDA`，`target=_blank rel=noopener`）；通過 Publisher Center 後，follower 是 Google News 正向訊號。`resourceLinks` 以 `external?: boolean` 標記是否外連。
- Footer 字級（皆用既有型階 token，不寫死 px）：欄標題 `--text-lead`（20/18px）；連結、標語、底部版權/免責/揭露皆 `--text-body`（18/17px）。footer 全文字 ≥ 正文級為刻意決策（早期版本連結用 `--text-meta`、底部用 `--text-badge` 過小，已整體上抬）。

---


## OG 圖（靜態，每 collection 一張）

- 目前採**靜態 OG**：每個 collection 共用一張預先產好的圖 `public/og-static/*.png`（home / articles / myths / ingredients / podcasts / videos / news），由 `src/utils/social-meta.mjs` 的 `ogImageForCollection()` 依 collection 指派，並帶版本查詢字串 `OG_IMAGE_VERSION`（目前 `20260604-static-og-v1`）。
- **已無 `pnpm og:generate` 指令、也無 `src/pages/og/[...slug].png.ts` endpoint**（早期 satori/sharp 逐頁生成方案已淘汰）。因此社群分享圖為 collection 級、不做逐篇差異化。
- 若日後要恢復逐篇 OG：satori/sharp 相依仍在 `package.json`；`scripts/generate-author-og.ts` 是現存的一次性作者頁 OG 生成工具，可作參考。
- OG 圖尺寸 1200x630；前台名稱使用「成分解析」，但路徑仍為 `/ingredients/`。
- 不得提交或分享字型檔。OG 圖應遵守 Corporate Identity 規範，不得呈現商品銷售感、醫療恐懼感或十字架元素。

## 效能：字型子集化（繁中）

- `src/layouts/Base.astro` 只 import **子集進入點**（繁中 `@fontsource/noto-sans-tc/chinese-traditional-*.css`、Latin `@fontsource/inter/latin-*.css` 等），不要改回完整版 `noto-sans-tc/400.css`（會帶進 ~350 條 render-blocking `@font-face`）。
- `postbuild` 先跑 `node scripts/subset-fonts.mjs`，掃 `dist` 全站實際用字，把繁中權重（Noto Sans TC 400/700、Noto Serif TC 700）依碼位切成 woff2 切片並改寫 CSS（`unicode-range` + `font-display:optional`），再交給 pagefind。純邏輯在 `scripts/lib/font-slicing.mjs`。
- 新增/移除繁中字重時，`Base.astro` 的 import 與 `subset-fonts.mjs` 的 `WEIGHTS` 要同步。依賴 `subset-font`。量測：完整版 ~351 條 `@font-face` / 8.4MB woff2 → 切塊後 ~50 條 / 1.7MB，且每頁只下載命中的切片。詳見 [docs/playbooks/ci-cd.md](docs/playbooks/ci-cd.md)。

## 社群分享

- `src/components/blocks/ShareButtons.astro`（LINE / Facebook / X / 複製連結，無外部 SDK）由 `Article.astro` 在內容尾端自動渲染（articles / ingredients），news 內頁於 `src/pages/news/[slug].astro` 另行引入。
- **myths 不加**：闢謠單篇刻意極簡且已有原生分享區，由 `showShare = category !== 'myth'` 排除。詳見 [docs/playbooks/article-layout.md](docs/playbooks/article-layout.md)。

## 快速開始

```bash
# — 開發 / 建置 —
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 啟動開發伺服器 (localhost:4321)
pnpm build          # 建置靜態網站 (輸出至 dist/；prebuild 跑 sync:youtube + used-images)
pnpm preview        # 預覽建置結果

# — 內容品質 gate —
pnpm check:content  # 去 AI 味守門（統一引擎 check-content.mjs，= 別名 content:audit）；掃相對 origin/main 變動檔
pnpm check:content:all  # 全站去 AI 味盤點（恆 exit 0，人工普查用）
pnpm check:myths    # 闢謠內容品質 gate（發布 myths 前必跑）
pnpm check:news     # 趨勢新聞來源連結 gate（每篇須有可點 references/sourceUrl/pmid；CI 已接）
pnpm check:design   # 設計規範守門 v2（pnpm build 會自動先跑；規則見「CSS / RWD 通用規範」）

# — 曝光量 / 選題（情境 B）—
pnpm perf           # 近 28 天 GA4+GSC 效能快照（唯讀，經營決策用；需 gcloud token）
pnpm insights       # GA4/GSC 驅動 /news 選題（吐三桶 JSON 給新聞管線）
```

> 情境 B（內容與曝光）每個 session 建議**先跑 `pnpm perf`** 看真實曝光再決定選題；認證設定見 [`docs/playbooks/audience-insights.md`](./docs/playbooks/audience-insights.md)。

---


## 內容語氣稽核

- 守門＝統一引擎 `scripts/check-content.mjs`（2026-07-21 起，取代舊 `audit-ai-tone.mjs`），掃 `src/**/*.md(x)`；`pnpm check:content`（= 別名 `pnpm content:audit`）掃相對 `origin/main` 的變動檔，`pnpm check:content:all` 全站盤點。
- **兩級判定**：ERROR（強 AI 指紋單一命中即擋、跨 ≥3 個軟訊號層升級為擋）、WARN（軟訊號單一命中只印不擋）。涵蓋模板化第一人稱開頭、AI 感句型、模糊引用。
- **已串進 `pnpm build`**（`check-design && check-content && astro build`）：提交前 build 即擋。
- **grandfather 存量**：預設只掃變動檔，既有文章不重掃；新／改文章照樣被擋。
- GitHub Actions 的 `content-audit.yml`（PR／main push／每週排程）跑 `pnpm check:content:all` 產全站報告（恆 exit 0）。
- 若未來要改為 blocking，可設定 `CONTENT_AUDIT_STRICT=1`。
- audit warning 代表需要人工檢查，不代表該句一定錯。

---

## CSS / RWD 通用規範

> **AI 修改版面前必須遵守以下規則。違反任何一條都會導致手機或電腦版崩壞。**

### 1. 斷點（Breakpoints）

**只允許使用以下 4 個斷點值，全部用 `min-width`（mobile-first）：**

| 名稱 | 值 | 用途 |
|------|------|------|
| `sm` | `640px` | 手機 → 大手機 |
| `md` | `768px` | 手機 → 平板 |
| `lg` | `1024px` | 平板 → 桌面 |
| `xl` | `1280px` | 桌面 → 寬螢幕 |

**禁止：**
- `max-width` media query（這是 desktop-first，本站統一用 mobile-first）
- 自創斷點（例如 760px、600px、960px）
- 在同一個元件中混用 `min-width` 和 `max-width`

### 2. Spacing 用 Fluid（禁止寫死像素再用 media query 覆蓋）

```css
/* 正確：一條 clamp() 搞定，手機到桌面連續過渡 */
padding: clamp(1rem, 0.5rem + 2vw, 2rem);

/* 禁止：寫死後用 media query 分段覆蓋 */
padding: 2rem;
@media (max-width: 768px) { padding: 1rem; }
```

### 3. Layout vs Page 分工

- **Layout 檔案**（`Article.astro`、`Media.astro`）只負責骨架（grid、sidebar），不寫內容樣式
- **Page 檔案**（`myths/[slug].astro` 等）負責自己的視覺樣式（`.block` 的背景、padding）
- 不要用 `:global()` 覆蓋 layout 的 class — 改用 variant prop
- 不要在全域 CSS 中加頁面特定的樣式
- 詳細 variant 系統見 [Article.astro playbook](./docs/playbooks/article-layout.md)

### 4. 禁止事項 — 設計規範 v2（2026-07-20 全站統一，`scripts/check-design.mjs` 自動守門）

`pnpm build` 會先跑 `node scripts/check-design.mjs`（亦可單獨 `pnpm check:design`），掃 `src/` 全部 `.css/.astro/.svelte`，違規直接 build fail（CI 同步擋部署）。六條規則：

1. **禁 `px` 定義 font-size**（一律 `var(--text-*)` 階梯；`clamp()` 內的 px 邊界暫不在掃描範圍）
2. **顏色（hex / rgb() / hsl()）只准出現在 `src/styles/variables.css`**（元件一律 `var(--color-*)`）
3. **禁 `!important`**（⚠️ 遷移期遞延中：存量 26 處在 global.css，見 check-design.mjs 檔頭 TODO，清零後啟用）
4. **禁外部 CDN**（fonts.googleapis / cdnjs / unpkg / jsdelivr；字體用 @fontsource 自託管，不受影響）
5. **css 檔白名單**：`src/` 下的 `.css` 只准 `src/styles/{variables,global}.css`，元件樣式寫 scoped `<style>`
6. **`--text-*` 字級下限**：每個 token 值一律 **≥18px（1.125rem）**，`clamp()` 以最小值計；`checkLadder()` 掃 `src/styles/variables.css`（字級階梯定義處）強制，禁止用 token 值開小門繞過 18px 下限

另沿用本站慣例：

- 不要把整個 `<style>` 壓成一行（不可讀、不可維護）
- 不要直接修改 `variables.css` 的 oklch 色值（經 4 輪審查定案，見 [design-tokens playbook](./docs/playbooks/design-tokens.md)）

### 5. 修改前自檢

修改任何 CSS 後，**必須**在以下三個寬度確認：

1. **375px**（iPhone SE）— 單欄、無 sidebar
2. **768px**（iPad）— 過渡斷點
3. **1280px**（桌面）— 完整版面

```bash
pnpm build  # 零錯誤才算通過
```

---

## 專案結構

```
src/
  content.config.ts          # Content Collections schema（6 種類型 Zod 驗證）
  content/                   # articles / myths / ingredients / podcasts / videos / news
  components/
    ui/                      # 原子元件（Button, Badge, CategoryTag 等）
    blocks/                  # 區塊元件（6 種 Card, FaqAccordion 等）
    charts/                  # d3.js Svelte 互動元件
    seo/                     # JsonLd 結構化資料
  layouts/
    Base.astro               # HTML shell（meta/OG/fonts/skip-to-content）
    Article.astro            # 文章 / 闢謠 / 成分解析（prose vs cards variant）
    Media.astro              # Podcast/短影音
    List.astro               # 列表頁
    Policy.astro             # 政策頁
  pages/                     # 路由
  styles/
    variables.css            # oklch design tokens + 字體/字級變數的色彩 token 檔（原 tokens.css，2026-07-20 改名）
    global.css               # typography 變數 + reset + prose + container + RWD fixes（2026-07-20 併入 typography.css/rwd-fixes.css）
  utils/                     # 共用工具
public/                      # 靜態資源（含 CNAME、favicon、images）
data/
  news-automation-config.json  # 趨勢新聞搜尋查詢
  processed-sources.json       # 去重追蹤
docs/
  architecture.md            # 架構總覽（SEO/AEO/CI/CD/a11y）
  content-guide.md           # 內容維護指南
  news_sop.md                # 趨勢新聞自動化 SOP
  playbooks/                 # 任務型 playbook（改 X / 串接 X / 新增類型）
```

---

## 發佈流程

```
1. 本地新增 / 編輯內容
2. pnpm dev                    → 本地預覽確認
3. git add . && git commit
4. git push origin main        → 觸發自動部署
```

GitHub Actions 自動執行：build → Pagefind 索引 → 連結檢查 → 部署。

部署狀態：https://github.com/weiqi-kids/evidencetoday.news/actions

---

## 待補齊項目

### 上線前 Blocker — ✅ 全數完成（2026-06-30 核對）

- [x] 利益揭露 — `src/data/policies/disclosure.md`（已有正式文案）
- [x] 隱私權 / 使用條款正式文案 — `src/pages/privacy.astro` / `terms.astro`
- [x] Email 信箱 — evidencetodaynews@gmail.com（contact / privacy / terms / about 已用）
- [x] 社群連結 — Footer 已放「在 Google News 追蹤」；其餘社群依硬規則「不得加入不存在的社群」，有真實帳號才補（**非 blocker**）
- [x] Logo — TopNav 已用 `/images/brand/logo-icon.png`（SVG 版列為上線後可選迭代）
- [x] 實際內容量 — 遠超標：文章 83 / 闢謠 34 / 成分 27 / 趨勢 64（要求 ≥10–15 + ≥5）

### 上線後可迭代

- [ ] `src/data/policies/editorial-policy.md` 目前僅 3 行，可補完整編輯方針
- [ ] Logo SVG 版本（現為 PNG）
- [ ] 成分解析頁補齊更多 pathwaySteps 資料
- [ ] Pagefind 搜尋頁動態載入

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | 架構、SEO / AEO、無障礙、CI/CD 總覽 |
| [`docs/content-guide.md`](docs/content-guide.md) | 內容維護指南（新增 / 修改 / 刪除各類內容） |
| [`docs/news_sop.md`](docs/news_sop.md) | 趨勢新聞自動化 SOP |
| [`docs/playbooks/news-article.md`](docs/playbooks/news-article.md) | 維護趨勢文章結構與 /news 前台 |
| [`docs/playbooks/audience-insights.md`](docs/playbooks/audience-insights.md) | GA4/GSC 數據驅動選題與寫法（`pnpm perf` / `pnpm insights`） |
| [`docs/playbooks/analytics.md`](docs/playbooks/analytics.md) | GA4/GSC 分析腳本與報表 |
| [`docs/playbooks/geo-offsite.md`](docs/playbooks/geo-offsite.md) | 站外權威 / GEO / LLM 推薦曝光 |
| [`docs/playbooks/editor-images.md`](docs/playbooks/editor-images.md) | 文章配圖（封面+內文情境圖／圖庫優先） |
| [`docs/playbooks/topnav.md`](docs/playbooks/topnav.md) | 改導覽列 TopNav |
| [`docs/playbooks/design-tokens.md`](docs/playbooks/design-tokens.md) | 改 design tokens（顏色 / 字體 / 間距） |
| [`docs/playbooks/article-layout.md`](docs/playbooks/article-layout.md) | 改 Article.astro variant 排版 |
| [`docs/playbooks/home-hero.md`](docs/playbooks/home-hero.md) | 改首頁 / Hero |
| [`docs/playbooks/d3-charts.md`](docs/playbooks/d3-charts.md) | 改 / 新增 d3 圖表 |
| [`docs/playbooks/external-apis.md`](docs/playbooks/external-apis.md) | 串接外部 API |
| [`docs/playbooks/new-content-type.md`](docs/playbooks/new-content-type.md) | 新增 Content Collection 類型 |
| [`docs/playbooks/ci-cd.md`](docs/playbooks/ci-cd.md) | CI/CD 與 deploy.yml 維護 |
| [`docs/brand-guidelines.md`](docs/brand-guidelines.md) | Corporate Identity 使用規範 |
| [`docs/ci-audit-checklist.md`](docs/ci-audit-checklist.md) | 視覺一致性檢查清單 |
| [`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`](docs/superpowers/specs/2026-05-07-evidencetoday-design.md) | 完整設計規格（品牌 / 色彩 / 字體 / 頁面 / 元件） |
| [`docs/superpowers/specs/2026-05-08-news-automation-design.md`](docs/superpowers/specs/2026-05-08-news-automation-design.md) | 趨勢新聞自動化技術設計規格 |


### Podcast 播放器資料欄位

Podcast 單集建議使用 `embedUrl` 指向 Firstory 內嵌播放器（`https://open.firstory.me/embed/story/...`）。
若暫時沒有 `embedUrl`，可用 `externalUrl` 作為外部收聽連結；單集頁不應再使用不可互動的假播放器區塊。

## Podcast JSON-LD

- Podcast 單集頁使用 `PodcastEpisode` schema。
- `author` / `creator` 為「羅揚」。
- `partOfSeries` 為「喜聞樂健」。
- `publisher` 為「本日有據」。
- `AudioObject` 若有 MP3 direct URL，使用 frontmatter 的 `audioUrl` 輸出 `contentUrl`。
- Firstory `embedUrl` 只作為播放器 `embedUrl`，不可誤填成 `contentUrl`。
- Firstory `externalUrl` 作為外部收聽頁，可用於 `AudioObject.url` / `sameAs`。
- `duration` 使用 `parseDurationToIso()` 轉成 ISO 8601 duration。
- 不得填不存在或無法公開存取的 MP3 URL。

### 成分解析頁中立知識庫維護重點

- 成分解析單頁 JSON-LD 應使用 `Article` / `WebPage` 等中立內容型別，不可使用 `MedicalWebPage`、`DietarySupplement`、`Product` 等商品導向 schema。
- 成分解析頁需固定呈現中立提示，明確說明「研究常討論的用途／可能機制／安全性」與「不作為個別療效宣稱」。
- 若 content 有 `safety` 欄位，頁面模板需固定輸出「安全性與交互作用」區塊（一般安全性、可能交互作用、族群注意）。

### 短影音列表卡片顯示規則

`/videos/` 的版面順序固定為 Hero、統計卡片、精選短影音整理、分類標籤、所有短影音列表。精選區第一張為「製作健康短影音的初衷」，後續四張高流量作品需以展開卡片呈現，包含縮圖、標題、摘要與站內觀看整理連結。

所有短影音列表卡片僅保留：

- YouTube Shorts 內嵌播放器（`embedUrl`）
- 影片標題
- 發布日期

不顯示額外的「在 YouTube 觀看」外部連結，以維持卡片資訊一致與版面簡潔。分類標籤需放在精選短影音整理之後，並維持 `data-category` 篩選與數量同步。


## Podcast 頻道頁維護重點

- 節目名稱固定為「喜聞樂健」，定位為每集約 15 分鐘的健康觀念與健康知識分享。
- `/podcasts/` 頻道頁需包含節目定位說明，不可退化成純播放器清單。
- 單集頁建議至少含播放器、內容摘要與本集重點；Show Notes / 本集段落可留在資料層但不在前台渲染。


## Podcast 頁面資料規則

- 首頁 Podcast 區塊版型需避免欄位擠壓：`section-podcast` / `podcast-layout` / 左右欄都要可縮（`min-width: 0`），CTA 不可覆蓋卡片點擊區。
- Podcast 卡片連結必須使用父層傳入 `href`，不可在卡片元件內推導或覆蓋。
- 任何指向 Podcast 單集頁的連結都要用 `stripPodcastSlug()` 產生 slug，不可用 `stripExt()`。
- `stripExt()` 僅保留給 articles / myths / ingredients / videos / news 等非 Podcast 內容路由。
- Podcast 卡片 footer 建議使用左側 duration/date、右側 `收聽本集 →` 的配置；`收聽本集 →` 需有足夠對比、可見 underline 與 focus/hover 狀態。
- 右上角 EP 標籤需維持可讀對比，可使用小型 pill badge，但不要讓 EP 標籤搶過標題層級。

- Podcast 列表與首頁 Podcast 區塊統一使用 `getPublishedPodcasts()`，避免重複顯示測試檔或舊檔。
- 去重優先使用 `episodeNumber`，缺少時回退到 slug。
- 單集 JSON-LD 時長請使用 `parseDurationToIso()`，同時支援 `MM:SS` 與 `HH:MM:SS`。
- Podcast 列表與首頁最新單集排序使用 `updatedDate ?? publishDate`，確保更新後能自動成為最新單集。
- Podcast 單集頁後段以「內容摘要」「本集重點」為主，Show Notes / 本集段落不在前台渲染。


## AEO / GEO 設定（2026-05）

- 文章頁重點摘要已改為「本篇可引用結論」，支援 question/aiAnswer/quickAnswer/citationAnswer 與 fallback。
- FAQ 改為伺服器端渲染，答案內容存在初始 HTML；題數超過 8 題時僅前 5 題預設展開。
- 新增 `queryPattern` 內容欄位（內部 metadata 用）。
- 新增 `public/llms.txt`，並更新 `public/robots.txt` 為 AI crawler 友善規則。

## Myths quality gate (Phase 2)

- Run `pnpm run check:myths` before publishing myths content.
- Articles marked `status: "under-review"` are excluded from `/myths` public listing and route generation.
