export type SeoFieldDescriptor = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list';
  maxLength?: number;
  required?: boolean;
};

// 只列「作者真正手寫」的欄位：title 與 description。
//
// 社群分享標題/描述、OG 分享圖都是 src/utils/social-meta.mjs 的 contentSocial()
// 自動衍生的——社群標題 fallback 到 title、社群描述 fallback 到 description、
// OG 圖是每個 collection 固定的靜態圖（ogImageForCollection）。這些不該擺進表單
// 讓使用者編輯（會誤導，且像 ogTitle/ogImage 這種 key 對 articles 根本不存在，
// 硬填還會讓 build 崩）。description 上限對齊 content.config.ts。
const titleField: SeoFieldDescriptor = { key: 'title', label: '標題', type: 'text', required: true };

const fields = (descMax: number): SeoFieldDescriptor[] => [
  titleField,
  { key: 'description', label: '描述（摘要）', type: 'textarea', maxLength: descMax, required: true },
];

const BY_COLLECTION: Record<string, SeoFieldDescriptor[]> = {
  articles: fields(155),
  ingredients: fields(155),
  podcasts: fields(155),
  videos: fields(155),
  news: fields(155),
  myths: fields(220),
};

export function getSeoFields(collection: string): SeoFieldDescriptor[] {
  return BY_COLLECTION[collection] ?? fields(155);
}
