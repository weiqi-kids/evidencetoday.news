# 內容維護指南

> 所有內容類型的新增、修改、刪除操作說明。

---

## 新增文章

在 `src/content/articles/` 建立 `.mdx` 檔案，檔名即為 URL slug（例如 `my-article.mdx` → `/articles/my-article/`）。

```yaml
---
title: "文章標題"
description: "155 字以內的摘要，用於 SEO meta description"
author: "作者名"
reviewer: "審稿人"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤A", "標籤B"]
tldr: "一段 TL;DR 重點摘要"
readingTime: 8
editorReviewed: true
featured: false                          # true = 首頁焦點置頂
draft: false                             # true = 不發佈
# --- 選填 ---
disclosure: "利益揭露聲明（若有）"
coverImage: "/images/articles/xxx.jpg"    # OG 分享圖
faq:
  - question: "常見問題？"
    answer: "回答。"
references:
  - title: "研究標題"
    url: "https://doi.org/..."
    type: meta-analysis                  # meta-analysis | rct | observational | review | guideline | other
relatedMyths: ["myth-slug"]
relatedIngredients: ["ingredient-slug"]
relatedVideos: ["video-slug"]
relatedPodcasts: ["podcast-slug"]
---
```

在 frontmatter 下方撰寫 Markdown 內文（使用 `##` H2 和 `###` H3 標題）。

---

## 新增闢謠

在 `src/content/myths/` 建立 `.mdx` 檔案：

```yaml
---
title: "迷思原句（例：吃 XX 一定有效？）"
description: "155 字以內摘要"
verdict: contextual                      # true | false | insufficient | contextual
verdictSummary: "2-3 句結論摘要"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤"]
whyItSpreads: "為什麼會流傳的分析"
actionAdvice: "一般人怎麼做最安全的建議"
featured: false
draft: false
evidence:                                # 至少一筆（必填）
  - level: meta-analysis                 # meta-analysis | rct | observational | animal | in-vitro
    summary: "該等級的研究結論摘要"
references:                              # 必填
  - title: "引用來源標題"
    url: "https://..."
    type: meta-analysis
relatedArticles: ["article-slug"]
relatedIngredients: ["ingredient-slug"]
---
```

---

## 新增原料

在 `src/content/ingredients/` 建立 `.mdx` 檔案：

```yaml
---
title: "原料中文名"
titleEn: "English Name"
sortKey: "ㄨ"                            # 注音首字母，用於索引排序
description: "155 字以內摘要"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤"]
introduction: "白話介紹這個原料是什麼"
featured: false
draft: false
uses:                                    # 研究常討論的用途
  - purpose: "用途名稱"
    evidenceLevel: rct
    summary: "該用途的研究摘要"
safety:                                  # 選填
  general: "一般安全性說明"
  interactions:
    - substance: "交互作用物質"
      description: "說明"
  populations:
    - group: "特殊族群（如孕婦）"
      note: "注意事項"
references:
  - title: "引用來源"
    type: guideline
relatedArticles: ["article-slug"]
relatedMyths: ["myth-slug"]
---
```

---

## 新增 Podcast 單集

在 `src/content/podcasts/` 建立 `.mdx` 檔案：

```yaml
---
title: "單集標題"
description: "155 字以內摘要"
episodeNumber: 2
publishDate: 2026-05-08
duration: "32:15"
embedUrl: "https://open.spotify.com/embed/episode/..."
tags: ["標籤"]
featured: false
draft: false
chapters:                                # 選填
  - time: "00:00"
    title: "開場"
  - time: "05:30"
    title: "第一段主題"
showNotes:                               # 選填
  - "重點一"
  - "重點二"
references:                              # 選填
  - title: "引用來源"
    type: review
relatedArticles: ["article-slug"]
---
```

---

## 新增短影音

在 `src/content/videos/` 建立 `.mdx` 檔案：

```yaml
---
title: "影片標題"
description: "155 字以內摘要"
youtubeId: "實際的YouTube影片ID"         # 從 YouTube URL 取得
duration: "0:30"                         # 選填
publishDate: 2026-05-08
tags: ["標籤"]
tldr: "30 秒重點摘要"
draft: false
transcript: "完整文字稿（選填）"
relatedArticles: ["article-slug"]
---
```

---

## 新增趨勢新聞

在 `src/content/news/` 建立 `.md` 檔案。完整撰寫流程見 README.md「AI 任務：撰寫趨勢文章」。

```yaml
---
title: "原始標題（可含健康雷達前綴，前台會自動清理）"
titleDisplay: "口語化前台標題（選填，優先於自動清理結果）"
subtitle: "一句話副標（選填，15-30 字）"
category: "主分類（選填，會從 tags 自動推斷）"  # 睡眠/飲食/食品安全/運動營養/慢性病/公共衛生/保健食品/腸道健康/研究新知
source: "來源媒體名稱"
sourceUrl: "https://原始新聞連結"
publishDate: 2026-05-08
tags: ["標籤"]
summary: "一句話摘要"
heroImage: "/images/news/xxx.jpg"          # 選填，文章主圖（有分類 fallback SVG）
thumbnail: "/images/news/xxx-thumb.jpg"    # 選填，列表縮圖（有分類 fallback SVG）
intro: "2-4 句白話開頭介紹（選填）"
termBox:                                   # 選填，專有名詞科普
  - term: "名詞"
    definition: "白話解釋"
evidenceNote: "2-3 句白話證據提醒（選填）"
pmid: "12345678"                           # 選填，PubMed ID
editorPick: false                          # true = 主編選題
editorComment: "我的觀點與行動建議（前台以此名稱顯示）"
draft: false
relatedArticles: ["article-slug"]
relatedMyths: ["myth-slug"]
relatedIngredients: ["ingredient-slug"]
---
```

**標題處理邏輯：** 前台標題優先使用 `titleDisplay`，若沒有則自動從 `title` 移除「健康雷達 YYYY-MM-DD HH：」前綴。`title` 保留原始值供後台與 SEO 使用。

**圖片 fallback：** 若未提供 `heroImage` / `thumbnail`，系統會根據分類自動使用 `public/images/news/` 下的 SVG 預設圖。

---

## 修改既有內容

1. 找到要修改的檔案：
   - 文章：`src/content/articles/{slug}.mdx`
   - 闢謠：`src/content/myths/{slug}.mdx`
   - 原料：`src/content/ingredients/{slug}.mdx`
   - Podcast：`src/content/podcasts/{slug}.mdx`
   - 短影音：`src/content/videos/{slug}.mdx`
   - 趨勢新聞：`src/content/news/{slug}.md`
   - 不確定 slug？用 `grep -r "文章標題關鍵字" src/content/` 搜尋

2. 修改 frontmatter 或內文後，更新 `updatedDate` 為今天日期

3. 本地預覽 → commit → push

---

## 刪除內容

**暫時下架（推薦）：** 將 frontmatter 的 `draft` 設為 `true`，檔案保留但不會出現在網站上。日後可隨時改回 `false` 重新上架。

**永久刪除：** 直接刪除檔案。刪除前確認：
- 其他內容的 `related*` 欄位是否引用了這個 slug（用 `grep -r "slug-name" src/content/` 檢查），有的話一併移除引用
- commit message 說明刪除原因

---

## 更新政策頁

直接編輯 `src/data/policies/` 下的 Markdown 檔案：

- `about.md` — 關於本站
- `editorial-policy.md` — 編輯政策
- `medical-disclaimer.md` — 醫療聲明
- `disclosure.md` — 利益揭露政策

`privacy.astro` 和 `terms.astro` 為 inline 內容，直接編輯 `src/pages/` 下的 `.astro` 檔案。

---

## 新增政策頁

1. 在 `src/data/policies/` 建立新的 `.md` 檔案（如 `cookie-policy.md`）
2. 在 `src/pages/` 建立對應的 `.astro` 頁面（如 `cookie-policy.astro`），參考 `src/pages/about.astro` 的結構，使用 `Policy` layout
3. 在 `src/components/blocks/Footer.astro` 加入新頁面的連結

---

## 圖片管理

| 用途 | 存放位置 | 命名規則 |
|------|---------|---------|
| 文章封面 / OG 分享圖 | `public/images/articles/` | `{slug}.jpg`（1200x630） |
| 闢謠封面 | `public/images/myths/` | `{slug}.jpg` |
| 原料封面 | `public/images/ingredients/` | `{slug}.jpg` |
| 趨勢新聞 fallback | `public/images/news/` | 分類 SVG（已建立 9 張） |
| 全站預設 OG | `public/og-default.jpg` | 固定檔名 |

在 frontmatter 中以 `coverImage: "/images/articles/{slug}.jpg"` 引用。

---

## 交叉連結規則

所有內容類型都可以透過 frontmatter 的 `related*` 欄位互相連結。值為對方的檔名（不含副檔名）：

```
relatedArticles: ["omega-3-guide"]       # 連到 src/content/articles/omega-3-guide.mdx
relatedMyths: ["vitamin-c-cold"]         # 連到 src/content/myths/vitamin-c-cold.mdx
relatedIngredients: ["vitamin-c"]        # 連到 src/content/ingredients/vitamin-c.mdx
relatedPodcasts: ["ep01-supplements"]    # 連到 src/content/podcasts/ep01-supplements.mdx
relatedVideos: ["sprouted-potato"]       # 連到 src/content/videos/sprouted-potato.mdx
```

建議雙向設定（A 連 B 時，B 也連 A）。

---

## 標籤（Tags）

所有內容的 `tags` 欄位會自動產生 `/tags/[tag]/` 彙整頁。跨內容類型的同標籤會匯集在同一頁。

建議統一標籤命名（例如用「維他命C」而非混用「維生素C」）。

**標籤命名禁忌：** tags 不得包含 `/`（斜線），會導致 Astro 無法產生 `/tags/[tag]/` 路由而 build 失敗。例如 `ME/CFS` 應改為 `慢性疲勞症候群`。

---

## 時區規則

全站日期統一使用 **台灣時間（Asia/Taipei, UTC+8）**。

| 項目 | 規則 |
|------|------|
| `publishDate` frontmatter | 以台灣日期為準（如 UTC 5/8 22:00 = 台灣 5/9 06:00 → 寫 `2026-05-09`） |
| 網站日期顯示 | 統一由 `src/utils/date.ts` 的 `fmtDate()` 處理，使用 `Asia/Taipei` 時區 |
| 新聞檔名 | `radar-{YYYY}-{MM}-{DD}-{HH}-{NN}.md` 中的日期和小時以台灣時間為準 |

---

## Schema 驗證失敗排錯

`pnpm build` 或 `pnpm dev` 時如果出現 Content Collection schema 錯誤，常見原因：

| 錯誤訊息 | 原因 | 修正方式 |
|---------|------|---------|
| `Required at "title"` | 必填欄位缺失 | 補上該欄位 |
| `Expected string, received number` | 型別錯誤 | 檢查值的格式（如日期要用 `2026-05-08` 不是 `20260508`） |
| `Invalid enum value` | 列舉值不在允許範圍 | 檢查 `src/content.config.ts` 中允許的值（如 verdict 只接受 true/false/insufficient/contextual） |
| `Array must contain at least 1 element(s)` | 必填陣列為空 | myths 的 `evidence` 和 `references` 至少要有一筆 |
| `String must contain at most 155 character(s)` | description 超過 155 字 | 縮短 description |

Schema 定義檔：`src/content.config.ts`，所有欄位的型別、必填/選填、允許值都在這裡。
