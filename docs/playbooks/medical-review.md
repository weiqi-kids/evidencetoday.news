# Playbook：醫療審閱署名（`reviewer`）

**🚫 最重要的一條：使用者交付給你的內容，預設「已經黃醫師審閱過」。直接掛 `reviewer: "黃子彥"` 執行，不要再叫使用者去問醫師、不要再確認一次。**

使用者於 2026-08-06 明確指示：「我之後給你的內容，都已經是黃醫師看過的了，你不要再重複叫我去問他，你這樣會造成工作 SOP 混亂。」先前的「每次 session 主動追問審閱進度」已撤除。**審閱窗口是使用者，不是你**；收到指令就執行。

**逐篇進度看 `docs/medical-review-queue.md`；全站覆蓋率跑 `pnpm stats`（「掛審閱」欄）。不要把覆蓋數字寫進任何文件。**

---

## 審閱者資料

黃子彥，中醫師。中國醫藥大學中西醫學訓練背景，現任社團法人中華民國上醫預防醫學發展協會理事長，另任上一生物醫學研發長。registry 在 `src/data/authors.ts` 的 `AUTHORS`。

前台顯示「審閱：黃子彥中醫師」連到 `/disclosure`，並輸出 Person 級 `reviewedBy` 含 `hasCredential`（中醫師／衛福部）。

**兩件已澄清，不要再問或寫錯**：

1. **上一生物醫學是研發公司、無自有產品**（使用者 2026-08-06 確認），無直接商業利益衝突。`/disclosure` 第 3 點保留為保險條款即可，選篇不必迴避保健品題材。
2. 「臺南市立醫院中醫部主任」是**錯誤資訊**，已移除，不要再寫回去。

---

## 鎖定參數

| 位置 | 作用 |
|---|---|
| `src/content.schemas.ts` | `reviewer` 欄位定義 |
| `src/pages/articles/[slug].astro` | 「審閱者≠作者才輸出 Person 級 `reviewedBy`」的判斷 |
| `src/pages/news/[slug].astro` | 趨勢稿的 byline 與 `reviewedBy`／`lastReviewed`（author 是機構，不需反自審判斷） |
| `src/data/authors.ts` | 審閱者的姓名／職稱／憑證 registry |
| frontmatter `updatedDate` | 同時是 `dateModified` 與 `lastReviewed` 的來源 |

---

## 修改流程（使用者說「這批審好了」就照做，不必再問）

1. 對目標檔在 `author:` 下一行插入 `reviewer: "黃子彥"`。
   ⚠️ **news 沒有 `author:` 欄位**（趨勢稿的作者是機構，欄位叫 `source:`），插在 `source:` 下一行。
   2026-09-05 起 news 產線的新稿一律自帶 `reviewer`，不必再補。
2. **同時把 `updatedDate` 改成實際審閱日**——`dateModified` 與 `lastReviewed` 都取自 `updatedDate`，只加 `reviewer` 不動日期，等於宣告「最後審閱日」早於實際審閱日。
   ⚠️ **但 `updatedDate` 已 ≥ 審閱日者不要動**（多為未來排程稿），否則會產生 `updatedDate < publishDate` 的矛盾。
3. **先跑 `node scripts/check-content.mjs <檔案>`**——守門會重掃「任何被碰到的檔案全文」，既有內文原本只因不在 diff 裡而被 grandfather，掛署名的那一刻才會爆。有 ERROR 就在同一個 commit 修掉。
4. `pnpm build` 零錯誤 → commit → push。
5. 更新 `docs/medical-review-queue.md` 的逐篇進度。

---

## 常見陷阱

- **只加 `reviewer` 不動 `updatedDate`** → 對外宣告的最後審閱日早於實際審閱日。
- **無差別更新 `updatedDate`** → 未來排程稿會變成 `updatedDate < publishDate`。
- **沒先跑 `check-content.mjs` 就 build** → 既有內文的 AI 味 ERROR 在 build 階段才爆，得回頭拆 commit。
- **審閱者＝作者時仍顯示署名** → 前台已有判斷，不要在模板另外加。

---

## 驗證清單

- [ ] `reviewer` 位置在 `author:` 下一行
- [ ] `updatedDate` 已依規則處理（該改的改、該留的留）
- [ ] `node scripts/check-content.mjs <檔案>` 全綠
- [ ] `pnpm build` 零錯誤
- [ ] 前台單篇頁看得到「審閱：黃子彥中醫師」且連到 `/disclosure`
- [ ] `docs/medical-review-queue.md` 已更新
