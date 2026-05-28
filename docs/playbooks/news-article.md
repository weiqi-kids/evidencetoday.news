# Playbook：趨勢文章（/news）

涵蓋趨勢文章 (`src/content/news/`) 的結構、前台呈現、卡片/Hero 視覺、來源處理。改任何東西先讀「鎖定參數」與「常見陷阱」。

---

## 鎖定參數（不可變動或要謹慎變動）

| 參數 | 位置 | 鎖定原因 |
|---|---|---|
| `keyPoints` 上限 8 點 / 下限 3 點 | `src/content.config.ts` news collection | 超過 8 點等於沒摘要 |
| `editorPoints` 上限 8 點 / 下限 2 點 | 同上 | 與 keyPoints 區分；主編判讀至少 2 點才有列點意義 |
| 詳情頁區塊順序 | `src/pages/news/[slug].astro` | 標題 → Hero 圖 → 重點摘要 → 先看懂這個詞 → Markdown body → 請注意 → 主編判讀（列點）→ 來源。順序不能亂改，會破壞閱讀節奏 |
| 「請注意」優先讀 `cautionNote`，fallback 到 `evidenceNote` | 同上 | 舊資料用 evidenceNote，新版用 cautionNote |
| 「主編判讀」優先讀 `editorPoints`，fallback 拆 `editorComment` | 同上 | normalizeEditorPoints() 會嘗試從字串拆出列點 |
| 來源優先用 `references` 陣列；fallback 到 `pmid` / `sourceUrl` | 同上 | references 是新版正規格式 |
| 缺源時顯示「原始來源連結尚未補上」字樣 | 同上 | 不能讓來源區塊空白 |
| 卡片字級：badge ≥ 13px / title ≥ 18px / summary ≥ 15px / date ≥ 13px | `src/pages/news/index.astro` | 卡片要像文章卡而不是資料庫條目 |
| TrendBubbles `prefers-reduced-motion` | `src/components/charts/TrendBubbles.svelte` | 偏好減動畫時直接收斂、不晃動 |
| 分類 fallback 圖必須是情境圖，不可是小 icon | `public/images/news/*.svg` + `src/utils/news.ts` CATEGORY_IMAGES | 管理者明確要求 |

---

## 趨勢文章內容寫作守則（每篇都套用）

### 1. 重點摘要（keyPoints，4-6 點）
- 用一般民眾看得懂的話
- 先回答「這篇研究跟生活有什麼關係」，不要一開始就堆研究方法
- 每點末尾不要加句點、不要加分號
- 不要寫成 AI 報告語氣
- 範例：
  - 這篇研究不是在推某一種神奇食物，而是在看長期飲食型態
  - 一般人可以先抓大方向：少含糖飲料、少加工食品、多原型食物
  - 這類研究多半只能說「有關」，不能直接證明照著做就能預防疾病

### 2. 先看懂這個詞（termBox）
- 只保留真正會影響一般讀者理解的領域核心詞
- 可保留：DRRD、腸腦軸、快速動眼期睡眠行為障礙、全因死亡率、超加工食品、食源性疾病、胰島素阻抗、發炎指標、睡眠呼吸中止症
- **不要放研究方法詞**：統合分析、系統性回顧、RCT、健康使用者偏誤、觀察性研究、世代研究、橫斷面研究、網路統合分析
- 沒有真正核心詞時，整個 termBox 留空或不填（前台會自動隱藏）

### 3. 研究內容（Markdown body）
- markdown 標題用「## 研究內容」（**不要用「研究看見什麼」**）
- 可包含研究設計、樣本數、分析對象、主要結果、數據、研究限制
- 不要擅自改研究數據
- 不要新增來源沒有支持的結論
- 不要把「相關」改成「造成」、把「可能」改成「一定」

### 4. 請注意（cautionNote）
- 講研究限制、不能過度推論的地方
- 不能證明因果時要明講
- 不要和「主編判讀」重複

### 5. 主編判讀（editorPoints，3-6 點）
- 每點對讀者要有生活理解或行動幫助
- 像主編在幫讀者翻譯研究的口吻，不要像 AI 報告
- 末尾不加句點、不加分號
- 不寫空泛結論（避免「這項研究具有重要啟示」）
- 把「怎麼把這些發現用在生活中」整併進來，不另設章節

### 6. 來源（references）
- 每篇都要有來源
- 結構：`{title, url, type, sourceType?, note?}`
  - `type`：'meta-analysis' | 'rct' | 'observational' | 'review' | 'guideline' | 'other'
  - `sourceType`：'論文' | '官方資料' | '新聞' | '社群來源' | '其他'
- 有具體百分比/數據時，來源必須能追溯
- **缺源時的處理**：
  - 不要假造 DOI、PMID、論文標題
  - frontmatter 加 `sourcePending: true` + `sourcePendingReason: "<原因>"`
  - 前台會自動顯示「原始來源連結尚未補上，編輯室會持續追蹤更新」

---

## 常見陷阱

- **AI 句型留下來**：寫完後 grep 確認以下 12 種句型 0 hit：
  ```
  研究看見什麼 | 這些結果對公共衛生有什麼意義 | 又有哪些地方需要謹慎解讀
  | 這些發現提醒我們 | 提供了重要參考 | 值得進一步關注 | 本研究具有啟示意義
  | 如何把這些發現用在生活中 | 對公共衛生具有重要意義 | 提供了新的視角
  | 有助於我們理解 | 值得未來研究進一步探討
  ```
- **termBox 沒精簡**：把方法詞（統合分析、RCT 等）當成核心詞放進去
- **主編判讀寫成長段**：editorPoints 沒拆，留在 editorComment 字串裡
- **列點尾加句點 / 分號**：違反風格
- **來源用了「本日有據編輯室」就不補原文**：缺源要明確標 sourcePending
- **卡片圖只剩小 icon**：分類 fallback 必須是完整情境圖

---

## 修改流程

### 改 schema (`src/content.config.ts`)
1. 確認向下相容（既有檔案能 build）
2. 跑 `pnpm build` 驗證
3. 更新本 playbook 的「鎖定參數」表

### 改詳情頁 (`src/pages/news/[slug].astro`)
1. 區塊順序不要變
2. 改完跑 build；在本機開瀏覽器看一篇驗證
3. 視覺改動同步更新本 playbook

### 改首頁 (`src/pages/news/index.astro`)
1. 卡片字級不要再縮小
2. TrendBubbles 區塊不要再用 `max-height: 50vh + overflow:hidden` 裁切

### 新增分類 fallback 圖
1. 在 `public/images/news/` 加 SVG（viewBox 800x450）
2. 在 `src/utils/news.ts` 的 `CATEGORY_IMAGES` 對應新分類
3. 在 `CATEGORY_KEYWORDS` 加判別關鍵字
4. 風格要與既有 9 張一致（teal 色系、CI 風格、不是小 icon）

---

## 驗證清單

- [ ] `pnpm build` 通過
- [ ] grep 確認 12 種 AI 句型 0 hit
- [ ] 在本機瀏覽器開至少一篇趨勢文章，確認區塊順序、列點呈現、來源區塊都正常
- [ ] `/news` 列表頁卡片：badge / title / summary / date 字級可讀
- [ ] TrendBubbles 在桌機/平板/手機都沒被裁切
- [ ] 缺源文章顯示「原始來源連結尚未補上」字樣
- [ ] 來源缺失清單（`grep -L "^references:\|^pmid:\|^sourceUrl:" src/content/news/*.md`）已列入 PR 描述
