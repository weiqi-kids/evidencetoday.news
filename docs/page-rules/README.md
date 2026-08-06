# 前台頁面規則

各分類前台頁面**自己的**維護規矩：定位、固定區塊、資料欄位、不該出現什麼。

跟隔壁兩類的分工：

- **`docs/playbooks/*`** — 「我要改 X」的操作手冊（鎖定參數／修改流程／常見陷阱／驗證清單）
- **`docs/page-rules/*`**（本目錄）— 「這一類頁面的規矩是什麼」（定位、該有什麼、不該有什麼）
- **`docs/content-guide.md`** — 「怎麼寫內容」

| 檔案 | 涵蓋 |
|---|---|
| [`about-and-editor.md`](./about-and-editor.md) | `/about`、主編頁的定位與內容邊界 |
| [`myths.md`](./myths.md) | `/myths` 列表篩選排序、單篇極簡版型、判讀標籤色彩 |
| [`ingredients.md`](./ingredients.md) | 成分解析命名規則、中立知識庫原則、安全性區塊 |
| [`podcasts.md`](./podcasts.md) | 頻道頁定位、單集頁欄位、JSON-LD、卡片與 slug 規則 |
| [`videos.md`](./videos.md) | 短影音列表／分類／單頁，YouTube 資料來源 |
| [`seo-and-feeds.md`](./seo-and-feeds.md) | Base meta、WebSite schema、RSS、OG 圖、社群分享、AEO/GEO |

`/news` 的頁面規則另外放在 [`../playbooks/news-article.md`](../playbooks/news-article.md)（結構與前台一起講比較不會漏）。
