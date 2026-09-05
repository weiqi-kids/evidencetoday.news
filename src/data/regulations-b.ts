/**
 * regulations-b.ts — 由既有文章抽取的結構化法規資料（B 批）
 *
 * 兩個來源：
 *   1. REGULATIONS_B：兩篇「國際法規落差」文章的七維度對照表
 *      - src/content/articles/ashwagandha-regulation-denmark-eu-us-taiwan.mdx
 *      - src/content/articles/5-htp-regulation-taiwan-us-eu.mdx
 *   2. CARRY_LIMITS：五篇「帶回台灣」文章共用的入境／郵寄限量，依品類彙整
 *
 * 原則：內容一律照抄文章已查證過的敘述，不另外上網補資料。
 * 文章沒寫的維度一律寫「查無明文」，並註明文章交代查過哪裡。
 *
 * 型別 SubstanceReg 由 ./regulations-a 提供，本檔不重複宣告。
 * 本檔假設的形狀（若與 A 不符，請以 A 為準調整本檔）：
 *   RegCell      = { text: string; source?: string; asOf?: string }
 *   RegDimension = { label: string; cells: Record<string, RegCell>; extra?: Record<string, RegCell> }
 *   SubstanceReg = { slug; name; articleSlug; asOf; columns; extraColumns?; dimensions; conclusion; originalFindings }
 */
// 本檔的形狀跟 regulations-a.ts 不同，而且是刻意的：
// A 那三種成分的落差剛好落在台美日歐，B 這兩種不是——南非醉茄的關鍵對照國是丹麥、荷蘭、
// 冰島與印度，5-HTP 則多了加拿大，日本反而沒有可引用的材料。硬套固定四欄會逼出空格或臆測。
// 兩種形狀在 `regulations.ts` 收斂成「每種成分自帶欄位定義」的統一模型。
export interface RawRegCellB {
  text: string;
  source?: string;
  sourceLabel?: string;
  asOf?: string;
  note?: string;
}
export interface RawSubstanceRegB {
  slug: string;
  name: string;
  latinName?: string;
  articleSlug: string;
  ingredientSlug?: string;
  asOf?: string;
  columns: Record<string, string>;
  extraColumns?: Record<string, string>;
  dimensions: {
    label: string;
    cells: Record<string, RawRegCellB>;
    extra?: Record<string, RawRegCellB>;
  }[];
  conclusion: string;
  originalFindings: string[];
}
type SubstanceReg = RawSubstanceRegB;

const TFDA_FOOD_MATERIAL = 'https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160';
const FDA_US_SUPPLEMENT_QA =
  'https://www.fda.gov/food/information-consumers-using-dietary-supplements/questions-and-answers-dietary-supplements';
const ASHWAGANDHA_INDIA_ADVISORY =
  'https://www.fssai.gov.in/upload/advisories/2026/04/69e0d84fcac2fAdvisory%20on%20non%20use%20of%20ashwagandha%20leaves%20in%20crude%20or%20extract%20or%20any%20other%20form%20in%20food%20products-%20reg.pdf';
const ICELAND_MAST_OPINION =
  'https://www.mast.is/static/files/upplysingar/Faedurbotaefni/alit-mast-may-2021-ashwagandha.pdf';
const CANADA_5HTP_MONOGRAPH = 'https://webprod.hc-sc.gc.ca/nhpid-bdipsn/atReq?atid=5htp';
const ITALY_BOTANICAL_DECREE = 'https://www.gazzettaufficiale.it/eli/id/2018/09/26/18A06095/sg';
const CDC_MMWR_EMS = 'https://www.cdc.gov/mmwr/preview/mmwrhtml/00001738.htm';
const TFDA_DRUG_LICENSE_DATASET = 'https://data.gov.tw/dataset/9122';

export const REGULATIONS_B: SubstanceReg[] = [
  {
    slug: 'ashwagandha',
    name: '南非醉茄',
    latinName: 'Withania somnifera',
    articleSlug: 'ashwagandha-regulation-denmark-eu-us-taiwan',
    // 文章載明：本文各項法規狀態的查證日期是 2026 年 9 月 5 日
    asOf: '2026-09-05',
    columns: { tw: '台灣', us: '美國', eu: '丹麥／荷蘭' },
    extraColumns: { india: '印度' },
    dimensions: [
      {
        label: '法規定位',
        cells: {
          tw: {
            text: '「可供食品使用之原料」，列於食藥署食品原料整合查詢平臺。',
            source: TFDA_FOOD_MATERIAL,
            asOf: '2026-07-29',
          },
          us: {
            text: '膳食補充劑成分，1994 年 DSHEA 之下無上市前核准。',
            source: FDA_US_SUPPLEMENT_QA,
            asOf: '1994',
          },
          eu: {
            text: '丹麥禁止作為食品販售；荷蘭草案把它列入禁用附件，程序進行中。',
            source:
              'https://foedevarestyrelsen.dk/kost-og-foedevarer/alt-om-mad/kemi-i-maden/mad-med-uoensket-kemi/ashwagandha',
            asOf: '2020-05-15',
          },
        },
        extra: {
          india: {
            text: 'Ayush 體系的傳統藥材，只有根部可用於 Ayush 藥品與產品。',
            source: ASHWAGANDHA_INDIA_ADVISORY,
            asOf: '2026-04-15',
          },
        },
      },
      {
        label: '能不能作為一般食品原料販售',
        cells: {
          tw: {
            text: '可以，但限水粗萃取物之乾品每日攝食 250 毫克以下。',
            source: TFDA_FOOD_MATERIAL,
            asOf: '2026-07-29',
          },
          us: {
            text: '可以，產品安全性與標示由業者自行負責。',
            source: FDA_US_SUPPLEMENT_QA,
          },
          eu: {
            text: '丹麥不可以；荷蘭現行可以，草案通過後不可以。',
            source:
              'https://www.internetconsultatie.nl/voedingssupplementen_en_kruidenpreparaten/document/13650',
            asOf: '2026-01',
          },
        },
        extra: {
          india: {
            text: '食品端由 FSSAI 管理；Ayush 端只准用根，葉部一律禁止。',
            source: ASHWAGANDHA_INDIA_ADVISORY,
            asOf: '2026-04-15',
          },
        },
      },
      {
        label: '市面上常見的產品形式',
        cells: {
          tw: { text: '膠囊、錠劑、粉包，多為標準化根部萃取的單方或複方。' },
          us: { text: '膠囊、錠劑、軟糖、機能飲品。' },
          eu: { text: '丹麥合法市面上沒有這個品項；荷蘭為膠囊、錠劑與草本茶。' },
        },
        extra: {
          india: { text: '傳統粉劑、藥膳配方與現代萃取物。' },
        },
      },
      {
        label: '官方允許的健康聲稱',
        cells: {
          tw: { text: '無。未取得健康食品查驗登記者，不得標示保健功效。' },
          us: {
            text: '得作結構／機能聲稱並附法定免責語，不得宣稱治療疾病。',
            source: FDA_US_SUPPLEMENT_QA,
          },
          eu: {
            text: '歐盟未核准相關聲稱；EMA/HMPC 認定無法建立歐盟草藥專論。',
            source:
              'https://www.ema.europa.eu/en/documents/public-statement/final-public-statement-withania-somnifera-l-dunal-radix-first-version_en.pdf',
            asOf: '2013-07-09',
          },
        },
        extra: {
          india: { text: '依 Ayurvedic 典籍的傳統用途，與現代療效聲稱屬不同體系。' },
        },
      },
      {
        label: '人體研究常用劑量 vs 市售劑量',
        cells: {
          tw: {
            text: '研究常用每日 300 至 600 毫克標準化根部萃取物；法規上限 250 毫克。',
            source: TFDA_FOOD_MATERIAL,
          },
          us: { text: '同為每日 300 至 600 毫克區間；FDA 未訂每日上限。' },
          eu: {
            text: 'RIVM 盤點的臨床試驗為每日 240 至 675 毫克萃取物或 5 公克粉末。',
            source: 'https://www.rivm.nl/bibliotheek/rapporten/2024-0029.pdf',
            asOf: '2024',
          },
        },
        extra: {
          india: {
            text: 'WHO 專論記載乾燥根粉每日 3 至 6 公克，另有每次 250 毫克、每日兩次。',
          },
        },
      },
      {
        label: '安全性警語與限量',
        cells: {
          tw: {
            text: '每日 250 毫克以下，並強制標示「嬰幼兒、孕婦、老年人及腸胃功能不佳者不宜食用」。',
            source: TFDA_FOOD_MATERIAL,
            asOf: '2026-07-29',
          },
          us: {
            text: '未訂限量；LiverTox 給肝損傷可能性 B 級，NCCIH 建議孕期哺乳期避免。',
            source: 'https://www.ncbi.nlm.nih.gov/books/NBK548536/',
            asOf: '2024-12-03',
          },
          eu: {
            text: '丹麥因禁售而無限量；冰島另把界線畫在每日 450 毫克萃取物。',
            source: ICELAND_MAST_OPINION,
            asOf: '2021-05',
          },
        },
        extra: {
          india: {
            text: '葉部一律禁用；標籤須依 1945 年藥品規則第 161 條標明所用部位。',
            source: ASHWAGANDHA_INDIA_ADVISORY,
            asOf: '2026-04-15',
          },
        },
      },
      {
        label: '主管機關與查證來源',
        cells: {
          tw: {
            text: '衛福部食藥署：食品原料整合查詢平臺、政府資料開放平臺資料集。',
            source: 'https://data.gov.tw/dataset/8452',
            asOf: '2026-07-29',
          },
          us: {
            text: 'FDA 膳食補充劑專區；NIH 的 LiverTox 與 NCCIH。',
            source: 'https://www.nccih.nih.gov/health/ashwagandha',
          },
          eu: {
            text: '丹麥 Fødevarestyrelsen 與 DTU；荷蘭 RIVM 與 VWS；冰島 Matvælastofnun。',
            source: 'https://www.rivm.nl/bibliotheek/rapporten/2024-0029.pdf',
          },
        },
        extra: {
          india: {
            text: '印度 Ayush 部與印度食品安全標準局（FSSAI）。',
            source: ASHWAGANDHA_INDIA_ADVISORY,
          },
        },
      },
    ],
    conclusion:
      '沒有任何一地是因為驗出危害而禁售，差別在於制度遇到「毒理資料不足以訂出安全上限」時的預設動作——丹麥與荷蘭選擇不准，台灣與冰島選擇設一個保守的數字加警語，美國選擇讓業者自負舉證責任，印度則選擇縮小可用的植物部位。',
    originalFindings: [
      '台灣的每日 250 毫克上限比冰島畫的 450 毫克更低，且至少可回溯到 2014-11-06 警語原料清單表第 198 項，比丹麥動作早了近十年。',
      '丹麥禁售的理由是「依現有資料無法訂出一個低於它就沒有風險的攝取量」，不是驗出毒性；該評估的文獻檢索止於 2019-08-26。',
      '衛福部 2023-07-27 預告的 8 項食品原料使用限制草案含南非醉茄萃取物，但 2024-01-04 正式公告的四項並不含它，所以目前約束它的仍是查詢平臺的載列內容，尚未升格為食安法第 15 條之 1 的規定。',
      '印度 2026-04-15 已禁用葉部，台灣平臺的部位欄仍寫「葉、根」，是這張對照表最可能先被修訂的一格。',
      '食品原料整合查詢平臺第一行紅字自述「非正面表列」，所以「沒列到就不能用」的常見說法不成立。',
    ],
  },
  {
    slug: '5-htp',
    name: '5-HTP',
    latinName: 'Oxitriptan（5-羥基色氨酸）',
    articleSlug: '5-htp-regulation-taiwan-us-eu',
    // 文章載明：本文各項法規狀態的查證日期為 2026 年 9 月 5 日
    asOf: '2026-09-05',
    columns: { tw: '台灣', us: '美國', eu: '歐盟' },
    extraColumns: { canada: '加拿大' },
    dimensions: [
      {
        label: '法規定位',
        cells: {
          tw: {
            text: '藥品。製劑「衛署藥製字第038948號」為須由醫師處方使用。',
            source: TFDA_DRUG_LICENSE_DATASET,
            asOf: '1995-06-08',
          },
          us: {
            text: '膳食補充劑成分，1994 年 DSHEA 之下無上市前核准。',
            source: FDA_US_SUPPLEMENT_QA,
            asOf: '1994',
          },
          eu: {
            text: '未統一。維生素與礦物質以外的「其他物質」由各會員國自訂。',
            source: ICELAND_MAST_OPINION,
          },
        },
        extra: {
          canada: {
            text: '天然健康產品（NHP），依專論申請 NPN 後才能上市。',
            source: CANADA_5HTP_MONOGRAPH,
            asOf: '2024-08-28',
          },
        },
      },
      {
        label: '能不能作為一般食品原料販售',
        cells: {
          tw: {
            text: '不可以。加納籽種子列於「未確認安全性尚不得使用之原料」。',
            source: TFDA_FOOD_MATERIAL,
          },
          us: {
            text: '可以，產品安全性與標示由業者自行負責。',
            source: FDA_US_SUPPLEMENT_QA,
          },
          eu: {
            text: '植物端：義大利部長令附件一收載加納籽；純化成分端視各國而定。',
            source: ITALY_BOTANICAL_DECREE,
            asOf: '2018-09-26',
          },
        },
        extra: {
          canada: {
            text: '不走一般食品途徑，走天然健康產品（NHP）途徑。',
            source: CANADA_5HTP_MONOGRAPH,
          },
        },
      },
      {
        label: '市面上常見的產品形式',
        cells: {
          tw: { text: '只有醫療端的處方膠囊；市面上看到的多為跨境電商或代購。' },
          us: { text: '膠囊、錠劑，常與維生素 B6 做成複方。' },
          eu: { text: '加納籽萃取物膠囊與錠劑，含量標示以 5-HTP 計。' },
        },
        extra: {
          canada: { text: '依專論核准的膠囊、錠劑，標籤須列出 NPN。' },
        },
      },
      {
        label: '官方允許的健康聲稱',
        cells: {
          tw: {
            text: '無。核准適應症只有「治療 BH4 缺乏型苯酮尿症患者」一項。',
            source: TFDA_DRUG_LICENSE_DATASET,
          },
          us: {
            text: '得作結構／機能聲稱並附法定免責語，不得宣稱治療疾病。',
            source: FDA_US_SUPPLEMENT_QA,
          },
          eu: {
            text: '飽足感聲稱（ID 4223）經 EFSA 認定因果關係未成立。',
            source: 'https://doi.org/10.2903/j.efsa.2011.2198',
            asOf: '2011',
          },
        },
        extra: {
          canada: {
            text: '專論明列情緒平衡、睡眠困擾、纖維肌痛、偏頭痛預防與體重管理。',
            source: CANADA_5HTP_MONOGRAPH,
            asOf: '2024-08-28',
          },
        },
      },
      {
        label: '人體研究常用劑量 vs 市售劑量',
        cells: {
          tw: { text: '不適用。屬處方端，用量依核准適應症由醫師決定。' },
          us: { text: '市售常見每份 50 至 200 毫克；FDA 未訂每日上限。' },
          eu: {
            text: '查無明文。附件一收載的是可用植物，查證之公報全文未見以毫克計的每日上限。',
            source: ITALY_BOTANICAL_DECREE,
            asOf: '2018-09-26',
          },
        },
        extra: {
          canada: {
            text: '依用途每日 100 至 900 毫克，單次不得超過 300 毫克。',
            source: CANADA_5HTP_MONOGRAPH,
            asOf: '2024-08-28',
          },
        },
      },
      {
        label: '安全性警語與限量',
        cells: {
          tw: {
            text: '屬處方藥，用量由醫師決定；輸入依藥物樣品贈品管理辦法與自用藥物限量表。',
            source: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030005',
          },
          us: {
            text: '未訂限量；歷史上與受污染 L-色胺酸的嗜伊紅性肌痛症候群及 Peak X 相關。',
            source: CDC_MMWR_EMS,
            asOf: '1990-08-24',
          },
          eu: {
            text: '查無明文。「其他物質」沒有統一立法，因此沒有全歐通用的警語規定。',
            source: ICELAND_MAST_OPINION,
          },
        },
        extra: {
          canada: {
            text: '禁忌：硬皮症患者、服用抗憂鬱藥者；用 carbidopa 或血清素製劑者須先諮詢。',
            source: CANADA_5HTP_MONOGRAPH,
            asOf: '2024-08-28',
          },
        },
      },
      {
        label: '主管機關與查證來源',
        cells: {
          tw: {
            text: '衛福部食藥署：全部藥品許可證資料集、食品原料整合查詢平臺。',
            source: TFDA_DRUG_LICENSE_DATASET,
          },
          us: {
            text: 'FDA 膳食補充劑專區；CDC MMWR 的歷史監測資料。',
            source: CDC_MMWR_EMS,
          },
          eu: {
            text: 'EFSA 健康聲稱意見；各會員國主管機關，例如義大利衛生部。',
            source: 'https://doi.org/10.2903/j.efsa.2011.2198',
          },
        },
        extra: {
          canada: {
            text: '加拿大衛生部的 NHPID 專論與 NPN 授權產品資料庫。',
            source: CANADA_5HTP_MONOGRAPH,
          },
        },
      },
    ],
    conclusion:
      '四地對 5-HTP 的效果證據看法其實相當接近——都認為人體資料規模小、品質參差；差別在於這個分子在各地是先撞上藥品法規還是先撞上食品法規，以及那次相遇發生在 1994 年之前還是之後。',
    originalFindings: [
      '台灣不是「還沒開放」：1995-06-08 就核發過 5-HTP 製劑藥證（衛署藥製字第038948號，有效至 2030-06-08），另有 2018-05-09 發證的原料藥（衛部藥輸字第027428號，製造廠為瑞士 LINNEA SA）。',
      '那張藥證的適應症只有「治療 BH4 缺乏型苯酮尿症患者」，跟睡眠、情緒無關；醫師若為助眠開立即屬仿單標示外使用。',
      '食品端另被第二道門擋住：加納籽（Griffonia simplicifolia，種子）列在「未確認安全性尚不得使用之原料」，純化成分與植物原料兩條路都不通。',
      '美國自由販售的法律基礎（1994 年 DSHEA）成立於 1989 年嗜伊紅性肌痛症候群大流行之後五年、1998 年 Peak X 報告之前四年——它跨過的是立法門檻，不是毒理審查門檻。',
      'Peak X 在 2003 年被鑑定為 4,5-tryptophan-dione，1998 年梅約診所在六家不同廠商的市售 5-HTP 中都測得到；之後沒有再爆發流行，但這件事並未結案。',
      'Cochrane 2002 年的系統性回顧檢索到 108 篇試驗，只有 2 篇、共 64 人符合品質門檻。',
    ],
  },
];

export interface CarryLimit {
  /** 品類，例如「非處方西藥」「中藥材」「錠狀膠囊狀食品」 */
  category: string;
  /** 隨身攜帶上限，照抄文章 */
  carry: string;
  /** 郵寄／網購寄回的上限；規定不同就寫清楚，相同就寫「同上」 */
  mail: string;
  /** 法源或公告名稱 */
  basis: string;
  source?: string;
  asOf?: string;
  /** 常見誤解，一句話。沒有就省略 */
  caveat?: string;
}

/**
 * 台灣的入境限量依「品類」而不是依國家訂。以下五篇文章講的是同一套規則：
 *   import-melatonin-taiwan-customs（處方藥那一格、郵寄每年兩次）
 *   japan-drugstore-medicine-bring-back-taiwan（非處方藥 12／36、管制藥品、依濃度分級）
 *   korea-drugstore-medicine-bring-back-taiwan（中藥材／中藥製劑、保育類成分）
 *   korea-red-ginseng-bring-back-taiwan（錠狀膠囊狀食品、一般食品、活植物生鮮產品）
 *   thailand-sleep-gummies-bring-back-taiwan（褪黑激素走處方藥、CBD 的 THC 上限）
 */
export const CARRY_LIMITS: CarryLimit[] = [
  {
    category: '非處方西藥',
    carry: '每種至多 12 瓶（盒、罐、條、支），合計不超過 36 瓶（盒、罐、條、支）。',
    mail:
      '規定不同：自用進口每次不得超過 12 瓶或軟管類 12 支或總量 1,200 顆，且 6 個月內不得重複申請；寄送藥品進入國內每年以兩次為限，並應事先申請同意。',
    basis:
      '入境旅客攜帶自用藥物限量表（衛福部會同財政部公告、海關執行查驗）；郵寄依藥物樣品贈品管理辦法第 6 條。',
    source: 'https://web.customs.gov.tw/taipei/singlehtml/3392?cntId=cus2_3392_3392_1347',
    asOf: '2026-09-05',
    caveat: '只要成分落進管制藥品或處方藥那一格，額度就從「盒數」改用「用量」算，尺完全換掉。',
  },
  {
    category: '處方西藥',
    carry:
      '未攜帶醫師處方箋或證明文件者以 2 個月用量為限；備有處方箋或證明文件者不得超過其開立之合理用量，且以 6 個月用量為限。',
    mail:
      '規定不同：依藥物樣品贈品管理辦法，數量不得超過處方箋所載合理用量，並須檢附包裹招領單、產品外盒說明書與切結書，處方藥另附國內醫療院所的診斷證明與處方。',
    basis:
      '入境旅客攜帶自用藥物限量表；藥物樣品贈品管理辦法第 2 條第 4 款、第 6 條、第 14 條。超量須檢附食藥署核發之個人自用藥品專案進口許可證。',
    source: 'https://www.fda.gov.tw/tc/newsContent.aspx?cid=4&id=t622952',
    asOf: '2026-08-08',
    caveat:
      '褪黑激素與 5-HTP 在台灣都是藥品，走的是這一格，不是非處方藥「12 瓶／36 瓶」那條——這是最常被搞錯的地方。',
  },
  {
    category: '管制藥品',
    carry: '須備醫師處方箋或證明文件，不得超過合理用量，並以 6 個月用量為限。',
    mail: '規定不同：管制藥品不得郵寄或快遞，這條路本身走不通。',
    basis:
      '衛福部「攜帶管制藥品入出境，要注意」；管制藥品管理條例第 3 條依成癮性、依賴性、濫用性及社會危害性分四級管理。',
    source: 'https://www.mohw.gov.tw/cp-6568-73282-1.html',
    asOf: '2026-09-05',
    caveat:
      '同一成分會因濃度落在不同級別（二氫可待因依含量分列第二、三、四級），看到成分名還不夠，要看含量。',
  },
  {
    category: '中藥材',
    carry: '每種至多 1 公斤，合計不得超過 12 種。',
    mail:
      '查無明文：文章引用的關務署臺北關、高雄關入境規定與中醫藥司公告都只寫入境攜帶額度，未載郵寄寄回的上限。',
    basis:
      '入境旅客攜帶自用藥物、化粧品及醫療器材限量（關務署高雄關、臺北關）。逾量須檢附醫療證明文件、不超過 3 個月用量，並檢附中醫藥司簽發之輸入許可證向海關申報。',
    source:
      'https://web.customs.gov.tw/kaohsiung/singlehtml/ed23ba99ec2c4d8f9634ceda2064de1c?cntId=daa0b5e6ece046928f9af6b96806122f',
    asOf: '2026-09-10',
    caveat: '乾燥蔘片、整支乾蔘走這一格；未乾燥的生鮮水參不走這裡，屬活植物生鮮產品、禁止攜入。',
  },
  {
    category: '中藥製劑',
    carry: '每種至多 12 瓶（盒），合計不超過 36 瓶（盒）。',
    mail:
      '查無明文：文章引用的關務署臺北關入境規定與中醫藥司公告只寫入境攜帶額度，未載郵寄寄回的上限。',
    basis:
      '入境旅客攜帶自用藥物及醫療器材規定（關務署臺北關）；衛福部中醫藥司攜帶藥品入境限量宣導。',
    source: 'https://web.customs.gov.tw/taipei/singlehtml/3392?cntId=cus2_3392_3392_1347',
    asOf: '2026-09-12',
    caveat:
      '含犀角、虎骨、豹骨、玳瑁、熊膽、麝香、水獺肝、穿山甲成分者，須先取得主管機關核可——韓國牛黃清心元的사향就踩在這條線上。',
  },
  {
    category: '錠狀、膠囊狀食品',
    carry: '每種至多 12 瓶（盒、罐、包、袋，以原包裝為限），合計 36。',
    mail: '查無明文：文章引用的關務署高雄關限量表只載入境旅客攜帶額度，未載郵寄寄回的上限。',
    basis: '入境旅客攜帶自用藥物、化粧品及醫療器材限量（財政部關務署高雄關）。',
    source:
      'https://web.customs.gov.tw/kaohsiung/singlehtml/ed23ba99ec2c4d8f9634ceda2064de1c?cntId=daa0b5e6ece046928f9af6b96806122f',
    asOf: '2026-09-10',
    caveat:
      '做成膠囊或錠劑的紅蔘健康機能食品走這一格；同品牌的濃縮液走一般食品那一格，混買會讓兩條額度同時開始計算。',
  },
  {
    category: '一般食品',
    carry: '自用食品價值 1,000 美元以下且重量 6 公斤以內，免申請輸入查驗。',
    mail:
      '查無明文：文章引用的衛福部免申請查驗規定與臺北關入境規定都只寫旅客攜帶，未載郵寄寄回的上限。',
    basis:
      '衛生福利部「旅客攜帶食品入境免申請查驗規定」；關務署臺北關「入境旅客攜帶農畜水產品及食品規定」。',
    source: 'https://www.mohw.gov.tw/fp-16-39820-1.html',
    asOf: '2026-09-10',
    caveat: '農畜水產品類另有一個並行的總量天花板：不得超過 6 公斤，跟食品那條額度各算各的。',
  },
  {
    category: '活植物及其生鮮產品',
    carry: '禁止攜帶入境。',
    mail: '查無明文：文章引用的臺北關入境規定只寫禁止旅客攜帶，未載郵寄寄回的處理方式。',
    basis: '關務署臺北關「入境旅客攜帶農畜水產品及食品規定」；擋下它的是植物檢疫，不是藥事法。',
    source: 'https://web.customs.gov.tw/taipei/singlehtml/3392?cntId=cus2_3392_3392_1351',
    asOf: '2026-09-10',
    caveat:
      '判準是有沒有經過蒸製或乾燥：紅蔘、白蔘、太極蔘依定義都是加工品，水參與蜜漬鮮蔘未經乾燥，過不了檢疫。',
  },
  {
    category: '含大麻二酚（CBD）產品',
    carry:
      '以藥品列管，數量按處方藥那一格算；另有成分門檻：THC 須低於 10ppm（泰國是 0.2%，相差約 200 倍）。',
    mail: '同上（處方藥那一格）。',
    basis:
      '台灣以藥品列管含 CBD 產品並訂 THC 限量 10ppm；入境數量依入境旅客攜帶自用藥物限量表。',
    // 原本引的是媒體報導（遠見健康）。THC 10ppm 是法規門檻、屬法律主張，
    // 媒體轉述不夠格當依據，改引衛福部正式回應（CBD 以一般藥品列管），實測回 200。
    source: 'https://www.mohw.gov.tw/cp-4632-53091-1.html',
    sourceLabel: '衛生福利部．CBD 以一般藥品列管之正式回應',
    asOf: '2026-09-05',
    caveat:
      '這一格的下檔風險不是東西被留下：已有民眾因產品檢出 THC 超過 10ppm 而遭以運輸二級毒品起訴。',
  },
];
