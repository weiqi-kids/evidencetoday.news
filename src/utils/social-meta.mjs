export const SITE_NAME = '本日有據';
export const SITE_SUFFIX = '本日有據';
export const DEFAULT_DESCRIPTION = '健康研究，白話解釋。把健康議題講得有根據，也講得讓人看得懂。';

export const COLLECTION_SOCIAL = {
  articles: {
    route: '/articles/',
    category: 'article',
    badge: '文章',
    ogBadge: '本日有據',
    ogTitle: '健康文章',
    label: '健康文章',
    title: '健康文章｜本日有據',
    description: '從營養、保健食品到生活健康，用研究與公共資料拆解常見問題，保留脈絡也說人話。',
    color: '#2d8185',
  },
  myths: {
    route: '/myths/',
    category: 'myth',
    badge: '迷思查證',
    ogBadge: '本日有據',
    ogTitle: '迷思查證',
    label: '迷思查證',
    title: '迷思查證｜本日有據',
    description: '把常見健康說法拿回證據裡檢查：哪些情境成立、哪些被誇大，結論說清楚。',
    color: '#b85a3a',
  },
  ingredients: {
    route: '/ingredients/',
    category: 'ingredient',
    badge: '成分解析',
    ogBadge: '本日有據',
    ogTitle: '成分解析',
    label: '成分解析',
    title: '成分解析｜本日有據',
    description: '從營養素、食物成分到安全性，整理研究常談的重點與日常使用情境。',
    color: '#3a8a4a',
  },
  podcasts: {
    route: '/podcasts/',
    category: 'podcast',
    badge: '喜聞樂健',
    ogBadge: 'Podcast',
    ogTitle: '喜聞樂健',
    label: 'Podcast《喜聞樂健》',
    title: 'Podcast《喜聞樂健》｜本日有據',
    description: '每一集約 15 分鐘，從一個健康問題出發，把知識、觀念與判斷講清楚。',
    color: '#6a5aad',
  },
  videos: {
    route: '/videos/',
    category: 'video',
    badge: '短影音',
    ogBadge: '本日有據',
    ogTitle: '短影音',
    label: '短影音',
    title: '短影音｜本日有據',
    description: '用短時間抓住健康、營養與生活科普重點；每支影片都回到可查證的資料脈絡。',
    color: '#8a7030',
  },
  news: {
    route: '/news/',
    category: 'news',
    badge: '健康雷達',
    ogBadge: '本日有據',
    ogTitle: '健康雷達',
    label: '健康雷達',
    title: '健康雷達｜本日有據',
    description: '整理健康研究、公共資訊與最新趨勢，幫你更快看懂真正需要留意的消息。',
    color: '#1f7c93',
  },
};

export const STATIC_SOCIAL = {
  home: {
    path: '/',
    ogPath: '/og/index.png',
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
    ogPath: '/og/pages/about.png',
    template: 'static',
    title: '關於本日有據｜本日有據',
    description: '我們把健康研究、公共資料與生活問題放在同一張桌上，用清楚文字整理可查證的健康資訊。',
    ogBadge: '本日有據',
    ogTitle: '關於我們',
    color: '#1f6f72',
  },
  'editorial-policy': {
    path: '/editorial-policy/',
    ogPath: '/og/pages/editorial-policy.png',
    template: 'static',
    title: '編輯政策｜本日有據',
    description: '查看本日有據如何選題、查證、引用來源與修正內容，理解每篇健康資訊背後的編輯流程。',
    ogBadge: '編輯透明',
    ogTitle: '編輯政策',
    color: '#103b44',
  },
  disclosure: {
    path: '/disclosure/',
    ogPath: '/og/pages/disclosure.png',
    template: 'static',
    title: '利益揭露與編輯獨立原則｜本日有據',
    description: '說明本站目前的合作、利益揭露與編輯獨立原則，讓讀者知道內容判斷如何與商業關係區隔。',
    ogBadge: '編輯透明',
    ogTitle: '利益揭露',
    color: '#103b44',
  },
  'medical-disclaimer': {
    path: '/medical-disclaimer/',
    ogPath: '/og/pages/medical-disclaimer.png',
    template: 'static',
    title: '醫療聲明｜本日有據',
    description: '本站內容提供一般健康教育與參考，不取代醫師、藥師、營養師等專業人員的個別建議。',
    ogBadge: '閱讀提醒',
    ogTitle: '醫療聲明',
    color: '#b85a3a',
  },
  privacy: {
    path: '/privacy/',
    ogPath: '/og/pages/privacy.png',
    template: 'static',
    title: '隱私權政策｜本日有據',
    description: '了解本日有據網站的資料蒐集、Cookie、第三方服務與聯絡方式。',
    ogBadge: '網站政策',
    ogTitle: '隱私權政策',
    color: '#103b44',
  },
  terms: {
    path: '/terms/',
    ogPath: '/og/pages/terms.png',
    template: 'static',
    title: '使用條款｜本日有據',
    description: '閱讀本站內容使用、外部連結、醫療免責與條款更新等基本規範。',
    ogBadge: '網站政策',
    ogTitle: '使用條款',
    color: '#103b44',
  },
  contact: {
    path: '/contact/',
    ogPath: '/og/pages/contact.png',
    template: 'static',
    title: '聯絡我們｜本日有據',
    description: '想回報內容勘誤、洽談合作或提供建議，可以在這裡找到本日有據的聯絡方式。',
    ogBadge: '聯絡',
    ogTitle: '聯絡我們',
    color: '#1f6f72',
  },
  'author-luo-yang': {
    path: '/authors/luo-yang/',
    ogPath: '/og/pages/author-luo-yang.png',
    template: 'static',
    title: '羅揚｜本日有據主編',
    description: '認識本日有據主編羅揚，以及他整理健康資訊、Podcast、文章與短影音內容的背景與方向。',
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
    .replace(/完整指南[：:]/g, '')
    .trim();
  const split = cleaned.split(/[：:？?｜|—－-]/).map((part) => part.trim()).filter(Boolean);
  const candidate = split.find((part) => part.length >= 4 && part.length <= maxLen + 4) || split[0] || cleaned;
  return candidate.length > maxLen ? `${candidate.slice(0, maxLen - 1)}…` : candidate;
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
  const image = `/og/${collection}/${slug}.png`;

  if (collection === 'podcasts') {
    const ep = data.episodeNumber ? `喜聞樂健 EP${data.episodeNumber}` : '喜聞樂健';
    return { title: socialTitle(short, ep), description, image, ogBadge: data.episodeNumber ? `EP${data.episodeNumber}` : 'Podcast', ogTitle: short, ogSubtitle: shortTitle(data.summary || data.description || '', 10) };
  }
  return {
    title: socialTitle(short, cfg?.label || SITE_SUFFIX),
    description,
    image,
    ogBadge: cfg?.badge || SITE_SUFFIX,
    ogTitle: short,
    ogSubtitle: collection === 'ingredients' && data.titleEn ? data.titleEn : undefined,
  };
}

export function listSocial(collection) {
  const cfg = COLLECTION_SOCIAL[collection];
  return { title: cfg.title, description: cfg.description, image: `/og/${collection}/index.png`, ...cfg };
}

export function tagSocial(tag) {
  return {
    title: `${tag}｜主題標籤｜本日有據`,
    description: `所有與「${tag}」相關的健康文章、迷思查證、成分解析與影音內容，集中在同一頁。`,
    image: '/og/tags/index.png',
    ogBadge: '主題標籤',
    ogTitle: tag.length > 16 ? `${tag.slice(0, 15)}…` : tag,
    color: '#1f6f72',
  };
}
