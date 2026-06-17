# Editor author page portrait handling

The Luo Yang author page (`src/pages/authors/luo-yang/index.astro`) renders the editor portrait via a `<picture>` element that prefers the real JPG and falls back to the committed text-based SVG:

- `public/images/authors/luo-yang.jpg` — primary photo (loaded via `<source type="image/jpeg">`)
- `public/images/authors/luo-yang-editor-portrait.svg` — `<img>` fallback when the JPG is unavailable

The About page (`src/data/policies/about.md`) uses the same `<picture>` pattern so both surfaces stay consistent.

For both pages, avoid build-time `existsSync` checks for the portrait. Render the image path directly so the static build does not fall back to the placeholder card when the asset lookup behaves differently across environments.

When the hero uses `<picture>`, also set `display: block; width: 100%;` on the picture so it fills its grid column (see `.editor-portrait` in the author page styles). Without this, picture's default inline display collapses the portrait width.

## 作者 JSON-LD 與專業背景（E-E-A-T）

作者結構化資料由 `buildPerson()`（`src/utils/schema-org.ts`）依 `AUTHORS` registry（`src/data/authors.ts`）產生，輸出 `name / url / jobTitle / description / knowsAbout / sameAs`。

- `description` 是 LLM 與 Google Knowledge Graph 判斷作者權威的關鍵欄位 — 把專業背景（如「具牙醫學與口腔衛生材料研究背景」）寫進機器可讀層，不要只留在 `about.md` 內文。
- **三處須一致**：`AUTHORS[羅揚].description`、`src/data/policies/about.md` 主編簡介、`authors/luo-yang/` 作者頁敘述。改一處要同步。
- 精準原則：照實寫「背景／研究」，**不得浮誇成「執業醫師」等未經證實的執照宣稱**（違反 YMYL 與不實醫療宣稱紅線）。
- `knowsAbout` 為主題標籤陣列，可含專業領域（牙醫學、口腔衛生材料）與關注議題。

## Editor meta card (右側 at-a-glance)

`.editor-meta` 卡片提供快速一覽資訊，與肖像並列。目前欄位：

- 姓名
- 身分
- 學科背景
- Podcast
- 關注主題
- 聯絡（mailto 連結）

新增欄位時保持「一行一欄」的 `<p><strong>標籤：</strong>內容</p>` 結構，避免換成 `<ul>` 或表格，否則需要重寫 CSS 並會破壞與肖像的視覺平衡。聯絡 email 須與 `src/data/policies/about.md` 一致（目前為 `evidencetodaynews@gmail.com`）。

## Content blocks on the author page

The author page mirrors the editor section from `src/data/policies/about.md`. Keep these blocks in sync when one side changes:

- 專業背景與內容理念
- 核心信念
- 內容紅線
- 專業領域

Followed by page-specific sections: Podcast 連結、文章列表（從 `articles` collection 過濾 `author === '羅揚'`）、醫療聲明。

## Asset workflow

When adding or replacing author images through Codex/GitHub UI, prefer text-based SVG assets or use a normal Git workflow for binary image files, because some review interfaces cannot create PRs that include binary image uploads.
