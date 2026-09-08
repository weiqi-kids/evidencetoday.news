# import-melatonin-taiwan-customs 錨點連結「高曝光零點擊」調查

*稽核日期：2026-09-08（台灣時間）｜觀測窗：GSC 2026-08-08 ~ 2026-09-05（近 28 天）｜唯讀調查，未改任何內容檔*

## 一句話結論

**那四個錨點不是獨立的搜尋結果，是同一則結果底下的「跳至章節」sitelinks；它們的曝光與本體曝光重複計算，不是額外流量。修好它能多拿的點擊接近零，而風險是全站最大流量來源。建議內容一個字都不要改；真正該修的是 `pnpm perf` 的報表把這四列當成「待改標題的低 CTR 頁」。**

---

## 一、這四個錨點到底是什麼

### 判斷依據（三項獨立證據，都指向 anchor sitelinks，不是 passage）

**證據 1：fragment 形式是具名錨點，不是 scroll-to-text。**
GSC page 維度回傳的四列是 `…/#在台灣褪黑激素是藥品不是保健食品` 這種百分比編碼的具名錨點。
Google 的「連結至的段落 / passage」在 SERP 上用的是 Text Fragment 語法（`#:~:text=…`），而且 passage ranking 本身不會在 GSC 產生獨立的 page 列——它排的是整頁。
這四個 fragment 字串與 `dist/articles/import-melatonin-taiwan-customs/index.html` 的 `<h2 id="…">` 完全逐字相符，也與側欄目錄 `<nav aria-label="Table of Contents">` 輸出的 `href="#…"` 完全相符。來源是本站自己的目錄錨點。

**證據 2：錨點列的排名與本體幾乎同值。**

| URL | clicks | impressions | position |
|---|---|---|---|
| 本體 | 315 | 4,324 | 4.31 |
| `#帶回台灣自用有明確的數量上限` | 2 | 853 | 4.17 |
| `#在台灣褪黑激素是藥品不是保健食品` | 1 | 863 | 4.17 |
| `#用網購郵寄寄回來規定更嚴` | 0 | 709 | 4.18 |
| `#買的是軟糖飲品還是藥錠規定看的是成分` | 0 | 674 | 4.14 |

四個錨點的 position 全部落在 4.14–4.18，本體 4.31。**獨立排出來的結果不可能排名同值**；sitelinks 繼承母結果的 position，才會出現這種分佈。

**證據 3：數量正好是 4，且是文件順序的前四個。**
該頁有 6 個 H2，目錄也輸出 6 條錨點；GSC 只有前 4 條有資料（`自用與販售…`、`那想用褪黑激素…` 兩條零資料）。「最多 4 條」是 Google 章節跳轉連結的典型上限。

**旁證：** John Mueller 說明過，Google 在 SERP 顯示 jump links（呈現方式類似 sitelinks）時，GSC 會出現 fragment identifier 的列；GSC 會把 `page#section` 拆成獨立列、分攤曝光，而點擊主要記在母 URL 上。這與本站觀測到的分佈一致。
參考：[When You Might See URL Fragment Identifiers In Google Search Console (Search Engine Roundtable)](https://www.seroundtable.com/url-fragment-identifiers-in-google-search-console-30198.html)、[Performance report: Dimensions and data groupings (Search Console Help)](https://support.google.com/webmasters/answer/17011259?hl=en)

### 為什麼是這一頁

全站只有 4 個頁面出現 fragment 列（另三個是 biotin-before-blood-test、melatonin-dosage-how-many-mg、melatonin-prescription-taiwan-gray-market，合計曝光僅 56）。共同點：都是 articles/ingredients 頁型、都有側欄目錄、都排進前段。
**這不是這一篇寫壞了，是「排得夠前面 + 有目錄」的自然結果。** 這一篇之所以量體大，純粹因為它是站上曝光最高的頁。

---

## 二、曝光是相加還是重複計算 → **重複計算**

### 決定性驗證：單一查詢的 query 總計 vs. page 列加總

查詢「褪黑激素可以帶回國嗎」：

| 維度 | impressions | clicks |
|---|---|---|
| query 維度總計 | **76** | 10 |
| page 維度該查詢所有列加總 | **240** | 11 |
| ├ 本體 | 76 | 8 |
| ├ 四個錨點 | 44 / 44 / 36 / 32 | 1 / 1 / 0 / 0 |
| └ 其他兩頁 | 6 / 2 | 0 / 1 |

**本體單列的 76 就等於整個查詢的 76。** 也就是說：凡是錨點出現的那一次搜尋，本體必定同時出現在同一個 SERP 上。錨點沒有帶來任何一次「本體沒出現」的曝光。

### 站台層級交叉驗證

| 口徑 | impressions |
|---|---|
| 站台總計（property level） | 22,972 |
| 全部 page 列加總（含 fragment） | 26,733（超出 3,761） |
| 全部 page 列加總（剔除 fragment） | 23,578（超出 606，屬正常的同一 SERP 多 URL 去重） |

剔除 fragment 後，加總即回歸站台總計附近。**這 3,099 次錨點曝光是同一批 SERP 的重複切片，不是新的曝光。**

### 因此「修好能多拿多少點擊」的量級

錨點列 28 天合計 **3 次點擊**。這 3 次是使用者點了跳轉連結，落地頁仍是同一頁（GA4 該頁 375 pageviews vs. GSC 315+3=318 clicks，沒有漏斗破口）。
**真實合併 CTR ＝ (315+3) / 4,324 ＝ 7.35%**，不是報表上那個被四列拉下來的假象。上限就在個位數點擊，不存在「修好多拿幾百點擊」這回事。

---

## 三、「H2 寫成陳述句結論，看標題就得到答案」這個假設 → **推翻**

四個章節標題確實是陳述句式的結論標題，且每個 H2 下第一段都是粗體的結論句（本站「結論先行」寫法），例如：

- `## 在台灣，褪黑激素是藥品，不是保健食品`
- `## 帶回台灣自用，有明確的數量上限`

但假設在資料上站不住：

1. **要判斷「答案被看光」，該看的是本體 CTR，不是錨點列 CTR。** 本體 7.3% @ position 4.3，是全站表現最好的一頁，也符合第 4 名的正常 CTR 曲線。站內同區間對照：thailand-sleep-gummies 4.8% @5.2、japan-drugstore 4.9% @5.6、cbd 5.7% @6.4、melatonin-dosage 5.8% @7.2。**這一頁不是低於行情，是高於行情。**
2. **錨點列的 CTR 是計數方式造成的，不是行為訊號。** sitelink 每次隨母結果曝光就記一次曝光，但只有使用者「特意點那一條」才記點擊——絕大多數人點的是主標題。這種列的 CTR 恆趨近 0，跟標題寫得好不好無關。
3. **標題其實沒有把答案講完。**「有明確的數量上限」沒有說出「無處方 2 個月／有處方 6 個月」；「規定更嚴」沒有說出「每年兩次、須事先申請」。真正的數字都在內文，讀者想知道具體限量仍必須點進來。
4. **sitelinks 通常是加分而非扣分**：它讓這則結果在 SERP 上佔更多垂直空間、更顯眼，本體 7.3% 的 CTR 有一部分可能正是它帶來的。

---

## 四、修法建議

### 內容端：**不要改**

| 改法 | 上限收益 | 風險 |
|---|---|---|
| 改寫四個 H2 標題 | 個位數點擊 | **高**：H2 id 由標題文字生成，改標題＝改錨點 id → 既有 sitelinks 失效需重新學習、站內外既有錨點連結斷掉；動的是全站 315/774＝41% 點擊、375/1,369＝27% pageviews 的單一來源 |
| 拿掉／截斷側欄目錄以消滅錨點列 | 0（報表變乾淨而已） | **高**：等於主動放棄章節跳轉 sitelinks 與 SERP 版面，可能直接壓低本體 CTR；且目錄是全站 articles/ingredients 共用元件，一改是全站範圍 |
| 加 `speakable` / `HowTo` schema 引導 Google | 未知且無證據 | 中：與本頁現有 FAQPage 疊加，收益不明 |

**風險遠大於收益，明確建議這一頁內容不要動。** 這也與交接時「一個字都不要改」的對照 hub 要求一致——本次調查沒有找到任何推翻該要求的理由。

### 真正該修的是報表，不是內容（唯一建議動的東西）

`scripts/perf-snapshot.mjs` 的 page 維度沒有剔除 fragment 列，導致：

```
— ⚠️ 高曝光低 CTR 頁面：曝光 ≥50、排名 ≤12、CTR <2%（共 56 筆）—
  c  1  i  863  p  4.2    0.1%  …/import-melatonin-taiwan-customs/#在台灣褪黑激素…
  c  2  i  853  p  4.2    0.2%  …/import-melatonin-taiwan-customs/#帶回台灣自用…
  c  0  i  709  p  4.2    0.0%  …/import-melatonin-taiwan-customs/#用網購郵寄…
  c  0  i  674  p  4.1    0.0%  …/import-melatonin-taiwan-customs/#買的是軟糖飲品…
```

榜首四名全是幽靈列，而且指向的是**全站表現最好的那一頁**。任何照著這張表做事的 session（含 AI agent）都會被引導去「搶救」一頁根本沒壞的內容——這次的調查本身就是被這張表觸發的。

**最小風險的第一步（建議只做這一件）：**
在 `scripts/perf-snapshot.mjs` 的 page 維度處理中，把含 `#` 的列從「低 CTR 頁面」與「Top 著陸頁」的排序名單中剔除（或另闢一區標示為「章節跳轉 sitelinks，非獨立結果，CTR 不可判讀」），並在 `docs/pitfalls.md`「資料判讀」類補一條。
理由：純報表端、唯讀資料處理、零前台影響、不碰任何內容檔，卻能永久擋掉這個誤判。屬硬規則 1 的 `scripts/` 變動，需同步更新 `docs/playbooks/audience-insights.md` 或 `analytics.md`。

### 若日後真的想從 sitelinks 拿更多點擊（低優先，非現在）

先在**其他頁**驗證，不要拿這一頁當試驗場。可觀察的變因是「H2 標題是否包含具體數字」——本站已有多篇同型國際法規落差文可做對照。等有跨頁證據再談是否回頭調整這一篇。

---

## 附錄：資料來源與可重現方式

- `pnpm perf`（`scripts/perf-snapshot.mjs`，GA4 + GSC，唯讀不寫檔）
- 本次另以 `scripts/lib/insight-fetch.mjs` 的 `gscQuery()` 取 `['page']`、`['query']`、`['page','query']` 三種維度交叉比對（rowLimit 5000），驗證重複計算；查詢字串屬商業內部資訊，未寫入 repo。
- 內容檔：`src/content/articles/import-melatonin-taiwan-customs.mdx`
- 渲染輸出：`dist/articles/import-melatonin-taiwan-customs/index.html`（未重新 build，沿用既有產出）
- 目錄元件：`src/components/blocks/TableOfContents.svelte`，掛載於 `src/pages/articles/[slug].astro`、`src/pages/ingredients/[slug].astro`
