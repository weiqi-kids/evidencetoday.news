# Playbook：改 Article.astro 排版（文章 / 闢謠 / 原料）

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/layouts/Article.astro`
- 改 articles / myths / ingredients 三類頁面的 layout（共用 Article.astro）
- 加新 variant、改 prose / cards 行為
- 改 sidebar（TOC、related）位置、sticky 行為
- 加新 slot（after-content、sidebar、head 之外）

> Article.astro 有 `prose` 與 `cards` 兩種 variant，**選錯 variant 會讓內容區崩壞**（cards 變 68ch 限制 / prose 失去白底卡片）。**動之前先弄懂 variant 系統**。

## 鎖定參數（動之前必看）

### Variant 系統

| Variant | 使用情境 | 視覺 |
|---|---|---|
| `prose`（預設） | articles、ingredients | 白底卡片 `border-radius: var(--radius-card)` + fluid padding，桌面雙欄 + sticky sidebar |
| `cards` | myths | 透明背景 + 無 padding，每個 `.block` 自帶卡片容器 |

### Layout vs Page 分工

| 層 | 負責 |
|---|---|
| Layout (`Article.astro`) | 骨架：grid、sidebar、slot 結構、container padding |
| Page (`myths/[slug].astro` 等) | 皮膚：自己 `.block` 的背景、padding、圓角 |

**禁止**：在 `Article.astro` 的 `.article-grid` 上加視覺樣式（背景、圓角、陰影），這些由 variant 控制。

### 雙欄 sidebar

- 斷點：`@media (min-width: 1024px)`
- 比例：`grid-template-columns: 0.7fr 0.3fr`
- sidebar：`position: sticky; top: 6rem; align-self: start`
- `<1024px`：sidebar `display: none`

### Content 寬度

| variant | `.article-content` max-width | `.prose` max-width |
|---|---|---|
| `prose` | `68ch` | 繼承 `68ch` |
| `cards` | `none`（無限制） | `none` |

> **歷史踩坑**：cards variant 第一版遺漏 `max-width: none`，blocks 被 68ch 限死（記憶：2026-05-13 RWD 修正）。

## 修改流程

1. **辨識 variant**：先用 `git grep "variant=" src/pages/articles src/pages/myths src/pages/ingredients` 找各頁傳什麼 variant
2. **不要混改**：改 prose 樣式不要影響 cards，加新 variant 而非改既有 variant
3. **加新 variant**：
   - 在 `.article-grid--{name}` 加完整樣式（背景、padding、max-width）
   - 同步加對應 `.article-grid--{name} .article-content { max-width: ? }`
   - 同步加對應 `.article-grid--{name} .prose { max-width: ? }`
4. **改 sidebar**：注意 `@media (min-width: 1024px)` 斷點，<1024px 要 hidden
5. **改 slot**：加新 slot 必須在 page 端用 `<slot name="...">` 對應，否則內容掉
6. **測試三類頁面**：articles / myths / ingredients 各跑一頁實測
7. **斷點驗證**：@375 / @768 / @1024 / @1280 都看
8. **build + commit**

## 常見陷阱

- **「重點摘要」字色過淡**：`src/components/blocks/TldrBox.astro` 的 `.summary-box__item` 若誤用 `--color-fog`，在淺底卡片上會導致摘要文字與 bullet 幾乎不可讀；請維持深色文字（`--color-ink`）並同步指定 `li::marker` 顏色。
- **「重點摘要」句尾標點殘留**：TL;DR 若由 `；`、`，` 或 `。` 分句產生 bullet，渲染前要先去除每個項目的結尾標點，避免出現「每點結尾都是符號」的視覺雜訊。
- **分號型 TL;DR 被錯判成整段**：`TldrBox` 需優先判斷 `；` / `;` 分點；只要可拆成 2–12 點就應渲染為清單，避免因點數較多（>6）退回整段 paragraph。

- **新 variant 漏設 max-width: none**：blocks 被預設 `68ch` 限制 → 加新 variant 一定要明確設定 `.article-content` 與 `.prose` 的 max-width
- **在 Article.astro 加視覺樣式**：違反 layout vs page 分工，未來改 variant 會誤傷別處 → 視覺樣式放 page 檔案
- **用 `:global()` 覆蓋 Article.astro 的 class**：scoped style 會被破壞，無法追蹤 → 改用 variant prop 控制
- **改了 sidebar 但忘了 `<1024px` 隱藏**：手機版會出現空 sidebar 區塊
- **myths 用 prose variant**：每個 myth `.block` 已有白底卡片，prose 再包一層 → 卡片裡有卡片，視覺亂
- **`.article-header h1` 寫死 `max-width: 40ch`**：超過 40 字標題會換行，動之前確認長標題場景
- **改 sticky `top: 6rem`**：navbar 是 `4.35rem`，6rem 留約 1.65rem buffer，動之前確認跟 navbar 高度互動

## 驗證清單

```
- [ ] articles 列表頁與某篇文章內頁正常顯示（白底卡片）
- [ ] myths 列表頁與某篇 myth 內頁正常顯示（卡片群）
- [ ] ingredients 列表頁與某個原料內頁正常顯示（白底卡片 + sticky sidebar）
- [ ] @1024px 以上 sidebar 出現且 sticky
- [ ] @<1024px sidebar 隱藏
- [ ] @375 / @768 / @1280 三斷點皆正常
- [ ] pnpm build 零錯誤
- [ ] git diff 不誤動 page 檔案的樣式
```

## 相關文件

- 內容新增：[../content-guide.md](../content-guide.md)
- design tokens：[design-tokens.md](./design-tokens.md)
- CSS / RWD 通用規範：[../../README.md](../../README.md)

## AEO 查詢情境標籤（2026-05）

- 文章 AEO 類型使用 `queryPattern` 欄位（單選）：
  - `ingredient-explainer`（成分解析）
  - `myth-check`（迷思查證）
  - `taiwan-regulation-market`（臺灣法規）
  - `audience-stage-guide`（熟齡族群）
  - `comparison`（成分比較）
- 中文標籤由 `src/utils/article-query-patterns.ts` 對照，不要新增 `qualityPair` 欄位。
- `ArticleCard` 與文章頁 header 可同時顯示「主題分類 + AEO 類型」，但不可取代既有主題分類。
- 手機版優先確保標題可讀；標籤需可換行，不要壓縮標題區塊。

## Ingredients 成分解析版型補充（2026-06）

- `src/pages/ingredients/[slug].astro` 的單篇頁首不再傳入 `disclosure`，避免在標題區重複顯示「一般健康教育／診斷」類提醒；正式醫療聲明仍由 `Article.astro` 底部的 `MedicalDisclaimer` 統一呈現。
- Ingredients 內文應直接從 MDX 的 `## 30 秒認識` 開始，不再在 page template 注入「閱讀這頁前，先說清楚」提醒卡，也不在正文前插入機制圖、證據圖或安全性卡片。
- 所有 `src/content/ingredients/*.mdx` 的二級標題維持一致順序：`30 秒認識`、`基本介紹`、`這是什麼？`、`在身體裡做什麼？／主要作用機制`、`食物來源／常見來源`、`建議攝取量／常見攝取建議／研究中常見使用方式`、`缺乏風險或攝取不足問題`、`補充品常見形式`、`安全性與注意事項`、`常見迷思`、`參考資料`。不要新增會干擾 TOC 的開頭提醒區塊。
- Ingredients RWD 防護：列表卡片 grid 使用 `minmax(0, 1fr)`，單篇 `Article.astro` 的 content/sidebar grid item 需要 `min-width: 0`；TOC 與卡片文字需允許 `overflow-wrap`，避免 360–430px 手機寬度出現整頁水平捲軸。

## Myth 單篇頁面內容卡片規則（2026-06-01 更新）

- `src/pages/myths/[slug].astro` 的科學證據卡片只呈現來源名稱、研究類型與主要發現；不要把資料欄位式的額外解釋直接顯示在前台。
- 若單篇 myth frontmatter 提供 `reasoningCards`，頁面會用藍色／紅色卡片呈現白話辯證；手機上下排列，桌面左右並排。未提供時才退回一般文字段落。
- myth 底部只保留一個「健康資訊提醒」，因此 myth page 會以 `showMedicalDisclaimer={false}` 關閉 `Article.astro` 的預設聲明，不再另外輸出文章資訊卡片或更新紀錄卡片。
- 分享區按鈕字級需維持至少 `1rem`，避免底部操作文字小於內文字級。

## Myths 闢謠單篇結構補充（2026-06-02）

- `/myths/[slug]` 單篇使用 `cards` variant，前台正文只渲染簡潔版型：30 秒快速結論、坊間流傳、科學證據、白話辯證、注意族群、FAQ、References 與健康資訊提醒。`mythClaim`、`verdict`、`evidenceLevel`、`cardConclusion` 可保留於 frontmatter、列表卡片與 SEO，不要在正文重複開成獨立區塊。
- 科學證據卡只顯示來源標題、研究類型與主要發現；`limitation`、`relevanceToMyth` 可保留於資料層，但不得在前台獨立輸出。
- `safePractice`、`whenToSeekProfessionalAdvice`、`terminology` 等欄位可保留於 content schema / frontmatter，但 myths 單篇不得再獨立渲染額外做法或求助區塊；有價值內容應整併到白話辯證或「哪些人要特別小心？」。
- 「白話辯證」需使用 `.myth-reasoning-grid` 搭配藍色「有道理的部分」與紅色「被誇大的部分」兩張卡；桌機雙欄、手機單欄。
- myths 單篇底部只保留一個「健康資訊提醒」，固定文案由 page template 統一輸出；分享區字級維持 `1rem`。
- `scripts/check-myth-quality.mjs` 需同步檢查 27 篇 published myths、快速結論至少 2 點、必要正文區塊、藍紅雙框、References 至少 2 個 URL，以及禁止套版句與已移除的舊區塊標題。
- myths 單篇 `<head>` 同時輸出 `Article` 與 `ClaimReview` 兩個 JSON-LD 物件（array 形式，透過 `JsonLd.astro`）。ClaimReview 由 `src/utils/schema-org.ts` 的 `buildClaimReview()` 組裝，使用 `mythClaim`、`verdict`、`verdictSummary`、`publishDate`、`updatedDate`、`url`、`name`（fact-check 標題，帶 `social.title`）欄位。`reviewRating.alternateName` 用 `displayVerdict()`（`src/utils/myths/schema.ts`）修正 `需謹慎 → 須謹慎`，與頁面卡片顯示一致；該 helper 同時供前台卡片使用。不得新增前台可見區塊。

## 全站 SEO / OG 分享預覽規則（2026-06-02）

- 全站分享標題、描述與 OG 圖路徑集中在 `src/utils/social-meta.mjs` 維護；頁面請優先使用 `STATIC_SOCIAL`、`listSocial()`、`contentSocial()` 或 `tagSocial()`，不要在各頁零散拼接 `og:title` / `og:description`。
- `Base.astro` 支援 `ogTitle`、`ogDescription`、`ogImage`，並會同步輸出 Open Graph 與 Twitter Card；單篇版型由 `Article.astro` / `Media.astro` 轉傳 `socialTitle` 與 `socialDescription`。
- `scripts/generate-og.mjs` 會在 build 前產生首頁、靜態頁、分類首頁、內容單篇與標籤頁共用的 1200×630 PNG。OG 圖只放短 badge、短主題與小品牌識別；不要把完整 description 放進圖裡。
- 分類首頁固定使用短字主視覺：健康文章、迷思查證、成分解析、喜聞樂健、短影音、健康雷達。若新增 collection，必須同步補 `COLLECTION_SOCIAL` 與產圖模板色彩。
- 內容 frontmatter 可選填 `ogShortTitle`、`socialTitle`、`socialDescription` 作為人工覆寫；未填時會由 title / description / summary 推導短標與分享描述。文案應維持 40–80 個中文字左右，避免「值得關注」「帶你了解」「一篇看懂」等套版語氣。
- **`seoTitle`（articles 限定，覆寫 `<title>`，不影響頁面 H1）**：`src/content.schemas.ts` 的 `articlesSchema` 提供 `seoTitle`（`max(60)`），`src/pages/articles/[slug].astro` 以 `seoTitle={data.seoTitle ?? social.title}` 帶入 `Article.astro`。用途是把搜尋查詢關鍵詞**前置**到 SERP 標題，解決編輯式長標題不對題、CTR 低的問題（依 GSC 真實查詢調整，見 `docs/playbooks/audience-insights.md`）。**需自帶品牌後綴**（如「｜本日有據」，因為走的不是 `social.title` 那條會自動加雙重後綴的路徑）；SERP 中文約 28–30 字會截斷，宜精簡並把關鍵詞放最前。未填時維持原本 `social.title`（機器推導短標）行為，不影響其他文章。`socialTitle`（OG 標題）不受 `seoTitle` 影響，仍走 `social.title`。
- 標籤頁的標題與描述會依 tag 個別產生，但共用 `/og/tags/index.png`，避免 build 前產生數百張低差異圖片。

## 詳情頁封面圖與證據標籤（2026-07-15 介面優化 Phase 1）

- **`Article.astro` 詳情頁主視覺**：新增 `coverImage` / `coverAlt` / `coverImageCredit` 三個可選 prop。當 `coverImage` 有效時（外連 http(s)，或本地 `/…` 且 `public` 下確實存在，判斷同 `ArticleCard` 的 `safeCover`），在 header 之後、`.article-grid` 之前渲染 `<figure class="article-cover">`：固定 `aspect-ratio:16/9`＋`max-height:24rem`＋`object-fit:cover`＋`--radius-card`，攝影者以 `.article-cover__credit`（沿用 figure credit 樣式）呈現「圖片／{credit}」。這是元件級 `<img src>`，**非**行內 markdown `](images/`，不觸犯幽靈圖片硬規則。`articles/[slug].astro` 與 `ingredients/[slug].astro` 皆傳入 `data.coverImage/coverAlt/coverImageCredit`。myths 不傳、故 cards variant 無封面（維持刻意簡化）。
- **成分頁「重點摘要」修正**：`ingredients/[slug].astro` 原本傳 `tldr={data.introduction}`，但 `Article.astro` 只認 `citationAnswer`（無 `tldr` prop）→ introduction 被靜默丟棄、成分頁沒有重點摘要區塊。已改為 `citationAnswer={data.introduction}`。
- **參考文獻證據類型中文化**：`ReferenceList.astro` 原本直接輸出 `ref.type` 英文 enum（`meta-analysis`、`rct`…，屬 `content:audit` 會抓的 raw enum 外露）。改用 `src/utils/evidence-labels.ts` 的 `referenceTypeLabel()`（涵蓋 referenceSchema.type 全 14 值＋ animal/in-vitro/case-report；用詞對齊 myths 的 sourceTypeLabels）。未知值原樣回傳、不吞資料。
- **`IngredientCard` 缺圖 fallback**：原本 `{coverImage && <img>}`，缺圖時完全不渲染媒體區、同一 grid 高度參差、也無檔案存在守衛。已比照 `ArticleCard` 加 `safeCoverImage` 守衛，缺圖時渲染 `.ingredient-card__thumb--fallback`（cat-ingredient 類色漸層＋「本日有據」佔位，`aria-hidden`），維持 16/9 比例讓卡片高度一致。
- **闢謠頁頂端判定徽章**：`myths/[slug].astro` 的「30 秒快速結論」左欄（`.quick-panel`）加 `<VerdictBadge verdict={d.verdict} size="lg" />`＋`<span class="pill evidence">證據強度：{d.evidenceLevel}</span>`（evidenceLevel 已是中文 enum 高／中／低）。重用原本閒置的 `.quick-badges/.pill/.evidence` CSS，並清掉真正無用的 dead CSS（`.claim/.verdict/.quick-summary/.belief`）。徽章顏色由 verdict tone 決定（對→綠、錯→紅、不足→藍），天然情緒中立。`VerdictBadge` 的 lg 標籤改用 `displayVerdict()`（需謹慎→須謹慎）。此為既有簡化版型內的強化、非新增內容區塊。

## Articles 文章 JSON-LD 審閱欄位規則（2026-06-14）

`src/pages/articles/[slug].astro` 的 `articleSchema` 採 `['Article', 'MedicalWebPage']` 多型別，審閱相關欄位遵循以下邏輯：

- `medicalAudience`：每篇文章都輸出（描述受眾，與審閱狀態無關）。
- `reviewedBy` 與 `lastReviewed` **配對輸出**，兩者同時出現或同時省略，不得各自獨立存在。
- `reviewedBy` 的決定順序（以 `reviewedBy` 變數計算，位於 `const articleSchema =` 之前）：
  1. frontmatter `reviewer` 有值 → `buildPerson(data.reviewer)`（Person 型別）
  2. `reviewer` 無值但 `editorReviewed` 為 true（schema 預設 true）→ 機構 `{ '@type': 'Organization', name: '本日有據', url: 'https://evidencetoday.news/' }`
  3. 兩者皆否 → `null`，不輸出 `reviewedBy` 也不輸出 `lastReviewed`
- 驗證指令（build 後執行）：
  ```bash
  node -e "const fs=require('fs');const ds=require('child_process').execSync('ls dist/articles').toString().trim().split('\n').filter(d=>fs.existsSync('dist/articles/'+d+'/index.html'));let person=0,org=0,none=0,mismatch=0;for(const d of ds){const arr=[...fs.readFileSync('dist/articles/'+d+'/index.html','utf8').matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flat();const a=arr.find(o=>Array.isArray(o['@type'])&&o['@type'].includes('MedicalWebPage'));if(!a){console.log('NO node:',d);continue;}const hasRev='reviewedBy' in a, hasLR='lastReviewed' in a;if(hasRev!==hasLR){mismatch++;console.log('MISMATCH:',d,'reviewedBy',hasRev,'lastReviewed',hasLR);}if(!hasRev){none++;continue;}if(a.reviewedBy['@type']==='Person')person++;else org++;}console.log('Person reviewer:',person,'| Org reviewer:',org,'| no reviewer:',none,'| pairing mismatches:',mismatch)"
  ```
  預期：`pairing mismatches: 0`，大多數文章為機構審閱、少數為 Person。
