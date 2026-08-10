# 對外服務契約：reader-index.json 與文章頁的 ReadingBeacon

> 摘要：`/root/my-line-bot-customer`（LINE 官方帳號 appinews-reader）靠本站 build 期產出的
> `reader-index.json` 取內容候選池、靠文章頁的 beacon 取「真讀 / 秒退」訊號。這兩樣不是自家
> 檔案——改欄位會讓對面靜默降級而不是報錯。移植自 `appi.news` 的同名機制
> （`docs/lessons/reader-index-and-beacon-contract.md`），本檔只記 evidencetoday.news 這一側
> 的差異與坑。

## 契約正本

**在別的 repo，不在這裡**：`/root/appinews-reader/contracts/`
（`reader-index.schema.json`、`beacon.schema.json`）。改任一份輸出的欄位，**先改那份 schema**，
不可單方面改本站的產生器/元件——契約消費端（reader）對缺欄位的設計是**降級**，不是報錯：缺
`cover_image` 出純文字卡、缺 `reading_time` 該打分項回 null 並重分配權重。所以這邊改壞了，
那邊只會安靜地變笨，CI 也不會告訴你。

## 兩支檔案

### `src/pages/reader-index.json.ts`

Astro endpoint（不是 postbuild 腳本）：postbuild 拿不到 content collections，得自己重解
frontmatter 並重寫一份公開判斷。全站的公開判斷唯一真相是 `src/utils/visibility.ts` 的
`isPublicEntry()`，本檔透過 `getPublishedArticles()`（`src/utils/articles.ts`）取得已排序、
已過濾的清單，不另開第二份判斷。

evidencetoday 這一側跟 appi.news 版本的差異，都是因為 collection schema 長得不一樣
（`src/content.schemas.ts` 的 `articlesSchema`）：

- **只收 `articles` collection**（決策已定）。myths/ingredients/news/videos/podcasts 不在範圍內。
- **沒有 frontmatter `category` 欄位**（appi.news 有 enum，這裡沒有）。分類改呼叫
  `classifyArticle()`（`src/utils/article-categories.ts`），對文章的 id/title/description/
  tldr/tags 做關鍵字比對，回傳固定 10 個 slug 之一（`vitamins` / `minerals` /
  `basic-nutrition` / `antioxidant` / `health-concepts` / `health-myths` / `sleep-stress` /
  `menopause` / `food-safety` / `oral-hygiene`），沒有命中規則時 fallback 到
  `health-concepts`。**不要**在這裡發明新的分類體系或直接讀不存在的 `data.category`。
- **沒有 frontmatter `slug` 欄位**，slug＝檔名 id 去副檔名（`entry.id.replace(/\.[^.]+$/, '')`）。
- `description`（≤155 字，必填）、`readingTime`（必填數字）直接對應契約欄位，不需要 fallback
  chain——這點跟本站其他 collection（myths/news 等摘要欄位名不統一）不同，因為契約只收
  articles，articlesSchema 本身欄位是齊的。
- `coverImage` 目前站上的實際值全部是外部圖床絕對網址（Unsplash），但欄位定義本身允許站內
  相對路徑，產生器仍照 `/^https?:\/\//i` 判斷做 fallback：外部網址原樣、站內路徑用
  `new URL(path, site)` 組成絕對網址。**不要對已經是絕對網址的值二次組 URL**——appi.news 那邊
  吃過「base 疊兩次」的虧（`coverImageFor()` 回傳值已含 base，二次套 `absoluteUrl()` 會疊兩層），
  這裡的判斷式就是為了同一個理由存在，即使目前資料上還沒踩到。
- **候選池：目前全站 131 篇 articles 全收，不做分類上限**。appi.news 用「各分類最新 40 篇聯集」
  是因為它的日產出量在分類間極不平均，取最新會讓冷門分類消失。evidencetoday 篇數少（平均每類
  13 篇），全收更簡單、不會有分類被擠掉。**這不是永久決定**：`reader-index.json.ts` 檔頭的
  `REVISIT_ARTICLE_COUNT`（目前 500）是重新評估的門檻，超過時 build 期會印一行 `console.warn`
  提醒，屆時要改成跟 appi.news 一樣的「各分類最新 N 篇聯集＋機械保證 featured 涵蓋」演算法。
- `featured`：`featured === true` 且 `publishDate` 落在**台北時區**當天
  （`Intl.DateTimeFormat({ timeZone: 'Asia/Taipei' })`）。build 跑在 UTC 的 GitHub Actions，
  用 `getDate()` 之類的本地時間方法會讓台北傍晚發佈的精選整批漏掉——這是 appi.news 記過的坑，
  照抄同一個判斷方式。沒有當日 featured 就回空陣列，**不要**退而求其次塞最新一篇（reader 端
  設計上會自己退回一般排序）。

不會污染 sitemap（`@astrojs/sitemap` 只收 HTML route），也不會被 `scripts/check-site.mjs`
掃到（那支只掃 `dist/**/*.html`）。`pnpm build` 的三道自訂 gate
（`check-design.mjs`／`check-content.mjs`／`check-boilerplate.mjs`）掃描範圍也都不含這支
`.ts` 檔（詳見各腳本檔頭的副檔名/路徑白名單）。

### `src/components/seo/ReadingBeacon.astro`

整份移植自 `appi.news` 的同名元件，**量測邏輯與送法一字不改**，只改了三處：

1. `ENDPOINT` 常數：`https://hi.evidencetoday.news/v1/beacon`
2. hostname 守門：`evidencetoday.news` / `www.evidencetoday.news`
3. 掛載點：`src/pages/articles/[slug].astro`，緊接在既有的
   `ReadingEngagement.svelte`（送 GA4，職責不同、終點不同，**並存不合併**）之後。該頁的
   `getStaticPaths()` 已經用 `isPublicEntry` 過濾過，站上目前沒有草稿預覽路由會渲染這個元件，
   不需要額外的 preview 旗標判斷（跟 appi.news 不同，那邊有獨立的排程草稿預覽頁）。

以下每一條都是 appi.news 踩過的坑，照抄是刻意的：

- 捲動深度**只在送出當下算一次**，用最終 `scrollHeight` 換算比例，不在 `requestAnimationFrame`
  裡連續取樣取最大值——文章頁圖片延後載入，早期取樣時 `scrollHeight` 還沒長到最終高度，比例會
  偏高，取最大值會讓偏高值永久留下。
- 停留計時用獨立 `running` 布林旗標，不用時間戳的真值判斷——`performance.now()` 在導覽起點附近
  可以合法地等於 0，`if (since)` 會把「計時中」誤判成「已暫停」，整段停留漏算。這種 bug 手測不
  會發現，appi.news 是寫模擬器跑才炸出來的。
- 只掛 `visibilitychange`（hidden）與 `pagehide`，**不掛 `beforeunload`**（行動裝置常不觸發）。
- `navigator.sendBeacon` 送 `Blob` 用 `text/plain`，不用 `application/json`——後者會觸發 CORS
  preflight，而 preflight 在 `pagehide` 階段常來不及送出。
- `#r=<8 位 hex>` 讀完立刻 `history.replaceState` 抹掉：不讓分享出去的網址帶識別碼，也不污染
  GA 的到達網頁報表。
- inline script 用 `<script is:inline set:html={snippet} />` 掛載，不用 `define:vars` 包樣板
  字串——那會被當成被丟棄的字串、IIFE 不執行（本站沒有 `Analytics.astro` 這個既有教訓的等價
  檔，但同一個 Astro 行為在這裡一樣成立）。
- **⚠️ `scripts/check-design.mjs` 是逐行掃 `src/` 下的 `.css`/`.astro`/`.svelte`、不分 CSS 還是
  JS**：inline script 字串裡若出現十六進位色碼開頭符號、色彩函式呼叫（如 `rgba(`/`hsla(`）或
  字級屬性名（如 `font-size:`），會被判成硬編樣式而擋 build。**連檔頭註解本身都會被掃到**——
  第一版就是這樣被擋下來的（註解裡寫出這些字面字串本身就觸發規則），所以本檔說明這條規則時
  刻意不直接寫出那些觸發字串。量測邏輯本就不需要顏色或字級，不要加。

## 驗證方式

契約合規不能靠肉眼看 JSON。已用的驗法（一次性腳本，跑完即刪，不留在 repo）：

1. `pnpm build`（含 `check-design`/`check-content`/`check-boilerplate`/`astro build`）零錯誤。
2. `node scripts/check-site.mjs`：全站結構 gate 通過（不會掃到 `reader-index.json` 本身，
   但會確認它引用的所有文章頁都真的產生了）。
3. 逐篇核對 `dist/reader-index.json` 裡的 `url` 在 `dist/` 下有對應的 `index.html`。
4. 用 `/root/appinews-reader/contracts/reader-index.schema.json` 逐欄核對：頂層與 `articles[]`
   的 required／additionalProperties／型別／format，外加 `featured` 涵蓋性與 `articles` 排序
   （新到舊）。repo 沒裝 `ajv`，用純 JS 手刻校驗即可，不必為了驗一次而加依賴。
5. `lychee --offline --root-dir dist dist/`：確認 0 內部死連結。用 `--dump`/`--dump-inputs`
   額外確認 lychee 預設不掃 `.json` 檔當連結來源，所以 `reader-index.json` 裡的 URL 字串不會
   被誤判成待驗證的連結。

## 怎麼避免重犯

- **改這兩支任何欄位前先讀契約正本** `/root/appinews-reader/contracts/`；本 repo 這兩檔的檔頭
  都寫了路徑。單方面改＝對面靜默降級，CI 不會抓到。
- articles 的分類概念**只有** `classifyArticle()` 這一份；不要因為某個新需求方便，就順手加
  `data.category` 這種本站 schema 沒有的欄位。
- 候選池「全收」是量體小時的簡化，`REVISIT_ARTICLE_COUNT` 是機械提醒，不是自動切換——超過門檻
  只會印 warning，實際改演算法要人工動手。
- 這兩支檔案在 `src/pages/` 與 `src/components/` 下，屬於 README「修改紀律」規定的 functional
  code 路徑，PR 走 `docs-sync-check.yml` 會要求同步文件——就是本檔存在的原因。
