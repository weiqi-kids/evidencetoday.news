# Playbook：首頁 / Hero 修改

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/pages/index.astro`
- 改 Hero 區（含 HeroParticles canvas、catch phrase、CTA buttons）
- 改首頁的內容區塊順序、分類卡、TrendBubbles、Podcast 區、短影音區、政策連結
- 改首頁 JSON-LD（structured data for SEO）

> 首頁是 SEO 與品牌印象核心，**SEO 結構化資料、Hero copy 和分類卡都是 SEO/AEO 高權重元素**，動之前確認用戶授權。

## 鎖定參數（動之前必看）

### 結構區塊（從上到下，2026-11-28 改版）

首頁是健康媒體的首頁，第一屏要看得到內容，不是品牌宣傳頁。2026-11 量測：舊版桌機要捲 6,500px、手機要捲 12,900px（約第 15 個畫面）才看到「最新內容」，改版後桌機第一屏底部、手機第一屏內就看得到。

1. **Hero**（`#hero`）：只有主標＋一句說明＋一顆主要按鈕「最新文章」。不放 badge、不放第二三顆按鈕、不放 trust cards（見下方「Hero 細節」）
2. **最新內容**（`#latest`）：跨 collection 新到舊取 8 筆；手機單欄只顯示前 4 筆，≥640 兩欄起顯示全部
3. **本日有據至今 數字條**（`#site-stats`，`SiteStats.astro`）
4. **編輯精選**（`#editors-pick`）：只收 90 天內的 featured，不足用近期文章補（見下方）
5. **迷思破解**（`#myths`）、**成分解析**（`#ingredients`）
6. **健康專題**（`#topics`）：只放 `TOPICS` 前 6 個，精簡列（小縮圖＋名稱＋兩行簡介），其餘到 /topics/
7. **Podcast**（`#podcasts`）、**健康議題雷達**（`#trends`）
8. **探索所有內容**（`#categories`）：一排分類連結（圖示＋名稱＋篇數），不是大圖卡
9. **我們怎麼做**（`#principles`）：原 Hero trust cards 的三條編輯原則，純文字三欄＋「認識主編」連結

> **RWD 一律 mobile-first**：首頁所有區塊只用 `min-width` 斷點（640/768/1024/1280），預設單欄、往上加欄。

### 分類連結（「探索所有內容」）

- **2026-11-28 起改成一排分類連結** `.category-links`／`.category-link`：分類色圖示＋中文名稱＋篇數，手機 2 欄、≥768 3 欄、≥1280 6 欄。原本 6 張 16:9 大圖卡（圖片是寫著「健康文章 Health Articles」的品牌縮圖）在首頁占掉約 1,200px，資訊只有名稱與篇數，收成連結列。
- 以下是舊版大圖卡的歷史紀錄，留作脈絡，**現行版面以上一條為準**：
- 首頁「探索所有內容」分類卡維持 3 欄／2 欄／1 欄 RWD、圓角、邊框與乾淨白底，不改成 dashboard 或功能選單風格。
- **2026-08 改為圖上文下**：卡片頂部 `.category-card__image`（16:9，`object-fit: cover`）＋下方 `.category-card__body` 包住原本三段節奏（`.category-card__head` 小圖示＋英文分類、中文標題、描述與篇數）。圖片來源＝各集合既有的 `/og-thumb/{key}.webp` 品牌縮圖（`articles`/`myths`/`ingredients`/`podcasts`/`videos`/`news`），與 `ArticleCard`/`IngredientCard` 缺封面時的 fallback 圖同一批素材，零額外產圖成本。此前「icon 導向、不配照片」是舊決策，因全站色塊/文字比例過重、視覺不夠像新聞網站而汰換。
- 圖示仍保留、不放大：icon box 約 `2.625rem`、SVG 約 `1.45rem`，與英文分類同列，手機版也應保持同列且可讀。
- 只調整首頁分類卡時，避免碰 Hero、最新內容、文章列表、短影音、Podcast 或其他卡片元件。

### 健康專題卡配圖

- **2026-11-28 起首頁改成精簡列** `.topics-home-list`／`.topic-home-row`：5.5rem 方形縮圖＋名稱＋兩行簡介，只放前 6 個專題（原本 18 張圖上文下大卡占約 3,100px）。`/topics` 列表頁維持圖上文下 `.topic-card`。
- **封面去重**：同一篇內容常同時比對到兩個專題，兩張卡會同一張圖。首頁與 `/topics` 都傳共用的 `Set` 給 `resolveTopicCover(topic, pools, used)`，選過的封面下一張卡會跳過；所有候選都用過才退回重複圖。測試見 `src/utils/topic-cover.test.ts`。
- `/topics` 列表卡為**圖上文下**：`.topic-card__image`（16:9）+ 內文。
- 封面來源＝`resolveTopicCover(topic, [articles, ingredients])`（`src/utils/topic-cover.ts`）：從該主題自動歸入的文章／成分解析裡挑一張既有封面（新到舊優先），缺圖退品牌佔位。零手工維護、新內容配好封面即自動更新。**不在 `topics.ts` 手寫每主題圖**。

### 趨勢（news）的兩種呈現：NewsCard vs NewsItem — 不可互換

趨勢新聞有**兩個**呈現元件，用錯會爆版（2026-08-04 首頁「最新內容」即因此破圖）：

| 元件 | 版型 | 只能用在 | 呼叫端 |
|---|---|---|---|
| `NewsCard.astro` | **直式卡片**（圖上文下、白底、圓角），與 `ArticleCard` / `MythCard` / `IngredientCard` / `VideoCard` 同族，縮圖 `16/9` | **多欄格線**的卡片區 | `news/index.astro`（`.news-grid`）、`index.astro` 最新內容（`.latest-grid`）、`tags/[tag]`（`.tag-grid`） |
| `NewsItem.astro` | **橫向媒體列**（縮圖在左、文字在右、只有 `border-bottom` 無卡片底） | **單欄全寬**的列表 | `index.astro` 健康議題雷達側欄（`.trends-layout__left`）、`topics/[slug]`（`.topic-news`） |

**為什麼不能混用**：`NewsItem` 的縮圖軌道是 `clamp(128px, 20vw, 168px) 1fr`，用**視窗**寬度而非容器寬度計算。放進 4 欄格線（每欄約 228–289px）後，168px 縮圖只剩 43–103px 給文字，而 `white-space: nowrap` 的 tag 加 18px 日期需要約 120px → 溢出、日期一字一行。它也沒有白色卡片底，會和鄰居格格不入。

- 兩者的縮圖都走 `getNewsThumbnail(...)`；缺圖退品牌佔位 `/og-thumb/news.webp`。
- **卡片標題一律用 `getDisplayTitle(d.titleDisplay, d.title)`**：`title` 是給 SEO/schema 的完整學術標題，`titleDisplay` 才是讀者看的口語問句。直接傳 `d.title` 會在前台露出「健康雷達 2026-08-22：…WHI 延伸分析…」這種沒人看得懂的長標。
- 趨勢文章的實體照片來源與回填流程見 [`news-article.md`](./news-article.md)「趨勢卡照片化」。

### 「最新內容」區塊

- 資料來自 5 個 collection 合併後依 `publishDate` 新到舊取 **8 筆**（`index.astro` 的 `latestAll`），逐筆依 `item.collection` 分派到對應卡片元件，外層包 `.latest-item`（`display: grid` 讓卡片撐滿格高）。手機單欄 `.latest-item:nth-child(n + 5)` 隱藏，≥640 顯示。
- **鐵則：這一格裡的每一種內容都必須是直式卡片**。新增 collection 時若沒有對應的卡片元件，先做一個，不要拿列表列充數。

### Hero 細節

> Hero 已收斂為**單欄品牌報頭**（`hero__inner` 單欄、mobile-first）：**2026-11-28 起只有主標＋一句說明＋一顆「最新文章」按鈕**，padding `clamp(2rem, 1.25rem + 3vw, 3.75rem)`。badge「健康研究・白話解釋」、「迷思破解」「認識主編」兩顆次要按鈕、三張 trust cards 都已移除；trust cards 的文案搬到頁尾前的 `#principles`，「認識主編」變成該區的連結。
>
> ⚠️ **說明文案寫在 `index.astro` 的 `.hero__subtitle` 裡，不要在 global.css 用透明字＋`::before content` 換字**。2026-11 以前 global.css 有一段這樣的覆寫（另含 52%／48% 兩欄強制），造成讀者看到的與搜尋引擎、螢幕閱讀器讀到的是兩段不同文字，已整段移除。

### 本日有據至今 數字條（`SiteStats.astro`）

Hero 正下方、編輯精選之前的一排四張白卡：文章、闢謠、成分解析篇數，加上全站可點來源數。

- **數字一律 build 時算，禁止寫死**：`index.astro` 的 `siteStats` 從已公開的 collection（`getPublishedArticles()`、`isPublicEntry` 過濾的 myths／ingredients／news）計算；來源數只算 `references[].url` 為 http(s) 的筆數，與 `check-spec` 的「可點來源」同一判準。排程稿不算進去
- **SSR 輸出真正的數字文字**：搜尋引擎、AI 摘要、關掉 JS 的讀者讀到的都是正確數字。滾動用的數字條由元件內 client script 產生、標 `aria-hidden`，原數字移進 `.sr-only` 給螢幕閱讀器。數字條裡的 0–9 用 `::before { content: attr(data-n) }` 畫，**不寫進 DOM 文字**：會執行 JS 的爬蟲（Googlebot 算繪）讀到的頁面文字才不會多出一串 0123456789。不要改成 SSR 或 textContent 輸出 0–9
- **動畫只在進入畫面時播一次**（IntersectionObserver，threshold 0.4）。數字條是在 IntersectionObserver 觸發時才產生的，在那之前畫面上一直是真實數字；不要改成載入時就先換成數字條，否則觀察器沒觸發時會停在一排 0。系統設定「減少動態效果」或瀏覽器不支援 IntersectionObserver 時不做任何替換，直接顯示數字；global.css 的 reduced-motion reset 也會把 transition 壓到 0
- 數字條元素是 script 產生的，沒有 Astro scope 屬性，樣式要寫 `.site-stats :global(.roll…)`
- RWD mobile-first：手機 2 欄、`≥1024` 4 欄；數字字級走 `var(--text-h1)`，數字色走分類色 token（`--color-cat-article`／`-myth`／`-ingredient`，來源數用 `--color-navy`）
- 前三張卡連到各列表頁；來源數那張沒有連結

### 編輯精選區（首頁編輯層級，圖像導向）

抽自舊「Hero 右側焦點卡」，獨立成 Hero 下方的 `#editors-pick`（`.editors-pick`），改為圖像導向：

- `featuredItems[0]`：主焦點 `.ep-main`，含 16:9 封面大圖 +「本週焦點」角標。
- `featuredItems.slice(1, 3)`：側欄 `.ep-side__item`（最多 2 筆）。**2026-08 改版**：側欄項目從「92px 小縮圖＋橫向列表列」改成獨立卡片——16:9 大圖在上、標題在下，卡片本身有邊框/圓角/hover 陰影（與 `.ep-main` 同一套卡片語彙）。桌機（≥1024）「主圖 1.3fr : 側欄 1fr」雙欄、側欄 2 張卡直向堆疊；平板（≥640, <1024）主圖全寬在上、側欄 2 張並排；手機單欄全部堆疊。**改動原因**：舊版 92px 橫向縮圖在主焦點大圖（原 1.6fr）襯托下顯得過小，改成直向卡片後圖片實際渲染寬度大幅提升，且 1.6fr→1.3fr 同時收斂主焦點的視覺壟斷感。
- 安全降級：0 筆不渲染整區；1 筆只渲染主焦點；2–3 筆 1 主 +（最多）2 側。
- **新鮮度（2026-11-28 加）**：`featured: true` 是人工標記，久沒人更新時首頁會一直掛著舊稿（當時是 3 月的維生素 E）。現在只收 **90 天內**的 featured（`FEATURED_FRESH_MS`），不足 3 筆時用「最新內容」沒擺到、且有封面的近期文章補滿（`pickedFeatured`）。
- 主焦點可顯示補充 meta（myth verdict、article 主編把關）但不改資料來源邏輯。
- **封面來源（2026-07-23 修）**：`featuredItems` 各型別（article／myth／ingredient／podcast）都帶 `cover: data.coverImage`，不再只有 article 有圖。渲染前一律過 `safeCover()` 守衛（外連 http(s) 直採；本地 `/…` 須 `existsSync` 於 `public/`，缺圖回 `undefined` → 主焦點顯示「本日有據」品牌字、側欄顯示漸層佔位，不出破圖）。此前 ingredient/podcast 未傳 cover，導致「編輯精選」中 featured 成分（如維生素 C／E）縮圖開天窗；補傳 cover 後恢復。**新增 featured 型別或封面欄位時，記得同步在 mapping 帶 `cover` 並用 `safeCover()` 包起來。**

- **catch phrase**：Hero 主標題固定以兩個 `.hero__title-line` 分行呈現：「把健康議題講得有根據」／「也講得讓人看得懂」，行尾不加標點。
- **HeroParticles**：canvas 全幅，desktop only（mobile 不渲染以省電）
- **CTA**：只有一顆主要按鈕「最新文章 →」（`/articles/`）
- **編輯原則**（原 trust cards）：在 `#principles`，三條「來源透明」「白話解讀」「編輯獨立」純文字三欄（手機 1 欄、≥768 3 欄），不做卡片；禁止使用透明文字或 `::before` 覆蓋文案的 hack。
- **JSON-LD**：`@type: "WebSite"` + `Organization` 結構化資料，用於 Google Knowledge Graph

### SEO / AEO

- 首頁 meta description 影響全站 SEO 描述（fallback）
- OG image：`og:type="website"`，靜態 PNG，不走 satori 動態（首頁 OG 是品牌入口）
- `<h1>` 必須在 hero 區，**只能有一個 h1**

## 修改流程

1. **明確改動目標**：是 Hero copy、分類卡內容、新區塊、還是順序？
2. **改 Hero copy 前**：確認新文案不破壞 brand voice（看 `docs/superpowers/specs/2026-05-07-evidencetoday-design.md`）
3. **改 JSON-LD 前**：用 Google Rich Results Test 驗證 schema
4. **加新區塊**：放在 hero 之後、CtaStrip 之前，按「主題優先」排序（人們最常找的內容放上面）
5. **改順序**：注意分類卡和熱門內容區之間的視覺節奏，相同色系卡不要連續
6. **dev 預覽**：`pnpm dev`，hero 在 mobile / desktop 都看（HeroParticles 只 desktop 出現）
7. **Lighthouse**：首頁是 Lighthouse 主要評測頁，Perf ≥ 90 / SEO ≥ 95 / A11y ≥ 95
8. **build + commit**

## 常見陷阱

- **HeroParticles 高度傳遞鏈斷裂**：canvas 用 `getBoundingClientRect()` 動態量，父層必須有明確高度 → 看 [d3-charts.md](./d3-charts.md)
- **多個 h1**：每頁只能有一個 h1，hero 已是 h1，內容區的標題用 h2
- **改了 catch phrase 沒同步 meta description**：兩個地方文案不一致 → 同步更新首頁社群/SEO 描述來源
- **加新內容區塊用了 `<section>` 沒加 `aria-labelledby`**：a11y 扣分 → 每個 section 要有可程式化標題
- **CTA buttons 多於 3 個**：研究顯示 3 個是注意力上限，加更多會降低 click-through
- **改 JSON-LD schema 但忘了測**：JSON-LD 錯誤不會 break build，但 Google 不收錄 → 一定用 Rich Results Test
- **改 OG image 用了動態 satori**：首頁 OG 應該是靜態品牌圖，不是動態 article cover

## 驗證清單

```
- [ ] @375 / @768 / @1280 hero 都正常（particles 只 desktop 出現）
- [ ] 桌機 1440×900 第一屏底部看得到「最新內容」標題；手機 390×844 第一屏內看得到
- [ ] 只有一個 <h1>
- [ ] meta description 與首頁品牌文案一致
- [ ] JSON-LD 通過 Google Rich Results Test
- [ ] Lighthouse CI: Perf≥90 / SEO≥95 / A11y≥95 / BP≥90
- [ ] OG image 顯示正確（fb sharing debugger 或 twitter card validator）
- [ ] HeroParticles 在 desktop 流暢、mobile 隱藏（不浪費 CPU）
- [ ] 數字條：@375 兩欄、@1280 四欄；捲到時數字滾動一次；關掉 JS 或開「減少動態效果」時直接顯示正確數字
- [ ] pnpm build 零錯誤
```

## 相關文件

- d3 圖表（HeroParticles 等）：[d3-charts.md](./d3-charts.md)
- design tokens：[design-tokens.md](./design-tokens.md)
- 架構與 SEO：[../architecture.md](../architecture.md)
- 設計 spec：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`
