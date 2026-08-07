# 頁面規則：成分解析（/ingredients）

縮圖處理見 [`../playbooks/ingredient-thumbnails.md`](../playbooks/ingredient-thumbnails.md)；排版 variant 見 [`../playbooks/article-layout.md`](../playbooks/article-layout.md)。

---

## 命名規則

- **前台顯示統一使用「成分解析」**，舊有稱呼不再作為使用者可見名稱。
- 為避免大型路由遷移，**URL 與 collection 保留 `/ingredients/` 與 `ingredients`**。
- `IngredientCard`、`category="ingredient"`、`.ingredient-*` class 屬於內部命名，維持現狀即可。
- 若日後要把 URL 遷到新路徑，須**另開 migration PR**，一併處理 redirect、sitemap、RSS、內部連結、canonical 與 Search Console。

## 中立知識庫原則（不可退化成商品頁）

- 單頁 JSON-LD 使用 **`Article` / `WebPage` 等中立內容型別**；**不可**使用 `MedicalWebPage`、`DietarySupplement`、`Product` 等商品導向 schema。
- 頁面需固定呈現中立提示：明確說明「研究常討論的用途／可能機制／安全性」，且**不作為個別療效宣稱**。
- 使用 `prose` variant（白底卡片 + 雙欄 sidebar）。

## 固定區塊

- content 有 `safety` 欄位時，模板固定輸出「安全性與交互作用」區塊，含：一般安全性、可能交互作用、族群注意。**2026-08-06 才真正接線**——在那之前這條規格寫了但實作沒做，20 篇成分頁寫好的安全性資料讀者一個字都看不到。實作在 `ingredients/[slug].astro` 的 `<Content />` 之後，勿再移除。
  - 交互作用與族群用 `<dl>` 而非 `<ul>`：每一條都是「對象 → 說明」的配對，語意上是定義列表，螢幕閱讀器可據此關聯。
- **`uses` 刻意不接前台**（2026-08-06 決定）。寫得好的成分頁（taurine、urolithin-a）body 已用散文講過用途與證據，把 `uses` 也渲染出來會在同一頁產生兩份近似內容。`safety` 是條列式的交互作用與族群注意，body 通常不會逐條重複，重疊風險低，所以只接它。日後若要接 `uses`，必須先解決與 body 的重複問題。
- `mechanism` 目前同樣未接前台（11 篇有資料）。原因同 `uses`：內文的「在身體裡做什麼？／主要作用機制」一節已涵蓋。**寫新成分頁時，機制請寫在 body，不要只填 frontmatter。**
- `pathwaySteps` 為可選；缺資料時不渲染，不要塞佔位內容。

## 「研究中討論的用途」區塊（2026-08-07 上架）

`ingredientsSchema.uses` 從建站起就有資料，51/64 篇寫的是真的臨床試驗摘要（樣本數、劑量、
試驗長度、結論限制），但長期沒有任何模板讀它。那正是 AI 答案引擎最需要、也最難從別處抄到
的內容，所以接上前台。

**兩層過濾，都是量出來的，不要拿掉：**

1. `filterBoilerplateItems('ingredients', 'uses', …)` — 14 篇填的是「核心知識與來源辨識／
   整理定義、來源與常見型態」這種對任何成分都成立的句子，跨篇比對後整批濾掉。
2. `dropIfInBody(…)` — 這一項內文散文已經講過就不重印。

第 2 點是本檔原本「刻意不接 uses」的理由，那個顧慮是對的，但範圍判斷錯了：實測 51 篇的
`uses` 摘要與 body 的 8-gram 重疊率中位數只有 16.2%，只有 13 篇超過 30%（saffron 58.6%、
saw-palmetto 57.6% 最高）。整個欄位都不接，對其餘 38 篇是過度反應。改成逐項判斷後
40/50 頁渲染出區塊。門檻 0.3 取自那份分佈：16% 是「用了相同專有名詞」的自然重疊，
超過 30% 才是真的在複述同一段。

證據等級一律中文化（`USE_EVIDENCE_LABEL`），前台不得出現 `rct` / `meta-analysis` 這類
原始 enum 值。

## 相關成分推薦（2026-08-07）

成分頁本來就算出了 `auto.ingredients` 卻沒有渲染，導致 11 篇完全沒有站內出口。
根因是**標籤詞彙分家**：成分用「礦物質」「維生素」「脂溶性營養素」這套字，articles
從來沒用過任何一個，跨 collection 的標籤交集是空集合。

成分頁的讀者多半在比較「該吃哪一個」，同類成分本來就是最貼近意圖的出口，而且成分之間的
標籤共用度遠高於跨 collection。接上後零出口頁 11 → 0。

## frontmatter 的 references 只放具體引用

13 篇曾共用同一份 `references`，內容是 NIH ODS / EFSA / Merck Manual / Cochrane / PubMed
的**首頁**連結。那不是引用，是「我們查過這些資料庫」，而且它會渲染兩次——一次是可見的
參考資料區塊，一次是 JSON-LD 的 `citation`，等於對 Google 宣告 13 頁引用同一組來源。
真正逐篇寫的具體引用（含 DOI 與期刊卷期）在 MDX body 裡，本來就會顯示。
現在 frontmatter 的 `references` 會過 `filterBoilerplateItems`，泛用清單不會出現。
