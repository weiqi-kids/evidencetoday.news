# Playbook：健康專題（topic hubs）

> 前台名稱「健康專題」。把同一主題的文章、闢謠、成分解析、Podcast、短影音、趨勢整理在一起，
> 建立 hub↔spoke 內鏈結構，利於讀者建立完整理解，也利於搜尋引擎/AI 認識主題權威（GEO）。

## 鎖定參數（改這些）

| 檔案 | 角色 |
|---|---|
| `src/data/topics.ts` | 主題定義（唯一真相）：`slug` / `name` / `intro` / `thirtySecond` / `matchKeywords` / `faq` |
| `src/pages/topics/index.astro` | `/topics/` 列表頁（CollectionPage + ItemList JSON-LD） |
| `src/pages/topics/[slug].astro` | 各主題頁，依 `matchKeywords` 自動收斂內容 + FAQPage JSON-LD |
| `src/pages/index.astro` | 首頁「健康專題」區塊（讀 `TOPICS` 渲染卡片） |
| `src/components/blocks/Footer.astro` | 頁尾「健康專題」連結 |

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
- **關鍵字太廣**會把不相關內容掃進來（例如單一個「鈣」字）。優先用較專一的詞，並以 `title + tags` 為比對範圍（不掃內文，降低雜訊）。
- **未來 publishDate / draft / under-review** 內容不會進主題頁（共用 `isPublicEntry`，見 `src/utils/visibility.ts`）。
- 新增主題後務必確認 sitemap（`dist/sitemap-0.xml`）有 `/topics/<slug>/`。

## 驗證清單
- [ ] `pnpm build` 零錯誤。
- [ ] 每個主題頁的「代表文章／相關闢謠／相關成分解析」至少一個區塊非空。
- [ ] FAQ 自然、無 AI 味、無制式提醒式問題。
- [ ] `/topics/` 與各 `/topics/<slug>/` 出現在 sitemap。
- [ ] 首頁「健康專題」區塊與頁尾連結正常。
