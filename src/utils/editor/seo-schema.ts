export type SeoFieldDescriptor = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list';
  maxLength?: number;
  required?: boolean;
};

// 欄位定義對齊 src/content.config.ts 各 collection 的 schema。
// 共有：title、description；社群分享統一為 socialTitle(≤80)/socialDescription(≤120)。
// 僅 myths 另有 ogTitle/ogDescription/ogImage（articles 等沒有這些欄位，
// 若硬塞進 frontmatter 會讓 Astro content schema 驗證失敗、build 崩）。
const titleField: SeoFieldDescriptor = { key: 'title', label: '標題', type: 'text', required: true };

const socialFields: SeoFieldDescriptor[] = [
  { key: 'socialTitle', label: '社群分享標題', type: 'text', maxLength: 80 },
  { key: 'socialDescription', label: '社群分享描述', type: 'textarea', maxLength: 120 },
];

const standard = (descMax: number): SeoFieldDescriptor[] => [
  titleField,
  { key: 'description', label: 'SEO 描述', type: 'textarea', maxLength: descMax, required: true },
  ...socialFields,
];

const BY_COLLECTION: Record<string, SeoFieldDescriptor[]> = {
  articles: standard(155),
  ingredients: standard(155),
  podcasts: standard(155),
  videos: standard(155),
  news: standard(155),
  myths: [
    titleField,
    { key: 'description', label: 'SEO 描述', type: 'textarea', maxLength: 220, required: true },
    ...socialFields,
    { key: 'ogTitle', label: 'OG 標題', type: 'text', required: true },
    { key: 'ogDescription', label: 'OG 描述', type: 'textarea', required: true },
    { key: 'ogImage', label: 'OG 圖網址（選填）', type: 'image' },
  ],
};

export function getSeoFields(collection: string): SeoFieldDescriptor[] {
  return BY_COLLECTION[collection] ?? standard(155);
}
