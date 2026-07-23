# Playbook：趨勢文章（/news）

涵蓋趨勢文章 (`src/content/news/`) 的結構、前台呈現、卡片/Hero 視覺、來源處理。改任何東西先讀「鎖定參數」與「常見陷阱」。

---

## 鎖定參數（不可變動或要謹慎變動）

| 參數 | 位置 | 鎖定原因 |
|---|---|---|
| `keyPoints` 上限 8 點 / 下限 3 點 | `src/content.config.ts` news collection | 超過 8 點等於沒摘要 |
| `editorPoints` 上限 8 點 / 下限 2 點 | 同上 | 與 keyPoints 區分；主編判讀至少 2 點才有列點意義 |
| 詳情頁區塊順序 | `src/pages/news/[slug].astro` | 標題 → Hero 圖 → 重點摘要 → 詞條提示（無 H2 標題）→ Markdown body → 請注意 → 主編判讀（列點）→ 來源。順序不能亂改，會破壞閱讀節奏 |
| 「請注意」優先讀 `cautionNote`，fallback 到 `evidenceNote` | 同上 | 舊資料用 evidenceNote，新版用 cautionNote |
| 「主編判讀」優先讀 `editorPoints`，fallback 拆 `editorComment` | 同上 | normalizeEditorPoints() 會嘗試從字串拆出列點 |
| 來源優先用 `references` 陣列；fallback 到 `pmid` / `sourceUrl` | 同上 | references 是新版正規格式 |
| 缺源時顯示「原始來源連結尚未補上」字樣 | 同上 | 不能讓來源區塊空白 |
| 卡片字級：badge ≥ 13px / title ≥ 18px / summary ≥ 15px / date ≥ 13px | `src/pages/news/index.astro` | 卡片要像文章卡而不是資料庫條目 |
| TrendBubbles `prefers-reduced-motion` | `src/components/charts/TrendBubbles.svelte` | 偏好減動畫時直接收斂、不晃動 |
| 分類 fallback 圖必須是情境圖，不可是小 icon | `public/images/news/*.svg` + `src/utils/news.ts` CATEGORY_IMAGES | 管理者明確要求 |

---

## 趨勢文章內容寫作守則（每篇都套用）

### 1. 重點摘要（keyPoints，4-6 點）
- 用一般民眾看得懂的話
- 先回答「這篇研究跟生活有什麼關係」，不要一開始就堆研究方法
- 每點末尾不要加句點、不要加分號
- 不要寫成 AI 報告語氣
- 範例：
  - 這篇研究不是在推某一種神奇食物，而是在看長期飲食型態
  - 一般人可以先抓大方向：少含糖飲料、少加工食品、多原型食物
  - 這類研究多半只能說「有關」，不能直接證明照著做就能預防疾病

### 2. 詞條提示（termBox）
- 只保留真正會影響一般讀者理解的領域核心詞
- 可保留：DRRD、腸腦軸、快速動眼期睡眠行為障礙、全因死亡率、超加工食品、食源性疾病、胰島素阻抗、發炎指標、睡眠呼吸中止症
- **不要放研究方法詞**：統合分析、系統性回顧、RCT、健康使用者偏誤、觀察性研究、世代研究、橫斷面研究、網路統合分析
- 沒有真正核心詞時，整個 termBox 留空或不填（前台會自動隱藏）
- 前台不顯示「先看懂這個詞」章節標題，只以輕量提示框呈現「詞條：解釋」
- termBox 字級需接近正文，避免看起來像註腳或正式章節

### 3. 研究內容（Markdown body）
- markdown 標題用「## 研究內容」（**不要用「研究看見什麼」**）
- 可包含研究設計、樣本數、分析對象、主要結果、數據、研究限制
- 不要擅自改研究數據
- 不要新增來源沒有支持的結論
- 不要把「相關」改成「造成」、把「可能」改成「一定」

### 4. 請注意（cautionNote）
- 講研究限制、不能過度推論的地方
- 不能證明因果時要明講
- 不要和「主編判讀」重複

### 5. 主編判讀（editorPoints，3-6 點）
- 每點對讀者要有生活理解或行動幫助
- 像主編在幫讀者翻譯研究的口吻，不要像 AI 報告
- 末尾不加句點、不加分號
- 不寫空泛結論（避免「這項研究具有重要啟示」）
- 把「怎麼把這些發現用在生活中」整併進來，不另設章節

### 6. 來源（references）
- 每篇都要有來源
- 結構：`{title, url, type, sourceType?, note?}`
  - `type`：'meta-analysis' | 'rct' | 'observational' | 'review' | 'guideline' | 'other'
  - `sourceType`：'論文' | '官方資料' | '新聞' | '社群來源' | '其他'
- 有具體百分比/數據時，來源必須能追溯
- **缺源時的處理**：
  - 不要假造 DOI、PMID、論文標題
  - frontmatter 加 `sourcePending: true` + `sourcePendingReason: "<原因>"`
  - 前台會自動顯示「原始來源連結尚未補上，編輯室會持續追蹤更新」

---

## 常見陷阱

- **AI 句型留下來**：寫完後 grep 確認以下 12 種句型 0 hit：
  ```
  研究看見什麼 | 這些結果對公共衛生有什麼意義 | 又有哪些地方需要謹慎解讀
  | 這些發現提醒我們 | 提供了重要參考 | 值得進一步關注 | 本研究具有啟示意義
  | 如何把這些發現用在生活中 | 對公共衛生具有重要意義 | 提供了新的視角
  | 有助於我們理解 | 值得未來研究進一步探討
  ```
- **termBox 沒精簡**：把方法詞（統合分析、RCT 等）當成核心詞放進去
- **主編判讀寫成長段**：editorPoints 沒拆，留在 editorComment 字串裡
- **列點尾加句點 / 分號**：違反風格
- **來源用了「本日有據編輯室」就不補原文**：缺源要明確標 sourcePending
- **卡片圖只剩小 icon**：分類 fallback 必須是完整情境圖

---

## 修改流程

### 改 schema (`src/content.config.ts`)
1. 確認向下相容（既有檔案能 build）
2. 跑 `pnpm build` 驗證
3. 更新本 playbook 的「鎖定參數」表

### 改詳情頁 (`src/pages/news/[slug].astro`)
1. 區塊順序不要變
2. 改完跑 build；在本機開瀏覽器看一篇驗證
3. 視覺改動同步更新本 playbook

### 改首頁 (`src/pages/news/index.astro`)
1. 卡片字級不要再縮小
2. TrendBubbles 區塊不要再用 `max-height: 50vh + overflow:hidden` 裁切

### 新增分類 fallback 圖
1. 在 `public/images/news/` 加 SVG（viewBox 800x450）
2. 在 `src/utils/news.ts` 的 `CATEGORY_IMAGES` 對應新分類
3. 在 `CATEGORY_KEYWORDS` 加判別關鍵字
4. 風格要與既有 9 張一致（teal 色系、CI 風格、不是小 icon）

---

## Google News／結構化資料就緒（2026-06-24 補齊）

> 背景：GSC 實測 `googleNews`/`news`/`discover` 曝光皆為 0。一般 `@astrojs/sitemap` 不含 news 標記、
> NewsArticle 缺人為查核與新鮮度訊號。以下為讓 /news 具備 Google News「入場資格」的技術件
> （注意：技術就緒是必要非充分，實際收錄仍受網域權重影響，見記憶 `sitemap-indexation-bottleneck`）。

- **News Sitemap**：`src/pages/sitemap-news.xml.ts` → 產 `/sitemap-news.xml`，**只收近 48 小時** news，
  每筆含 `<news:publication>`（name=本日有據、language=**zh-tw**）/`<news:publication_date>`/`<news:title>`（用 `getDisplayTitle`）。
  與一般 sitemap 分開；`public/robots.txt` 已加 `Sitemap:` 行指向它，`pnpm sitemap:submit` 也會一併提交 GSC。
  站每日重建（news-cron + optimize-cron 會 push）→ 48h 視窗自動滾動；近 48h 無新聞時為合法空 urlset。
- **NewsArticle schema**（`src/pages/news/[slug].astro`）：`author` 掛**機構「本日有據編輯室」**（趨勢稿由編輯室產製，
  不謊稱個人親筆）；主編羅揚以 **`editor`（`buildPerson('羅揚')` 完整 Person 實體）** 承載人為查核權責，
  對齊頁面可見的「主編判讀」區塊（E-E-A-T，避免結構化資料與可見內容 mismatch）；加 `dateModified`
  （= `updatedDate ?? publishDate`，`updatedDate` 為 newsSchema 新增選填欄位）。
- **Organization → NewsMediaOrganization**（`src/utils/schema-org.ts`）：向 Google News 表明發布機構身分；
  `logo` 改用**點陣 PNG** `apple-touch-icon.png`（180×180，Google 不認 SVG logo），不可改回 `favicon.svg`。
- **可見 byline**（header `news-article__meta`）：頁面顯示「本日有據編輯室整理 · 主編 羅揚 審定」，
  羅揚連到 `/authors/luo-yang/`（`rel="author"`）。**務必與 JSON-LD 的 `editor` 一致**（Google 要結構化資料對齊可見內容），且可見署名才真正加 E-E-A-T。
- **結構化資料圖 ≥1200px**：schema 的 `image` 經 `schemaImageUrl()`（`src/utils/news.ts`）把 pexels/unsplash 的 `w=`
  拉到 ≥1200（Google Article/News 建議；頁面顯示仍可用較小尺寸）。新聞管線抓圖時也應優先取 ≥1200 寬的圖庫圖。
- **改這區任一處都要**：`pnpm build` 後 grep `dist/sitemap-news.xml` 確認有 `<news:news>` 條目、
  驗 XML well-formed，並 grep 一篇 `dist/news/*/index.html` 確認 `author`/`editor`/`dateModified` 都在。
- **收錄監測**：`pnpm gnews:watch`（`scripts/googlenews-watch.mjs`，純 GSC 查詢、無 headless claude）查
  googleNews/news/discover/web 曝光、做週對週對比，`googleNews`/`news`「從 0 變正」會回 exit 10（里程碑）。
  cron 包裝 `ops/googlenews-watch.sh` 每週一 09:45 跑、報告存 `reports/gnews-<date>.md`、
  里程碑另寫 `reports/GOOGLENEWS-MILESTONE.md` 旗標。設 `GNEWS_HISTORY` 才會累積歷史與偵測里程碑。
- **每週 Slack 週報＋推估**：mjs 讀**整段歷史**做確定性趨勢分析（週對週、零連續週數、近 6 週最小二乘斜率、
  線性推估下週值／約幾週破 100），組繁中摘要寫到 `GNEWS_SLACK_OUT` 指定檔；包裝腳本**每週都**把它發到
  **優化報報 `C0BCABEBHHD`**（里程碑與否皆發）。要改門檻/文案改 mjs 末段 `analyze()`／`verdict`，發訊頻道改
  包裝腳本 `GNEWS_CHANNEL`。發訊沿用 `ops/slack-notify.sh`（bot 已在優化報報頻道）。

## 驗證清單

- [ ] `pnpm build` 通過
- [ ] grep 確認 12 種 AI 句型 0 hit
- [ ] 在本機瀏覽器開至少一篇趨勢文章，確認區塊順序、列點呈現、來源區塊都正常
- [ ] `/news` 列表頁卡片：badge / title / summary / date 字級可讀
- [ ] TrendBubbles 在桌機/平板/手機都沒被裁切
- [ ] 缺源文章顯示「原始來源連結尚未補上」字樣
- [ ] 來源缺失清單（`grep -L "^references:\|^pmid:\|^sourceUrl:" src/content/news/*.md`）已列入 PR 描述

## 趨勢卡照片化（2026-07-23：62 篇既有稿回填真實照片）

> 背景：管理者要求 `/news` 全面「插畫 → 照片」，原則比照成分解析縮圖（`ingredient-thumbnails.md`）。
> 做法：每篇趨勢稿 frontmatter 補 `heroImage`（Wikimedia Commons 自由授權照片熱連結）＋ `coverAlt`＋`coverImageCredit`，
> 前台 `getNewsThumbnail`／`getNewsHeroImage` 既有優先序即自動改用照片、SVG 只留作最終備援。

- **為何要 runner**：CCR 雲端 session 的網路政策擋掉圖庫網域（Commons／Pexels／Unsplash 皆 403），
  無法在 session 內抓圖。解法同成分縮圖：把搜圖外包給 **GitHub Actions runner**（網路不受限）。
- **腳本**：`scripts/fetch-content-photos.mjs`——內建 news／topics 的策劃英文關鍵字（`PLAN`）＋第二輪
  單一名詞覆寫（`OVERRIDE`），搜 Wikimedia Commons API（免金鑰、只收 CC0/PD/CC BY*/CC BY-SA* 等自由授權
  的 JPEG/PNG、原圖 ≥800），每項抓 3 張候選 + `manifest.json` 落 `tmp-photo-review/<group>/` 供目視驗收。
  **canonical 一律用 API 回傳的 `thumburl`（1280 桶）原字串，禁自行改寬度**（比照成分縮圖 2026-07-22 事故）。
- **臨時 workflow**：搜圖用的 `.github/workflows/content-photos.yml`（push 含 `[fetch-photos]` 觸發、runner 把
  `tmp-photo-review/` 推回分支）為一次性，**任務完成後已移除**（要重跑從 git 歷史撈，比照 `ingredient-photos.yml`）。
- **驗收鐵則（禁止不看圖就接線）**：runner 回傳後在 session 用 headless chromium 對候選 contact sheet 截圖
  逐張目視，關鍵字太窄／撈到古董版畫／同名陷阱（milk glass=乳白玻璃器皿非鮮奶、walking=鶺鴒鳥、
  cat blood pressure=幫貓量血壓）都要換單一名詞補搜再驗。放圖邏輯：呈現該篇最具體的食物／物件／情境，
  避開明顯非亞洲人臉與資訊圖表。
- **接線**：`coverImageCredit` 記作者＋授權（CC BY/BY-SA 必署名）；插入 frontmatter 時**插在收尾 `---` 之前**
  （頂層 key），勿插在 `summary: >-` 這類 block scalar 與其縮排內文之間（會吃掉 summary）。
- **link check**：Commons 熱連結網域 `upload.wikimedia.org` 已在 `deploy.yml` 外連檢查 `--exclude`（成分縮圖時加），
  故大量新增 Commons 圖不會拖垮部署連結檢查。

### 7. 趨勢圖卡與 fallback 圖片
- `/news` 列表縮圖優先序固定為 `thumbnail → heroImage → topic fallback → category fallback → default fallback`；詳情頁 hero 固定為 `heroImage → thumbnail → topic fallback → category fallback → default fallback`。
- 首頁趨勢區與最新內容用的 `NewsItem.astro` 已改為「縮圖＋文字」媒體列（縮圖走同一條 `getNewsThumbnail` 優先序）；細節見 [`home-hero.md`](./home-hero.md)。
- topic fallback 由 `src/utils/news.ts` 依 `titleDisplay`、`title`、`subtitle`、`summary`、`tags`、`category` 關鍵字判斷，命中後使用 `public/images/news/topics/*.svg`，避免同分類文章全部共用同一張圖。
- `public/images/news/**/*.svg` 必須是本地、完整 XML，`viewBox="0 0 800 450"`，不可引用外部圖片；主視覺需佔圖面約 45–65%，不可退回中央小 icon 或淡色 placeholder。
- fallback 圖應以中文健康媒體語氣呈現，避免過小英文裝飾字；若需要文字，只使用足夠辨識的中文短字輔助主視覺。
