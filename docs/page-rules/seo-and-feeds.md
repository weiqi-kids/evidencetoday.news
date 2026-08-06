# 頁面規則：SEO meta / JSON-LD / RSS / OG / 社群分享

全站共用的「出口」規則。架構全貌見 [`../architecture.md`](../architecture.md)；站外權威見 [`../playbooks/geo-offsite.md`](../playbooks/geo-offsite.md)。

---

## Base meta 與 WebSite schema（`src/layouts/Base.astro`）

- 統一輸出 `theme-color`。
- 輸出 RSS alternate link 指向 `/rss.xml`。
- 輸出 WebSite JSON-LD；其 `SearchAction` target 使用 `/search/?q={search_term_string}`。
- **`src/pages/search.astro` 必須支援 URL query `q`**，否則不可啟用 SearchAction。`query` 可作為備用 query string，但 schema target 一律用 `q`。
- **不得加入不存在的社群、Logo、Product、Rating 或商業 schema。**

## 結構化資料

- 實體圖（Organization / WebSite / Person / Article 的 `@id`）與 citation 見 [`../architecture.md`](../architecture.md)「結構化資料」與 `src/utils/schema-org.ts`。
- 作者 Person 由 `buildPerson()` 依 `src/data/authors.ts` 的 `AUTHORS` registry 產生。
- 審閱者以 Person 級 `reviewedBy` 輸出（審閱者≠作者才輸出），見 [`../playbooks/medical-review.md`](../playbooks/medical-review.md)。

## RSS（`src/pages/rss.xml.ts`）

- 收錄公開的 articles / myths / ingredients / podcasts / news。
- Podcast slug 必須用 `stripPodcastSlug()`。
- item 以 `updatedDate ?? publishDate` 排序，輸出上限 50 筆。
- Footer RSS 入口與 Base alternate link 都指向 `/rss.xml`。

## 可見性（所有出口共用）

- 前台任何讀 collection 的地方**一律用 `isPublicEntry(data)`**，禁裸 `!data.draft`。HTML 路由、`.txt`、RSS、`llms-full.txt`、tags 頁都算。
- `src/utils/visibility.test.ts` 有防回歸測試。事故經過見 [`../pitfalls.md`](../pitfalls.md)「排程與可見性」。
- sitemap `lastmod` 邏輯在 `astro.config.mjs` + `scripts/lib/content-dates.mjs`。

## OG 圖（靜態，每 collection 一張）

- 每個 collection 共用一張預先產好的圖 `public/og-static/*.png`（home / articles / myths / ingredients / podcasts / videos / news），由 `src/utils/social-meta.mjs` 的 `ogImageForCollection()` 依 collection 指派，並帶版本查詢字串 `OG_IMAGE_VERSION`。
- **已無 `pnpm og:generate` 指令、也無 `src/pages/og/[...slug].png.ts` endpoint**（早期逐頁生成方案已淘汰）。社群分享圖是 collection 級，**不做逐篇差異化**。
- 若日後要恢復逐篇 OG：satori/sharp 相依仍在 `package.json`；`scripts/generate-author-og.ts` 是現存的一次性作者頁 OG 工具，可作參考。字型陷阱見 [`../pitfalls.md`](../pitfalls.md)「資產產出」。
- 尺寸 1200x630。前台名稱用「成分解析」，路徑仍為 `/ingredients/`。
- **不得提交或分享字型檔。** OG 圖遵守 Corporate Identity：不得呈現商品銷售感、醫療恐懼感或十字架元素。

## 社群分享

- `src/components/blocks/ShareButtons.astro`（LINE / Facebook / X / 複製連結，無外部 SDK）由 `Article.astro` 在內容尾端自動渲染（articles / ingredients）；news 內頁於 `src/pages/news/[slug].astro` 另行引入。
- **myths 不加**（`showShare = category !== 'myth'`），理由見 [`myths.md`](./myths.md)。

## Footer

- 「資源」欄含「在 Google News 追蹤」外連（`target=_blank rel=noopener`）；`resourceLinks` 以 `external?: boolean` 標記是否外連。
- Footer 全部文字 ≥ 正文級是**刻意決策**（早期版本連結與底部字級過小，已整體上抬）。欄標題用 `--text-lead`，其餘用 `--text-body`，一律走型階 token，不寫死 px。

## AEO / GEO

- 文章開頭 AEO 區塊前台統一標題「**重點摘要**」；不顯示「問題／答案／適用對象／證據基礎／最後更新」等欄位標籤。
- 摘要優先寫成人也好讀的要點式文字；主題是「5 件事」「3 個重點」這類時，`aiAnswer` / `citationAnswer` 建議用編號或條列。
- 醫療聲明、證據來源與更新日期由文章其他區塊承接，**不在重點摘要框重複**。
- FAQ 伺服器端渲染，答案存在初始 HTML；題數多時只有前幾題預設展開。
- `queryPattern` 為內部 metadata 欄位，不對外顯示。
- `public/llms.txt` 與 AI crawler 友善的 `public/robots.txt` 已就位。

## 搜尋頁

- 熱門標籤用 `getTopTags()` 動態產生，**不要硬寫固定標籤**。
