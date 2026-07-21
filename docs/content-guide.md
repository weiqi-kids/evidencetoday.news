# 內容維護指南

> 所有內容類型的新增、修改、刪除操作說明。

---

## ⭐ 選題與新文章第一順位：先讀「能贏的文章模子」

**撰寫或改寫任何一篇文章前，先讀 [`playbooks/winning-article-formula.md`](./playbooks/winning-article-formula.md)。** 這是本站經實測（melatonin-customs 一篇吃全站 66% 點擊）驗證的選題方法論：在低權威網域上，別跟頭部詞正面打，要挑「**具體、急迫、乏人問津、限定台灣情境**」的健康決定題。每篇動筆前，題目必須同時具備該 playbook 的**六基因**（單一具體決定／「現在」觸發點／台灣在地限定／權威站沒寫的角度／切身後果／答案先行＋範圍狠收），否則會退化成排不上去的百科式泛論。本檔以下的區塊結構規範，是在題目已通過六基因之後才套用。

---

## GEO 答案化原則（提高被 AI 引用）

撰寫新增/修改任何內容時，依下列原則讓內容更容易被 AI 搜尋原文引用：

- **標題即真實問句**：用使用者會打的自然語言問句當標題/小標（「維他命 C 真的能預防感冒嗎？」），而非名詞短語。
- **段落首句先給結論（BLUF / 倒金字塔）**：AI 抽取段落首句，結論不要埋在段末。
- **可引用短斷言**：短、自足、附數字與出處（「根據 2020 年 Cochrane 回顧，一般人群常規補充對感冒病程縮短約 8%」）。
- **對比用表格或清單**：AI 容易結構化抽取。
- **`tldr` / 重點摘要寫成可獨立成立的答案**：不依賴上下文即可被整段引用（會同步出現在該內容 `.txt` 純文字版的開頭）。
- **每個 `references` 附 `url`**：一手來源 URL 會出現在 `.txt` 版文末，讓 AI 連帶引用原始研究。
- **闢謠**：`verdict` 與 `verdictSummary` 要能單獨回答「X 是真的嗎」，對應 ClaimReview 結構化資料。

---

## 內容區塊結構（AEO 自然段落，避免 AI 味）

> 新文章與未來重寫文章的**內容規範**。目標：段落結構利於 AI 抽取（AEO），但讀起來自然、像人寫的，不像模板填空。

### 鐵則（避免 AI 味與過度免責）

> **統一去 AI 味禁用句型清單（全站生成端一致）**：以下 ⑧ 類為所有生成端（news / draft / optimize cron、ai-suggest worker、人工撰稿）共用的鐵則，各處 prompt 皆對齊此清單。

- **🚫 ①「不是X，而是Y」下定義與排比句型**：不准用「不是…而是」「並非…而是」「不僅…更／還」「不只是…而是／更是」等公式化對比轉折。要表達對比，用「是Y，而非X」或正面直述。
- **🚫 ②「值得注意的是」「值得一提的是」「換句話說」**：這類填充轉折一律刪掉，直接講內容。
- **🚫 ③ 空泛收束**：不准用「總的來說」「綜上所述」「總而言之」「歸根結底」「整體而言」等模板化收尾。結尾直接給可帶走的重點或行動。
- **🚫 ④ 拔高與開場公式**：不准用「真正的問題／關鍵是…」這種拔高句，也不准用「隨著…的發展／普及」「在…的今天」這類公式化開場。
- **🚫 ⑤ 誇大形容詞**：不准用「至關重要」「不可或缺」「舉足輕重」等空泛強調詞。
- **🚫 ⑥ 禁止模糊引用（YMYL 尤其致命）**：不准用「研究顯示」「有研究指出」「文獻回顧」「專家認為」「學者認為」「普遍認為」等空泛開頭。每個 claim 要嘛**附具體可點來源**／**具名歸因**（年份／作者／期刊／機構，且對應 frontmatter `references`），要嘛**軟化為主編判讀**（「目前證據顯示…」「就現有資料看…」），要嘛不寫。禁止為了過 gate 而編造來源。
- **🚫 ⑦ 破折號（——）下定義**：不准用破折號補一句定義或轉折來拔高。
- **🚫 ⑧ 禁止模板化第一人稱開場（YMYL 致命傷）**：不准以「我」起句，或用「我一直覺得…」「我最近…」「老實講／老實說…」「朋友最常問我…」「最近有讀者…」「我發現…」「我觀察…」這類固定人設開場白。內文開頭第一句**直接給具體價值**——一個數據、一個明確主張、一個具體情境，而非作者的感想或鋪陳。原因：全站曾有 42% 文章用同一套開場白，在健康（YMYL）類別會被 Google 判為 AI 量產內容而拒絕索引。**每篇開頭都要不一樣。**
- **✅ 正向要求**：長短句交錯、每段換一種開法、每段至少放一個具體事實（數字／年份／機構／情境），用台灣口語、容許口語瑕疵，讀起來像人寫的而非模板填空。
- **`pnpm check:content`（= 相容別名 `pnpm content:audit`）是硬性 gate**：2026-07-21 起改用 new-astro-site skill 的統一去 AI 味引擎 `scripts/check-content.mjs`（取代舊 `audit-ai-tone.mjs`）。**兩級判定**：ERROR（強 AI 指紋單一命中即擋——「不是X而是Y／不只是…而是／並非…而是／值得注意的是／換句話說／空泛收束／模糊引用／模板化開頭」等）；WARN（軟訊號分「詞彙/句式/結構/語氣」四層，**單檔跨 ≥3 層才升級為 ERROR**，破折號等單一命中不擋）。**掃描範圍 grandfather**：預設只掃「相對 origin/main 的變動檔」（存量文章不重掃），`pnpm check:content:all` 全站普查（恆 exit 0、供人工盤點）。已串進 `pnpm build`（`check-design && check-content && astro build`），**提交前 build 即擋**。舊 `raw-enum` 檢查刻意未 port（本就只警告、多為合法 schema 值，前台已由 `evidence-labels.ts` 中文化）。
  - **evidence 特化規則已 port 進 `check-content.mjs` 的 `SITE_*` 擴充點**：模糊引用醫療腔（`某研究指出／文獻回顧／研究者觀點／摘自臨床生化教學文獻`）、AI 句型（`這件事值得說清楚／我一直覺得／老實講／有人說`）、模板化開頭（`朋友最常問我`），以及第一人稱自證口氣 `我觀察`、`我在臨床` 的**全文攔截**（原只擋開頭，實際常出現在第 2、3 段）。注意：只擋這兩個作者假借語氣；讀者/引述語氣的 `我發現`（FAQ 問句）、`我最近`（示範對醫師說的話）合法、不在攔截範圍。
- **不要用 AI 味標題**：禁止「這篇回答什麼問題」「什麼情況需要保守看待」「為你解答」這類制式中介標題。小標要直接講內容（「EPA 和 DHA 差在哪」），而非描述「這段在做什麼」。
- **提醒性文字不可喧賓奪主**：醫療提醒／免責聲明可存在，但**整篇集中一處**即可（多用既有 `medicalDisclaimer` 欄位或結尾一句），不要每個區塊都在提醒、不要把全站做成到處是免責的頁面。
- **保留 BLUF**：每個區塊首句先給結論（見上方 GEO 原則），其餘補充。
- **30 秒重點 / 結論要能獨立成立**：不依賴上下文即可被整段引用。

### 各類型建議區塊（H2 小標可依主題自然微調用詞，順序為建議）

**一般文章**
1. 30 秒重點　2. 重點整理　3. 關鍵判讀　4. 常見疑問　5. 參考來源　6. 延伸閱讀

**研究／趨勢文章**
1. 30 秒重點　2. 研究說了什麼　3. 為什麼值得注意　4. 關鍵判讀　5. 研究限制　6. 參考來源

**成分解析**
1. 30 秒重點　2. 這個成分是什麼　3. 常見用途　4. 證據怎麼看　5. 怎麼挑選　6. 常見疑問　7. 參考來源

**闢謠文章**
1. 30 秒結論　2. 這個說法從哪裡來　3. 證據怎麼看　4. 容易誤解的地方　5. 關鍵判讀　6. 參考來源

### FAQ（`faq` 欄位）撰寫規範

`faq` 會輸出 **FAQPage JSON-LD**（文章頁、健康專題頁），因此問題品質直接影響 AEO：

- **問題要自然、貼主題**，像讀者真的會問的（「EPA 和 DHA 差在哪裡？」「魚油濃度越高就一定越好嗎？」「葉黃素和玉米黃素有什麼不同？」「鈣和維生素 D 為什麼常一起討論？」「三酸甘油脂偏高和飲食有什麼關係？」「保健食品標示上的毫克數該怎麼看？」）。
- **禁止制式／粗糙提醒式問題**：不要每篇都塞「什麼人補充前要先問醫師」這種萬用問句。
- **FAQ 抽取來源限定 `faq` 欄位**，不要把「結語／參考來源／免責聲明／延伸閱讀」當成問答塞進 `faq`。
- 答案首句先回應問題本身（可被單獨引用），語氣保守、精準。

### 健康專題（topic hub）

主題整理頁定義在 `src/data/topics.ts`（含 `intro` / `thirtySecond` / `matchKeywords` / `faq`）。新增或調整主題、或想讓某內容被歸入某專題，見 [docs/playbooks/topic-hubs.md](./playbooks/topic-hubs.md)。

---

## 新增文章

在 `src/content/articles/` 建立 `.mdx` 檔案，檔名即為 URL slug（例如 `my-article.mdx` → `/articles/my-article/`）。

> **Slug 命名規則（必遵守，影響 AEO 與分享）**
> - 一律用**語意化英文短語**、全小寫、連字號分隔，含主關鍵字（例：`menstrual-pain-primary-vs-secondary`、`vitamin-d-beyond-bone-immune-mood-heart`）。
> - **禁止無語意的數字／來源序號 slug**（如 `appi-news-63`、`lodes-22`）。舊有此類 slug 已於 2026-06 全數改名並在 `astro.config.mjs` 設轉址，新文章不得再產生。
> - slug 一旦發布即固定；若必須改名，務必同步在 `astro.config.mjs` 的 `redirects` 補一條 `舊 → 新/`，避免斷連結與流失索引權重。

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

> **維護提醒：** 新增或下架「已發佈（`status: published` 且非 `draft`）」的闢謠後，必須同步更新 `scripts/check-myth-quality.mjs` 的 `EXPECTED_PUBLISHED_COUNT` 常數，使其等於目前已發佈的闢謠篇數，否則 `pnpm check:myths` 會失敗。此常數是防止意外大量增刪闢謠的守門機制。

---

## 新增成分解析

在 `src/content/ingredients/` 建立 `.mdx` 檔案：

```yaml
---
title: "成分中文名"
titleEn: "English Name"
sortKey: "ㄨ"                            # 注音首字母，用於索引排序
description: "155 字以內摘要"
publishDate: 2026-05-08
updatedDate: 2026-05-08
tags: ["標籤"]
introduction: "白話介紹這個成分是什麼"
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
   - 成分解析：`src/content/ingredients/{slug}.mdx`
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
| 成分解析封面 | `public/images/ingredients/` | `{slug}.jpg` |
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
| `Invalid enum value` | 列舉值不在允許範圍 | 檢查 `src/content.config.ts` 中允許的值 |
| `Array must contain at least 1 element(s)` | 必填陣列為空 | myths 的 `evidence` 和 `references` 至少要有一筆 |
| `String must contain at most 155 character(s)` | description 超過 155 字 | 縮短 description |

Schema 定義檔：`src/content.config.ts`，所有欄位的型別、必填/選填、允許值都在這裡。
