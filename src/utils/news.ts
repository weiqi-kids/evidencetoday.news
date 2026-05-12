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
  '睡眠': ['睡眠', '失眠', '睡眠呼吸中止', '嗜睡'],
  '飲食': ['飲食', '飲食型態', '全穀', '蔬果', '地中海飲食', '糖尿病預防', 'DRRD'],
  '食品安全': ['食品安全', 'FDA', '召回', '食品標示', '食安', '污染', '重金屬'],
  '運動營養': ['蛋白質', '乳清蛋白', '肌肉', '阻力訓練', '健身', '運動', '補充劑'],
  '慢性病': ['糖尿病', '心血管', '血糖', '代謝', '高血壓', '慢性病'],
  '公共衛生': ['公共衛生', 'WHO', '疫情', '疾管署', '傳染病'],
  '保健食品': ['保健食品', '益生菌', '維生素', 'omega-3', '魚油', '補充品'],
  '腸道健康': ['腸道菌', '腸道', '腸腦軸', '微生物', '菌相'],
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

const CATEGORY_IMAGES: Record<string, string> = {
  '睡眠': '/images/news/sleep.svg',
  '飲食': '/images/news/diet.svg',
  '食品安全': '/images/news/food-safety.svg',
  '運動營養': '/images/news/exercise.svg',
  '慢性病': '/images/news/chronic.svg',
  '公共衛生': '/images/news/public-health.svg',
  '保健食品': '/images/news/supplement.svg',
  '腸道健康': '/images/news/gut.svg',
  '研究新知': '/images/news/research.svg',
};

const DEFAULT_IMAGE = '/images/news/research.svg';

/**
 * Get a hero image for a news article.
 * Priority: heroImage field > thumbnail field > category fallback.
 */
export function getNewsHeroImage(
  heroImage: string | undefined,
  thumbnail: string | undefined,
  tags: string[],
  category?: string,
): string {
  if (heroImage?.trim()) return heroImage.trim();
  if (thumbnail?.trim()) return thumbnail.trim();
  const cat = getNewsCategory(tags, category);
  return CATEGORY_IMAGES[cat] ?? DEFAULT_IMAGE;
}

/**
 * Get a thumbnail for a news card.
 * Priority: thumbnail field > heroImage field > category fallback.
 */
export function getNewsThumbnail(
  thumbnail: string | undefined,
  heroImage: string | undefined,
  tags: string[],
  category?: string,
): string {
  if (thumbnail?.trim()) return thumbnail.trim();
  if (heroImage?.trim()) return heroImage.trim();
  const cat = getNewsCategory(tags, category);
  return CATEGORY_IMAGES[cat] ?? DEFAULT_IMAGE;
}
