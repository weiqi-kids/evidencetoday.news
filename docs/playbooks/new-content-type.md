# Playbook：新增 Content Collection 類型

## 何時看這份

任務涉及以下任一情況：

- 新增第 7+ 種內容類型（articles / myths / ingredients / podcasts / videos / news 之外）
- 修改 `src/content.config.ts` 既有 schema 的欄位（加 / 改 / 移）
- 加新的 enum 值（例如新 verdict、新 evidenceLevel）
- 改 referenceSchema 等共享 schema

> **這是結構性變動**：schema、layout、page、card、related 欄位、SEO、OG image、AEO endpoint 都要連動。**動之前畫一張影響範圍圖，確認每個觸點都覆蓋到**。

## 鎖定參數（動之前必看）

### 既有 6 個 Content Collection

| Collection | Layout | Card | 路徑 | 特殊欄位 |
|---|---|---|---|---|
| articles | Article (prose) | ArticleCard | `/articles/[slug]` | tldr, faq, references |
| myths | Article (cards) | MythCard | `/myths/[slug]` | verdict, evidencePyramid |
| ingredients | Article (prose) | IngredientCard | `/ingredients/[slug]` | uses, pathwaySteps, safety |
| podcasts | Media | PodcastCard | `/podcasts/[slug]` | episodeNumber, chapters |
| videos | Media | VideoCard | `/videos/[slug]` | youtubeId |
| news | News.astro | NewsCard | `/news/[slug]` | editorPick, pmid |

### Schema 必有欄位

每個 collection 至少要有：

- `title: z.string()`
- `description: z.string().max(155 or 200)` — meta description / OG description
- `publishDate: z.coerce.date()`
- `tags: z.array(z.string())`
- `draft: z.boolean().default(false)`

### 交叉連結欄位（10 組雙向）

每個非 news collection 都有 `related{Articles, Myths, Ingredients, Podcasts, Videos}` slug 陣列。**news 是單向導流**（news 可 link 別人，別人不 link 回 news）。

### Tags 規則

- 禁止含 `/`（如 `ME/CFS` → 用 `ME-CFS`）— Astro build 會失敗
- 用 `src/utils/tag-stats.ts` 算熱詞時跨 collection 統一

## 修改流程

### 新增第 7 種 Content Collection

依序動以下檔案，**每改一處立即跑 `pnpm build` 確認 schema valid**：

1. **Schema**（`src/content.config.ts`）：
   - 用既有 `articles` schema 當範本
   - 加進 `export const collections = { ... }`
2. **Content 目錄**：`src/content/{name}/`，加 `.gitkeep`
3. **Layout**：決定共用 Article.astro 還是 Media.astro 還是新建
4. **動態路由頁**：`src/pages/{name}/[slug].astro`
5. **列表頁**：`src/pages/{name}/index.astro`
6. **Card 元件**：`src/components/blocks/{Name}Card.astro`
7. **JSON-LD schema**：加 `src/components/seo/JsonLd.astro` 的對應 case
8. **OG image template**：`src/pages/og/[...slug].png.ts` 加 case
9. **AEO endpoint**：`src/pages/{name}/[slug].txt.ts` 純文字版
10. **llms.txt / llms-full.txt**：更新清單（`src/pages/llms.txt.ts` 等）
11. **RSS**：加進 `src/pages/rss.xml.ts`
12. **Sitemap**：Astro 自動產，確認 `astro.config.mjs` 沒排除
13. **TopNav**：加導覽項目（看 [topnav.md](./topnav.md)）
14. **首頁**：決定要不要在首頁加區塊（看 [home-hero.md](./home-hero.md)）
15. **content-guide.md**：更新「新增 X」流程
16. **content.config.ts 加範例**：放 1-2 篇 seed content 進 `src/content/{name}/`

### 修改既有 schema 欄位

1. **看當前用此欄位的檔案**：`git grep "\.{欄位名}" src/`
2. **若改 enum**：所有既有內容檔的 frontmatter 都要更新
3. **若移欄位**：先確認沒地方用，再移
4. **schema 修改後**：`pnpm build` 會驗證所有既有內容，**有錯就 fix 內容檔再改 schema**（不是繞過 schema）
5. **若加必填欄位**：所有既有內容都要補欄位，否則 build 失敗
6. **若加選填欄位**：用 `.optional()` 或 `.default(...)`

## 常見陷阱

- **schema 加必填欄位沒回填既有內容**：build 立刻失敗，全站爆 → 加必填必須同時 batch update 所有既有內容
- **enum 改值沒同步既有內容**：例如 `verdict` 從「大致正確」改成「基本正確」，所有 myth 檔的 frontmatter 都要改
- **新類型沒加 OG image case**：分享連結時 OG 圖會用 fallback，品質差
- **新類型沒加 llms.txt**：AEO 沒收錄，AI 助手找不到
- **新類型 tags 含 `/`**：Astro build 失敗（如 `ME/CFS` → 用 `ME-CFS`）
- **新類型 description 太長**：超過 155-200 字 SEO 截斷 → schema 限制要嚴格
- **忘了加 sitemap**：Google 不收錄 → Astro 預設會加，但要確認 `astro.config.mjs` integrations
- **新增類型用 px 寫死字體尺寸**：違反 [design-tokens.md](./design-tokens.md) 規則 → 用 token
- **新類型的 card 元件沒用 CategoryTag**：視覺不一致 → 看既有 card 範例
- **改 schema 沒備份**：build 爆找不到舊版 → git commit 改 schema 前先 commit 內容

## 驗證清單

新增類型：

```
- [ ] schema 在 src/content.config.ts，並加進 export const collections
- [ ] 動態路由頁 src/pages/{name}/[slug].astro
- [ ] 列表頁 src/pages/{name}/index.astro
- [ ] Card 元件 src/components/blocks/{Name}Card.astro
- [ ] JSON-LD case 加進 JsonLd.astro
- [ ] OG image case 加進 og/[...slug].png.ts
- [ ] AEO endpoint src/pages/{name}/[slug].txt.ts
- [ ] llms.txt / llms-full.txt 已更新
- [ ] RSS 已包含
- [ ] TopNav 加導覽項目（或刻意不加）
- [ ] 首頁加新區塊（或刻意不加）
- [ ] content-guide.md 加「新增 X」流程
- [ ] 至少 1-2 篇 seed content 在 src/content/{name}/
- [ ] pnpm build 零錯誤
- [ ] schema 驗證所有 seed content 通過
- [ ] Lighthouse CI 不退步
```

修改既有 schema：

```
- [ ] 確認所有既有內容檔已對應更新（git grep 確認）
- [ ] pnpm build 零錯誤
- [ ] 改 enum 的話，前台顯示邏輯也對應改（card / page）
- [ ] 如加新欄位，content-guide.md 加說明
```

## 相關文件

- 內容新增：[../content-guide.md](../content-guide.md)
- Article.astro 排版：[article-layout.md](./article-layout.md)
- design tokens：[design-tokens.md](./design-tokens.md)
- 架構與 SEO：[../architecture.md](../architecture.md)
- 既有 schema：`src/content.config.ts`
