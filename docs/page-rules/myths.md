# 頁面規則：/myths 闢謠

排版 variant 見 [`../playbooks/article-layout.md`](../playbooks/article-layout.md)；內容寫法見 [`../content-guide.md`](../content-guide.md)。發布前必跑 `pnpm check:myths`。

---

## 單篇頁：刻意極簡，不要加東西

- 單篇版型**只渲染固定區塊**。不要再加「更新與更正紀錄」「延伸閱讀」等段落——`check-myth-quality` 掃不到模板層，這條靠 review 把關。
- **例外：FAQ 是刻意保留的固定區塊**。frontmatter 手寫 Q&A，前台渲染 + 輸出 FAQPage JSON-LD。曾因 `mythsSchema` 漏宣告 `faq` 欄位被 Zod 靜默剝除而整組失效，補回後生效，**勿再移除**。
- 使用 `cards` variant（透明背景 + `max-width: none`）。漏掉 `max-width: none` 會讓 blocks 被限制在 68ch。
- **不加 ShareButtons**：闢謠單篇刻意極簡且已有原生分享區，由 `showShare = category !== 'myth'` 排除。
- `status: "under-review"` 的稿排除在 `/myths` 公開列表與路由生成之外。

## 色彩

- 沿用 CI tokens（`--color-paper/ink/fog/teal/navy/coral/cat-myth`）與 `color-mix`，**禁止新增 pastel hex**。
- `VerdictBadge` 只能用 CI token + `color-mix`。
- `MythCard` 的 `verdict` 型別必須引用 `@/utils/myths/schema` 的 `MythVerdict`，不可自行定義字面量聯集。

## 列表頁：篩選與排序（前端互動）

- **篩選順序**：`searchQuery` → `verdict` → `topicTags` → `evidenceLevel`，採**交集**邏輯。
- **排序**：對篩選後結果依 `updatedDate` 排序（`new` 新到舊、`old` 舊到新），日期解析失敗 fallback 為 `0`。
- **搜尋欄位**：`title`、`mythClaim`、`verdictSummary`、`summary`、`topicTags`、`tldr`（大小寫不敏感，先 `trim`）。
- **空狀態**：結果為空時只顯示「目前沒有符合條件的闢謠文章，請調整搜尋或篩選條件。」且不渲染卡片。
- 顯示切換用 `style.display`（避免 `hidden` 屬性被頁面樣式覆寫），確保空狀態與卡片列表互斥。
