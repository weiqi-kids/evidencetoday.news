/**
 * News utility functions — title cleanup, category inference, fallback images.
 */

/**
 * Strip the "健康雷達 YYYY-MM-DD HH：" prefix from raw titles.
 * Falls back to the original title if no prefix is found.
 */
export function cleanNewsTitle(raw: string): string {
  // Pattern: "健康雷達 2026-05-12 12：" or similar date-time prefix
  const cleaned = raw.replace(
    /^健康雷達\s*\d{4}-\d{2}-\d{2}\s*\d{0,2}\s*[：:]\s*/,
    '',
  );
  return cleaned || raw;
}

/**
 * Get a display-ready title: prefer titleDisplay, then cleaned raw title.
 */
export function getDisplayTitle(
  titleDisplay: string | undefined,
  rawTitle: string,
): string {
  return titleDisplay?.trim() || cleanNewsTitle(rawTitle);
}

/* ---- Category mapping ---- */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '睡眠': ['睡眠', '失眠', '睡眠呼吸中止', '嗜睡', '快速動眼期'],
  '飲食': ['飲食', '飲食型態', '全穀', '蔬果', '地中海飲食', '糖尿病預防', 'DRRD', '超加工'],
  '食品安全': ['食品安全', 'FDA', '召回', '食品標示', '食安', '污染', '重金屬', '食源性'],
  '運動營養': ['蛋白質', '乳清蛋白', '肌肉', '阻力訓練', '健身', '運動', '補充劑'],
  '慢性病': ['糖尿病', '心血管', '血糖', '代謝', '高血壓', '慢性病', '胰島素阻抗'],
  '公共衛生': ['公共衛生', 'WHO', '疫情', '疾管署', '傳染病', '群聚'],
  '保健食品': ['保健食品', '益生菌', 'omega-3', '魚油', '補充品'],
  '腸道健康': ['腸道菌', '腸道', '腸腦軸', '微生物', '菌相'],
  '維生素': ['維生素', 'vitamin', '葉酸', '維他命'],
  '礦物質': ['礦物質', '鈣', '鎂', '鋅', '鐵', '碘'],
  '熟齡健康': ['長者', '熟齡', '老化', '高齡', '失智', '骨質'],
  '預防醫學': ['預防醫學', '篩檢', '健檢', '雷達', '監測', '風險評估'],
  '研究新知': ['統合分析', '系統性回顧', 'RCT', '臨床試驗'],
};

/**
 * Infer a single primary category from tags.
 * If an explicit `category` field is provided, use it directly.
 */
export function getNewsCategory(
  tags: string[],
  explicitCategory?: string,
): string {
  if (explicitCategory?.trim()) return explicitCategory.trim();

  const joined = tags.join(' ');
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => joined.includes(kw))) {
      return cat;
    }
  }
  return '研究新知';
}

/* ---- Fallback images ---- */

type NewsImageMeta = {
  title?: string;
  titleDisplay?: string;
  subtitle?: string;
  summary?: string;
};

export type NewsImageInput = NewsImageMeta & {
  tags?: string[];
  category?: string;
  thumbnail?: string;
  heroImage?: string;
};

const TOPIC_IMAGES: Array<{ image: string; keywords: string[] }> = [
  {
    image: '/images/news/topics/drrd-diet.svg',
    keywords: ['DRRD', '糖尿病預防', '控糖飲食', '糖尿病風險降低飲食', '少糖飲', '少糖飲料', '加工肉', '含糖飲料'],
  },
  {
    image: '/images/news/topics/gut-sleep.svg',
    keywords: ['腸道菌', '睡眠', '失眠', '睡眠呼吸中止', '快速動眼期', '腸腦軸', '腸道與睡眠'],
  },
  {
    image: '/images/news/topics/food-recall.svg',
    keywords: ['召回', 'FDA', '食品警示', '沙門氏菌', '鉛超標', '污染', '食安警示', '產品召回'],
  },
  {
    image: '/images/news/topics/mind-diet.svg',
    keywords: ['MIND 飲食', 'MIND飲食', '失智', '認知', '大腦', '腦健康'],
  },
  {
    image: '/images/news/topics/protein-training.svg',
    keywords: ['乳清', '酪蛋白', '大豆蛋白', '蛋白質', '重訓', '肌肉', '阻力訓練', '運動補充'],
  },
  {
    image: '/images/news/topics/supplement-alert.svg',
    keywords: ['保健食品', '違禁藥', '壯陽藥', '過敏原', '未標示', '膠囊', '禁藥成分', '補充品'],
  },
  {
    image: '/images/news/topics/infectious-disease.svg',
    keywords: ['傳染病', '疾管署', '病毒', '疫情', '漢他病毒', '立百病毒', '感染症'],
  },
  {
    image: '/images/news/topics/public-health-alert.svg',
    keywords: ['WHO', '公共衛生', '世界食品安全日', '食源性疾病', '全球衛生', '公告'],
  },
  {
    image: '/images/news/topics/food-labeling.svg',
    keywords: ['食品標示', '營養標示', '包裝正面', '標籤', '營養標籤', '食品包裝'],
  },
  {
    image: '/images/news/topics/ultra-processed-food.svg',
    keywords: ['超加工食品', '加工食品', '飲食指引', '高度加工', '包裝食品'],
  },
];

const CATEGORY_IMAGES: Record<string, string> = {
  '睡眠': '/images/news/sleep.svg',
  '飲食': '/images/news/diet.svg',
  '食品安全': '/images/news/food-safety.svg',
  '運動營養': '/images/news/exercise.svg',
  '慢性病': '/images/news/chronic.svg',
  '公共衛生': '/images/news/public-health.svg',
  '保健食品': '/images/news/supplement.svg',
  '腸道健康': '/images/news/gut.svg',
  '維生素': '/images/news/vitamin.svg',
  '礦物質': '/images/news/mineral.svg',
  '熟齡健康': '/images/news/senior-health.svg',
  '預防醫學': '/images/news/preventive-medicine.svg',
  '研究新知': '/images/news/research.svg',
};

const DEFAULT_IMAGE = '/images/news/research.svg';

function normalizeForTopicSearch(value: string): string {
  return value.toLocaleLowerCase('zh-TW').replace(/\s+/g, '');
}

function getNewsTopicImage(tags: string[], category?: string, meta?: NewsImageMeta): string | undefined {
  const searchParts = [
    meta?.titleDisplay,
    meta?.title,
    meta?.subtitle,
    meta?.summary,
    category,
    ...tags,
  ].filter((part): part is string => Boolean(part?.trim()));

  const haystack = normalizeForTopicSearch(searchParts.join(' '));
  return TOPIC_IMAGES.find(({ keywords }) => (
    keywords.some((keyword) => haystack.includes(normalizeForTopicSearch(keyword)))
  ))?.image;
}

function getFallbackImage(tags: string[], category?: string, meta?: NewsImageMeta): string {
  const topicImage = getNewsTopicImage(tags, category, meta);
  if (topicImage) return topicImage;

  const cat = getNewsCategory(tags, category);
  return CATEGORY_IMAGES[cat] ?? DEFAULT_IMAGE;
}

/**
 * Get a hero image for a news article.
 * Priority: heroImage field > thumbnail field > topic fallback > category fallback > default fallback.
 */
export function getNewsHeroImage(
  heroImage: string | undefined,
  thumbnail: string | undefined,
  tags: string[],
  category?: string,
  meta?: NewsImageMeta,
): string {
  if (heroImage?.trim()) return heroImage.trim();
  if (thumbnail?.trim()) return thumbnail.trim();
  return getFallbackImage(tags, category, meta);
}

/**
 * Get a thumbnail for a news card.
 * Priority: thumbnail field > heroImage field > topic fallback > category fallback > default fallback.
 */
export function getNewsThumbnail(
  thumbnail: string | undefined,
  heroImage: string | undefined,
  tags: string[],
  category?: string,
  meta?: NewsImageMeta,
): string {
  if (thumbnail?.trim()) return thumbnail.trim();
  if (heroImage?.trim()) return heroImage.trim();
  return getFallbackImage(tags, category, meta);
}
