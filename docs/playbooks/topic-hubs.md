# Playbook：健康專題（topic hubs）

> 前台名稱「健康專題」。把同一主題的文章、闢謠、成分解析、Podcast、短影音、趨勢整理在一起，
> 建立 hub↔spoke 內鏈結構，利於讀者建立完整理解，也利於搜尋引擎/AI 認識主題權威（GEO）。

## 鎖定參數（改這些）

| 檔案 | 角色 |
|---|---|
| `src/data/topics.ts` | 主題定義（唯一真相）：`slug` / `name` / `intro` / `thirtySecond` / `matchKeywords` / `faq` |
| `src/utils/topic-cover.ts` | `resolveTopicCover()`：從主題自動歸入的內容取代表縮圖（見「專題卡片縮圖」） |
| `src/pages/topics/index.astro` | `/topics/` 列表頁（CollectionPage + ItemList JSON-LD；卡片帶代表縮圖） |
| `src/pages/topics/[slug].astro` | 各主題頁，依 `matchKeywords` 自動收斂內容 + FAQPage JSON-LD |
| `src/pages/index.astro` | 首頁「健康專題」區塊（讀 `TOPICS` 渲染卡片，同帶代表縮圖） |
| `src/components/blocks/Footer.astro` | 頁尾「健康專題」連結 |
| `src/components/blocks/TopNav.astro` | 導覽列「健康專題」→ `/topics/`（全站內鏈入口） |
| `src/pages/articles/[slug].astro` | 文章頁 spoke→hub 回鏈：用 `matchesTopic()` 自動列出「所屬健康專題」 |

### 目前的 hubs（11 個）
`omega-3` / `lutein` / `calcium-vitamin-d` / `supplement-guide` / `blood-lipids` / `blood-sugar` / `liver-kidney-test`，
以及 2026-07-12 新增：`sleep`（睡眠與助眠）/ `womens-health`（更年期與女性健康）/ `sports-nutrition`（運動營養與肌肉）/ `gut-health`（腸道健康與菌相）。
新增這四個是為了補「已達 5+ 篇卻沒有 pillar page 的最大內容群」，其中睡眠是站上最大叢集。

### hub↔spoke 雙向內鏈
- **hub→spoke**：`/topics/<slug>/` 依 `matchKeywords` 自動收斂內容（既有機制）。
- **spoke→hub**：文章單篇頁（`articles/[slug].astro`）用同一個 `matchesTopic()` 反查本文所屬專題，渲染「所屬健康專題」膠囊連結；零手工維護、新文章自動生效。

### 專題卡片縮圖（資料驅動，零手工維護）
- 專題**沒有**逐主題圖庫，也不維護 `topics.ts` 圖片欄位。`/topics/` 列表頁與首頁「健康專題」區塊的卡片縮圖，一律由 `resolveTopicCover(topic, [articles, ingredients])`（`src/utils/topic-cover.ts`）**從該主題自動歸入的文章／成分解析取一張封面**（各池先按發佈日新到舊排序，取第一個「有比對到本主題且封面合法」者）。
- 合法性判定與各 Card 一致：外連 `http(s)://` 直接採用、本地 `/…` 須 `public` 下存在；全數落空時退回品牌佔位 `/og-thumb/home.webp`（`alt=""`＋`aria-hidden`，視為裝飾）。
- 效果：新內容配好 `coverImage` 後，專題縮圖自動更新，不需手動指派。想換某主題的代表圖 → 讓一篇有理想封面的內容成為該主題「最新一篇」即可。

## 修改流程

### 新增一個主題
1. 在 `src/data/topics.ts` 的 `TOPICS` 陣列加一筆物件：
   - `slug`：語意化英文短語（= 網址 `/topics/<slug>/`）。
   - `name`：前台中文名稱（用「健康專題」語感，**不要**用技術詞「主題集群」）。
   - `intro`：1–2 句簡介（會進 meta description 與頁首）。
   - `thirtySecond`：3–5 點「30 秒重點」，每點能獨立成立。
   - `matchKeywords`：用來把內容歸入此主題的關鍵字（小寫，比對內容的 **title + tags**）。
   - `faq`：2+ 題自然的常見疑問（會輸出 FAQPage JSON-LD；規範見 content-guide「FAQ 撰寫規範」）。
2. `pnpm build`，確認 `dist/topics/<slug>/index.html` 有產出且各區塊**非空**。

### 內容如何被歸入主題
- 採**自動比對**，不需手寫 slug 清單：`matchesTopic()` 對每篇內容的 `title + tags`（myths 另含 `topicTags`）做關鍵字包含判斷。
- 想讓某篇文章進入某主題 → 在該文章 frontmatter 的 `tags` 補上該主題的關鍵字即可。
- 各區塊只在「真的有比對到內容」時渲染，避免空區塊。

## 常見陷阱
- **關鍵字太廣**會把不相關內容掃進來（例如單一個「鈣」字）。優先用較專一的詞，並以 `title + tags` 為比對範圍（不掃內文，降低雜訊）。2026-07-12 已把 `supplement-guide` 過廣的「行銷／誇大／偽科學」關鍵字移除（原本掃進 50+ 篇稀釋主題性），改留專一詞＋補「堆疊／交互作用」。
- **未來 publishDate / draft / under-review** 內容不會進主題頁（共用 `isPublicEntry`，見 `src/utils/visibility.ts`）。
- 新增主題後務必確認 sitemap（`dist/sitemap-0.xml`）有 `/topics/<slug>/`。

## 驗證清單
- [ ] `pnpm build` 零錯誤。
- [ ] 每個主題頁的「代表文章／相關闢謠／相關成分解析」至少一個區塊非空。
- [ ] FAQ 自然、無 AI 味、無制式提醒式問題。
- [ ] `/topics/` 與各 `/topics/<slug>/` 出現在 sitemap。
- [ ] 首頁「健康專題」區塊與頁尾連結正常。
- [ ] `/topics/` 與首頁每張專題卡片都有縮圖（多數應命中內容封面而非佔位；全佔位代表關鍵字沒對到任何有封面的內容）。
