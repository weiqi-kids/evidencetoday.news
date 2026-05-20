import type { CollectionEntry } from 'astro:content';

export type ArticleCategorySlug =
  | 'nutrition'
  | 'supplements'
  | 'myths'
  | 'chronic'
  | 'food'
  | 'lifestyle'
  | 'research'
  | 'other';

export interface ArticleCategory {
  slug: ArticleCategorySlug;
  label: string;
  description: string;
}

export type CategorizedArticle = CollectionEntry<'articles'> & {
  categorySlug: ArticleCategorySlug;
  categoryLabel: string;
};

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  {
    slug: 'nutrition',
    label: '營養觀念',
    description: '營養素、飲食結構與身體代謝的基本判斷。',
  },
  {
    slug: 'supplements',
    label: '保健食品',
    description: '保健食品、營養補充、使用時機與常見誤解。',
  },
  {
    slug: 'myths',
    label: '健康迷思',
    description: '容易被誤解、過度簡化或需要重新判斷的健康說法。',
  },
  {
    slug: 'chronic',
    label: '慢性病與指標',
    description: '血脂、血糖、血壓、肝腎功能、檢查數字與長期健康管理。',
  },
  {
    slug: 'food',
    label: '食物與原料',
    description: '食物、原料、植化素與日常飲食中的健康議題。',
  },
  {
    slug: 'lifestyle',
    label: '生活保養',
    description: '睡眠、運動、壓力、作息、老化與日常保養習慣。',
  },
  {
    slug: 'research',
    label: '研究新知',
    description: '醫學研究、公共衛生、健康新聞與新證據整理。',
  },
  {
    slug: 'other',
    label: '其他',
    description: '暫時無法明確分類的文章。',
  },
];

const CATEGORY_LABEL_MAP = new Map(ARTICLE_CATEGORIES.map((category) => [category.slug, category.label]));

const CATEGORY_KEYWORDS: Record<ArticleCategorySlug, string[]> = {
  nutrition: [
    '營養',
    '蛋白質',
    '脂肪',
    '碳水',
    '膳食纖維',
    '纖維',
    '礦物質',
    '胺基酸',
    '代謝',
    '缺乏',
    '攝取',
    '熱量',
  ],
  supplements: [
    '保健食品',
    '保健品',
    '補充品',
    '營養補充',
    '魚油',
    'omega',
    '葉黃素',
    'b群',
    '維生素',
    '鈣',
    'q10',
    'coq10',
    '輔酶q10',
    '膠原',
    '益生菌',
    '乳酸菌',
    '薑黃素',
    'nmn',
    'nad',
    '肌酸',
    '胜肽',
    '補充',
  ],
  myths: [
    '迷思',
    '闢謠',
    '錯誤',
    '真的假的',
    '有效嗎',
    '智商稅',
    '騙局',
    '誇大',
    '別再',
    '神藥',
    '聖品',
    '問題很大',
    '網路說',
  ],
  chronic: [
    '血糖',
    '血脂',
    '膽固醇',
    '三酸甘油酯',
    '血壓',
    '肝',
    '腎',
    '尿酸',
    '發炎',
    '脂肪肝',
    '糖尿病',
    '心血管',
    '中風',
    '動脈',
    '胰島素',
    '檢查',
    '報告',
    '指數',
    '指標',
  ],
  food: [
    '食物',
    '原型食物',
    '飲食',
    '蔬菜',
    '水果',
    '茶',
    '咖啡',
    '豆',
    '油',
    '堅果',
    '早餐',
    '晚餐',
    '斷食',
    '168',
    '吃什麼',
    '怎麼吃',
    '原料',
    '植化素',
  ],
  lifestyle: [
    '睡眠',
    '運動',
    '壓力',
    '作息',
    '走路',
    '肌力',
    '肌少',
    '老化',
    '抗老',
    '保養',
    '習慣',
    '生活',
    '熬夜',
    '精神',
    '疲勞',
  ],
  research: [
    '研究',
    '期刊',
    '論文',
    '新聞',
    '統合分析',
    'meta',
    'rct',
    '隨機',
    '觀察研究',
    '實驗',
    '證據',
    '公共衛生',
    '指南',
  ],
  other: [],
};

// 若自動分類不準，請用文章 id 指定分類，例如：'lodes-24.mdx': 'supplements'。
const ARTICLE_CATEGORY_OVERRIDES: Record<string, ArticleCategorySlug> = {
  // article id: category
};

function containsKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function getSearchText(article: CollectionEntry<'articles'>): string {
  const data = article.data;

  return [
    article.id,
    data.title,
    data.description,
    data.tldr,
    ...(data.tags ?? []),
  ]
    .join(' ')
    .trim()
    .toLowerCase();
}

export function classifyArticle(article: CollectionEntry<'articles'>): ArticleCategorySlug {
  const override = ARTICLE_CATEGORY_OVERRIDES[article.id];
  if (override) return override;

  const text = getSearchText(article);

  if (containsKeyword(text, CATEGORY_KEYWORDS.chronic)) return 'chronic';
  if (containsKeyword(text, CATEGORY_KEYWORDS.supplements)) return 'supplements';
  if (containsKeyword(text, CATEGORY_KEYWORDS.myths)) return 'myths';
  if (containsKeyword(text, CATEGORY_KEYWORDS.food)) return 'food';
  if (containsKeyword(text, CATEGORY_KEYWORDS.lifestyle)) return 'lifestyle';
  if (containsKeyword(text, CATEGORY_KEYWORDS.research)) return 'research';
  if (containsKeyword(text, CATEGORY_KEYWORDS.nutrition)) return 'nutrition';

  return 'other';
}

export function categorizeArticles(articles: CollectionEntry<'articles'>[]): CategorizedArticle[] {
  return articles.map((article) => {
    const categorySlug = classifyArticle(article);
    const categoryLabel = CATEGORY_LABEL_MAP.get(categorySlug) ?? '其他';

    return {
      ...article,
      categorySlug,
      categoryLabel,
    };
  });
}
