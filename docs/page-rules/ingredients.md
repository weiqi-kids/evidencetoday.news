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

- content 有 `safety` 欄位時，模板需固定輸出「安全性與交互作用」區塊，含：一般安全性、可能交互作用、族群注意。
- `pathwaySteps` 為可選；缺資料時不渲染，不要塞佔位內容。
