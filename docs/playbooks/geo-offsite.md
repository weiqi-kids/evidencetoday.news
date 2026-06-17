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

- [ ] Bing 帳號建立並加入網站
- [ ] 驗證碼交給工程 → 回填 → Verify 通過
- [ ] 提交 sitemap

## 2. Google Search Console

確認 Google 正確收錄（影響 AI Overviews / Gemini）。

1. 前往 https://search.google.com/search-console ，新增資源 `https://evidencetoday.news`（URL prefix 類型）。
2. 驗證：同樣可用「HTML tag」`<meta name="google-site-verification" ... />`，**content 值交給工程**回填 Base.astro。或用 DNS TXT（若你管 DNS 更穩）。
3. 提交 sitemap：`https://evidencetoday.news/sitemap-index.xml`
4. 之後用「網址審查」抽查幾篇文章是否已編入索引。

- [ ] GSC 資源建立
- [ ] 驗證碼交給工程 → 回填 → 通過
- [ ] 提交 sitemap，抽查 3 篇已收錄

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

- [ ] Wikidata item 建立並填 4 項 statement
- [ ] Q 編號 URL 交給工程回填 SITE_SAMEAS

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

## 閉環提醒

Wikidata（步驟 3）建好的 Q URL、以及未來任何官方社群連結，都應回填 `SITE_SAMEAS`（`src/data/authors.ts`），讓站內 Organization/Person 的 `sameAs` 持續指向更多權威實體——這是站內與站外互相加強的關鍵。
