// 站台層級的外部身分連結（sameAs）。主編羅揚即品牌代表，作者與機構共用同一份。
export const SITE_SAMEAS = [
  'https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes',
  'https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ',
] as const;

export interface AuthorInfo {
  name: string;
  url: string;
  jobTitle: string;
  knowsAbout: string[];
  sameAs: string[];
}

// 作者資料 registry。key 必須與內容 frontmatter 的 author 字串完全一致。
export const AUTHORS: Record<string, AuthorInfo> = {
  羅揚: {
    name: '羅揚',
    url: 'https://evidencetoday.news/authors/luo-yang/',
    jobTitle: '本日有據主編',
    knowsAbout: ['健康識讀', '營養科學', '預防醫學', '公共衛生', '熟齡健康溝通', '保健食品觀念'],
    sameAs: [...SITE_SAMEAS],
  },
};
