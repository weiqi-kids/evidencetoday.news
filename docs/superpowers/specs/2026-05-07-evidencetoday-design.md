# Evidence Today 本日有據 — 完整設計規格

> 版本：v1.3
> 日期：2026-05-07
> 狀態：審查通過（v1.3 經四輪審查）

### 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-05-07 | 初版 |
| v1.1 | 2026-05-07 | 根據第一輪審查修正 60 項問題：oklch 色彩值全面校正、Schema.org 選型修正、補齊缺失頁面規格、統一 schema 欄位、補充技術細節 |
| v1.2 | 2026-05-07 | 根據第二輪審查修正 11 項問題：coral 對比度修正、分類色對比度修正、News schema 補齊、交叉連結表補齊、Media layout 新增、字體載入策略、列表頁分頁統一、verdict-insufficient 對比度修正 |
| v1.3 | 2026-05-07 | 根據第三輪審查修正 4 項問題：Video txt 模板加 Duration、深色底 coral 連結對比度處理、article badge 對比度安全邊距、對比度檢核表補齊 |

---

## 第一部分：總體策略

### 品牌定位

- 中文品牌名：本日有據
- 英文品牌名：Evidence Today
- 網域：evidencetoday.news
- 品牌語氣：冷靜、可信、白話、有編輯判斷、不賣弄專業
- 核心印象：健康議題編輯媒體，不是診所、不是保健品官網、不是八卦健康站

### 設計策略

- 風格方向：Frontier Editorial（前線健康編輯室）
- 啟發參考：STAT 類型的專業媒體感 — 權威、現代、留白多、重內容層級
- 設計原則：像編輯部，不像商城；像可信內容站，不像保健廣告站
- 無障礙與高對比從第一天就納入設計流程
- Dark mode：v1 不支援，未來版本可利用 oklch 色彩系統快速擴充

### 技術決策

| 決策 | 結論 |
|------|------|
| 框架 | Astro v5.x + Svelte islands + d3.js |
| 內容管理 | Astro Content Collections（Markdown/MDX，放 repo） |
| 色彩系統 | oklch 為唯一定義，無 hex fallback |
| 瀏覽器支援 | Chrome 111+、Firefox 113+、Safari 16.4+、Edge 111+ |
| 部署 | GitHub Pages，main push 自動部署至 gh-pages |
| 連結檢查 | 站內 + 站外（外部為 warning）+ Lighthouse CI |
| SEO/AEO | Schema JSON-LD + llms.txt + 每篇 .txt 純文字 endpoint |
| d3.js 範圍 | 資料圖表 + 頁面裝飾特效 + 機制路徑視覺化 |
| 套件管理器 | pnpm |
| 搜尋 | Pagefind（build time 索引，零後端） |

### 為什麼這樣做

1. Astro 是目前最適合內容網站的框架 — 預設零 JS、build time 靜態生成、Content Collections 原生支援
2. Svelte islands 用於需要互動的元件（d3 圖表、搜尋、FAQ 手風琴等），編譯後幾乎零 runtime
3. d3.js 直接操作 SVG/Canvas，不需要 React 的虛擬 DOM 層，跟 Svelte 整合自然
4. oklch 色彩空間感知均勻，讓對比度計算更準確，配合 color-mix() 可動態生成派生色
5. GitHub Pages 免費、穩定、跟 repo 同步，適合靜態內容站
6. llms.txt + .txt endpoint 是目前 AEO 的最佳實踐，成本極低但訊號明確

### Astro 配置要點

```javascript
// astro.config.mjs
{
  site: 'https://evidencetoday.news',
  integrations: [svelte(), sitemap(), mdx()],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    css: { transformer: 'lightningcss' }  // oklch + color-mix 原生支援
  }
}
```

---

## 第二部分：資訊架構（IA）

### 主導覽

```
本日有據 [Logo]
├── 文章
├── Podcast
├── 短影音
├── 闢謠
├── 原料
├── 趨勢
├── 關於我們
└── [搜尋圖示]
```

手機端：Logo + 搜尋圖示 + 漢堡選單

### 頁面樹狀結構

```
/                                  首頁
│
├── /articles/                     文章列表頁
│   └── /articles/[slug]/          單篇文章頁
│
├── /podcasts/                     Podcast 列表頁
│   └── /podcasts/[slug]/          Podcast 單集頁
│
├── /videos/                       短影音列表頁
│   └── /videos/[slug]/            短影音單篇頁
│
├── /myths/                        闢謠列表頁
│   └── /myths/[slug]/             闢謠單篇頁
│
├── /ingredients/                  原料索引頁
│   └── /ingredients/[slug]/       原料單頁
│
├── /news/                         趨勢/健康議題雷達頁（僅列表，無單篇）
│
├── /about/                        關於本站
├── /editorial-policy/             編輯政策
├── /medical-disclaimer/           醫療聲明
├── /disclosure/                   利益揭露政策
├── /privacy/                      隱私權政策
├── /terms/                        使用條款
├── /contact/                      聯絡頁
│
├── /search/                       搜尋結果頁
├── /tags/[tag]/                   標籤彙整頁
├── /404                           找不到頁面
│
├── /llms.txt                      AI 爬蟲索引（build time 動態生成）
├── /llms-full.txt                 AI 爬蟲完整內容（build time 動態生成）
├── /articles/[slug].txt           文章純文字版
├── /myths/[slug].txt              闢謠純文字版
├── /ingredients/[slug].txt        原料純文字版
├── /podcasts/[slug].txt           Podcast 純文字版
├── /videos/[slug].txt             短影音純文字版
│
├── /sitemap.xml                   Sitemap
├── /robots.txt                    爬蟲規則（靜態）
├── /rss.xml                       RSS 主 Feed（全類型）
├── /articles/rss.xml              文章 RSS Feed
├── /myths/rss.xml                 闢謠 RSS Feed
├── /podcasts/rss.xml              Podcast RSS Feed
└── /videos/rss.xml                短影音 RSS Feed
```

News 項目為外部新聞摘要，不產生單篇頁面，連結導向外部 sourceUrl 或站內相關內容。

### 內容交叉連結邏輯

六種內容類型之間的互連，在 frontmatter 中用 slug 陣列實作：

```
Article    <-> Myth         文章引用闢謠、闢謠延伸閱讀指向文章
Article    <-> Ingredient   文章提到原料、原料頁列出相關文章
Article    <-> Video        文章有對應短影音版本
Article    <-> Podcast      文章是 Podcast 的文字整理
Myth       <-> Ingredient   闢謠涉及特定原料
Myth       <-> Video        闢謠主題有短影音版本
Myth       <-> Podcast      闢謠主題在 Podcast 中討論
Ingredient <-> Video        原料有對應短影音介紹
Ingredient <-> Podcast      原料在 Podcast 中討論
Video      <-> Podcast      短影音與 Podcast 同題材
News       ->  All types    趨勢頁導流到所有內容類型（單向）
```

所有 collection schema 都包含完整的雙向 related 欄位（見各 schema 定義）。News 為單向導流，其他 schema 不含 relatedNews。

### Footer 結構

```
┌─────────────────────────────────────────────────────┐
│ [Logo] 本日有據 Evidence Today                       │
│ 把健康議題，講得有根據，也講得讓人看得懂。              │
├──────────┬──────────┬──────────┬─────────────────────┤
│ 內容      │ 資源      │ 關於      │ 追蹤               │
│ 文章      │ 搜尋      │ 關於本站   │ LINE 官方帳號      │
│ Podcast  │ RSS      │ 編輯政策   │ YouTube            │
│ 短影音    │ Sitemap  │ 醫療聲明   │ Podcast 平台       │
│ 闢謠      │          │ 利益揭露   │                    │
│ 原料      │          │ 隱私政策   │                    │
│ 趨勢      │          │ 使用條款   │                    │
│           │          │ 聯絡我們   │                    │
├───────────────────────────────────────────────────────┤
│ (C) 2026 本日有據 Evidence Today                      │
│ 本站內容僅供參考，不構成醫療建議。詳見醫療聲明。          │
│ 本站與健康產品公司之關係，詳見利益揭露政策。              │
└───────────────────────────────────────────────────────┘
```

---

## 第三部分：首頁詳細規格

### 區塊順序

```
1. Top Navigation
2. Hero 主視覺區
3. 分類入口區（六宮格）
4. 最新內容流
5. Podcast 區塊
6. 闢謠精選區塊
7. 原料精選區塊
8. 趨勢雷達區塊
9. CTA 區塊（LINE 追蹤）
10. Footer
```

### 1. Top Navigation

- 背景：`--color-paper` 半透明 + `backdrop-blur`
- Sticky top，z-index 40
- 左：Logo（方框切角符號 + 「本日有據」+ 小字 Evidence Today）
- 中（桌面）：主導覽連結
- 右：搜尋圖示 + LINE 追蹤按鈕（CTA Button 小型，coral 底）
- 手機：Logo + 搜尋圖示 + 漢堡選單

### 2. Hero 主視覺區

背景：
- 漸層：`--color-teal` -> `--color-navy`，135deg（teal L=0.38 到 navy L=0.25，明度差 0.13，漸層可見）
- d3.js 裝飾層：細網格點陣靜態底 + d3 動態微粒子緩慢漂浮
- 粒子只做緩慢漂移，不做炫技動畫
- 手機端（< 768px）：不載入 d3 粒子，僅顯示靜態網格底圖（使用 `client:media="(min-width: 768px)"`）

內容（左欄 55%，桌面雙欄 grid）：
- 頂部 Badge：`主編把關・研究脈絡・白話解釋`
- H1：`把健康議題，講得有根據，也講得讓人看得懂。`（白色，--font-serif）
- 副標：本日有據是一個以文章、Podcast、短影音、闢謠與原料整理為核心的健康編輯平台。內容重視證據層級、更新日期、引用來源與閱讀友善度，讓複雜的健康資訊回到可理解、可查證、可行動的狀態。
- 按鈕組：
  - Primary Button：`最新文章 ->` (teal 底，頁面主動作)
  - Secondary：`迷思破解` (白色邊框)
  - CTA Button：`追蹤 LINE 拿整理筆記` (coral 底，全站推廣動作)
- 信任元素三欄卡片：
  - 「每篇都有更新日」/ 讓資訊時效一目了然
  - 「主編校稿標章」/ 建立信任與內容責任
  - 「引用來源可展開」/ 先看結論，也能回頭查證

內容（右欄 45%）：
- 三張焦點卡片垂直堆疊
- 數據來源：自動取各類型最新一篇（最新文章 / 最新 Podcast / 最新闢謠），可透過 frontmatter `featured: true` 手動置頂覆蓋
- 每張卡頂部有分類色條
- 卡片白底，圓角 1.5rem

手機端：單欄，先文字後卡片，信任元素改橫向捲動，按鈕全寬堆疊

### 3. 分類入口區（六宮格）

- 標題：`探索所有內容`
- 6 張卡片，桌面 3x2 grid，平板 2x3，手機單欄
- 每張卡片：分類圖示 + 分類英文 Badge + 中文標題 + 說明 + 內容數量 + 「查看分類」連結
- 白底、--color-fog 邊框、hover 上浮 2px + 陰影加深

### 4. 最新內容流

- 標題：`最新內容`
- 右上角：「看全部內容」Secondary Button
- 桌面 4 欄 grid，平板 2 欄，手機單欄
- 混合顯示所有類型最新內容（內容類型識別方式：使用 Astro collection name，非 frontmatter 欄位）
- 卡片：分類色條 + 分類 Badge + 標題 + 摘要 + 作者/校稿 + 日期

### 5. Podcast 區塊

- 深色底 --color-navy，視覺斷層
- 左欄（55%）：小標 + 大標 + 說明 + CTA Button（播放最新單集）+ hashtag 列
- 右欄（45%）：最新 3 集迷你卡片列表
- 深色卡片文字系統：標題用 white、meta 用 `oklch(0.75 0.01 220)`、連結用 `--color-coral`
- 手機：單欄堆疊

### 6. 闢謠精選區塊

- --color-paper 背景
- 標題：`迷思破解`
- 3 張闢謠卡片，桌面 3 欄
- 每張：結論 pill + 迷思原句 + 一句話結論 + 連結
- 底部：「看全部闢謠」Secondary Button

### 7. 原料精選區塊

- 白底
- 標題：`原料知識庫`，副標：`用研究證據說話，不用行銷話術`
- 3-4 張原料卡片橫向排列
- 每張：原料名 + 一句話介紹 + 證據強度 mini badge + 連結

### 8. 趨勢雷達區塊

- 淺灰底（color-mix --color-fog 20%）
- 標題：`健康議題雷達`
- 左欄：3-5 則新聞摘要卡
- 右欄：d3.js 熱詞趨勢圖（詳見 d3 元件規格）
- 底部：「查看完整趨勢」連結
- 趨勢頁需至少每週更新一次。初期若內容量不足，此區塊可退化為「主編選題 + 最新新聞列表」，不顯示熱詞圖表。

### 9. CTA 區塊

- 白底卡片，單一行動呼籲
- 標題：`追蹤 LINE，回覆關鍵字拿整理筆記`
- CTA Button：`立即追蹤`（coral）

### 10. Footer

如 IA 段落定義。

---

## 第四部分：各分頁詳細規格

### 文章列表頁 /articles/

- Hero 區（簡版）：標題 + 副標 + 搜尋/篩選列
- 篩選：按主題標籤、按日期排序
- Grid：桌面 3 欄、平板 2 欄、手機單欄
- 卡片：分類色條 + 標題 + 摘要 + 作者 + 日期 + 校稿標章
- 分頁導覽：每頁 12 筆（配合 3 欄 grid 為 4 行），非 infinite scroll（對 SEO 和長者操作友善）
- Breadcrumb：首頁 > 文章

### 單篇文章頁 /articles/[slug]/

Breadcrumb：首頁 > 文章 > {文章標題}

Header 區（--color-paper 底）：
- 分類 Badge + 校稿標章 Badge
- 利益揭露標示（若 frontmatter disclosure 有值，在此處顯示）
- 發佈日 + 最後更新日
- H1（--font-serif，48px/32px）
- Lead 摘要（--text-lead）
- Meta 列：閱讀時間 / 作者 / 審稿

主內容區（白底，桌面 grid: 0.7fr 0.3fr）：

左欄：
1. TL;DR 區塊 — --color-teal-subtle 底，圓角卡片
2. 內文 — Markdown 渲染，max-width: 68ch
3. FAQ 區塊 — 手風琴式，Schema.org FAQPage markup
4. 引用來源 — 折疊式
5. 醫療聲明 — 固定樣板
6. 證據判讀聲明（若有）
7. 延伸閱讀 — 相關 myth/ingredient/video/podcast 卡片
8. 相關內容推薦 — 同類型文章 3 篇

右欄（sticky sidebar，桌面限定）：
- TOC 目錄（scroll spy 高亮當前段落）
- 信任元素摘要
- CTA 小卡

手機端：sidebar 消失，TOC 變為文章頂部折疊式

Content Collection Schema（articles）：

```typescript
{
  title: z.string(),
  description: z.string().max(155),   // 與 meta description 長度一致
  author: z.string(),
  reviewer: z.string().optional(),
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date(),
  tags: z.array(z.string()),
  tldr: z.string(),
  readingTime: z.number(),
  editorReviewed: z.boolean().default(true),
  featured: z.boolean().default(false),          // 首頁焦點置頂
  disclosure: z.string().optional(),             // 利益揭露聲明
  coverImage: z.string().optional(),             // OG image（若無則自動生成）
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    type: z.enum(["meta-analysis", "rct", "observational", "review", "guideline", "other"]),
  })).optional(),
  relatedMyths: z.array(z.string()).optional(),
  relatedIngredients: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),
  relatedPodcasts: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
}
```

### Podcast 列表頁 /podcasts/

- Hero 區：節目名稱 + 簡介 + 收聽平台連結（Apple/Spotify/Google）
- 篩選/搜尋
- 精選單集區（置頂 1-3 集）
- 全部單集列表：深色卡片（--color-navy 底），封面縮圖 + 集數 + 標題 + 時長 + 日期
- 深色卡片文字：標題 white、meta `oklch(0.75 0.01 220)`、連結 --color-coral
- CTA：訂閱 Podcast
- 分頁導覽：每頁 12 筆
- Breadcrumb：首頁 > Podcast

### Podcast 單集頁 /podcasts/[slug]/

Breadcrumb：首頁 > Podcast > {集數標題}

Layout：Media.astro（單欄 + embed 播放器區塊，無 sidebar）

Header 區：
- Podcast 分類 Badge + 集數
- H1 標題
- 發佈日 + 時長

播放器區：
- 初期使用第三方 embed（Spotify embed 或 Apple Podcasts embed），schema 中以 embedUrl 控制
- 未來如需自建播放器（含進度條、速度控制、章節跳轉 UI），以獨立 Svelte 元件實作
- 章節時間戳列表，每個可點擊（embed 模式下跳轉為另開播放器）

內容區：
- 摘要（100-200 字）
- Show Notes（條列式）
- 延伸閱讀
- 引用來源
- CTA

Content Collection Schema（podcasts）：

```typescript
{
  title: z.string(),
  description: z.string().max(155),
  episodeNumber: z.number(),
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),        // Podcast 集數通常不更新，故 optional
  duration: z.string(),                           // "32:15"
  audioUrl: z.string().url().optional(),
  embedUrl: z.string().url().optional(),
  coverImage: z.string().optional(),
  featured: z.boolean().default(false),
  chapters: z.array(z.object({
    time: z.string(),
    title: z.string(),
  })).optional(),
  showNotes: z.array(z.string()).optional(),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    type: z.enum(["meta-analysis", "rct", "observational", "review", "guideline", "other"]),
  })).optional(),
  relatedArticles: z.array(z.string()).optional(),
  relatedMyths: z.array(z.string()).optional(),
  relatedIngredients: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),   // 同題材短影音
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
}
```

### 短影音列表頁 /videos/

- 標題 + 篩選
- Grid：桌面 3 欄
- 卡片：YouTube 縮圖 + 標題 + TL;DR 前 50 字 + 日期
- Hover 顯示播放圖示
- 分頁導覽：每頁 12 筆
- Breadcrumb：首頁 > 短影音

### 短影音單篇頁 /videos/[slug]/

Breadcrumb：首頁 > 短影音 > {標題}

Layout：Media.astro（單欄 + embed 播放器區塊，無 sidebar）

- H1 標題
- YouTube 嵌入（lite-youtube web component，效能優先）
- YouTube embed 載入失敗時顯示：標題 + 「前往 YouTube 觀看」文字連結
- 30 秒重點 TL;DR 區塊
- 文字稿/摘要
- 主題標籤
- 延伸閱讀
- 引用來源（若有）
- CTA

Content Collection Schema（videos）：

```typescript
{
  title: z.string(),
  description: z.string().max(155),
  youtubeId: z.string(),
  duration: z.string().optional(),                // "0:30" 短影音時長
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()),
  tldr: z.string(),
  transcript: z.string().optional(),
  coverImage: z.string().optional(),
  featured: z.boolean().default(false),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    type: z.enum(["meta-analysis", "rct", "observational", "review", "guideline", "other"]),
  })).optional(),
  relatedArticles: z.array(z.string()).optional(),
  relatedMyths: z.array(z.string()).optional(),
  relatedIngredients: z.array(z.string()).optional(),
  relatedPodcasts: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
}
```

### 闢謠列表頁 /myths/

- 標題：迷思破解
- 篩選：按結論標籤（真/假/證據不足/情境成立）+ 按主題
- Grid：桌面 2 欄（闢謠卡需要更多閱讀空間）
- 卡片：結論 pill + 迷思原句粗體 + 一句話結論 + 日期
- 分頁導覽：每頁 12 筆
- Breadcrumb：首頁 > 闢謠

### 闢謠單篇頁 /myths/[slug]/

Breadcrumb：首頁 > 闢謠 > {迷思原句}

Header 區：
- 闢謠分類 Badge
- 結論標籤 — 大型 pill：
  - 真：--color-verdict-true 底白字
  - 假：--color-verdict-false 底白字
  - 證據不足：--color-verdict-insufficient 底白字
  - 情境成立：--color-verdict-contextual 底白字
- H1：迷思原句（引號框起，--font-serif）

內容區（單欄，max-width: 68ch）：
1. 結論摘要 — callout 區塊
2. 為什麼會流傳 — 心理/語境分析
3. 證據整理 — 依研究等級分層：
   - Meta-analysis / 系統性回顧
   - RCT 隨機對照試驗
   - 觀察性研究
   - 動物/體外實驗
   - 每層用不同底色深淺區分
4. 一般人怎麼做最安全 — 行動建議 callout
5. 引用來源（必備，折疊式）
6. 證據判讀聲明：「本判讀基於截至 {updatedDate} 的公開研究證據，隨新證據發表可能調整。」
7. 延伸閱讀
8. 醫療聲明

Content Collection Schema（myths）：

```typescript
{
  title: z.string(),                              // 迷思原句
  description: z.string().max(155),
  verdict: z.enum(["true", "false", "insufficient", "contextual"]),
  verdictSummary: z.string(),
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date(),
  tags: z.array(z.string()),
  whyItSpreads: z.string(),
  actionAdvice: z.string(),
  featured: z.boolean().default(false),
  coverImage: z.string().optional(),
  evidence: z.array(z.object({                    // 必填：闢謠核心內容
    level: z.enum(["meta-analysis", "rct", "observational", "animal", "in-vitro"]),
    summary: z.string(),
    references: z.array(z.string()).optional(),
  })).min(1),                                     // 至少一筆證據
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    type: z.enum(["meta-analysis", "rct", "observational", "review", "guideline", "other"]),
  })),
  relatedArticles: z.array(z.string()).optional(),
  relatedIngredients: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),
  relatedPodcasts: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
}
```

### 原料索引頁 /ingredients/

- 標題：原料知識庫
- 搜尋列（prominently displayed）
- 注音首字母索引（快速跳轉，使用 anchor link）。每筆原料的 frontmatter 包含 `sortKey` 欄位（注音首字母如「ㄧ」或拼音首字母如「Y」），build time 按 sortKey 分組。
- Grid：桌面 3 欄
- 卡片：原料名 + 一句話介紹 + 研究用途 tags + 證據強度 mini badge
- 分頁導覽：每頁 12 筆
- Breadcrumb：首頁 > 原料

### 原料單頁 /ingredients/[slug]/

Breadcrumb：首頁 > 原料 > {原料名}

Header 區：
- 原料分類 Badge
- H1 原料名（中文 + 英文）
- 一句話白話介紹

內容區（桌面 grid: 0.7fr 0.3fr）：

左欄：
1. 是什麼 — 白話介紹
2. 研究常探討的用途 — 條列，每項附證據強度小標籤
3. 機制與路徑 — 文字說明 + Pathway Diagram placeholder（v1 顯示靜態示意圖或純文字，v2 實作 d3.js 互動視覺化）
4. 證據強度分級 — d3.js Evidence Scale 元件（詳見 d3 元件規格）
5. 安全性與交互作用 — 族群注意 + 藥物交互
6. 研究趨勢摘要 — 預留區塊，連到趨勢頁
7. 相關文章/闢謠/影音
8. 引用來源
9. 醫療聲明

右欄（sticky sidebar）：
- TOC
- 證據強度總覽 mini 圖
- 安全性警示摘要

Content Collection Schema（ingredients）：

```typescript
{
  title: z.string(),                              // 中文名
  titleEn: z.string().optional(),                 // 英文名
  sortKey: z.string(),                            // 注音/拼音首字母，用於索引排序
  description: z.string().max(155),
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date(),
  tags: z.array(z.string()),
  introduction: z.string(),
  featured: z.boolean().default(false),
  coverImage: z.string().optional(),
  disclosure: z.string().optional(),              // 利益揭露（若涉及特定品牌）
  uses: z.array(z.object({
    purpose: z.string(),
    evidenceLevel: z.enum(["meta-analysis", "rct", "observational", "animal", "in-vitro"]),
    summary: z.string(),
  })),
  mechanism: z.string().optional(),
  safety: z.object({
    general: z.string(),
    interactions: z.array(z.object({
      substance: z.string(),
      description: z.string(),
    })).optional(),
    populations: z.array(z.object({
      group: z.string(),
      note: z.string(),
    })).optional(),
  }).optional(),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    type: z.enum(["meta-analysis", "rct", "observational", "review", "guideline", "other"]),
  })),
  relatedArticles: z.array(z.string()).optional(),
  relatedMyths: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),
  relatedPodcasts: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
}
```

### 趨勢頁 /news/

Dashboard + editorial selection 混合頁。News 項目不產生單篇頁面。

Breadcrumb：首頁 > 趨勢

區塊 1 — 主編選題（Editorial Picks）：
- 2-3 張主編選題卡片：標題 + 主編評語 + 導流連結
- 人工策展區，非自動生成（由 editorPick: true + editorComment 控制）

區塊 2 — 最新新聞列表：
- 每則：來源 + 日期 + 主題標籤 + 標題 + 摘要
- 列表式排列，密度高
- 可按主題篩選
- 點擊連到外部 sourceUrl（target="_blank"）

區塊 3 — 熱詞趨勢（Phase 1 可省略，Phase 2 實作）：
- d3.js Trend Chart：水平長條圖（horizontal bar chart），顯示本週最常出現的 tags 及其出現次數
- 資料來源：build time 從所有 collection 的 tags 統計近 7 天的出現頻率
- 互動：hover 顯示精確次數，點擊連到 /tags/[tag]/ 頁面
- 座標軸：X 軸為次數，Y 軸為關鍵字名稱，按次數降序排列，最多顯示 10 個

區塊 4 — 導流區：
- 「根據本週趨勢，你可能想看」
- 推薦相關的文章/闢謠/影音卡片

Content Collection Schema（news）：

News 項目不需要單篇頁面，但仍使用 Content Collections 管理以統一內容流程。

```typescript
{
  title: z.string(),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  publishDate: z.coerce.date(),
  tags: z.array(z.string()),
  summary: z.string(),
  editorPick: z.boolean().default(false),
  editorComment: z.string().optional(),
  relatedArticles: z.array(z.string()).optional(),
  relatedMyths: z.array(z.string()).optional(),
  relatedIngredients: z.array(z.string()).optional(),
  relatedVideos: z.array(z.string()).optional(),
  relatedPodcasts: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
}
```

### 搜尋結果頁 /search/

Layout：Base.astro（自訂版面）

- 使用 Pagefind 作為搜尋引擎（build time 索引）
- 頂部：全寬搜尋框（pill 形，自動 focus），與導覽列搜尋按鈕聯動
- 搜尋結果按相關度排序
- 每筆結果：分類 Badge + 標題（連結）+ 摘要片段（highlight 搜尋詞）+ 日期
- 側邊（桌面）或頂部（手機）：分類篩選 checkbox（文章/闢謠/原料/Podcast/短影音）
- 每頁顯示 10 筆，分頁導覽
- 空結果狀態：「找不到符合的內容」+ 推薦熱門內容 3 篇 + 搜尋建議
- 初期內容量少時（< 15 篇），搜尋頁可暫時隱藏，導覽列搜尋圖示指向 /tags/ 頁面
- Breadcrumb：首頁 > 搜尋結果
- SEO：搜尋結果頁設 `<meta name="robots" content="noindex">`，避免被搜尋引擎索引

### 標籤彙整頁 /tags/[tag]/

- 使用 List.astro layout
- 標題：`#{tag}` 的所有內容
- 混合顯示所有類型的同標籤內容，按日期倒序
- Grid：桌面 3 欄、平板 2 欄、手機單欄
- 各類型卡片使用各自的 Card 元件（Article Card / Myth Card / etc.）
- 分頁導覽
- Breadcrumb：首頁 > #{tag}

### 404 頁面

- 使用 Base.astro layout
- H1：「找不到這個頁面」
- 副標：「你要找的頁面可能已被移動或不存在。」
- 搜尋框
- 推薦內容：最新 3 篇文章卡片
- 導覽連結：回首頁 / 文章 / 闢謠 / 原料
- 不使用幽默語氣（符合品牌的冷靜專業調性）

---

## 第五部分：Design System

### 色彩系統（oklch）

品牌色：

| Token | oklch | 近似 Hex（僅供參考） | 用途 |
|---|---|---|---|
| --color-teal | oklch(0.38 0.08 200) | ~#0e5a5e | 品牌主色、Primary Button、導覽列 active |
| --color-navy | oklch(0.25 0.03 245) | ~#1c2c3a | 深色輔色、頁尾、Podcast 深色卡片底 |
| --color-paper | oklch(0.96 0.01 90) | ~#f6f4ee | 主背景、文章背景 |
| --color-ink | oklch(0.22 0.01 260) | ~#1f2328 | 正文、標題、導覽文字 |
| --color-fog | oklch(0.89 0.01 220) | ~#d7dde0 | 邊框、分隔線、表格線 |
| --color-coral | oklch(0.56 0.18 28) | ~#c04a3a | CTA 按鈕、關鍵提醒（小面積） |

與 v1.0 的差異：
- `--color-teal`：L 從 0.30 提高到 0.38，C 從 0.04 提高到 0.08。提高後作為按鈕背景和 badge 底色時有足夠的品牌辨識度，不再是近黑色。
- `--color-coral`：H 從 45 調整到 28，更接近正紅珊瑚色。L 從 0.62 降至 0.56 確保白字對比度 >= 4.5:1（AA），C 提高到 0.18。
- Hero 漸層 teal(L=0.38) → navy(L=0.25) 明度差 0.13，漸層視覺效果可見。

分類色：

| Token | oklch | 近似 Hex | 用途 |
|---|---|---|---|
| --color-cat-article | oklch(0.45 0.09 195) | ~#266065 | 文章 |
| --color-cat-myth | oklch(0.48 0.14 30) | ~#a6533f | 闢謠 |
| --color-cat-ingredient | oklch(0.48 0.10 140) | ~#4a7035 | 原料 |
| --color-cat-podcast | oklch(0.45 0.10 280) | ~#5b5f8c | Podcast |
| --color-cat-video | oklch(0.45 0.12 65) | ~#7d5e28 | 短影音 |
| --color-cat-news | oklch(0.42 0.08 230) | ~#3d5d7a | 趨勢 |

與 v1.0 的差異：
- 拉大色相間距：article H=195、myth H=30、ingredient H=140、podcast H=280、video H=65、news H=230（每組間隔 40-55 度）
- 提高 chroma 讓小面積使用（色條、badge）時仍可辨識
- ingredient 和 video 的色相與亮度調整，避免與相鄰色混淆

闢謠結論標籤色（與品牌主色明確區隔）：

| Token | 結論 | oklch |
|---|---|---|
| --color-verdict-true | 真 | oklch(0.48 0.12 160) — 深青綠（偏綠，區別於品牌 teal） |
| --color-verdict-false | 假 | oklch(0.42 0.14 25) — 深磚紅 |
| --color-verdict-insufficient | 證據不足 | oklch(0.50 0.05 240) — 灰藍 |
| --color-verdict-contextual | 情境成立 | oklch(0.50 0.10 75) — 棕金 |

與 v1.0 的差異：
- 「真」不再使用品牌主色，改為 H=160（偏綠）的獨立語意色，避免品牌色與結論色的認知混淆。

深色背景文字系統：

| Token | oklch | 用途 |
|---|---|---|
| --color-on-dark-heading | oklch(1.00 0 0) | 深色底上的標題（白色） |
| --color-on-dark-body | oklch(0.85 0.01 220) | 深色底上的正文 |
| --color-on-dark-meta | oklch(0.75 0.01 220) | 深色底上的 meta 資訊 |
| --color-on-dark-link | oklch(0.75 0.15 28) | 深色底上的連結（coral 亮化版，確保在 navy 底上 >= 4.5:1） |

使用比例：60% paper / 20% ink / 12% teal / 5% navy / 3% coral

派生色工具：

```css
--color-teal-subtle: color-mix(in oklch, var(--color-teal) 8%, var(--color-paper));
--color-teal-light:  color-mix(in oklch, var(--color-teal) 14%, var(--color-paper));
--color-coral-hover: color-mix(in oklch, var(--color-coral) 85%, black);
--color-teal-hover:  color-mix(in oklch, var(--color-teal) 85%, black);
```

### 色彩對比度檢核表

| 前景 | 背景 | 預期對比度 | 要求 |
|---|---|---|---|
| --color-ink | --color-paper | > 15:1 | AAA 正文 |
| white | --color-teal | > 7:1 | AAA 按鈕文字 |
| white | --color-coral | > 4.5:1 | AA 按鈕文字（L=0.56 確保達標） |
| white | --color-verdict-true | > 4.5:1 | AA 標籤文字 |
| white | --color-verdict-false | > 4.5:1 | AA 標籤文字 |
| white | --color-navy | > 10:1 | AAA 深色卡片文字 |
| --color-ink | --color-teal-subtle | > 7:1 | AAA TL;DR Box 文字 |
| 分類色 | --color-paper (14% mix) | > 4.5:1 | AA 分類 Badge 文字 |
| white | --color-verdict-insufficient | > 4.5:1 | AA 標籤文字（L=0.50 確保達標） |
| white | --color-verdict-contextual | > 4.5:1 | AA 標籤文字 |
| --color-on-dark-link | --color-navy | > 4.5:1 | AA 深色底連結（L=0.75 亮化版 coral） |
| --color-on-dark-body | --color-navy | > 7:1 | AAA 深色底正文（L=0.85） |
| --color-on-dark-meta | --color-navy | > 4.5:1 | AA 深色底 meta（L=0.75） |

### 字體系統

載入：
- Noto Serif TC: 700
- Noto Sans TC: 400, 700
- Inter: 400, 500, 700
- Source Serif 4: 600, 700

字體載入策略：
- 託管方式：自託管（放在 public/fonts/），避免第三方 CDN 的隱私與 CLS 問題
- `font-display: swap`（確保文字立即可見，字體載入後替換）
- 首屏關鍵字體 preload：Noto Sans TC 400（正文）、Noto Serif TC 700（H1 大標）
  - `<link rel="preload" href="/fonts/NotoSansTC-Regular.woff2" as="font" type="font/woff2" crossorigin>`
  - `<link rel="preload" href="/fonts/NotoSerifTC-Bold.woff2" as="font" type="font/woff2" crossorigin>`
- Inter 和 Source Serif 4 不 preload，延遲載入即可（用於 meta 和英文大標，非首屏關鍵）

CSS Custom Properties：

```css
--font-serif:   'Noto Serif TC', 'Source Serif 4', serif;
--font-sans:    'Noto Sans TC', 'Inter', sans-serif;
--font-ui:      'Inter', 'Noto Sans TC', sans-serif;
--font-display: 'Source Serif 4', 'Noto Serif TC', serif;
```

字級（使用 clamp 流暢縮放）：

| Token | 桌面 | 手機 | 字重 | 行高 | 字體 |
|---|---|---|---|---|---|
| --text-h1 | 48px | 32px | 700 | 1.2 | --font-serif |
| --text-h2 | 32px | 26px | 700 | 1.3 | --font-sans |
| --text-h3 | 24px | 20px | 700 | 1.4 | --font-sans |
| --text-body | 18px | 17px | 400 | 1.8 | --font-sans |
| --text-lead | 20px | 18px | 400 | 1.7 | --font-sans |
| --text-meta | 14px | 13px | 400 | 1.6 | --font-ui |
| --text-caption | 14px | 14px | 400 | 1.6 | --font-sans |
| --text-badge | 12px | 12px | 500 | 1 | --font-ui |

```css
--text-h1: clamp(2rem, 1.5rem + 2vw, 3rem);
--text-h2: clamp(1.625rem, 1.25rem + 1.5vw, 2rem);
--text-body: clamp(1.0625rem, 1rem + 0.25vw, 1.125rem);
```

排版規則：
- 正文最大寬度：68ch
- 段落間距：1.5em（手機 1.25em）
- 標題前間距：2em（手機 1.5em），標題後：0.75em

### 間距系統

```css
--space-page-x: clamp(1rem, 0.5rem + 2vw, 2rem);
--space-page-y: clamp(2rem, 1.5rem + 2vw, 3rem);
--space-card-gap: clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
--space-section-gap: clamp(2.5rem, 2rem + 2vw, 4rem);
```

### 按鈕

**使用原則**：
- **Primary** = 頁面主要動作（如「最新文章」「看更多」「查看分類」）
- **CTA** = 全站推廣動作（如「追蹤 LINE」「立即追蹤」「免費訂閱」）— 小面積使用
- **Secondary** = 次要動作（如「延伸閱讀」「看全部」）
- **Ghost** = 內嵌於內文的輕量動作

| 類型 | 背景 | 文字 | 邊框 | Hover |
|---|---|---|---|---|
| Primary | --color-teal | white | -- | --color-teal-hover |
| Secondary | transparent | --color-teal | --color-teal | --color-teal-subtle 底 |
| CTA | --color-coral | white | -- | --color-coral-hover |
| Ghost | transparent | --color-teal | -- | --color-teal-subtle 底 |

共通：pill 形（border-radius: 9999px）、最小高 44px、Focus ring 2px --color-teal offset 2px、Disabled opacity 0.5、Active scale(0.98)

### 標籤

| 類型 | 樣式 | 用途 |
|---|---|---|
| Category Tag | 分類色 14% 底 + 分類色文字，pill 形 | 內容分類 |
| Verdict Badge | 結論色底 + 白字，pill 形，較大（padding 加大） | 闢謠結論 |
| Editor Badge | --color-teal-light 底 + --color-teal 文字 | 主編校稿 |
| Evidence Level Badge | --color-fog 底 + --color-ink 文字，小型 | 證據等級 |

### 卡片

共通：白底、--color-fog 邊框、border-radius 1.5rem、頂部分類色條 h-1.5、hover translateY(-2px) + shadow 加深、手機無 hover

| 卡片類型 | 特殊元素 |
|---|---|
| Article Card | 色條 + 分類 Badge + 標題 + 摘要 + 作者 + 日期 |
| Podcast Card | 深色底 --color-navy + 播放圖示 + 時長（文字用 on-dark 系統） |
| Video Card | YouTube 縮圖 + 播放 overlay + TL;DR 前 50 字 |
| Myth Card | 結論 pill + 迷思原句粗體 + 一句話結論 |
| Ingredient Card | 原料名 + 介紹 + 證據強度 mini badge |
| News Card | 列表式：來源 + 日期 + 標題 + 摘要（非卡片外觀） |

### 內容元件

| 元件 | 說明 |
|---|---|
| Breadcrumb | 頁頂路徑導覽，首頁 > 分類 > 標題，配合 BreadcrumbList JSON-LD |
| TL;DR Box | --color-teal-subtle 底，圓角 1.5rem，頂部小標 |
| Quote Block | 左邊框 4px --color-teal，--color-paper 底 |
| Reference List | 折疊式，header 顯示引用數量 |
| FAQ Accordion | 點擊展開，觸控區 48px，Schema.org markup |
| Medical Disclaimer | --color-paper 底，--color-fog 邊框，固定文案 |
| Verdict Disclaimer | 闢謠頁專用：「本判讀基於截至 {updatedDate} 的公開研究證據，隨新證據發表可能調整。」 |
| Editor Info Block | 作者名 + 角色 + 校稿標章 |
| Author Meta Block | 發佈日 + 更新日 + 閱讀時間 |
| Disclosure Banner | 利益揭露提示條，文章/原料頁 header 區下方（僅 disclosure 欄位有值時顯示） |
| CTA Strip | 全寬區塊，標題 + 說明 + CTA Button |
| Search Bar | pill 形，左側搜尋 icon，aria-label="搜尋健康議題、迷思、原料" |
| TOC | 桌面 sticky sidebar，手機折疊式，scroll spy |

### d3.js 互動元件規格

**共通規則**：
- 所有 d3 元件封裝為 Svelte 元件，放在 `src/components/charts/`
- SSR 時渲染 loading skeleton（灰色矩形佔位），hydrate 後替換為互動圖表
- 提供 `<noscript>` fallback（純文字描述）
- 使用 oklch 色彩 tokens

| 元件 | Svelte 檔案 | client 指令 | 說明 |
|---|---|---|---|
| Hero Particles | HeroParticles.svelte | `client:media="(min-width: 768px)"` | 首頁 Hero 微粒子漂浮裝飾。手機不載入。 |
| Evidence Scale | EvidenceScale.svelte | `client:visible` | 原料頁證據強度分級圖 |
| Trend Chart | TrendChart.svelte | `client:visible` | 趨勢頁熱詞趨勢圖（Phase 2，Phase 1 不實作） |
| Pathway Diagram | PathwayDiagram.svelte | `client:visible` | 原料頁代謝路徑互動圖（Phase 2，Phase 1 顯示靜態佔位） |

**Evidence Scale 詳細規格**：
- 圖表類型：水平階梯圖（horizontal stacked level indicator）
- 5 層對應：Meta-analysis > RCT > Observational > Animal > In-vitro
- 每層顯示：該原料在此證據等級的相關研究結論摘要
- 視覺：左到右排列，最高等級最左、顏色最深（使用 color-mix 從 --color-teal 按比例淡化）
- 互動：hover 顯示該等級的詳細摘要 tooltip
- 尺寸：寬度 100% container，高度約 60px

**Trend Chart 詳細規格**（Phase 2）：
- 圖表類型：水平長條圖（horizontal bar chart）
- 資料來源：build time 統計近 7 天所有 collections 的 tags 出現頻率
- 顯示：最多 10 個關鍵字，按次數降序
- X 軸：出現次數
- Y 軸：關鍵字名稱
- 互動：hover 顯示精確次數，點擊連到 /tags/[tag]/
- 顏色：--color-cat-news 為主色

**Hero Particles 詳細規格**：
- 效果：半透明微粒子在深色漸層底上緩慢漂浮
- 粒子數量：30-50 個
- 粒子大小：2-6px
- 粒子顏色：白色 10-30% opacity
- 動畫速度：極緩慢（每幀移動 < 0.5px），使用 requestAnimationFrame
- Canvas 或 SVG：建議 Canvas（效能較好）
- 手機（< 768px）：不載入，僅顯示 CSS radial-gradient 靜態網格底

### 元件狀態規則

所有互動元件必須定義：

- **Default** — 預設狀態
- **Hover** — 桌面滑鼠懸停（手機無 hover，使用 `@media (hover: hover)` 區分）
- **Focus** — 鍵盤 focus，2px solid --color-teal focus ring，offset 2px
- **Active** — 點擊中，scale(0.98)
- **Disabled** — opacity 0.5，cursor: not-allowed
- **Loading** — Skeleton placeholder（灰色圓角矩形，pulse 動畫）
- **Error** — 簡潔錯誤訊息 + 重試連結（如適用）

---

## 第六部分：政策與信任系統

### 政策頁實作方式

政策頁使用獨立的 `.astro` 頁面檔案（非 Content Collections），因為：
1. 各頁路由不統一（/about/、/editorial-policy/、/disclosure/ 等）
2. 數量少且固定（7 頁）
3. 不需要列表頁或動態路由

每頁在 `.astro` 中 import Markdown 內容，使用 Policy.astro layout 渲染。
Markdown 內容放在 `src/data/policies/` 目錄（非 content collections）。

Policy.astro layout 規格：單欄、max-width 68ch、H1 + 更新日 + Markdown 內文、無 sidebar、無 CTA。

### About /about/

1. 本日有據是什麼
2. 我們做什麼（文章/Podcast/短影音/闢謠/原料整理）
3. 內容怎麼產出的（AI 輔助 + 人類主編審稿流程）
4. 為什麼要做這個站
5. 團隊/主編介紹

### Editorial Policy /editorial-policy/

1. 內容產出流程（選題 -> AI 初稿 -> 主編審稿 -> 發佈 -> 定期更新）
2. AI 使用聲明（明確說明 AI 參與的範圍與人類把關的環節）
3. 引用來源標準（優先系統性回顧/RCT，標註證據等級）
4. 更新與勘誤政策
5. 讀者回報管道

### Medical Disclaimer /medical-disclaimer/

1. 本站內容僅供一般健康資訊參考
2. 不構成醫療診斷、治療建議或處方
3. 如有健康問題請諮詢專業醫療人員
4. 本站盡力確保內容正確，但不保證即時性與完整性

精簡版以 Medical Disclaimer 元件出現在每篇文章/闢謠/原料頁底部。

### Disclosure Policy /disclosure/

**此頁面為上線前 blocker，不可用 placeholder。**

1. 本站與相關組織/公司的關係說明
2. 編輯獨立性聲明（編輯內容不受商業影響）
3. 產品/品牌標示規則（文章中涉及特定產品時的標示方式）
4. 廣告/贊助內容政策（若有）
5. 聯盟行銷連結政策（若有）
6. 利益衝突處理原則

Footer 底部永久顯示：`本站與健康產品公司之關係，詳見利益揭露政策。`

個別文章/原料頁若涉及特定品牌，透過 frontmatter `disclosure` 欄位在頁面頂部額外標示。

### Privacy Policy /privacy/ & Terms /terms/

基礎結構，標準條款。上線前必須完成正式文案（blocker）。

### Contact /contact/

- 聯絡信箱：editor@evidencetoday.news（建議）
- 內容勘誤回報
- 合作洽詢
- 不做表單，直接列聯絡方式

---

## 第七部分：SEO / Schema / 無障礙規格

### 結構化資料（Schema.org JSON-LD）

| 頁面 | Schema 類型 | 說明 |
|---|---|---|
| 文章頁 | Article + FAQPage（若有 FAQ）+ BreadcrumbList | 標準做法 |
| Podcast 單集 | Article + AudioObject + BreadcrumbList | Google 不支援 PodcastEpisode Rich Results，故用 Article 包 AudioObject |
| 短影音頁 | VideoObject + BreadcrumbList | Google 支援 Video Rich Results |
| 闢謠頁 | Article + BreadcrumbList | 不使用 ClaimReview（需 IFCN 認證才有 Fact Check Rich Results）。以 Article 呈現，結論語意由內容本身傳達 |
| 原料頁 | MedicalWebPage + BreadcrumbList | 比純 Article 更精確，強調健康內容可信度。about 屬性指向 DietarySupplement/Substance |
| 趨勢頁 | WebPage + BreadcrumbList | 聚合頁，無需特殊 Schema |
| 全站 | Organization + publishingPrinciples | 使用 Organization（非 NewsMediaOrganization），publishingPrinciples 指向 /editorial-policy/。未來如申請 Google News Publisher Center 認證，可升級為 NewsMediaOrganization |

### Metadata 規則

Title：
- 單篇：{文章標題} | 本日有據
- 列表：{分類名} | 本日有據
- 首頁：本日有據 — 把健康議題，講得有根據，也講得讓人看得懂

Meta Description：
- 單篇：取 frontmatter description（max 155 字元，與 schema 定義一致）
- 列表頁：固定文案

Open Graph：
- og:title / og:description / og:image / og:type（article 或 website）
- og:site_name：本日有據
- Twitter card：summary_large_image
- og:image 來源：優先使用 frontmatter `coverImage`，若無則 build time 使用 satori 自動生成（品牌色底 + 標題文字 + 分類標籤）

Canonical：每頁設 canonical URL（基於 astro.config.mjs 的 site 設定）

### AI 可讀取（AEO）

llms.txt 和 llms-full.txt 都透過 Astro endpoint 在 build time 動態生成（非靜態檔案），確保內容清單與實際發佈內容同步。

llms.txt 格式：

```
# Evidence Today 本日有據
> 健康議題編輯平台

## 內容類型
- 文章 /articles/
- 闢謠 /myths/
- 原料 /ingredients/
- Podcast /podcasts/
- 短影音 /videos/
- 趨勢 /news/

## 純文字版
每篇內容提供 .txt 純文字版，路徑為 /[type]/[slug].txt

## 編輯政策
/editorial-policy/
```

llms-full.txt：所有已發佈內容的標題 + 摘要 + 連結，按日期倒序。

純文字 endpoint 輸出格式（依內容類型調整 header）：

文章：
```
Title: {title}
Date: {publishDate}
Updated: {updatedDate}
Author: {author}
Reviewer: {reviewer}
Tags: {tags, comma-separated}
---
{body text in plain Markdown, frontmatter stripped}
```

闢謠：
```
Title: {title}
Date: {publishDate}
Updated: {updatedDate}
Verdict: {verdict}
Tags: {tags, comma-separated}
---
{body text in plain Markdown, frontmatter stripped}
```

原料：
```
Title: {title}
Title (EN): {titleEn}
Date: {publishDate}
Updated: {updatedDate}
Tags: {tags, comma-separated}
---
{body text in plain Markdown, frontmatter stripped}
```

Podcast / 短影音：
```
Title: {title}
Date: {publishDate}
Duration: {duration}
Tags: {tags, comma-separated}
---
{body text in plain Markdown, frontmatter stripped}
```

### robots.txt

```
User-agent: *
Allow: /

Sitemap: https://evidencetoday.news/sitemap.xml

# AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

### Sitemap 配置

使用 @astrojs/sitemap，配置：
- 文章/闢謠/原料頁：changefreq weekly，priority 0.8
- Podcast/短影音頁：changefreq weekly，priority 0.7
- 列表頁/趨勢頁：changefreq daily，priority 0.6
- 政策頁：changefreq yearly，priority 0.3
- 搜尋結果頁：排除（noindex）

### 無障礙規格

| 項目 | 要求 |
|---|---|
| 色彩對比 | 正文/背景 >= 7:1（AAA），大標/背景 >= 4.5:1（AA） |
| 不只靠顏色 | 結論標籤文字本身就是結論（真/假/不足/情境） |
| 連結辨識 | 內文連結有底線，hover 變色 + 底線加粗 |
| Focus 可見 | 2px solid --color-teal focus ring，offset 2px |
| 觸控面積 | 最小 44x44px |
| 語意 HTML | nav / main / article / aside / footer / section |
| Heading 層級 | 每頁一個 H1，不跳級 |
| 圖片 alt | 所有圖片必須有 alt |
| 表單 label | 搜尋列有 aria-label |
| 手機操作 | FAQ/TOC 觸控正常 |
| 跳過導覽 | 頁頂 skip to content 連結 |
| d3 圖表 | 提供 noscript 純文字 fallback |

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
trigger: push to main

jobs:
  build-and-deploy:
    steps:
      1. Checkout
      2. Setup Node.js (v20)
      3. Setup pnpm
      4. Install dependencies (pnpm install)
      5. Build Astro (pnpm build)
      6. Build Pagefind index (npx pagefind --site dist)
      7. Internal link check (lychee --offline dist/)
      8. External link check (lychee dist/ --accept 200..=399, continue-on-error: true)
      9. Lighthouse CI (Performance >= 90, SEO >= 95, A11y >= 95, BP >= 90)
      10. Deploy to gh-pages (peaceiris/actions-gh-pages)
      11. Report (連結檢查結果 + Lighthouse 分數摘要)
```

CNAME：public/CNAME 內容為 `evidencetoday.news`

---

## 第八部分：交付物清單

### 專案結構

```
src/
  content.config.ts                Content Collections schema 定義（Astro v5 格式）
  content/
    articles/                      文章 Markdown/MDX
    myths/                         闢謠 Markdown/MDX
    ingredients/                   原料 Markdown/MDX
    podcasts/                      Podcast Markdown/MDX
    videos/                        短影音 Markdown/MDX
    news/                          趨勢新聞 Markdown
  data/
    policies/                      政策頁 Markdown（非 Content Collection）
  components/
    ui/                            按鈕、標籤、Badge、搜尋列、Input、Breadcrumb
    blocks/                        Hero、CTA Strip、FAQ Accordion、TL;DR Box、
                                   Reference List、Medical Disclaimer、
                                   Verdict Disclaimer、Disclosure Banner、
                                   Editor Info、Author Meta、TOC、
                                   Card (Article/Podcast/Video/Myth/Ingredient/News)
    charts/                        EvidenceScale.svelte、TrendChart.svelte、
                                   PathwayDiagram.svelte、HeroParticles.svelte
    icons/                         SVG icons
  layouts/
    Base.astro                     HTML head、字體、全域 CSS、skip-to-content（首頁、搜尋頁、404 直接使用）
    Article.astro                  文章/闢謠/原料頁 layout（雙欄 + sidebar）
    Media.astro                    Podcast 單集/短影音單篇 layout（單欄 + embed 播放器區塊）
    List.astro                     列表/標籤彙整頁 layout
    Policy.astro                   政策頁 layout
  pages/
    index.astro                    首頁
    articles/index.astro           文章列表
    articles/[slug].astro          文章單篇
    articles/[slug].txt.ts         文章純文字 endpoint
    podcasts/index.astro           Podcast 列表
    podcasts/[slug].astro          Podcast 單集
    podcasts/[slug].txt.ts         Podcast 純文字 endpoint
    videos/index.astro             短影音列表
    videos/[slug].astro            短影音單篇
    videos/[slug].txt.ts           短影音純文字 endpoint
    myths/index.astro              闢謠列表
    myths/[slug].astro             闢謠單篇
    myths/[slug].txt.ts            闢謠純文字 endpoint
    ingredients/index.astro        原料索引
    ingredients/[slug].astro       原料單頁
    ingredients/[slug].txt.ts      原料純文字 endpoint
    news/index.astro               趨勢頁
    about.astro                    關於本站
    editorial-policy.astro         編輯政策
    medical-disclaimer.astro       醫療聲明
    disclosure.astro               利益揭露
    privacy.astro                  隱私政策
    terms.astro                    使用條款
    contact.astro                  聯絡頁
    search.astro                   搜尋結果
    tags/[tag].astro               標籤彙整
    404.astro                      找不到頁面
    llms.txt.ts                    AI 爬蟲索引 endpoint
    llms-full.txt.ts               AI 爬蟲完整內容 endpoint
    rss.xml.ts                     主 RSS Feed
    articles/rss.xml.ts            文章 RSS Feed
    myths/rss.xml.ts               闢謠 RSS Feed
    podcasts/rss.xml.ts            Podcast RSS Feed
    videos/rss.xml.ts              短影音 RSS Feed
  styles/
    tokens.css                     oklch design tokens + 派生色
    typography.css                 字體系統 + clamp 字級
    global.css                     全域樣式 + reset
public/
  CNAME                            evidencetoday.news
  robots.txt                       爬蟲規則
  favicon.svg                      SVG favicon
  favicon.ico                      ICO favicon（16x16, 32x32）
  apple-touch-icon.png             Apple 觸控圖示（180x180）
  favicon-192.png                  PWA 圖示
  favicon-512.png                  PWA 圖示
astro.config.mjs                   Astro 配置（site、integrations、vite）
package.json                       依賴與 scripts
pnpm-lock.yaml
.github/workflows/deploy.yml       CI/CD pipeline
```

### 工程師注意事項

1. 使用 pnpm 作為套件管理器
2. Astro v5.x，使用 `src/content.config.ts` 定義 Content Collections（content layer API）
3. Svelte 元件用 `client:visible` 載入（lazy load），Hero Particles 例外使用 `client:media`
4. d3.js 按子模組引入（d3-selection、d3-scale、d3-shape 等），不引入整包
5. YouTube 嵌入使用 `@justinribeiro/lite-youtube` web component
6. 圖片使用 Astro Image 最佳化
7. 搜尋功能使用 Pagefind（build time 索引），CI pipeline 中 Astro build 後執行 `npx pagefind --site dist`
8. RSS feed 使用 @astrojs/rss
9. Sitemap 使用 @astrojs/sitemap
10. Schema JSON-LD 在各 layout 中以 `<script type="application/ld+json">` 輸出
11. OG image 自動生成使用 satori（build time 產出 PNG）
12. 路由使用 `[slug].astro`（非 `[...slug].astro`），因為所有 collection slug 都是扁平結構
13. `astro.config.mjs` 必須設定 `site: 'https://evidencetoday.news'`

---

## 附錄：設計審查意見

以資深設計總監兼內容策略顧問的角色，主動指出以下風險與建議：

### 1. 利益揭露是最大的信任風險

客戶 brief 提到「背後可能與健康產品公司有關聯」。如果揭露不夠透明，整個站的可信度會瞬間崩潰。建議：
- Disclosure 頁面在上線前必須完成正式文案，不能用 placeholder（已標為 blocker）
- 每篇涉及特定產品/品牌的文章/原料頁，透過 frontmatter `disclosure` 欄位在頁面頂部額外標示
- Footer 雙聲明是底線，不可移除

### 2. AI 輔助產出需要明確聲明

現在 AI 生成內容越來越受到 Google 和讀者的審視。建議：
- Editorial Policy 中明確說明 AI 參與的範圍
- 不需要每篇標「AI 生成」，但流程透明度要在政策頁說清楚
- 「主編校稿」標章的存在就是在回應這個問題

### 3. 闢謠頁的法律風險

「真/假」的結論標籤可能引發爭議。建議：
- 結論基於「目前可取得的研究證據」，不是絕對判定
- 每篇闢謠頁底部有 Verdict Disclaimer 元件：「本判讀基於截至 {updatedDate} 的公開研究證據，隨新證據發表可能調整。」
- 「證據不足」和「情境成立」兩個標籤的存在就是為了避免非黑即白

### 4. 原料頁的療效宣稱風險

台灣法規對健康食品/保健食品的廣告宣稱有嚴格規範。建議：
- 用語一律用「研究常探討」「文獻中討論」而非「有效」「可治療」
- 原料頁不可出現任何特定品牌產品推薦
- Medical Disclaimer 元件在原料頁尤其重要

### 5. 搜尋功能的內容量門檻

Pagefind 在內容量少的時候搜尋體驗會很空。建議：
- 初期至少準備 10-15 篇文章 + 5 篇闢謠才上線搜尋功能
- 搜尋結果為空時，顯示推薦內容而非空白頁（已納入搜尋頁規格）

### 6. 趨勢頁的更新頻率

趨勢頁如果不頻繁更新，會變成最弱的頁面。建議：
- 明確定義更新頻率（至少每週一次）
- 已在規格中標註：Phase 1 可退化為簡化版（主編選題 + 新聞列表），Phase 2 加入熱詞圖表

### 7. Phase 分期標註

雖然全部功能一次到位，但以下元件標註了 Phase 1/2 以管理複雜度：
- Phase 1：所有頁面、元件、SEO、CI/CD
- Phase 2（可在 Phase 1 完成後立即接續）：Trend Chart d3 圖表、Pathway Diagram d3 互動視覺化
- Phase 1 中 Phase 2 元件的位置會顯示靜態佔位內容
