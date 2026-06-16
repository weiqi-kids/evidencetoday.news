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

/* ------------------------------------------------------------------ */
/*  混合式表單欄位（核心 widget + 進階 YAML）                          */
/* ------------------------------------------------------------------ */
//
// SeoFields 用 getCoreFields(collection) 取得「給 widget 的核心欄位」，其餘 frontmatter
// 一律丟進可折疊的「進階欄位（YAML）」區。category / author 依專案決策維持自由文字（不做
// 分類法下拉、不做 authors 集合）。存檔前的硬性 gate 是 content.schemas 的 Zod 驗證。
// full:true 的欄位渲染為上方全寬（標題、長文摘要）；其餘進右欄。

export type CoreField =
  | { key: string; label: string; type: 'text' | 'textarea' | 'date'; maxLength?: number; required?: boolean; full?: boolean }
  | { key: string; label: string; type: 'tags' | 'bool'; required?: boolean; full?: boolean };

const T = (key: string, label: string, opts: Partial<CoreField> = {}): CoreField =>
  ({ key, label, type: 'text', ...opts } as CoreField);
const tags: CoreField = { key: 'tags', label: '標籤', type: 'tags' };
const publishDate = (required = true): CoreField => ({ key: 'publishDate', label: '發佈日期', type: 'date', required });
const draft: CoreField = { key: 'draft', label: '草稿（不發佈）', type: 'bool' };
const featured: CoreField = { key: 'featured', label: '精選', type: 'bool' };

const desc = (max: number): CoreField => ({ key: 'description', label: '描述（摘要）', type: 'textarea', maxLength: max, required: true, full: true });
const title: CoreField = { key: 'title', label: '標題', type: 'text', required: true, full: true };

const CORE_BY_COLLECTION: Record<string, CoreField[]> = {
  articles: [title, desc(155), T('author', '作者'), tags, publishDate(), featured, draft],
  myths: [title, desc(220), T('category', '分類'), T('author', '作者'), tags, publishDate(), draft],
  ingredients: [title, desc(155), tags, publishDate(), featured, draft],
  podcasts: [title, desc(155), tags, publishDate(), featured, draft],
  videos: [title, desc(155), tags, publishDate(), featured, draft],
  news: [
    title,
    { key: 'summary', label: '摘要', type: 'textarea', required: true, full: true },
    T('source', '來源', { required: true }),
    T('category', '分類'),
    tags,
    publishDate(),
    draft,
  ],
};

export function getCoreFields(collection: string): CoreField[] {
  return CORE_BY_COLLECTION[collection] ?? [title, desc(155), tags, publishDate(), draft];
}

// 封面圖欄位對應（不同集合封面 key 不同：news 用 heroImage）。
export type CoverConfig = { field: string; altKey: string; creditKey: string };
const COVER_BY_COLLECTION: Record<string, CoverConfig> = {
  articles: { field: 'coverImage', altKey: 'coverAlt', creditKey: 'coverImageCredit' },
  myths: { field: 'coverImage', altKey: 'imageAlt', creditKey: 'coverImageCredit' },
  ingredients: { field: 'coverImage', altKey: 'coverAlt', creditKey: 'coverImageCredit' },
  podcasts: { field: 'coverImage', altKey: 'coverAlt', creditKey: 'coverImageCredit' },
  videos: { field: 'coverImage', altKey: 'coverAlt', creditKey: 'coverImageCredit' },
  news: { field: 'heroImage', altKey: 'coverAlt', creditKey: 'coverImageCredit' },
};

export function getCoverConfig(collection: string): CoverConfig {
  return COVER_BY_COLLECTION[collection] ?? COVER_BY_COLLECTION.articles;
}

// 進階 YAML 區要排除的 key = 核心 widget key + 封面相關 key
export function handledKeys(collection: string): string[] {
  const cover = getCoverConfig(collection);
  return [...getCoreFields(collection).map((f) => f.key), cover.field, cover.altKey, cover.creditKey];
}
