# 頁面規則：Podcast（/podcasts）

節目名稱固定為「喜聞樂健」，定位為每集約 15 分鐘的健康觀念與健康知識分享。

---

## 頻道頁

- `/podcasts/` 需包含**節目定位說明**，不可退化成純播放器清單。
- 列表與首頁 Podcast 區塊統一使用 `getPublishedPodcasts()`，避免重複顯示測試檔或舊檔。
- 去重優先使用 `episodeNumber`，缺少時回退到 slug。
- 列表與首頁「最新單集」排序使用 `updatedDate ?? publishDate`，確保更新後能自動成為最新單集。

## 單集頁

- 至少含：播放器、內容摘要、本集重點。
- 後段以「內容摘要」「本集重點」為主；**Show Notes / 本集段落可留在資料層但不在前台渲染**。
- 播放器優先用 `embedUrl` 指向 Firstory 內嵌播放器（`https://open.firstory.me/embed/story/...`）。
- 暫時沒有 `embedUrl` 時，用 `externalUrl` 作為外部收聽連結；**不要放不可互動的假播放器區塊**。

## slug 規則（踩過坑）

- **任何**指向 Podcast 單集頁的連結都要用 `stripPodcastSlug()` 產生 slug，**不可用 `stripExt()`**。
- `stripExt()` 僅保留給 articles / myths / ingredients / videos / news 等非 Podcast 路由。
- Podcast 卡片連結必須使用父層傳入的 `href`，不可在卡片元件內推導或覆蓋。

## JSON-LD

- 單集頁使用 `PodcastEpisode` schema。
- `author` / `creator` 為「羅揚」；`partOfSeries` 為「喜聞樂健」；`publisher` 為「本日有據」。
- `AudioObject`：有 MP3 direct URL 時，用 frontmatter 的 `audioUrl` 輸出 `contentUrl`。
- Firstory `embedUrl` **只作為播放器 `embedUrl`**，不可誤填成 `contentUrl`。
- Firstory `externalUrl` 作為外部收聽頁，可用於 `AudioObject.url` / `sameAs`。
- `duration` 用 `parseDurationToIso()` 轉 ISO 8601（同時支援 `MM:SS` 與 `HH:MM:SS`）。
- **不得填不存在或無法公開存取的 MP3 URL。**

## 版面

- 首頁 Podcast 區塊要避免欄位擠壓：`section-podcast` / `podcast-layout` / 左右欄都要可縮（`min-width: 0`），CTA 不可覆蓋卡片點擊區。
- 卡片 footer：左側 duration/date、右側 `收聽本集 →`；`收聽本集 →` 需有足夠對比、可見 underline 與 focus/hover 狀態。
- 右上角 EP 標籤維持可讀對比，可用小型 pill badge，但**不要搶過標題層級**。
