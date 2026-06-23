export const SITE_NAME = '本日有據';
export const SITE_SUFFIX = '本日有據';
export const DEFAULT_DESCRIPTION = '從研究到日常判斷，整理真正值得注意的健康資訊';

export const OG_IMAGE_VERSION = '20260604-static-og-v1';

export const STATIC_OG_IMAGES = {
  home: '/og-static/home.png',
  news: '/og-static/news.png',
  ingredients: '/og-static/ingredients.png',
  articles: '/og-static/articles.png',
  myths: '/og-static/myths.png',
  podcasts: '/og-static/podcasts.png',
  videos: '/og-static/videos.png',
  default: '/og-static/home.png',
};

export function versionedOgImage(path = STATIC_OG_IMAGES.default) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${OG_IMAGE_VERSION}`;
}

export const DEFAULT_OG_IMAGE = versionedOgImage(STATIC_OG_IMAGES.home);

export function ogImageForCollection(collection) {
  return versionedOgImage(STATIC_OG_IMAGES[collection] || STATIC_OG_IMAGES.default);
}

export const COLLECTION_SOCIAL = {
  articles: {
    route: '/articles/',
    category: 'article',
    badge: '文章',
    ogBadge: '本日有據',
    ogTitle: '健康文章',
    label: '健康文章',
    title: '健康文章｜本日有據',
    description: '從日常健康問題出發，整理一般人看得懂的研究重點',
    color: '#2d8185',
    image: ogImageForCollection('articles'),
  },
  myths: {
    route: '/myths/',
    category: 'myth',
    badge: '迷思查證',
    ogBadge: '本日有據',
    ogTitle: '迷思查證',
    label: '迷思查證',
    title: '迷思查證｜本日有據',
    description: '用白話說清楚：這個健康說法到底能不能信',
    color: '#b95b3b',
    image: ogImageForCollection('myths'),
  },
  ingredients: {
    route: '/ingredients/',
    category: 'ingredient',
    badge: '成分解析',
    ogBadge: '本日有據',
    ogTitle: '成分解析',
    label: '成分解析',
    title: '成分解析｜本日有據',
    description: '從成分名稱到實際用途，整理一般人看得懂的重點',
    color: '#3f7f55',
    image: ogImageForCollection('ingredients'),
  },
  podcasts: {
    route: '/podcasts/',
    category: 'podcast',
    badge: '喜聞樂健',
    ogBadge: 'Podcast',
    ogTitle: '喜聞樂健',
    label: 'Podcast《喜聞樂健》',
    title: 'Podcast《喜聞樂健》｜本日有據',
    description: '從一個問題開始，談健康資訊背後的思考方式',
    color: '#6657a6',
    image: ogImageForCollection('podcasts'),
  },
  videos: {
    route: '/videos/',
    category: 'video',
    badge: '短影音',
    ogBadge: '本日有據',
    ogTitle: '短影音',
    label: '短影音',
    title: '短影音｜本日有據',
    description: '30 秒抓住一個健康重點，快速看懂日常營養與保健觀念',
    color: '#9a7728',
    image: ogImageForCollection('videos'),
  },
  news: {
    route: '/news/',
    category: 'news',
    badge: '健康雷達',
    ogBadge: '本日有據',
    ogTitle: '健康雷達',
    label: '健康雷達',
    title: '健康雷達｜本日有據',
    description: '健康雷達整理新研究，幫你快速看懂重要發現',
    color: '#326d8c',
    image: ogImageForCollection('news'),
  },
};

export const STATIC_SOCIAL = {
  home: {
    path: '/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'home',
    title: '本日有據｜健康研究，白話解釋',
    description: DEFAULT_DESCRIPTION,
    ogBadge: '健康研究',
    ogTitle: '本日有據',
    ogSubtitle: '白話解釋',
    color: '#1f6f72',
  },
  about: {
    path: '/about/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '關於本日有據｜本日有據',
    description: '我們把健康研究、公共資料與生活問題放在同一張桌上，用清楚文字整理可查證的健康資訊。',
    ogBadge: '本日有據',
    ogTitle: '關於我們',
    color: '#1f6f72',
  },
  'editorial-policy': {
    path: '/editorial-policy/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '編輯政策｜本日有據',
    description: '查看本日有據如何選題、查證、引用來源與修正內容，理解每篇健康資訊背後的編輯流程。',
    ogBadge: '編輯透明',
    ogTitle: '編輯政策',
    color: '#253445',
  },
  disclosure: {
    path: '/disclosure/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '利益揭露與編輯獨立原則｜本日有據',
    description: '說明本站目前的合作、利益揭露與編輯獨立原則，讓讀者知道內容判斷如何與商業關係區隔。',
    ogBadge: '編輯透明',
    ogTitle: '利益揭露',
    color: '#253445',
  },
  'medical-disclaimer': {
    path: '/medical-disclaimer/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '醫療聲明｜本日有據',
    description: '本站內容提供一般健康教育與參考，不取代醫師、藥師、營養師等專業人員的個別建議。',
    ogBadge: '閱讀提醒',
    ogTitle: '醫療聲明',
    color: '#b95b3b',
  },
  privacy: {
    path: '/privacy/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '隱私權政策｜本日有據',
    description: '了解本日有據網站的資料蒐集、Cookie、第三方服務與聯絡方式。',
    ogBadge: '網站政策',
    ogTitle: '隱私權政策',
    color: '#253445',
  },
  terms: {
    path: '/terms/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '使用條款｜本日有據',
    description: '閱讀本站內容使用、外部連結、醫療免責與條款更新等基本規範。',
    ogBadge: '網站政策',
    ogTitle: '使用條款',
    color: '#253445',
  },
  contact: {
    path: '/contact/',
    ogPath: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    template: 'static',
    title: '聯絡我們｜本日有據',
    description: '想回報內容勘誤、洽談合作或提供建議，可以在這裡找到本日有據的聯絡方式。',
    ogBadge: '聯絡',
    ogTitle: '聯絡我們',
    color: '#1f6f72',
  },
  'author-luo-yang': {
    path: '/authors/luo-yang/',
    ogPath: versionedOgImage('/og-static/author-luo-yang.png'),
    image: versionedOgImage('/og-static/author-luo-yang.png'),
    template: 'static',
    title: '羅揚｜拆解保健成分與行銷話術的健康主編',
    description: '本日有據主編羅揚，長年身處營養保健產業，習慣把成分、研究與行銷話術之間的落差拆給你看。主持 Podcast《喜聞樂健》，談營養、預防醫學與熟齡健康。',
    ogBadge: '作者',
    ogTitle: '羅揚',
    ogSubtitle: '本日有據主編',
    color: '#1f6f72',
  },
};

export function socialTitle(title, context) {
  return `${title}｜${context}｜${SITE_SUFFIX}`;
}

export function cleanText(value = '') {
  return String(value)
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(健康雷達\s*\d{4}-\d{2}-\d{2}\s*\d{1,2}\s*[：:]\s*)/, '')
    .trim();
}

export function shortTitle(title = '', maxLen = 18) {
  const cleaned = cleanText(title)
    .replace(/^EP\s*\d+\s*[｜|:：-]\s*喜聞樂健\s*[｜|:：-]\s*/i, '')
    .replace(/^喜聞樂健\s*[｜|:：-]\s*/i, '')
    .replace(/^健康雷達\s*\d{4}-\d{2}-\d{2}\s*\d{1,2}\s*[：:]\s*/, '')
    .replace(/^關於(.+?)，你所需要知道的/, '$1')
    .replace(/^關於(.+?)，你該知道的/, '$1')
    .replace(/完整指南[：:]/g, '：')
    .replace(/你所需要知道的/g, '')
    .trim();
  const split = cleaned.split(/[：:？?｜|—－-]/).map((part) => part.trim()).filter(Boolean);
  const candidate = split.find((part) => part.length >= 4 && part.length <= maxLen + 4) || split[0] || cleaned;
  if (candidate.length <= maxLen) return candidate;
  const punctuationCut = ['。', '；', '，', '、']
    .map((mark) => candidate.lastIndexOf(mark, maxLen))
    .filter((idx) => idx >= 6)
    .sort((a, b) => b - a)[0];
  if (punctuationCut) return `${candidate.slice(0, punctuationCut)}重點`;
  return `${candidate.slice(0, Math.max(4, maxLen - 4)).replace(/[，；、。\s]+$/, '')}重點`;
}

export function normalizeDescription(...candidates) {
  const picked = candidates.map(cleanText).find((item) => item.length >= 20) || candidates.map(cleanText).find(Boolean) || DEFAULT_DESCRIPTION;
  if (picked.length <= 86) return picked;
  const hardStop = picked.slice(0, 86);
  const cutAt = Math.max(hardStop.lastIndexOf('。'), hardStop.lastIndexOf('；'), hardStop.lastIndexOf('，'));
  return `${(cutAt >= 36 ? hardStop.slice(0, cutAt) : hardStop.slice(0, 78)).replace(/[，；、。\s]+$/, '')}。`;
}

export function contentSocial(collection, data = {}, slug = '') {
  const cfg = COLLECTION_SOCIAL[collection];
  const title = cleanText(data.titleDisplay || data.ogTitle || data.socialTitle || data.title || '本日有據');
  const short = cleanText(data.ogShortTitle || shortTitle(title, collection === 'ingredients' ? 14 : 18));
  const description = normalizeDescription(data.socialDescription, data.ogDescription, data.description, data.summary, data.subtitle, data.intro, data.tldr);
  const image = ogImageForCollection(collection);

  if (collection === 'podcasts') {
    const ep = data.episodeNumber ? `喜聞樂健 EP${data.episodeNumber}` : '喜聞樂健';
    return {
      title: socialTitle(short, ep),
      description,
      image,
      ogBadge: data.episodeNumber ? `Podcast EP${data.episodeNumber}` : 'Podcast',
      ogTitle: cleanText(data.ogShortTitle || title),
      ogSubtitle: shortTitle(data.summary || data.description || '', 10),
    };
  }

  return {
    title: socialTitle(short, cfg?.label || SITE_SUFFIX),
    description,
    image,
    ogBadge: cfg?.badge || SITE_SUFFIX,
    ogTitle: cleanText(data.ogShortTitle || title),
    ogSubtitle: collection === 'ingredients' && data.titleEn ? data.titleEn : undefined,
  };
}

export function listSocial(collection) {
  const cfg = COLLECTION_SOCIAL[collection];
  return { title: cfg.title, description: cfg.description, image: ogImageForCollection(collection), ...cfg };
}

export function tagSocial(tag) {
  return {
    title: `${tag}｜主題標籤｜本日有據`,
    description: `所有與「${tag}」相關的健康文章、迷思查證、成分解析與影音內容，集中在同一頁。`,
    image: ogImageForCollection('articles'),
    ogBadge: '主題標籤',
    ogTitle: tag.length > 16 ? `${tag.slice(0, 15)}…` : tag,
    color: '#1f6f72',
  };
}
