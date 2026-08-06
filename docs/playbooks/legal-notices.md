# 免責、揭露與署名 — 放置規範

> **一頁一次、放角落、降彩度、絕不重複。**
>
> 使用者定調（2026-08-04）：我們會配合法規，但**前提是絕對不要用這些東西破壞閱讀體驗**。讀者點進來第一個要看的是答案，AI 要抓的也是答案。法規字眼不是重點，不該喧賓奪主。

---

## 硬規則

1. **通用醫療免責全站只出現在頁尾一處**（`src/components/blocks/Footer.astro`）。內文不再放同義句。
2. **`Article.astro` 的 `showMedicalDisclaimer` 預設為 `false`**。個別頁面若真有非通用的提醒需求，才顯式傳 `true`。
3. **禁止在 MDX 內文自己再寫一次免責句**。模板層已經有了，內文重複只會讓同一句在一頁出現兩三次。
4. **揭露類文字（利益衝突、審閱者商業關係）只放一行、連到 `/disclosure`**。完整條文寫在該政策頁，不佔內文版面。
5. **字級不得低於 `var(--text-meta)`**。`scripts/check-design.mjs` 規則 ⑥ 強制所有 `--text-*` ≥ 1.125rem，而 `--text-body`／`--text-meta`／`--text-caption`／`--text-badge` **全都正好是 1.125rem，沒有更小的級距**。硬寫 `0.9rem` 能過 linter 但會破壞四輪審查定案的字級階梯。**低干擾靠降彩度（`color-mix(... var(--color-ink) 55%, transparent)`）與位置達成，不靠縮字。**
6. **新增任何法規性文字前，先確認同一頁沒有同義句。**

---

## 目前實際的配置（2026-08-04 整理後）

| 頁型 | 免責出現處 | 次數 |
|---|---|---|
| 文章 / 成分解析 | 頁尾 | **1** |
| 闢謠 | 頁尾 ＋ 專屬「健康資訊提醒」區塊（主題特化，非同義句） | 2（刻意） |
| 趨勢新聞 | 頁尾 ＋ `cautionNote`/`evidenceNote`（逐篇特化） | 1–2 |
| Podcast / 短影音 | 頁尾 | **1** |

整理前的問題：`MedicalDisclaimer.astro` 的「本站所有內容僅供一般健康資訊參考，不構成醫療診斷、治療建議或處方」與頁尾的「本站內容僅供一般健康資訊參考，不構成醫療建議」前 15 字幾乎逐字相同，出現在**每一篇文章與成分頁**；另有 2 篇文章的 MDX 內文自己又寫了第三次。已全部收斂。

---

## 醫療審閱者署名

**寫法**：`審閱：黃子彥中醫師`，一行，無圖示、無徽章、無附加說明，顏色降彩度（`EditorInfo.astro` 的 `.editor-info__item--reviewer`）。姓名連到 `/disclosure`。

**為什麼這樣做**：署名是可信度訊號，不是版面重點。把揭露文字塞進內文會擠掉讀者要看的答案；連結到 `/disclosure` 可以讓完整揭露條文存在、又完全不佔內文空間。職稱由 `AUTHORS[reviewer].jobTitle` 自動接上，不在內容端手寫。

**署名採逐篇制**：只有實際審閱過的頁面才填 `reviewer`。`reviewedBy` 在 schema.org 上是「這位具名醫師審閱過這篇」的事實主張，批次蓋章等同不實陳述。送審進度見 `docs/medical-review-queue.md`。

### 三個 collection 的接法（2026-08-06 統一）

`reviewer` 欄位有沒有作用，取決於各 collection 的路由**有沒有真的接**。曾經發生過「frontmatter 寫了但前台完全沒讀」——myths 74 篇掛了 `reviewer` 卻既不顯示署名、也不輸出 `reviewedBy`，白掛了一輪。動這三個檔時務必成套檢查：

| collection | 作者 | 審閱者署名 | JSON-LD |
|---|---|---|---|
| `articles` | `data.author`（逐篇具名） | `EditorInfo` | 審閱者≠作者 → Person 級 `reviewedBy` |
| `myths` | `d.author`（逐篇具名） | `EditorInfo` | 同上（2026-08-06 補接） |
| `ingredients` | 無 author 欄，`EditorInfo` 顯示「編輯部」 | `EditorInfo` | 有 `reviewer` → Person 級；否則退回機構級 `PUBLISHER_REF`（2026-08-06 補接） |

- `ingredients` 刻意不設 `author`：成分解析由編輯部彙整，沒有逐篇掛名作者。`Article.astro` 的 `author ?? '編輯部'` fallback 就是為此。
- 三處共用同一條反自審規則：**審閱者＝作者時不顯示署名、也不輸出 Person 級 `reviewedBy`**（退為機構級）。判斷邏輯散在 `EditorInfo.astro` 與三個 `[slug].astro`，改一處要同步其他處。
- **驗證方式**：`rm -rf .astro dist && pnpm build`（schema 改動必須清 content-layer 快取，否則新欄位會被舊 `data-store.json` 靜默剝除），然後 `grep -o '"reviewedBy":{"@type":"[A-Za-z]*"' dist/<collection>/<slug>/index.html` 應出現 `Person`。

---

## 已知的死碼與待處理項

- ~~`src/components/blocks/VerdictDisclaimer.astro`~~ — 全站零引用，2026-08-04 已刪除。
- ~~`Footer.astro` 的 `.footer__disclosure`~~ — 有 CSS 無 markup，2026-08-04 已刪除。
- **`mythsSchema.medicalDisclaimer`**（`src/content.schemas.ts`）為 **required 但從未被渲染**：70 篇闢謠各自寫了客製免責文案，讀者永遠看不到，前台顯示的是 `myths/[slug].astro` 內的硬編碼 `healthReminder`。改 required 欄位會動到 70 個檔案，風險高，**另案處理**；在那之前不要以為那個欄位有作用。
- `ingredientsSchema.disclosure` 欄位存在但 0 檔案設定，且 `ingredients/[slug].astro` 從未把它傳給 `<Article>`——雙重死碼。
