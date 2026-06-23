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
   * 專業憑證（schema.org EducationalOccupationalCredential），選填。
   * 羅揚的作者權威錨定在「營養保健產業第一線實務經驗」（樂地滋有限公司負責人，可由公司登記查證），
   * 以 description + sameAs（lodes.com.tw）承載，而非以執照式 hasCredential 宣稱，故此欄位刻意留空。
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
      '本日有據（Evidence Today）主編，同時為營養食品公司「樂地滋有限公司」（Lodes）負責人，長年深耕營養保健產業第一線，累積營養、保健食品與消費者溝通的實務經驗；具健康教育內容製作與編輯經驗，長期關注健康識讀、營養科學、預防醫學、公共衛生與熟齡健康溝通，擅長將血液檢查、保健食品與營養議題整理成一般人看得懂的內容；主持 Podcast《喜聞樂健》。',
    knowsAbout: [
      '營養科學',
      '保健食品',
      '保健食品產業',
      '健康識讀',
      '預防醫學',
      '公共衛生',
      '熟齡健康溝通',
    ],
    // sameAs 串起羅揚的跨站作者實體：本人 Wikidata Person（Q140319371）、姊妹站 appi.news 作者頁
    // （已回指本站）、其負責的營養食品公司樂地滋官網與粉專、機構共用頻道。形成 LLM/知識圖譜可串接的
    // 作者權威網（E-E-A-T 的 Experience：營養保健產業第一線）。見 docs/playbooks/geo-offsite.md。
    sameAs: [
      'https://www.wikidata.org/wiki/Q140319371',
      'https://appi.news/authors/luo-yang/',
      'https://lodes.com.tw/',
      'https://www.facebook.com/LODES8/',
      ...SITE_SAMEAS,
    ],
  },
};
