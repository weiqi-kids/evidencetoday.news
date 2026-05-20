import type { VideoItem } from '@/lib/youtube';

export type VideoCategorySlug =
  | 'nutrition'
  | 'supplements'
  | 'myths'
  | 'chronic'
  | 'food'
  | 'lifestyle'
  | 'research'
  | 'other';

export interface VideoCategory {
  slug: VideoCategorySlug;
  label: string;
  description: string;
}

export interface CategorizedVideoItem extends VideoItem {
  categorySlug: VideoCategorySlug;
  categoryLabel: string;
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    slug: 'nutrition',
    label: '營養觀念',
    description: '營養素、飲食結構、身體需要什麼，先建立基本判斷。',
  },
  {
    slug: 'supplements',
    label: '保健食品',
    description: '保健食品、營養補充、使用時機與常見誤解。',
  },
  {
    slug: 'myths',
    label: '健康迷思',
    description: '常見說法、網路流傳與需要重新判斷的健康資訊。',
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
    description: '睡眠、運動、壓力、作息與日常保養習慣。',
  },
  {
    slug: 'research',
    label: '研究新知',
    description: '醫學研究、公共衛生、健康新聞與新證據。',
  },
  {
    slug: 'other',
    label: '其他',
    description: '暫時無法明確分類的短影音。',
  },
];

const CATEGORY_LABEL_MAP = new Map(VIDEO_CATEGORIES.map((category) => [category.slug, category.label]));

const CATEGORY_KEYWORDS: Record<VideoCategorySlug, string[]> = {
  nutrition: ['營養', '蛋白質', '脂肪', '碳水', '纖維', '膳食纖維', '礦物質', '胺基酸', '必需脂肪酸', '缺乏', '攝取', '熱量', '代謝'],
  supplements: ['保健食品', '保健品', '補充品', '營養補充', '魚油', 'omega', '葉黃素', 'b群', '維生素', '鈣', 'q10', '膠原', '益生菌', '乳酸菌', '薑黃素', '褪黑激素', '胜肽'],
  myths: ['迷思', '闢謠', '錯誤', '真的假的', '有效嗎', '智商稅', '傳言', '網路說', 'line', '不能吃', '一定要', '騙局', '謠言'],
  chronic: ['血糖', '血脂', '膽固醇', '三酸甘油酯', '血壓', '肝', '腎', '尿酸', '發炎', '脂肪肝', '糖尿病', '心血管', '中風', '動脈', '胰島素', '檢查', '報告', '指數', '指標'],
  food: ['食物', '原型食物', '飲食', '蔬菜', '水果', '茶', '咖啡', '豆', '油', '堅果', '早餐', '晚餐', '斷食', '168', '吃什麼', '怎麼吃', '原料', '植化素'],
  lifestyle: ['睡眠', '運動', '壓力', '作息', '走路', '肌力', '肌少', '老化', '保養', '習慣', '生活', '熬夜', '精神', '疲勞'],
  research: ['研究', '期刊', '論文', '新聞', '統合分析', 'meta', 'rct', '隨機', '觀察研究', '實驗', '證據', '公共衛生', '指南'],
  other: [],
};

// 若自動分類不準，請用 YouTube video id 指定分類。
const VIDEO_CATEGORY_OVERRIDES: Record<string, VideoCategorySlug> = {
  // YouTube video id: category
};

function containsKeyword(title: string, keywords: string[]): boolean {
  return keywords.some((keyword) => title.includes(keyword));
}

export function classifyVideoByTitle(title: string): VideoCategorySlug {
  const normalizedTitle = title.trim().toLowerCase();

  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.myths)) return 'myths';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.chronic)) return 'chronic';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.supplements)) return 'supplements';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.food)) return 'food';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.lifestyle)) return 'lifestyle';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.research)) return 'research';
  if (containsKeyword(normalizedTitle, CATEGORY_KEYWORDS.nutrition)) return 'nutrition';

  return 'other';
}

export function categorizeVideos(videos: VideoItem[]): CategorizedVideoItem[] {
  return videos.map((video) => {
    const categorySlug = VIDEO_CATEGORY_OVERRIDES[video.id] ?? classifyVideoByTitle(video.title);
    const categoryLabel = CATEGORY_LABEL_MAP.get(categorySlug) ?? '其他';

    return {
      ...video,
      categorySlug,
      categoryLabel,
    };
  });
}
