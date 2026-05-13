# 本日有據 Evidence Today

健康議題編輯平台 — 把健康議題，講得有根據，也講得讓人看得懂。

- 網站：https://evidencetoday.news
- 技術：Astro 5 + Svelte 5 + d3.js + oklch CSS
- 部署：GitHub Pages（push main 自動部署）
- 套件管理器：**pnpm**（不是 npm）

> **給 AI 和新進開發者：** 修改前先讀 [`docs/architecture.md`](docs/architecture.md) 了解已實作功能，避免重複建設。真正需要修的東西列在下方「已知效能瓶頸」。

---

## AI 任務：撰寫趨勢文章

> 當收到「撰寫趨勢文章」指令時，依下方步驟執行。完整 SOP 見 `docs/news_sop.md`。

### 步驟 1：準備

1. 讀取 `data/news-automation-config.json` 取得搜尋查詢清單
2. 讀取 `data/processed-sources.json` 取得已處理來源（用於去重）
3. 取得今天的台灣日期（UTC+8），作為 `publishDate` 和檔名

### 步驟 2：搜尋素材

對 config 中的 8 組查詢執行網路搜尋，收集最新的健康研究與公衛新聞。

過濾規則：
- 跳過已在 `processed-sources.json` 中的來源（比對 PMID 或完整 URL）
- 跳過超過 7 天的舊聞
- 素材池為空 → 回報「本次無新素材」並結束

### 步驟 3：評分與選題

對每則素材以五維度加權評分（證據等級 30%、影響範圍 25%、新穎性 20%、實用性 15%、話題性 10%）。

- 加權總分 >= 5.0 才進入撰文
- 同主題素材合併為一篇（2-5 則）
- 高分素材（>= 7.0）可單獨成篇
- 判定 `editorPick`：官方政策更新、高證據等級結論修正、平均分 >= 8.0、食安緊急事件

**產出結果是 n 份撰文工單，每份工單對應一篇文章。有多少合格素材就分組成多少篇，不要只寫一篇。**

### 步驟 4：撰寫文章（每份工單各一篇，共 n 篇）

依步驟 3 的分組結果，**為每份工單各建立一個 `.md` 檔案**。多篇文章應平行撰寫。

**檔名格式**：`radar-{YYYY}-{MM}-{DD}-{HH}-{NN}.md`（台灣時間，NN 為序號從 01 遞增）

例如本次產出 3 篇：
```
src/content/news/radar-2026-05-12-19-01.md
src/content/news/radar-2026-05-12-19-02.md
src/content/news/radar-2026-05-12-19-03.md
```

**Frontmatter 必填欄位**：

```yaml
---
title: "原始標題"
titleDisplay: "口語化前台標題——用一般人聽得懂的話，不要學術語氣"
subtitle: "一句話副標，15-30 字"
category: "主分類"  # 睡眠/飲食/食品安全/運動營養/慢性病/公共衛生/保健食品/腸道健康/研究新知
source: "本日有據編輯室"
publishDate: 2026-05-12  # 台灣日期
tags: ["標籤A", "標籤B"]  # 禁止含 /
summary: "100-150 字摘要"
intro: "2-4 句白話開頭介紹：研究看什麼？為什麼值得注意？和日常生活有什麼關係？"
termBox:  # 有專有名詞時才加
  - term: "名詞"
    definition: "白話解釋，3-5 句"
evidenceNote: "2-3 句白話證據提醒，例如：這類研究能看見關聯，但還不能證明因果。"
pmid: "12345678"  # 有 PubMed 來源時才加
editorPick: false
editorComment: "我的觀點與行動建議：1 段觀點 + 3-5 點行動建議"
draft: false
---
```

**選填欄位**：`sourceUrl`、`heroImage`、`thumbnail`、`relatedArticles`、`relatedMyths`、`relatedIngredients`、`relatedVideos`、`relatedPodcasts`

**內文結構**：
1. 用友善小標題（如「研究看見什麼？」而非「研究設計與方法」）
2. 保留核心發現，用白話呈現
3. 不要堆砌統計術語
4. 不要寫獨立的「研究限制」章節（已在 `evidenceNote`）
5. 不要寫「結語」章節（已在 `editorComment`）
6. 不要在文末寫「來源：[...]」（已在 `pmid`）

**語言規範**：
- 台灣繁體中文，台灣慣用醫學術語
- 專有名詞首次出現附英文：「丁酸（butyrate）」
- 禁止中國用語（「視頻」→「影片」、「信息」→「資訊」）
- 禁止聳動用語：「震驚」「突破性」「革命性」
- 禁止具體醫療建議，改為「建議諮詢醫療團隊」
- 禁止醫療承諾：「可以治療」→「研究發現相關」

### 步驟 5：自動審核（反覆修正直到通過）

撰寫完成後，對每篇文章執行以下審核清單。**任何一項不通過就修正文章，重新審核，直到全部通過為止。**

**A. Build 驗證**
```bash
pnpm build    # 必須零錯誤，否則修正 frontmatter 後重試
```

**B. Frontmatter 完整性檢查**
- [ ] `titleDisplay` 存在且為口語化標題（不含「健康雷達」、不含日期、不像論文標題）
- [ ] `subtitle` 存在且 15-30 字
- [ ] `category` 存在且為允許值之一（睡眠/飲食/食品安全/運動營養/慢性病/公共衛生/保健食品/腸道健康/研究新知）
- [ ] `tags` 不含 `/` 字元
- [ ] `summary` 為 100-150 字
- [ ] `intro` 存在且為 2-4 句白話
- [ ] `evidenceNote` 存在且為 2-3 句白話
- [ ] `editorComment` 存在且包含觀點 + 行動建議
- [ ] `publishDate` 為台灣日期

**C. 內容品質檢查**
- [ ] 標題沒有學術語氣（不用「統合分析」「跨疾患」「多角度解析」等詞彙作標題）
- [ ] 內文沒有獨立的「研究限制」章節
- [ ] 內文沒有「結語」章節
- [ ] 內文沒有文末「來源：[...]」行
- [ ] 小標題是友善語氣（「研究看見什麼？」而非「研究設計與方法」）
- [ ] 沒有聳動用語（「震驚」「突破性」「革命性」）
- [ ] 沒有具體醫療建議（「應該每天吃 X mg」）
- [ ] 沒有醫療承諾（「可以治療」「一定有效」「證實可以改善」）
- [ ] 沒有中國用語（「視頻」「信息」「數據」應為「影片」「資訊」「數據」）

**D. 修正迴圈**
- 若任何檢查項不通過 → 修正文章 → 重新執行 `pnpm build` → 重新審核
- 每輪記錄「未通過項目數」
- 未通過項目數持續減少 → 繼續修正
- **連續 3 輪未通過項目數沒有減少（等於或增加都算沒減少）→ 判定未收斂** → 將 `draft` 設為 `true`，在 PR body 列出未解決問題

### 步驟 6：更新去重紀錄

將本次所有進入素材池的來源寫入 `data/processed-sources.json`：
- PubMed：`"PMID:{id}": {"processedAt": "ISO8601", "outputFile": "檔案路徑或 null"}`
- 其他：`"完整URL": {"processedAt": "ISO8601", "outputFile": "檔案路徑或 null"}`

### 步驟 7：發布

```bash
pnpm build                    # 最終確認零錯誤
git add src/content/news/radar-*.md data/processed-sources.json
git commit -m "news: auto-generated health radar YYYY-MM-DD HH:MM"
git push origin main          # 觸發自動部署
```

如果無法 push main（例如在 Codex 沙箱環境），改為開 PR：
```bash
git checkout -b news/radar-YYYY-MM-DD-HH
git add src/content/news/radar-*.md data/processed-sources.json
git commit -m "news: auto-generated health radar YYYY-MM-DD HH:MM"
git push origin HEAD
# 開 PR，body 中說明：審核全部通過，可直接 merge
```

---

## 快速開始

```bash
pnpm install        # 安裝依賴（不是 npm）
pnpm dev            # 啟動開發伺服器 (localhost:4321)
pnpm build          # 建置靜態網站 (輸出至 dist/)
pnpm preview        # 預覽建置結果
```

---

## 專案結構

```
src/
  content.config.ts          # Content Collections schema 定義（6 種類型的 Zod 驗證）
  content/
    articles/                # 文章（Markdown/MDX）
    myths/                   # 闢謠
    ingredients/             # 原料
    podcasts/                # Podcast 單集
    videos/                  # 短影音
    news/                    # 趨勢新聞
  data/
    policies/                # 政策頁 Markdown（非 Content Collection）
  components/
    ui/                      # 原子元件（Button, Badge, CategoryTag, VerdictBadge, Breadcrumb, SearchBar）
    blocks/                  # 區塊元件（6 種 Card, FaqAccordion, TOC, TldrBox, ReferenceList, MedicalDisclaimer, CtaStrip 等）
    charts/                  # d3.js Svelte 互動元件（HeroParticles, EvidenceScale）
    seo/                     # JsonLd 結構化資料輸出元件
  layouts/
    Base.astro               # HTML shell（所有頁面繼承，含 meta/OG/fonts/skip-to-content）
    Article.astro            # 文章/闢謠/原料（雙欄 + sticky sidebar + TOC）
    Media.astro              # Podcast/短影音（單欄 + embed player）
    List.astro               # 列表頁
    Policy.astro             # 政策頁（單欄 68ch）
  pages/                     # 路由頁面
  styles/
    tokens.css               # oklch design tokens
    typography.css           # 字體 custom properties + clamp() 流暢字級
    global.css               # reset + prose + container + sr-only + skip-to-content
  utils/
    date.ts                  # fmtDate（台灣時間）
    news.ts                  # 標題清理、分類推斷、fallback 圖片
public/
  CNAME                      # GitHub Pages custom domain
  robots.txt                 # 爬蟲規則（含 AI bot 允許）
  images/news/               # 趨勢新聞分類 fallback SVG（9 張）
data/
  news-automation-config.json  # 搜尋查詢設定
  processed-sources.json       # 去重追蹤
docs/
  architecture.md            # 架構與已實作功能總覽
  content-guide.md           # 內容維護指南（新增/修改/刪除各類內容）
  news_sop.md                # 趨勢新聞自動化 SOP
```

---

## 發佈流程

```
1. 本地新增/編輯內容
2. pnpm dev                    → 本地預覽確認
3. git add .
4. git commit -m "content: 新增 xxx"
5. git push origin main        → 觸發自動部署
```

GitHub Actions 自動執行：build → Pagefind 索引 → 連結檢查 → 部署。

部署狀態：https://github.com/weiqi-kids/evidencetoday.news/actions

---

## 已知效能瓶頸（優化方向）

### 1. Pagefind 搜尋頁 CSS/JS

`src/pages/search.astro` 直接載入 Pagefind CSS/JS。改為動態 import 可優化。優先順序低。

---

## 待補齊項目

### 上線前 Blocker

- [x] ~~Favicon~~ （已完成：favicon.svg + favicon.ico + apple-touch-icon.png）
- [ ] 利益揭露具體內容 — `src/data/policies/disclosure.md`
- [ ] 隱私權政策正式文案 — `src/pages/privacy.astro`
- [ ] 使用條款正式文案 — `src/pages/terms.astro`
- [ ] Email 信箱 — corrections@、editor@、hello@、transparency@
- [ ] 社群連結 — `src/components/blocks/Footer.astro`
- [ ] Logo SVG — `src/components/blocks/TopNav.astro`
- [ ] 實際內容量 — 至少 10-15 篇文章 + 5 篇闢謠

### 上線後可迭代

- [x] ~~自託管字體~~ （已完成：fontsource，移除 Google Fonts CDN）
- [x] ~~OG Image 自動生成~~ （已完成：satori + sharp，支援 6 種內容類型）
- [x] ~~Lighthouse CI~~ （已完成：warn mode，閾值 Perf≥90 SEO≥95 A11y≥95 BP≥90）
- [x] ~~趨勢頁 d3 熱詞圖表~~ （已完成：TrendBubbles 加入趨勢列表頁）
- [ ] 原料頁補齊更多 pathwaySteps 資料
- [ ] Pagefind 搜尋頁動態載入

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | 架構、已實作功能、SEO/AEO、無障礙、CI/CD 總覽 |
| [`docs/content-guide.md`](docs/content-guide.md) | 內容維護指南（各類型 frontmatter、交叉連結、標籤、時區） |
| [`docs/news_sop.md`](docs/news_sop.md) | 趨勢新聞自動化 SOP（排程、來源、去重、審核、維運） |
| [`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`](docs/superpowers/specs/2026-05-07-evidencetoday-design.md) | 完整設計規格（品牌、色彩、字體、頁面、元件） |
| [`docs/superpowers/specs/2026-05-08-news-automation-design.md`](docs/superpowers/specs/2026-05-08-news-automation-design.md) | 新聞自動化技術設計規格 |
