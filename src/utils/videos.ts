import type { VideoItem } from '@/lib/youtube';
import { ARTICLE_CATEGORIES, type ArticleCategorySlug } from '@/utils/article-categories';

export type VideoCategorySlug = ArticleCategorySlug;

export interface VideoCategory {
  slug: VideoCategorySlug;
  label: string;
  description: string;
}

export interface CategorizedVideoItem extends VideoItem {
  categorySlug: VideoCategorySlug;
  categoryLabel: string;
}

export const VIDEO_CATEGORIES: VideoCategory[] = ARTICLE_CATEGORIES;

const CATEGORY_LABEL_MAP = new Map(VIDEO_CATEGORIES.map((category) => [category.slug, category.label]));

const CATEGORY_KEYWORDS: Record<VideoCategorySlug, string[]> = {
  vitamins: [
    '維生素',
    '維他命',
    'vitamin',
    'b群',
    '葉酸',
    '菸鹼素',
    '維生素a',
    '維生素b',
    '維生素c',
    '維生素d',
    '維生素e',
    '維生素k',
    '曬太陽',
    '曬香菇',
    '香菇',
  ],
  minerals: [
    '礦物質',
    '鐵',
    '鐵劑',
    '缺鐵',
    '鐵蛋白',
    '鈣',
    '補鈣',
    '鎂',
    '鋅',
    '硒',
    '電解質',
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
    '胺基酸',
    '必需脂肪酸',
    '膳食纖維',
    '纖維',
    '膠原蛋白',
    '胜肽',
    '卵磷脂',
    '葉黃素',
    '玉米黃素',
  ],
  antioxidant: [
    '抗氧化',
    '白藜蘆醇',
    'resveratrol',
    '蝦紅素',
    'astaxanthin',
    '植化素',
    '多酚',
    '槲皮素',
    '花青素',
    '葡萄籽',
    '氧化壓力',
    '蒜',
    '大蒜',
    '蒜素',
    '洋蔥',
  ],
  'health-concepts': [
    '觀念',
    '保健食品',
    '保健品',
    '補充品',
    '營養補充',
    '膠囊',
    '劑量',
    '安全上限',
    '體感',
    '有效嗎',
    '多久',
    '三個月',
    '咖啡',
    '飲食模式',
    '168',
    '斷食',
    '益生菌',
    '優酪乳',
    '乳酸菌',
    '判斷',
    '初衷',
  ],
  'health-myths': [
    '迷思',
    '闢謠',
    '錯誤',
    '真的假的',
    '智商稅',
    '傳言',
    '網路說',
    'line',
    '不能吃',
    '一定要',
    '騙局',
    '謠言',
    '排毒',
    '神藥',
    '聖品',
    '誇大',
    '抗癌',
    '壯陽',
    '天然ozempic',
    '瘦瘦針',
    '幹細胞',
    'nmn',
    '薑黃素',
    '瑪卡',
    '磷蝦油',
    '燕窩酸',
    '唾液酸',
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
    '熬夜',
    '疲勞',
    '精神',
  ],
  menopause: [
    '更年期',
    '圍停經',
    '停經',
    '女性荷爾蒙',
    '大豆異黃酮',
    '黑升麻',
    '熱潮紅',
  ],
  'food-safety': [
    '食品安全',
    '食安',
    '食品中毒',
    '餐飲風險',
    '冰箱',
    '交叉污染',
    '剩菜',
    '冷藏',
    '冷凍',
    '室溫',
    '隔夜',
    '發霉',
    '黃麴毒素',
    '下鍋',
    '濕濕下鍋',
    '川燙',
    '汆燙',
    '焯水',
    '瀝水',
    '切了才燙',
    '秋葵',
    '菠菜',
  ],
  'oral-hygiene': [
    '口腔',
    '牙齒',
    '牙周',
    '咀嚼',
    '吞嚥',
    '吞嚥困難',
    '假牙',
    '護牙',
    '洗牙',
    '口腔衛生',
  ],
};

// 若自動分類不準，請用 YouTube video id 指定分類。
const VIDEO_CATEGORY_OVERRIDES: Record<string, VideoCategorySlug> = {
  // YouTube video id: category
};

function containsKeyword(title: string, keywords: string[]): boolean {
  return keywords.some((keyword) => title.includes(keyword));
}

function classifyExplicitVideoPattern(title: string): VideoCategorySlug | null {
  if (title.includes('香菇') && title.includes('維生素d')) return 'vitamins';
  if (title.includes('菠菜') && (title.includes('汆燙') || title.includes('瀝水') || title.includes('直接炒'))) return 'food-safety';
  if (title.includes('秋葵') && (title.includes('切了才燙') || title.includes('濕濕下鍋'))) return 'food-safety';
  if (title.includes('蒜') && (title.includes('拍碎') || title.includes('蒜素') || title.includes('效果'))) return 'antioxidant';
  if (title.includes('健康短影音') || title.includes('初衷')) return 'health-concepts';

  return null;
}

export function classifyVideoByTitle(title: string): VideoCategorySlug {
  const normalizedTitle = title.trim().toLowerCase();
  const explicitPattern = classifyExplicitVideoPattern(normalizedTitle);
  if (explicitPattern) return explicitPattern;

  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['health-myths'])) return 'health-myths';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['sleep-stress'])) return 'sleep-stress';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.menopause)) return 'menopause';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['oral-hygiene'])) return 'oral-hygiene';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['food-safety'])) return 'food-safety';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.vitamins)) return 'vitamins';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.minerals)) return 'minerals';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.antioxidant)) return 'antioxidant';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['basic-nutrition'])) return 'basic-nutrition';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS['health-concepts'])) return 'health-concepts';

  return 'health-concepts';
}

export function categorizeVideos(videos: VideoItem[]): CategorizedVideoItem[] {
  return videos.map((video) => {
    const categorySlug = VIDEO_CATEGORY_OVERRIDES[video.id] ?? classifyVideoByTitle(video.title);
    const categoryLabel = CATEGORY_LABEL_MAP.get(categorySlug) ?? '保健觀念';

    return {
      ...video,
      categorySlug,
      categoryLabel,
    };
  });
}
