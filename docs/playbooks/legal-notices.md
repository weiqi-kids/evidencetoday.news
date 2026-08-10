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

## 利益揭露標籤（2026-08-10 定案）

**寫法**：固定四個字「利益揭露」，一個連結，無圖示、無徽章、無背景色，顏色比審閱者署名更淡（`EditorInfo.astro` 的 `.editor-info__item--disclosure`，`color-mix(... var(--color-ink) 40%, transparent)`，審閱者是 55%）。放在作者／審閱者那一排（`EditorInfo`）最後一個位置，點下去連到 `/disclosure/` 看完整說明。**不在內文或該欄位寫任何一句話**——欄位型別是 `boolean`（`disclosure: true`），結構上就不允許再寫成一整段句子。

**為什麼是 boolean 不是字串**：舊版 `disclosure` 是自由文字欄位，曾經被寫成一整句夾在標題正上方的橘色色塊裡（`DisclosureBanner.astro`，已刪除）。business owner 明確定調「有就好，字數越少越好，不要破壞閱讀體驗」，所以直接把欄位改成 boolean——這樣以後不會有人（或 agent）又手滑寫成一大段話，固定版本靠 schema 鎖死，不是靠約定。

**適用範圍**：只在「內容確實碰到主編個人商業利益」的頁面加，**不是全站盲蓋**。2026-08-10 業主親自核對後，全站僅 6 篇符合（魚油／Omega-3 相關 4 篇文章＋成分頁、葉黃素成分頁 1 篇）：
`omega-3-guide.mdx`、`fish-oil-blood-thinner-interaction.mdx`、`krill-oil-vs-fish-oil-comparison.mdx`、`aspirin-fish-oil-together-bleeding-risk.mdx`、`ingredients/omega-3.mdx`、`ingredients/lutein.mdx`。
之後新增內容若主題確實碰到主編實際在賣的品項，才加 `disclosure: true`；不要用「聽起來像保健品」「像購買指南」去猜——這條路徑已經試過一次、命中率接近零，業主明確否決了「廣泛盤點式」的做法。

**接線同「三個 collection 的接法」表**：`articles`／`ingredients` 皆已接通（`Article.astro` 的 `(author || reviewer || disclosure)` 任一為真即渲染 `EditorInfo`）；`myths` 未接（`disclosureStatus` 是另一個全站只有 1 種值的樣板欄位，非本項，勿混用）。

---

## 已知的死碼與待處理項

- ~~`src/components/blocks/VerdictDisclaimer.astro`~~ — 全站零引用，2026-08-04 已刪除。
- ~~`Footer.astro` 的 `.footer__disclosure`~~ — 有 CSS 無 markup，2026-08-04 已刪除。
- ~~**`mythsSchema.medicalDisclaimer`** 為 required 但從未被渲染~~ → **2026-08-06 已修，欄位現在是活的。**
  當時前台顯示的是 `myths/[slug].astro` 內硬編碼的 `healthReminder` 常數，把每篇 frontmatter 的 `medicalDisclaimer` 整個繞過。修法只有一行：`const healthReminder = d.medicalDisclaimer?.trim() || FALLBACK_REMINDER`，不需要動任何內容檔（原本評估「要動 70 個檔案、風險高」是高估了）。
  **實際效益比預期小，如實記錄**：74 篇裡有 67 篇的 `medicalDisclaimer` 是把通用句原封不動複製一遍，真正客製的只有 7 篇。生效後那 7 篇會顯示含該主題具體警訊症狀與建議科別的版本（例如大腸相關題目寫「出現血便、排便習慣改變、體重不明下降等症狀，請至消化內科、家庭醫學科」），其餘 67 篇畫面不變。
  同一次把版面改成符合硬規則 8a：原本是 `<section class="block">` 加 `<h2>健康資訊提醒</h2>`，跟內容區塊一樣醒目；現改為 `<aside class="health-reminder">`，去掉卡片與標題，只留左側細線與 `--color-ink-subtle`，字級維持 `var(--text-meta)`（規範 ⑥ 不得再縮小）。**低干擾靠降彩度與位置達成，不靠縮字。**
  往後寫闢謠時，`medicalDisclaimer` 值得針對主題寫具體症狀與科別——它現在真的會顯示。
- ~~`ingredientsSchema.disclosure` 欄位存在但 0 檔案設定，且 `ingredients/[slug].astro` 從未把它傳給 `<Article>`~~ → **2026-08-10 已接通**，見上方「利益揭露標籤」一節。
