# 頁面規則：/myths 闢謠

排版 variant 見 [`../playbooks/article-layout.md`](../playbooks/article-layout.md)；內容寫法見 [`../content-guide.md`](../content-guide.md)。發布前必跑 `pnpm check:myths`。

---

## 選題供給來源：唯一收「當下實際在流傳的謠言」

2026-09-08 業主裁示：闢謠線的選題供給來源**只有一個**——此刻真的有人在傳的說法。
題庫式發想（憑印象覺得「大家應該常誤會這個」）一律不做：沒有流傳證據就不是闢謠，是自問自答。
規則寫在 `ops/draft-cron.sh` 的 myths `SELECT_BLOCK`，改動請一併更新本節。

### 四條取證管道（都實測可從自動化主機直連；Google 網域連不上，別試）

| 管道 | 端點 | 拿到的證據 |
|---|---|---|
| Cofacts 真的假的（LINE 回報訊息） | `POST https://api.cofacts.tw/graphql` | 訊息 id、`replyRequestCount`（多少人在 LINE 上問這則）、`createdAt` |
| 台灣事實查核中心 | `https://tfc-taiwan.org.tw/feed/`、`https://tfc-taiwan.org.tw/weekly-top-10-rumors/` | 查核報告 URL、發布日、每週謠言 TOP10 的名次與週次 |
| MyGoPen | `https://www.mygopen.com/feeds/posts/default?alt=rss` | 該篇 URL、發布日 |
| GSC 實際被打進搜尋框的問句 | `node scripts/audience-insights.mjs` → `data/audience-insights.json` 的 `topicCandidates` | 查詢字串、`evidence.impressions`、`evidence.position` |

- Cofacts 的健康題在兩個分類底下：`medical`（疾病、醫藥）與 `lT3h7XEBrIRcahlYugqq`（保健秘訣、食品安全）。
- ⚠️ Cofacts 一定要打 `api.cofacts.tw`。打 `cofacts-api.g0v.tw` 會 303 轉址並把 POST body 丟掉、回 500，看起來像 API 壞了。
- WebSearch **只能當佐證**（回頭確認說法近期仍在流通、補流傳版本的原話），不能當唯一證據。

### 判準刻意是二值的，不設分數門檻

命中上表**任一條**即算有流傳證據，不要求同時命中多條、不設「幾人回報以上」的下限。
這是刻意的：news 線 2026-08-11 被兩條選題規則夾成死結，連續數週零產出而無人察覺，因為「無新草稿」是設計上的正常結局。
改這一節時務必檢查新規則與既有門檻（七月標準、`check:myths`、撞題排除）會不會又互相咬死。

- 時間窗先抓近 90 天；四條都撈不到候選才放寬到 180 天。
- **已被 TFC／MyGoPen 查核過不是排除理由**，那正是它在流傳的證明；但禁止改寫查核報告原文，一級文獻要自己找。
- 唯一的排除是撞題（既有 slug／`mythClaim` 相同）——換下一個候選，不是整輪放棄。

### 證據要落地在既有 frontmatter 欄位

不要為此加新欄位（`mythsSchema` 沒宣告的欄位會被 Zod 靜默剝除，見本檔 FAQ 那條的前例）。

| 欄位 | 新要求 |
|---|---|
| `rumorSources` | 每筆＝「管道＋可核對的識別＋日期＋量」，例如「Cofacts 訊息 `<id>`（`<日期>`，`<n>` 人詢問）」「TFC 每週謠言 TOP10 `<週次>` 第 `<n>` 名」「GSC 查詢『…』近 28 天曝光 `<n>`、平均排名 `<x>`」。**禁止填「長輩經驗談」「家庭群組轉傳」這類無法核對的泛稱**——不算證據，且會撞硬規則 13 跨頁樣板 |
| `spreadLevel` | 要對得上 `rumorSources` 裡的量，不憑感覺填 |
| `currentSituation` / `popularVersions` / `whyItSpreads` | 寫這一則**此刻**的真實流傳形態（哪個平台、哪個版本的原話），不寫放諸四海皆準的通則 |

run summary（cron stdout，落在 `/var/log/evidencetoday/draft-myths.log`）每篇一行印出「slug｜管道｜識別碼或 URL｜量化數字｜證據日期」；**零產出時要逐條印出四條管道各查了什麼、為什麼沒有候選**。

### 連續零產出告警

`ops/draft-cron.sh` 的 `ZERO_STREAK` 機制涵蓋 myths：連續零產出達門檻就發闢謠頻道 Slack 警報，有稿即歸零。
myths 是週更且供給面比題庫式窄，門檻獨立設得比每日型的 news 更早觸發（見 `draft-cron.sh` 的 `ZERO_ALERT_AT`）。

### 兩個與選題無關、但實測會造成零產出的坑

1. 撰稿子代理被丟到背景後主 session 空等，會被 headless 的背景等待上限砍斷 → 子代理要在同一則訊息並行派出並等它們回傳。
2. `scripts/check-myth-quality.mjs` 的 `EXPECTED_PUBLISHED_COUNT` 是哨兵：新增 published 迷思後沒同步調整，`pnpm check:myths` 必掛，剛寫好的稿會被產線自己刪掉。

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
