import type { CollectionEntry } from 'astro:content';

export type ArticleCategorySlug =
  | 'vitamins'
  | 'minerals'
  | 'basic-nutrition'
  | 'antioxidant'
  | 'health-concepts'
  | 'health-myths'
  | 'sleep-stress'
  | 'menopause'
  | 'food-safety'
  | 'oral-hygiene'
  | 'mens-health'
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
    slug: 'vitamins',
    label: '維生素',
    description: '維生素 A、B 群、C、D、E、K 等基礎營養主題。',
  },
  {
    slug: 'minerals',
    label: '礦物質',
    description: '鐵、鈣、鎂、鋅、硒等礦物質與補充判斷。',
  },
  {
    slug: 'basic-nutrition',
    label: '基礎營養',
    description: 'Omega-3、Q10、肌酸等日常營養支持與身體功能維持。',
  },
  {
    slug: 'antioxidant',
    label: '抗氧化',
    description: '抗氧化、抗老化、植化素與氧化壓力相關主題。',
  },
  {
    slug: 'health-concepts',
    label: '保健觀念',
    description: '補充週期、體感、劑量、安全上限與健康判斷框架。',
  },
  {
    slug: 'health-myths',
    label: '保健迷思',
    description: '誇大宣稱、偽科學行銷與常見保健錯誤觀念。',
  },
  {
    slug: 'sleep-stress',
    label: '睡眠與壓力',
    description: '睡眠、壓力、焦慮、助眠成分與生活節律。',
  },
  {
    slug: 'menopause',
    label: '更年期',
    description: '更年期、圍停經期、荷爾蒙變化與分階段保養。',
  },
  {
    slug: 'food-safety',
    label: '食品安全',
    description: '食安、保存、交叉污染、餐飲風險與居家飲食安全。',
  },
  {
    slug: 'oral-hygiene',
    label: '口腔衛生',
    description: '牙周、咀嚼力、護牙、假牙與熟齡口腔照護。',
  },
  {
    slug: 'mens-health',
    label: '男性健康',
    description: '男性健康需求、攝護腺、肌肉骨骼與市場刻板印象。',
  },
  {
    slug: 'other',
    label: '其他',
    description: '暫時無法明確分類的文章。',
  },
];

const CATEGORY_LABEL_MAP = new Map(ARTICLE_CATEGORIES.map((category) => [category.slug, category.label]));

const CATEGORY_KEYWORDS: Record<ArticleCategorySlug, string[]> = {
  vitamins: [
    '維生素',
    '維他命',
    'vitamin',
    'b群',
    '維生素a',
    '維生素b',
    '維生素c',
    '維生素d',
    '維生素e',
    '維生素k',
  ],
  minerals: [
    '礦物質',
    '鐵',
    '鐵劑',
    '缺鐵',
    '鐵蛋白',
    '鈣',
    '鎂',
    '鋅',
    '硒',
    '亞鐵',
  ],
  'basic-nutrition': [
    'omega-3',
    'omega',
    'epa',
    'dha',
    '魚油',
    'q10',
    'coq10',
    '輔酶q10',
    '肌酸',
    '蛋白質',
    '基礎營養',
    '營養支持',
  ],
  antioxidant: [
    '抗氧化',
    '白藜蘆醇',
    'resveratrol',
    '蝦紅素',
    'astaxanthin',
    '植化素',
    '氧化壓力',
  ],
  'health-concepts': [
    '觀念',
    '體感',
    '安慰劑',
    '劑量',
    '毒性',
    '安全上限',
    '補充週期',
    '三個月',
    '效果維持',
    '咖啡',
    '飲食模式',
    '劑型',
    '軟糖',
    '判斷',
  ],
  'health-myths': [
    '迷思',
    '偽科學',
    '騙局',
    '誇大',
    '神藥',
    '聖品',
    '抗癌',
    '壯陽',
    '天然ozempic',
    '幹細胞',
    'nmn',
    '薑黃素',
    '瑪卡',
    '磷蝦油',
    '燕窩酸',
    '唾液酸',
    '行銷',
  ],
  'sleep-stress': [
    '睡眠',
    '失眠',
    '壓力',
    '焦慮',
    'gaba',
    '褪黑激素',
    '茶胺酸',
    '甘胺酸',
    '助眠',
    '睡不好',
    '情緒',
    '肌醇',
    'pcos',
  ],
  menopause: [
    '更年期',
    '圍停經',
    '停經',
    '女性荷爾蒙',
    '大豆異黃酮',
    '黑升麻',
  ],
  'food-safety': [
    '食品安全',
    '食安',
    '餐飲風險',
    '冰箱',
    '交叉污染',
    '剩菜',
    '保存',
    '料理',
  ],
  'oral-hygiene': [
    '口腔',
    '牙齒',
    '牙周',
    '咀嚼',
    '假牙',
    '護牙',
    '洗牙',
    '口腔衛生',
  ],
  'mens-health': [
    '男性健康',
    '男性保健',
    '攝護腺',
    '男人',
    '性別刻板印象',
  ],
  other: [],
};

// 文章頁分類採「人工指定優先」，避免關鍵字把保健觀念、保健迷思、成分文誤歸為同一類。
const ARTICLE_CATEGORY_OVERRIDES: Record<string, ArticleCategorySlug> = {
  'iron-deficiency-anemia-women-supplements.mdx': 'minerals',
  'melatonin-prescription-taiwan-gray-market.mdx': 'sleep-stress',
  'supplement-course-myth-continuous-supplementation.mdx': 'health-concepts',
  'men-health-stereotypes-beyond-performance.mdx': 'mens-health',
  'menopause-supplement-stages-guide.mdx': 'menopause',
  'omega-3-guide.mdx': 'basic-nutrition',
  'lodes-4.mdx': 'food-safety',
  'lodes-5.mdx': 'oral-hygiene',
  'lodes-7.mdx': 'health-myths',
  'lodes-22.mdx': 'sleep-stress',
  'lodes-23.mdx': 'menopause',
  'lodes-24.mdx': 'basic-nutrition',
  'lodes-25.mdx': 'health-myths',
  'lodes-27.mdx': 'health-concepts',
  'lodes-28.mdx': 'health-myths',
  'lodes-29.mdx': 'health-myths',
  'lodes-30.mdx': 'health-concepts',
  'lodes-31.mdx': 'health-concepts',
  'lodes-32.mdx': 'antioxidant',
  'lodes-33.mdx': 'health-myths',
  'lodes-34.mdx': 'antioxidant',
  'lodes-50.mdx': 'health-myths',
  'lodes-51.mdx': 'health-concepts',
  'lodes-52.mdx': 'sleep-stress',
  'lodes-53.mdx': 'basic-nutrition',
  'lodes-54.mdx': 'health-myths',
  'lodes-55.mdx': 'sleep-stress',
  'lodes-78.mdx': 'oral-hygiene',
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

  if (containsKeyword(text, CATEGORY_KEYWORDS['health-myths'])) return 'health-myths';
  if (containsKeyword(text, CATEGORY_KEYWORDS['sleep-stress'])) return 'sleep-stress';
  if (containsKeyword(text, CATEGORY_KEYWORDS.menopause)) return 'menopause';
  if (containsKeyword(text, CATEGORY_KEYWORDS['food-safety'])) return 'food-safety';
  if (containsKeyword(text, CATEGORY_KEYWORDS['oral-hygiene'])) return 'oral-hygiene';
  if (containsKeyword(text, CATEGORY_KEYWORDS['mens-health'])) return 'mens-health';
  if (containsKeyword(text, CATEGORY_KEYWORDS.vitamins)) return 'vitamins';
  if (containsKeyword(text, CATEGORY_KEYWORDS.minerals)) return 'minerals';
  if (containsKeyword(text, CATEGORY_KEYWORDS.antioxidant)) return 'antioxidant';
  if (containsKeyword(text, CATEGORY_KEYWORDS['basic-nutrition'])) return 'basic-nutrition';
  if (containsKeyword(text, CATEGORY_KEYWORDS['health-concepts'])) return 'health-concepts';

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
