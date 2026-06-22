// 站台層級的外部身分連結（sameAs）。主編羅揚即品牌代表，作者與機構共用同一份。
// Wikidata 機構實體 Q140265345（本日有據／Evidence Today）擺第一，是最權威的可連結實體，
// 讓站內 Organization/Person 的 sameAs 與 Wikidata 互相指認，形成站內↔站外閉環（見 docs/playbooks/geo-offsite.md）。
export const SITE_SAMEAS = [
  'https://www.wikidata.org/wiki/Q140265345',
  'https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes',
  'https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ',
] as const;

export interface AuthorInfo {
  name: string;
  url: string;
  jobTitle: string;
  /** 專業背景敘述，會進 Person JSON-LD 的 description，是 LLM/Knowledge Graph 判斷作者權威（E-E-A-T）的關鍵欄位。須與 about.md 主編簡介一致、精準不浮誇。 */
  description: string;
  knowsAbout: string[];
  sameAs: string[];
  /**
   * 專業憑證（schema.org EducationalOccupationalCredential）。只放真實、可被外部查證的憑證。
   * 羅揚為「牙醫學學歷背景」，並非執業牙醫師、亦未領有牙醫師執照，故不得以 hasCredential 宣稱專業執照。
   * 待有可驗證來源（如公會註冊頁）前，此欄位刻意留空。
   */
  hasCredential?: {
    name: string;
    credentialCategory: string;
    recognizedBy?: string;
  };
}

// 作者資料 registry。key 必須與內容 frontmatter 的 author 字串完全一致。
export const AUTHORS: Record<string, AuthorInfo> = {
  羅揚: {
    name: '羅揚',
    url: 'https://evidencetoday.news/authors/luo-yang/',
    jobTitle: '本日有據主編',
    description:
      '本日有據（Evidence Today）主編，具牙醫學學歷背景與口腔衛生材料相關研究經驗，並有保健食品產業實務與健康教育內容製作經驗；長期關注健康識讀、營養科學、預防醫學、公共衛生與熟齡健康溝通，擅長將血液檢查、保健食品與營養議題整理成白話內容；主持 Podcast《喜聞樂健》。',
    knowsAbout: [
      '牙醫學',
      '口腔衛生材料',
      '健康識讀',
      '營養科學',
      '預防醫學',
      '公共衛生',
      '熟齡健康溝通',
      '保健食品觀念',
    ],
    sameAs: [...SITE_SAMEAS],
  },
};
