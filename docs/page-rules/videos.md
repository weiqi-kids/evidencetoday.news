# 頁面規則：短影音（/videos）

資料來源：YouTube API 產生的 `youtube-shorts.json`（`pnpm sync:youtube`，`prebuild` 會自動跑）。

---

## 列表頁 `/videos/`

- 版面順序固定：Hero → 統計卡片 → 精選短影音整理 → 分類標籤 → 所有短影音列表。
- **分類標籤放在精選短影音整理之後**，並維持 `data-category` 篩選與數量同步。
- 精選區第一張為「製作健康短影音的初衷」，後續高流量作品以展開卡片呈現（縮圖、標題、摘要、站內觀看整理連結）。
- 一般列表卡片**只保留三項**：YouTube Shorts 內嵌播放器（`embedUrl`）、影片標題、發布日期。
- **不顯示「在 YouTube 觀看」外部連結**，以維持卡片資訊一致與版面簡潔。
- YouTube 影片列表仍可顯示全部影片。

## 分類

- 短影音分類由 `src/utils/videos.ts` 依標題自動判斷。
- 自動分類不準時，用 `VIDEO_CATEGORY_OVERRIDES` 以 YouTube video id 手動指定，**不要改判斷邏輯去遷就單支影片**。

## 單頁 `/videos/[slug]/`

- **不需要所有 Shorts 都有站內頁**；只有精選或需要 AEO 的影片才建立內容頁（站內頁優先服務 SEO / AEO 與精選內容整理）。
- 有站內頁的影片需包含：YouTube 影片、重點摘要、30 秒重點、文字摘要、逐字稿、延伸閱讀。
- 前台摘要標題用「**重點摘要**」，不要用「可引用答案」當視覺標題。
- `transcript` 可放完整逐字稿，前台以 `details` 預設收合。
- **references 不可憑空新增**；沒有可靠來源時省略。
- `relatedArticles` / `relatedMyths` / `relatedIngredients` / `relatedPodcasts` 必須連到**實際存在**的內容。
