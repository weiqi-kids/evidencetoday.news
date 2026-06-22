// 前台可見性判斷 —— 單一真相來源。
//
// 規則（首頁分類數字、各分類列表、內容頁 getStaticPaths、sitemap 一律共用，避免漂移）：
//   1. draft: true            → 不公開
//   2. status: 'under-review' → 不公開（目前僅 myths 有此欄位）
//   3. publishDate 在未來      → 不公開（排程稿尚未到時間）
//
// 日期以建置當下比較。publishDate 為「日期」粒度，台灣時間（UTC+8）與 UTC 的跨日差異
// 不影響「是否為未來日期」的判斷（未來稿的 publishDate 會明顯大於 build 當下）。

export interface VisibilityFields {
  draft?: boolean;
  status?: string;
  publishDate?: Date;
}

export function isPublicEntry(data: VisibilityFields, now: number = Date.now()): boolean {
  if (data.draft) return false;
  if (data.status === 'under-review') return false;
  if (data.publishDate instanceof Date && data.publishDate.getTime() > now) return false;
  return true;
}
