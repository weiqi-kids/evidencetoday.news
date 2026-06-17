# GEO 站外經營與成效監測 Playbook

> 站內技術（A1/A2/A3/B）已完成。站外訊號讓 AI 更傾向引用「全網被廣泛承認」的來源。本檔為使用者親自執行的步驟清單，依槓桿高低排序。對應策略地圖 `docs/superpowers/specs/2026-06-14-geo-strategy-design.md` 的 C、D 區塊。

執行原則：一次做一步、做完打勾、把產生的驗證碼/連結交給工程協助回填站內設定。

---

## 優先順序總覽

| 順位 | 項目 | 為何重要 | 你要做 | 工程協助 |
|---|---|---|---|---|
| 1 | Bing Webmaster 收錄 | ChatGPT 搜尋走 Bing 索引 | 註冊、驗證、提交 sitemap | 放驗證碼 meta |
| 2 | Google Search Console | AI Overviews / Gemini、確認收錄 | 註冊、驗證 | 放驗證碼 meta |
| 3 | Wikidata entity | 讓 AI 有可連結的機構實體 | 建立 item | 回填 Person/Org sameAs |
| 4 | 有機提及 / backlink | 全網引用權重 | 內容經營 | — |
| 5 | D2 人工抽測 | 量測有沒有被引用 | 每月跑題庫 | 記錄表 |
| 6 | D1 referrer 監測 | 量測 AI 導流 | 決定方式 | 建置 beacon |

---

## 1. Bing Webmaster Tools（最高槓桿）

ChatGPT 的網路搜尋走 Bing 索引，台灣市場最常被忽略。

1. 前往 https://www.bing.com/webmasters ，用 Microsoft 帳號登入。
2. 「Add a site」→ 輸入 `https://evidencetoday.news`。
   - 若已在 Google Search Console 設好，可選「Import from GSC」一鍵帶入並免驗證。否則走下一步。
3. 驗證所有權：選「HTML Meta Tag」，會給一段 `<meta name="msvalidate.01" content="XXXX" />`。
   - **把那段 content 值貼給工程**，我加進 `src/layouts/Base.astro` 的 `<head>`，push 後你回 Bing 按 Verify。
4. 驗證通過後 →「Sitemaps」→ Submit：`https://evidencetoday.news/sitemap-index.xml`
5. 完成。日後可在此看到 Bing 索引頁數、查詢字詞、被點擊狀況。

- [x] Bing 帳號建立並加入網站（2026-06-17 完成）
- [x] 驗證 → Verify 通過
- [x] 提交 sitemap

## 2. Google Search Console

確認 Google 正確收錄（影響 AI Overviews / Gemini）。

1. 前往 https://search.google.com/search-console ，新增資源 `https://evidencetoday.news`（URL prefix 類型）。
2. 驗證：同樣可用「HTML tag」`<meta name="google-site-verification" ... />`，**content 值交給工程**回填 Base.astro。或用 DNS TXT（若你管 DNS 更穩）。
3. 提交 sitemap：`https://evidencetoday.news/sitemap-index.xml`
4. 之後用「網址審查」抽查幾篇文章是否已編入索引。

- [x] GSC 資源建立（2026-06-17 完成；SA `ga4-insights@yaocare` 已有資源權限，`pnpm perf` 可拉 GSC 資料）
- [x] 驗證 → 通過
- [ ] 提交 sitemap，抽查 3 篇已收錄（改名後新 slug 可在此手動送 URL 加速回補索引）

## 3. Wikidata 機構 entity（C2）

讓 AI 有一個可連結的「本日有據」實體；建好後其 URL 可回填到站內 Person/Organization 的 `sameAs`，形成閉環。

1. 註冊 https://www.wikidata.org 帳號。
2. 「Create a new Item」：
   - Label（中文）：`本日有據`；Label（英文）：`Evidence Today`
   - Description：`台灣健康議題編輯平台 / Taiwanese health-evidence editorial platform`
3. 加上述性質（Statements）：
   - `instance of (P31)` → `website (Q35127)` 或 `online database`
   - `official website (P856)` → `https://evidencetoday.news`
   - `country (P17)` → `Taiwan`
   - `language of work (P407)` → `Traditional Chinese`
4. 存檔後會得到一個 `Q` 編號（如 `Q123456789`）與 URL `https://www.wikidata.org/wiki/Q123456789`。
   - **把這個 URL 交給工程**，我加進 `SITE_SAMEAS`（`src/data/authors.ts`），讓 Organization/Person 的 sameAs 多一個權威實體。
5. （進階）若主編羅揚要獨立 Person item，可比照建立並用 `P50 author` 串接，但非必要。

- [x] Wikidata item 建立並填 statement（2026-06-17：**Q140265345** 本日有據／Evidence Today；P31 website、P856 官網、P17 Taiwan、P407 Chinese、P571 2026）
- [x] Q 編號 URL 回填 `SITE_SAMEAS`（`src/data/authors.ts` 第一順位 `https://www.wikidata.org/wiki/Q140265345`）
- [ ] 後續：累積 1–2 個第三方提及以鞏固 notability（降低被提刪風險）

注意：Wikidata 對「值得收錄性（notability）」有要求，若 item 被提刪，先累積一些第三方報導/引用再建（見下一步）。

## 4. 有機提及與 backlink（C3/C4）

LLM 偏好被全網廣泛引用的來源。重質不重量、禁灌水。

- 在 PTT / Dcard / Threads / 相關社團，當有人問到對應健康問題時，**以內容價值**自然分享對應的闢謠/文章連結（不是到處貼）。
- 與其他健康媒體、機構、衛教單位互相連結或合作轉載（標明出處）。
- 投稿、接受採訪、被新聞引用——每一次第三方提及都同時強化 Wikidata notability 與 LLM 語料權重。
- 目標心態：累積「別人主動提到我們」的足跡，而非自我宣傳。

- [ ] 建立 2–3 個有機提及（記錄在哪、連到哪篇）
- [ ] 接洽 1 個互相連結/轉載對象

---

## 5. D2 人工抽測 checklist（成效監測）

每月固定拿同一組問題去問各家 AI，記錄是否引用本站、排序如何。問題取自本站既有內容（涵蓋闢謠與文章）。

**題庫（每月固定問，可逐步擴充）：**
1. 感冒後狂吃維生素 C 會好得比較快嗎？
2. 鹼性水或鹼性體質可以抗癌嗎？
3. 蔓越莓汁可以治療尿道感染嗎？
4. 蘋果醋可以快速減肥嗎？
5. 吃雞蛋會提高膽固醇和心臟病風險嗎？
6. 葡萄糖胺和軟骨素可以逆轉關節退化嗎？
7. 膠原蛋白喝了會直接變成皮膚膠原蛋白嗎？
8. 痛風只是因為吃太好嗎？高尿酸要怎麼飲食調整？
9. 益生菌是不是人人吃都有幫助？
10. 防曬會不會影響維生素 D 合成？

**對象：** ChatGPT（開網路搜尋）、Perplexity、Google（AI Overviews）、Gemini、Claude。

**每月記錄表（自行複製填寫）：**

| 日期 | 問題# | 平台 | 有引用本站？ | 引用位置/排序 | 備註（被誰搶引、答案品質） |
|---|---|---|---|---|---|
| | | | 是/否 | | |

判讀：連續 2–3 個月某平台從「否」變「是」，代表站內+站外努力開始被該引擎採信；長期沒有任何引用，回頭檢查該平台是否有索引（GSC/Bing 收錄狀況）。

- [ ] 第一次基線抽測（記下目前 0/n 的起點）
- [ ] 設每月固定日重跑

## 6. D1 referrer 監測（待你決定方式）

GitHub Pages 靜態無 server log，無法直接看爬蟲。可量測的是「使用者從 AI 點連結進站」的 referrer。三條路，請擇一（決定後工程建置）：

- **A. 自建 Cloudflare Worker beacon（推薦）**：你們已有 Worker 基礎建設。前端一段極小 script，當 `document.referrer` 來自 `chat.openai.com`/`perplexity.ai`/`gemini.google.com` 等時，送一個 beacon 到 Worker 記進 KV。隱私友善（只記來源網域、不記個資），可自訂。需更新 `privacy.astro`。
- **B. 隱私友善分析服務（Plausible 等）**：最省力，有現成 referrer 報表，但需付費/自架且引入第三方，需更新 `privacy.astro`。
- **C. 暫不做**：先靠 D2 人工抽測，referrer 之後再說。

`privacy.astro` 已預留「未來導入分析工具會更新說明並提供退出機制」，故選 A/B 都需回來補這頁。

- [ ] 決定 A / B / C
- [ ] （若 A/B）工程建置 + 更新隱私頁

---

## 站內索引衛生（工程已落地，維護時注意）

讓爬蟲與 AI 把預算集中在「真內容」，避免 thin 頁稀釋權威訊號。

- **分類頁 `/tags/*` = `noindex, follow` 且不進 sitemap。** 自動產生、多數只含 1–2 筆、`tagSocial()` 描述偏薄，索引價值低但仍是內部連結樞紐，故用 `noindex,follow`（不索引、保留穿透）。
  - 機制：`Base.astro` 的 `robotsFollow` prop 控制 `noindex` 時輸出 `noindex, follow`（預設 `noindex, nofollow`）；`List.astro` 透傳；`src/pages/tags/[tag].astro` 傳 `noindex={true} robotsFollow={true}`。
  - sitemap 排除：`astro.config.mjs` 的 `sitemap.filter` 同時排除 `/admin` 與 `/tags/`。
  - 新增 thin 列表頁（未來若有）沿用同模式。
- **作者姓名連到作者頁。** `EditorInfo.astro` 用 `AUTHORS` registry 把 `author` 連到 `/authors/<slug>/`（`rel="author"`），串起 文章 → 作者頁 → `sameAs` 實體圖，強化 E-E-A-T。registry 沒有的作者名則純文字顯示。
- **全六類內容皆提供 `/[type]/[slug].txt` 純文字版，且全數收進 `llms-full.txt`。** 給 LLM/答案引擎乾淨可擷取的純文字。端點：`src/pages/{articles,myths,ingredients,podcasts,news,videos}/[slug].txt.ts`，共用 `renderSources()`（`src/utils/txt-endpoint.ts`）輸出來源清單。
  - news 用 `summary`/`titleDisplay`/`source`；videos 無 references，改納入 `transcript`（短影音的主要文字資產）。
  - 新增 Content Collection 類型時，務必一併補 `.txt` 端點並加進 `src/pages/llms-full.txt.ts`，否則該類型對 LLM 索引隱形。
- **IndexNow 自動推送（deploy 時即時通知 Bing/Yandex/Seznam/Naver/DuckDuckGo）。** `scripts/indexnow-submit.mjs` + `deploy.yml` 的「Notify IndexNow」步驟：`push` 事件時用 `git diff HEAD^ HEAD` 找出本次異動的 `src/content/**`，映射成 URL（slug = 檔名去副檔名），**只送真的存在於 `dist/sitemap-0.xml` 的 URL**（draft/轉址/slug 不符自動排除），POST 到 `https://api.indexnow.org/indexnow`。
  - 金鑰非機密，明碼存於 workflow 與 `public/<KEY>.txt`（檔名=內容=金鑰）；換金鑰時三處要同步。
  - **僅 `push` 觸發**（`if: github.event_name == 'push'`），cron/手動不送，避免每小時重送洗版；失敗不阻擋 deploy。
  - **意義與邊界**：ChatGPT 搜尋接地走 Bing 索引，故這條加速時效 `/news` 進入可被 ChatGPT search 引用的範圍；**Google 不支援 IndexNow**，Google/Gemini 一路仍靠 sitemap + GSC。它加速「發現/抓取」，不改「排名或 LLM 偏好」。
  - 新增集合類型時，記得把目錄名加進 `scripts/indexnow-submit.mjs` 的 `COLLECTIONS`。
- **文章支援 `relatedArticles`（article→article 內鏈，topic cluster 基礎）。** `articlesSchema` 的 `relatedArticles: string[]`（值＝目標文章檔名去副檔名）→ `src/pages/articles/[slug].astro` 用 `getEntry('articles', id)` 解析、以 `ArticleCard` 渲染於「相關內容」。**做主題叢集（hub↔spoke）時要雙向互鏈**：hub 文章列出各 spoke、每篇 spoke 也列回 hub 與彼此，集中該題目的權威訊號讓 LLM 固定引用。已建：睡眠/褪黑激素叢集（`melatonin-prescription-taiwan-gray-market` 為 hub）。
- **`reviewedBy` 只在「審閱者 ≠ 作者」時輸出 Person 層級。** `src/pages/articles/[slug].astro` 的 `independentReviewer` 守門：`reviewer` 與 `author` 不同時才輸出 Person `reviewedBy` + `lastReviewed`（獨立審閱，真 E-E-A-T）；`reviewer === author` 或僅 `editorReviewed` 時退為機構層級（本日有據編輯室背書）。**自己審自己是 schema.org `reviewedBy` 反模式，Google/LLM 會折價，故禁止。** 要拉高文章權威，正解是在 `AUTHORS` registry 新增一位具醫療憑證的審閱者（含 `sameAs`/`knowsAbout`），再於文章 frontmatter 填 `reviewer`。

## 閉環提醒

Wikidata（步驟 3）建好的 Q URL、以及未來任何官方社群連結，都應回填 `SITE_SAMEAS`（`src/data/authors.ts`），讓站內 Organization/Person 的 `sameAs` 持續指向更多權威實體——這是站內與站外互相加強的關鍵。
