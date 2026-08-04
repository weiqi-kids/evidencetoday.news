// 站台層級的外部身分連結（sameAs）。主編羅揚即品牌代表，作者與機構共用同一份。
// Wikidata 機構實體 Q140265345（本日有據／Evidence Today）擺第一，是最權威的可連結實體，
// 讓站內 Organization/Person 的 sameAs 與 Wikidata 互相指認，形成站內↔站外閉環（見 docs/playbooks/geo-offsite.md）。
export const SITE_SAMEAS = [
  'https://www.wikidata.org/wiki/Q140265345',
  'https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes',
  'https://open.spotify.com/show/2Qu0wOcTRsnqimaENnsIp8',
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
  /** 任職/經營的組織，輸出為 Person JSON-LD 的 worksFor，串起作者↔機構實體圖（E-E-A-T）。 */
  worksFor?: Array<{ name: string; url?: string }>;
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
      '本日有據（Evidence Today）主編。長年身處營養保健產業，熟悉成分、研究與行銷話術之間的落差，擅長把這些拆解成一般人看得懂、能自己判斷的內容；長期關注健康識讀、營養科學、預防醫學、公共衛生與熟齡健康溝通，並主持 Podcast《喜聞樂健》。（主編相關商業利益揭露見 /disclosure）',
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
    // worksFor 串起作者↔機構實體圖：本日有據（主編）＋ 樂地滋（其經營的營養食品公司，
    // 商業利益見 /disclosure）。讓 Google/LLM 把這些資產認成同一個可究責的人。
    worksFor: [
      { name: '本日有據 Evidence Today', url: 'https://evidencetoday.news/' },
      { name: '樂地滋有限公司', url: 'https://lodes.com.tw/' },
    ],
  },

  // ⚠️ 獨立醫療審閱者，2026-08-04 建立，**尚未啟用**。
  //
  // 這筆資料只有在某篇內容的 frontmatter 填了 `reviewer: 黃子彥` 時才會被輸出成
  // Person 級 `reviewedBy`（見 articles/[slug].astro 的反自審判斷）。在使用者逐篇
  // 送審、確認審閱完成之前，**不要**替任何一篇填入 reviewer——`reviewedBy` 是
  // 「這位具名醫師審閱過這篇」的事實主張，批次蓋章等同不實陳述。
  //
  // 上線前仍須由使用者確認下列兩點（本檔目前的內容來自公開網路資料，未經本人確認）：
  //   1. hasCredential 的正確表述（中醫師？中西醫雙執照？）與證書字號可查性。
  //   2. description 中的經歷（臺南市立醫院中醫部主任）需一個可點的第一手來源。
  //
  // 利益衝突：黃醫師同時任職上一生物醫學（保健食品研發）。本站已有同型前例
  // （主編羅揚經營樂地滋），處理原則見 docs/playbooks/geo-offsite.md——啟用審閱者
  // 時必須同步在 /disclosure 揭露其商業關係，且審閱範圍應避開與其產品線直接
  // 重疊的品項，否則「獨立審閱」的訊號價值會被自身的利益衝突抵銷。
  黃子彥: {
    name: '黃子彥',
    url: 'https://evidencetoday.news/authors/huang-tzu-yen/',
    jobTitle: '中醫師｜本日有據醫療審閱者',
    description:
      '中醫師，中國醫藥大學中西醫學訓練背景，現任社團法人中華民國上醫預防醫學發展協會理事長，長期投入預防醫學與中西醫結合的健康溝通。於本站擔任獨立醫療審閱者，審閱範圍以中醫、中藥與草本相關內容為主。（審閱者相關商業利益揭露見 /disclosure）',
    knowsAbout: ['中醫', '中藥', '草本療法', '預防醫學', '中西醫結合', '保健食品法規'],
    hasCredential: {
      name: '中醫師',
      credentialCategory: '專門職業及技術人員高等考試中醫師考試及格',
      recognizedBy: '中華民國衛生福利部',
    },
    // sameAs 只放可獨立查證的機構頁，不放人物介紹型的媒體報導。
    sameAs: ['https://gcm.org.tw/member/'],
    worksFor: [{ name: '社團法人中華民國上醫預防醫學發展協會', url: 'https://gcm.org.tw/' }],
  },
};
