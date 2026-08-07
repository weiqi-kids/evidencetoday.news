# 頁面規則：/myths 闢謠

排版 variant 見 [`../playbooks/article-layout.md`](../playbooks/article-layout.md)；內容寫法見 [`../content-guide.md`](../content-guide.md)。發布前必跑 `pnpm check:myths`。

---

## 單篇頁：極簡，但分清楚擋的是什麼

- ~~不要加「延伸閱讀」「相關內容」這類導覽區塊~~ → **2026-08-07 推翻，延伸閱讀已加上**。
  推翻的理由是實測數據：闢謠單篇曾是全站唯一沒有任何站內出鏈的頁型（內文區站內連結中位數 **0**），而闢謠是搜尋主要入口之一，等於把讀者接進來又送走。留客的優先度高於版型潔癖。加上後中位數為 2。
- 仍然不要加的是「更新與更正紀錄」這類**與閱讀動線無關**的區塊——`check-myth-quality` 掃不到模板層，這條靠 review 把關。
- **判準（2026-08-06 釐清）**：問「這個區塊的內容**是這一篇獨有的**，還是把站上別處的東西搬過來？」把別處內容搬過來的一律不加；該篇自己的內容可以討論。此前這條被寫成「只渲染固定區塊」，範圍過寬，結果是逐篇寫好的內容也不敢露出。
- **FAQ**：frontmatter 手寫 Q&A，前台渲染 + 輸出 FAQPage JSON-LD。曾因 `mythsSchema` 漏宣告 `faq` 欄位被 Zod 靜默剝除而整組失效，補回後生效，**勿再移除**。
- **「那，實際上該怎麼做？」**（2026-08-06 新增，使用者授權）：讀 `safeActions`／`avoidActions`（兩張並排卡，沿用 `myth-reasoning-card--blue/--red`）與 `whenToSeekProfessionalAdvice`（單行提示）。這三欄從建站起就逐篇寫在 frontmatter、前兩者還是 **required**，卻從未被任何模板讀取——74 篇的「該做／別做／何時就醫」讀者一個字都看不到。
  ⚠️ `whenToSeekProfessionalAdvice` **只在不等於通用句時輸出**。74 篇裡 28 篇填的是與頁尾免責幾乎同義的通用句，兩處都印會違反硬規則 8a「免責一頁一次、絕不重複」；那些頁由頁尾 `.health-reminder` 承擔即可。通用句常數寫在 `myths/[slug].astro` 的 `GENERIC_SEEK_ADVICE`。
- **`medicalDisclaimer` 是活欄位**，不是裝飾：頁尾 `.health-reminder` 優先取該篇的值，退回通用句。詳見 `../playbooks/legal-notices.md`。
- 使用 `cards` variant（透明背景 + `max-width: none`）。漏掉 `max-width: none` 會讓 blocks 被限制在 68ch。
- **不加 ShareButtons**：闢謠單篇刻意極簡且已有原生分享區，由 `showShare = category !== 'myth'` 排除。
- `status: "under-review"` 的稿排除在 `/myths` 公開列表與路由生成之外。

## 色彩

- 沿用 CI tokens（`--color-paper/ink/fog/teal/navy/coral/cat-myth`）與 `color-mix`，**禁止新增 pastel hex**。
- `VerdictBadge` 只能用 CI token + `color-mix`。
- `MythCard` 的 `verdict` 型別必須引用 `@/utils/myths/schema` 的 `MythVerdict`，不可自行定義字面量聯集。

## 列表頁：篩選與排序（前端互動）

- **篩選順序**：`searchQuery` → `verdict` → `topicTags` → `evidenceLevel`，採**交集**邏輯。
- **排序**：對篩選後結果依 `updatedDate` 排序（`new` 新到舊、`old` 舊到新），日期解析失敗 fallback 為 `0`。
- **搜尋欄位**：`title`、`mythClaim`、`verdictSummary`、`summary`、`topicTags`、`tldr`（大小寫不敏感，先 `trim`）。
- **空狀態**：結果為空時只顯示「目前沒有符合條件的闢謠文章，請調整搜尋或篩選條件。」且不渲染卡片。
- 顯示切換用 `style.display`（避免 `hidden` 屬性被頁面樣式覆寫），確保空狀態與卡片列表互斥。

## 免責、FAQ、封面圖：只印「這一篇自己的」（2026-08-07）

三個欄位都曾是整批複製的樣板，且都已上前台或上結構化資料，改法一致：
渲染時過 `src/utils/boilerplate.ts` 的過濾，值在 5 篇以上逐字相同就不顯示。

| 欄位 | 樣板篇數 | 處理 |
|---|---|---|
| `medicalDisclaimer` | 68/76 | 只印該篇特有的（6 篇）。其餘交給頁尾全站免責——頁尾早就有一句，內文再印一次違反硬規則 10「通用醫療免責只在頁尾一處」 |
| `faq` | 26/76 | 過濾後 FAQ 頁數 59 → 33。同時從 FAQPage 結構化資料移除——26 頁對 Google 宣告一模一樣的 FAQ，是拿 rich result 資格去換一個重複內容訊號 |
| `safeActions` / `avoidActions` / `whenToSeekProfessionalAdvice` | 26–28/76 | 原本只硬編比對一句通用 seek-advice，改成跨篇實測。硬編清單擋不住下一批新的樣板句 |

**順帶更正一項先前的判斷**：2026-08-06 曾記錄「74 篇客製文案讀者一個字都看不到」，
那個數字是錯的——實測只有 8 篇是客製的，其餘 68 篇一字不差。

### 封面圖欄位已全部移除

74/76 篇的 `coverImage` / `heroImage` / `ogImage` / `shareCardImage` 指向同兩張 radar SVG，
而那兩張圖裡烤死了別的題目的字樣與 `aria-label`（見 `docs/pitfalls.md`）。
295 個錯誤欄位已清除，`shareCardImage` 改為 optional，`validate.ts` 的必填要求已移除。

分享圖由 `contentSocial()` 的 `mythOgImage(slug)` 逐篇產生，不吃 frontmatter；
列表頁用 `MythSquareCardVisual` 逐篇渲染該篇自己的標題／判讀／證據強度；
卡片縮圖缺值時 `MythCard` 退回品牌縮圖。三條路都不需要 frontmatter 填圖。
