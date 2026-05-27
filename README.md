# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push main 自動部署）
- 套件管理器：**pnpm**（不是 npm）

---

## 修改紀律（必讀）

**功能改動必須同步文件**。動到以下任一路徑：

- `src/components/`、`src/layouts/`、`src/pages/` 內非 [slug] 的元件邏輯
- `src/styles/`、`src/lib/`、`src/utils/`
- `scripts/`、`.github/workflows/`
- `astro.config.mjs`、`src/content.config.ts`、`package.json` 的 scripts/dependencies

…就**必須同時更新** `README.md` 或 `docs/` 內對應的 playbook。沒有同步 → CI `docs-sync-check` 會 fail，PR 無法合併。例外場景請在 PR body 或 commit message 加 `[skip docs]`（適用 typo / 純測試 / build 設定微調）。

純內容變動（`src/content/`、`src/data/policies/`、`public/images/` 等）不在此規則內。

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

- 主編頁定位為「健康知識處理方法與信任頁」，不是個人履歷頁，也不是保健食品說明頁。
- 頁面應說明創辦原因、健康資訊處理方法、證據與主編觀點的分層、內容製作流程、Podcast 與代表內容。
- 主編頁文字需以客觀第三人稱為主，避免第一人稱自白；段落長度以手機可快速掃讀為優先。
- 「Podcast 與代表內容」建議維持精選列表（約 6–8 篇），避免一次列出全部文章造成閱讀壓力。
- 主編頁可依內容重疊度刪減段落，優先保留必要信任訊號（身分、背景、Podcast、聯絡與精選內容）。
- 主編觀點可作為第五層判讀，但不得包裝成研究結論。
- 主編頁不應反覆聚焦保健食品，也不應寫成商品導購或個人廣告。
- 醫療聲明與利益揭露政策由全站政策頁承接，不應在主編頁重複堆疊。

---

## 短影音分類與搜尋頁維護

- `/videos/` 使用 YouTube API 產生的 `youtube-shorts.json`。
- 短影音分類由 `src/utils/videos.ts` 根據標題自動判斷。
- 自動分類不準時，使用 `VIDEO_CATEGORY_OVERRIDES` 以 YouTube video id 手動指定分類。
- 本階段只做短影音分類導覽，尚未建立單支影片內容頁（短影音分類為第一步；單支影片內容頁將於後續建立）。
- 搜尋頁熱門標籤使用 `getTopTags()` 動態產生，不應硬寫固定標籤。
- 趨勢頁 `editorComment` 前台標題使用「主編判讀」，避免過度個人部落格語氣。

---

## 我要做什麼？（任務索引）

> 改任何東西**先找到對應 playbook**，再動手。每個 playbook 列出「鎖定參數、修改流程、常見陷阱、驗證清單」。

### 內容類

| 任務 | 看哪份 |
|---|---|
| 新增文章 / 闢謠 / 成分解析 / Podcast / 短影音 / 趨勢新聞 | [docs/content-guide.md](./docs/content-guide.md) |
| 修改、刪除既有內容 | [docs/content-guide.md](./docs/content-guide.md) |
| 撰寫趨勢新聞 SOP（自動化排程） | [docs/news_sop.md](./docs/news_sop.md) |
| 新增 Content Collection 類型 | [docs/playbooks/new-content-type.md](./docs/playbooks/new-content-type.md) |

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

---

## 快速開始

```bash
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 啟動開發伺服器 (localhost:4321)
pnpm build          # 建置靜態網站 (輸出至 dist/)
pnpm preview        # 預覽建置結果
pnpm content:audit  # 掃描內容的 AI 感句型與模糊引用
```

---


## 內容語氣稽核

- `pnpm content:audit` 會掃描 `src/content/**/*.mdx` 與 `src/content/**/*.md`。
- 稽核項目包含 AI 感句型、模糊引用與 raw enum 外露風險。
- GitHub Actions 的 Content audit workflow 會在內容 PR、main push 與每週排程執行。
- 預設為 warning mode，不阻擋 PR。
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

### 4. 禁止事項

- 不要把整個 `<style>` 壓成一行（不可讀、不可維護）
- 不要用 `!important`
- 不要用 `px` 定義 font-size（用 `clamp()` 或 CSS custom properties）
- 不要新增外部 CDN（字體、CSS framework）— 本站全部自託管
- 不要直接修改 `tokens.css` 的 oklch 色值（經 4 輪審查定案，見 [design-tokens playbook](./docs/playbooks/design-tokens.md)）

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
    tokens.css               # oklch design tokens
    typography.css           # 字體 + fluid type scale
    global.css               # reset + prose + container
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

### 上線前 Blocker

- [ ] 利益揭露具體內容 — `src/data/policies/disclosure.md`
- [ ] 隱私權政策正式文案 — `src/pages/privacy.astro`
- [ ] 使用條款正式文案 — `src/pages/terms.astro`
- [ ] Email 信箱 — evidencetodaynews@gmail.com（單一聯絡信箱）
- [ ] 社群連結 — `src/components/blocks/Footer.astro`
- [ ] Logo SVG — `src/components/blocks/TopNav.astro`
- [ ] 實際內容量 — 至少 10-15 篇文章 + 5 篇闢謠

### 上線後可迭代

- [ ] 成分解析頁補齊更多 pathwaySteps 資料
- [ ] Pagefind 搜尋頁動態載入

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | 架構、SEO / AEO、無障礙、CI/CD 總覽 |
| [`docs/content-guide.md`](docs/content-guide.md) | 內容維護指南（新增 / 修改 / 刪除各類內容） |
| [`docs/news_sop.md`](docs/news_sop.md) | 趨勢新聞自動化 SOP |
| [`docs/playbooks/topnav.md`](docs/playbooks/topnav.md) | 改導覽列 TopNav |
| [`docs/playbooks/design-tokens.md`](docs/playbooks/design-tokens.md) | 改 design tokens（顏色 / 字體 / 間距） |
| [`docs/playbooks/article-layout.md`](docs/playbooks/article-layout.md) | 改 Article.astro variant 排版 |
| [`docs/playbooks/home-hero.md`](docs/playbooks/home-hero.md) | 改首頁 / Hero |
| [`docs/playbooks/d3-charts.md`](docs/playbooks/d3-charts.md) | 改 / 新增 d3 圖表 |
| [`docs/playbooks/external-apis.md`](docs/playbooks/external-apis.md) | 串接外部 API |
| [`docs/playbooks/new-content-type.md`](docs/playbooks/new-content-type.md) | 新增 Content Collection 類型 |
| [`docs/playbooks/ci-cd.md`](docs/playbooks/ci-cd.md) | CI/CD 與 deploy.yml 維護 |
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

`/videos/` 的短影音卡片僅保留：

- YouTube Shorts 內嵌播放器（`embedUrl`）
- 影片標題
- 發布日期

不顯示額外的「在 YouTube 觀看」外部連結，以維持卡片資訊一致與版面簡潔。


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
