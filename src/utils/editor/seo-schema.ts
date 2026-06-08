export type SeoFieldDescriptor = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list';
  maxLength?: number;
  required?: boolean;
};

const COMMON: SeoFieldDescriptor[] = [
  { key: 'description', label: 'SEO 描述', type: 'textarea', maxLength: 160, required: true },
  { key: 'ogTitle', label: '社群分享標題', type: 'text', maxLength: 60 },
  { key: 'ogDescription', label: '社群分享描述', type: 'textarea', maxLength: 160 },
  { key: 'ogImage', label: '社群分享圖網址', type: 'image' },
];

const BY_COLLECTION: Record<string, SeoFieldDescriptor[]> = {
  articles: COMMON,
  myths: COMMON,
  ingredients: COMMON,
};

export function getSeoFields(collection: string): SeoFieldDescriptor[] {
  return BY_COLLECTION[collection] ?? COMMON;
}
