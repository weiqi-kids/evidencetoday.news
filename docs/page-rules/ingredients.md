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
