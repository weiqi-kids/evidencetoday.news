/**
 * regulations-a.ts — 跨國法規對照結構化資料（批次 A）
 *
 * 資料來源：本站三篇已完成醫療審閱與引用查證的法規對照文章，
 * 逐格抽取其「七維度 × 台美日歐」對照表，不另行加入文章未載明的內容。
 *   1. /articles/melatonin-why-otc-abroad-prescription-taiwan/
 *   2. /articles/nmn-regulation-taiwan-japan-us-eu/
 *   3. /articles/red-yeast-rice-regulation-eu-japan-taiwan/
 *
 * 維護原則：法規會變，每一格盡量帶 asOf（依據文件的發布或查證日期）。
 * 要更新時請回到來源文章與其 references，不要只改這裡的字串。
 */

export interface RegCell {
  /** 該格的內容，繁體中文，照抄文章語意；查不到就寫「查無明文」並在 note 說明查過哪裡 */
  text: string;
  /** 官方出處網址，只放文章 references 裡實際有的；沒有就省略 */
  source?: string;
  /** 出處名稱，例如「食藥署 食品原料整合查詢平臺」 */
  sourceLabel?: string;
  /** 依據文件的發布或查證日期，例如「2026-07-29」；文章沒寫就省略 */
  asOf?: string;
  note?: string;
}

export interface RegRow {
  dimension: string;
  tw: RegCell;
  us: RegCell;
  jp: RegCell;
  eu: RegCell;
}

export interface SubstanceReg {
  /** 對應文章的 slug */
  articleSlug: string;
  /** 對應成分頁 slug（沒有就省略） */
  ingredientSlug?: string;
  /** 中文名 */
  name: string;
  /** 英文名 */
  nameEn: string;
  /** 文章表格下方那句「一句話結論」，照抄 */
  verdict: string;
  /** 這篇最值得被引用的原創發現，1-3 條 */
  originalFindings: string[];
  rows: RegRow[];
}

export const REGULATIONS_A: SubstanceReg[] = [
  {
    articleSlug: 'melatonin-why-otc-abroad-prescription-taiwan',
    ingredientSlug: 'melatonin',
    name: '褪黑激素',
    nameEn: 'Melatonin',
    verdict:
      '四邊對褪黑激素的科學看法其實相當接近（有限、溫和、長期資料不足），真正拉開差距的是它被放進哪一套上市程序；美國賣得最鬆，卻是唯一沒有官方核准過任何一句褪黑激素功效聲稱的地方。',
    originalFindings: [
      '同一個 FDA 對同一個分子給出兩種相反答案：一邊讓褪黑激素以膳食補充劑自由上架，一邊把它（CAS 73-31-4）列在「上市後判定不具 GRAS 地位」清單，2020-12-22 的警告信明講沒有任何食品添加物法規授權它用於一般食品。',
      '台灣 1996-10-15 的公告留了一個幾乎沒人提過的例外：牛、羊、豬的松果腺／松果體乾燥粉末只要 melatonin 含量在 20 ppm 以下即得作食品原料——換算要吞 50 公克粉末才等於美國貨架上一顆 1 mg 錠劑。',
      '審得最嚴的歐盟反而是四者中唯一正式核准褪黑激素健康聲稱的法域：432/2012 附錄核准每份 0.5 mg 談緩解時差、每份 1 mg 談縮短入睡，同時 2 mg 緩釋錠 Circadin 自 2007-06-29 起是中央授權處方藥。',
    ],
    rows: [
      {
        dimension: '法規定位',
        tw: {
          text: '藥品。衛生署 1996-10-15 公告，凡標示含 melatonin 者一律以藥品管理。',
          source: 'https://www.mohw.gov.tw/cp-3159-23959-1.html',
          sourceLabel: '衛生福利部．含 melatonin 成分產品之管理原則',
          asOf: '1996-10-15',
        },
        us: {
          text: '膳食補充劑（1994 年 DSHEA 建立的類別）；同時被列為一般食品不得添加的非 GRAS 物質。',
          source: 'https://www.fda.gov/food/dietary-supplements',
          sourceLabel: 'FDA. Dietary Supplements（DSHEA 1994）',
          note: '非 GRAS 判定見 FDA「上市後判定不具 GRAS 地位」清單，附 2011-07-25 與 2013-12-12 兩份科學備忘錄。',
        },
        jp: {
          text: '專供醫藥品使用之成分本質，收於薬生監麻発 0331 第 9 号別添 1，他名欄寫「松果体ホルモン」。',
          source: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc4935&dataType=1',
          sourceLabel: '厚生労働省．食薬区分における成分本質（原材料）の取扱いの例示 別添 1',
          asOf: '2020-03-31',
        },
        eu: {
          text: '雙重身分：可作食品補充品原料，同時有中央授權的處方藥 Circadin（2 mg 緩釋錠）。',
          source: 'https://www.ema.europa.eu/en/medicines/human/EPAR/circadin',
          sourceLabel: 'EMA. Circadin (melatonin) 2 mg prolonged-release tablets, EPAR',
          asOf: '2007-06-29',
        },
      },
      {
        dimension: '能不能作為一般食品原料販售',
        tw: {
          text: '不能。唯一例外是牛羊豬松果腺／松果體乾燥粉末，melatonin 含量 20 ppm 以下者得作食品原料。',
          source: 'https://www.mohw.gov.tw/cp-3159-23959-1.html',
          sourceLabel: '衛生福利部．含 melatonin 成分產品之管理原則',
          asOf: '1996-10-15',
          note: '20 ppm 等於每公斤 20 毫克；要吃到相當於一顆 1 mg 錠劑得吞 50 公克粉末，實務上撐不起食品通路。',
        },
        us: {
          text: '作為膳食補充劑可自由上市；加進一般食品則屬未經核准的食品添加物（非 GRAS 判定）。',
          source: 'https://hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=Postmarket&id=melatonin',
          sourceLabel: 'FDA. Post-market Determinations that the Use of a Substance is not GRAS — Melatonin, CAS 73-31-4',
          asOf: '2013-12-12',
          note: '科學備忘錄 2011-07-25、2013-12-12；警告信 2011-07-28、2020-12-22。',
        },
        jp: {
          text: '不能。收在專供醫藥品成分清單上，食品端沒有入口。',
          source: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc4935&dataType=1',
          sourceLabel: '厚生労働省．食薬区分通知 別添 1',
          asOf: '2020-03-31',
        },
        eu: {
          text: '可以，多數會員國以食品補充品販售；2002/46/EC 只統一維生素與礦物質，其餘由各國認定。',
          source: 'https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-supplements_en',
          sourceLabel: 'European Commission. Food supplements（Directive 2002/46/EC）',
        },
      },
      {
        dimension: '市面上常見的產品形式',
        tw: {
          text: '僅醫師處方的 2 mg 長效緩釋錠（衛部藥輸字第027800號），市面無合法食品型態產品。',
          source:
            'https://mcp.fda.gov.tw/im_detail_1/%E8%A1%9B%E9%83%A8%E8%97%A5%E8%BC%B8%E5%AD%97%E7%AC%AC027800%E8%99%9F',
          sourceLabel: '食藥署 西藥許可證查詢：亞眠靚長效錠（Melatonin 2mg 緩釋錠）',
        },
        us: {
          text: '錠劑、膠囊、軟糖、舌下含片與複方，單份 0.5 至 10 mg。',
          note: 'JAMA 2023 抽驗 25 款軟糖，22 款實測含量與標示不符，落在標示量的 74% 到 347%。',
        },
        jp: {
          text: '兒童處方藥 Melatobel（0.2% 顆粒、1 mg／2 mg 錠）；食品端只有其他成分的機能性表示食品。',
          source: 'https://www.kegg.jp/medicus-bin/japic_med?japic_code=00071652',
          sourceLabel: '医療用医薬品：メラトベル 添付文書',
          note: '日本助眠訴求的食品走的是 L-茶胺酸、GABA 等成分，褪黑激素進不去。',
        },
        eu: {
          text: '食品補充品多為 1 mg 以下即釋劑型；藥品端為 2 mg 緩釋錠 Circadin。',
          source: 'https://www.ema.europa.eu/en/medicines/human/EPAR/circadin',
          sourceLabel: 'EMA. Circadin EPAR',
          asOf: '2007-06-29',
        },
      },
      {
        dimension: '官方允許的健康聲稱',
        tw: {
          text: '無。非藥物不得為醫療效能之標示或宣稱（藥事法第 69 條）。',
          note: '藥事法條文未列於該篇 references，故不附網址。',
        },
        us: {
          text: '僅結構／功能聲稱：不經事前核准、上市後 30 日內通報，標籤須加註未經 FDA 評估。',
          source: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/structurefunction-claims',
          sourceLabel: 'FDA. Structure/Function Claims',
          note: '標籤另須聲明本產品無意診斷、治療、治癒或預防任何疾病。',
        },
        jp: {
          text: '褪黑激素進不了機能性表示食品制度；該制度本身是事前申報，消費者庁明講國家不審查。',
          source: 'https://www.caa.go.jp/policies/policy/food_labeling/foods_with_function_claims/',
          sourceLabel: '消費者庁．機能性表示食品について',
        },
        eu: {
          text: '兩項核准聲稱：每份 0.5 mg 以上可談緩解時差主觀感受、每份 1 mg 可談縮短入睡所需時間。',
          source: 'https://www.legislation.gov.uk/eur/2012/432/annex',
          sourceLabel: 'Commission Regulation (EU) No 432/2012, Annex',
          asOf: '2012',
          note: '依據為 EFSA Journal 2010;8(2):1467 與 2011;9(6):2241，並須告知消費者於接近就寢時攝取。',
        },
      },
      {
        dimension: '人體研究常用劑量 vs 市售劑量',
        tw: {
          text: '合法品僅 2 mg 處方緩釋錠，市面無合法品可對照。',
          source:
            'https://mcp.fda.gov.tw/im_detail_1/%E8%A1%9B%E9%83%A8%E8%97%A5%E8%BC%B8%E5%AD%97%E7%AC%AC027800%E8%99%9F',
          sourceLabel: '食藥署 西藥許可證查詢',
        },
        us: {
          text: '劑量反應統合分析顯示助眠效果約在每日 4 mg 到頂；貨架常見 5 mg、10 mg。',
          source: 'https://pubmed.ncbi.nlm.nih.gov/38888087/',
          sourceLabel: 'Cruz-Sanabria F, et al. (2024), J Pineal Res 76(5):e12985',
          asOf: '2024',
        },
        jp: {
          text: '兒童用藥每日 1 mg 起、上限 4 mg；成人失眠沒有核准的褪黑激素藥可用。',
          source: 'https://www.kegg.jp/medicus-bin/japic_med?japic_code=00071652',
          sourceLabel: '医療用医薬品：メラトベル 添付文書',
        },
        eu: {
          text: '食品聲稱門檻 0.5 至 1 mg；處方藥為 2 mg 緩釋錠。',
          source: 'https://www.legislation.gov.uk/eur/2012/432/annex',
          sourceLabel: 'Commission Regulation (EU) No 432/2012, Annex',
          asOf: '2012',
        },
      },
      {
        dimension: '安全性警語與限量',
        tw: {
          text: '公告理由明列具藥理活性、缺乏長期使用之安全性資料。',
          source: 'https://www.mohw.gov.tw/cp-3159-23959-1.html',
          sourceLabel: '衛生福利部．含 melatonin 成分產品之管理原則',
          asOf: '1996-10-15',
        },
        us: {
          text: '無法定每日上限；警告信列出血糖恆定與生殖發育、心血管、眼睛、神經系統之安全疑慮。',
          source:
            'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/nextl3vel-services-group-llc-dba-stuff-good-you-610446-12222020',
          sourceLabel: 'FDA Warning Letter: NextL3vel Services Group, LLC (610446)',
          asOf: '2020-12-22',
        },
        jp: {
          text: '6 歲以下與 16 歲以上有效性安全性未確立；與 fluvoxamine 併用列為禁忌。',
          source: 'https://www.kegg.jp/medicus-bin/japic_med?japic_code=00071652',
          sourceLabel: '医療用医薬品：メラトベル 添付文書',
        },
        eu: {
          text: '聲稱條件即為劑量門檻；處方藥核准對象為 55 歲以上原發性失眠短期治療。',
          source: 'https://www.ema.europa.eu/en/medicines/human/EPAR/circadin',
          sourceLabel: 'EMA. Circadin EPAR',
          asOf: '2007-06-29',
        },
      },
      {
        dimension: '主管機關與查證來源',
        tw: {
          text: '衛福部／食藥署：西藥許可證查詢、食藥闢謠專區。',
          source: 'https://www.fda.gov.tw/TC/newsContent.aspx?id=28747',
          sourceLabel: '食藥署 食藥闢謠專區：吃褪黑激素能幫助睡眠嗎？',
          asOf: '2023-05-02',
        },
        us: {
          text: 'FDA：Dietary Supplement Ingredient Directory、非 GRAS 判定清單、警告信資料庫。',
          source: 'https://www.fda.gov/food/dietary-supplements/dietary-supplement-ingredient-directory',
          sourceLabel: 'FDA. Dietary Supplement Ingredient Directory',
        },
        jp: {
          text: '厚生労働省食薬区分通知、消費者庁機能性表示食品申報資料庫、PMDA 藥品仿單。',
          source: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc4935&dataType=1',
          sourceLabel: '厚生労働省．食薬区分通知（薬生監麻発 0331 第 9 号）',
          asOf: '2020-03-31',
        },
        eu: {
          text: '執委會健康聲稱登錄簿、EFSA 科學意見、EMA 藥品頁。',
          source: 'https://ec.europa.eu/food/food-feed-portal/screen/health-claims/eu-register',
          sourceLabel: 'European Commission. EU Register of nutrition and health claims made on foods',
        },
      },
    ],
  },

  {
    articleSlug: 'nmn-regulation-taiwan-japan-us-eu',
    ingredientSlug: 'nmn',
    name: '菸醯胺單核苷酸',
    nameEn: 'Nicotinamide Mononucleotide (NMN)',
    verdict:
      '四地對 NMN 的安全性資料看法其實相當接近，都認為短期耐受性可以接受、長期資料不足；差別在於各自的制度預設是「先證明才准賣」還是「沒被列管就能賣」，以及這個成分在各地是先遇到食品法規還是先遇到藥品法規。',
    originalFindings: [
      'FDA 於 2025-09-29 在卷宗 FDA-2023-P-0872 的回函中推翻自己 2022 年的藥品優先（drug preclusion）排除認定：放棄「先前上市必須合法」這個自加條件，改為只看事實上有沒有先於藥品研究核准前上市，並認定 NMN 早在 2017 年就已在美國以補充劑上市；2025-12-09 起陸續發出恢復通報效力的回函。三年之間分子沒變、毒理與臨床資料都沒變，變的只是一個時間先後條款的讀法。',
      '台灣管的是「純化物」這個型態、不是 NMN 這個分子：食藥署平臺該筆資料的「部位」欄寫的就是「純化物」；而且平臺首行紅字自述「非正面表列」，真正的禁止依據是食安法第 15 條，不是「沒列到就不能用」。',
      '「未確認安全性尚不得使用之原料」這個分類是 2022-06-21（民國 111 年）平臺由「可供食品使用原料彙整一覽表」改版時才新增的——在那之前台灣連一個放這類成分的抽屜都沒有；同一筆資料的備註另寫明若以補充菸鹼素及核苷酸為目的應以食品添加物管理，方向與 EFSA 以「菸鹼素來源」評估 NMN 一致。',
    ],
    rows: [
      {
        dimension: '法規定位',
        tw: {
          text: '食品原料，列於「未確認安全性尚不得使用之原料」，部位欄為「純化物」。',
          source: 'https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160',
          sourceLabel: '食藥署 食品原料整合查詢平臺',
          asOf: '2026-07-29',
          note: '該分類為平臺 2022-06-21 改版時新增；asOf 取政府資料開放平臺同一資料集的最後更新日。',
        },
        us: {
          text: '膳食補充劑成分。FDA 2025-09-29 回函推翻 2022 年依藥品優先條款所作的排除認定。',
          source: 'https://www.regulations.gov/document/FDA-2023-P-0872-2754',
          sourceLabel: 'FDA HFP Response Letter to NPA and ANH USA（卷宗 FDA-2023-P-0872）',
          asOf: '2025-09-29',
          note: '文件類型標註為 Partial Petition Approval and Denial。2022 年的代表性反對文件為 NDI 1259 補充回函（2022-11-08）。',
        },
        jp: {
          text: '非醫藥品。薬生監麻発 0331 第 9 号的非医薬品リスト收錄「β-ニコチンアミドモノヌクレオチド／NMN」。',
          source: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc4935&dataType=1&pageNo=1',
          sourceLabel: '厚生労働省．食薬区分における成分本質（原材料）の取扱いの例示',
          asOf: '2020-03-31',
        },
        eu: {
          text: '新穎食品（Regulation (EU) 2015/2283），授權程序進行中，尚未列入聯盟清單。',
          source:
            'https://food.ec.europa.eu/food-safety/novel-food/authorisations/summary-applications-and-notifications_en',
          sourceLabel: 'European Commission. Summary of applications and notifications, Novel Food',
        },
      },
      {
        dimension: '能不能作為一般食品原料販售',
        tw: {
          text: '純化物不得使用；天然來源的萃取物須個案函詢。',
          source: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=L0040001&flno=15',
          sourceLabel: '食品安全衛生管理法第 15 條',
          note: '平臺自述非正面表列；純化 NMN 不能用是因為同時符合「從未於國內供作飲食」與「未經證明無害」兩個條件。',
        },
        us: {
          text: '可以，但每家業者原則上仍須自行送 NDI 通報，除非原料來自已送過件的同一供應商。',
          source: 'https://www.regulations.gov/document/FDA-2022-S-0023-0067',
          sourceLabel: 'FDA HFP. NDI 1240 Reinstatement response letter to SyncoZymes (Shanghai)',
          asOf: '2025-12-09',
        },
        jp: {
          text: '可以，作為一般食品流通，不需另取食品資格。',
          source: 'https://www.mhlw.go.jp/stf/newpage_07867.html',
          sourceLabel: '厚生労働省．令和元年度第2回 医薬品の成分本質に関するワーキンググループ 議事概要',
          asOf: '2019-09-13',
          note: '判定理由為「不符合判斷基準的任何一項，且食品中本來就含有」。',
        },
        eu: {
          text: '未經授權不得上市。這是新穎食品的程序狀態，不是禁令。',
          source:
            'https://food.ec.europa.eu/food-safety/novel-food/authorisations/summary-applications-and-notifications_en',
          sourceLabel: 'European Commission. Summary of applications and notifications, Novel Food',
          note: '兩件 NMN 申請均列為審查中，申請人皆主張 Regulation (EU) 2015/2283 第 26 條的資料保護。',
        },
      },
      {
        dimension: '市面上常見的產品形式',
        tw: {
          text: '少數以酵母萃取等天然來源標示「含 NMN」的產品。',
        },
        us: {
          text: '膠囊、錠劑，多為單方。',
        },
        jp: {
          text: '錠劑、膠囊、粉包；部分為機能性表示食品。',
          source: 'https://www.fuji-keizai.co.jp/press/detail.html?cid=25042&la=ja',
          sourceLabel: '富士経済．NMN含有サプリメント、化粧品の国内市場を調査',
          asOf: '2025-04-23',
          note: '推估 2031 年日本國內 NMN 含有商品市場 305 億日圓、較 2024 年成長 91.8%，其中保健食品佔九成以上。',
        },
        eu: {
          text: '無合法上市品項，市面所見多為跨境郵購。',
        },
      },
      {
        dimension: '官方允許的健康聲稱',
        tw: {
          text: '無。不得作為食品原料，亦無對應的健康食品查驗登記。',
          source: 'https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160',
          sourceLabel: '食藥署 食品原料整合查詢平臺',
          asOf: '2026-07-29',
        },
        us: {
          text: '得作結構／機能聲稱並附法定免責語，不得宣稱治療疾病。',
        },
        jp: {
          text: '一般食品不得標示效能；經届出者可標示已届出機能（例 J1063：中高年步行能力的維持）。',
          source: 'https://prtimes.jp/main/html/rd/p/000000036.000063879.html',
          sourceLabel: '三菱商事ライフサイエンス．NMN 機能性表示食品届出受理（届出番号 J1063）',
          asOf: '2025-05-29',
          note: '届出是事前備查、不是事前審查，消費者庁不做效果認定；J1063 於 2025-04-09 受理。',
        },
        eu: {
          text: '尚未授權故無可用聲稱；EFSA 係以「食品補充劑中的菸鹼素來源」而非抗老效果評估。',
          source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13158811/',
          sourceLabel: 'EFSA NDA Panel. Safety of beta-nicotinamide mononucleotide (β-NMN), EFSA Journal 2026;24(5):e10007',
          asOf: '2026-05-11',
          note: '2026-03-04 通過、2026-05-11 刊登；該意見只評估風險、不包含效果。',
        },
      },
      {
        dimension: '人體研究常用劑量 vs 市售劑量',
        tw: {
          text: '不適用。不得作為食品原料，無合法市售品可對照。',
        },
        us: {
          text: '統合分析納入試驗區間為每日 250 至 2000 毫克；FDA 未訂用量上限，由各件 NDI 通報自載。',
          source: 'https://pubmed.ncbi.nlm.nih.gov/39531138/',
          sourceLabel: 'Chen F, Zhou D, Kong AP, et al. (2024), Current Diabetes Reports',
          asOf: '2024',
        },
        jp: {
          text: '研究區間同美國；機能性表示食品 J1063 的届出量為每日 300 毫克。',
          source: 'https://prtimes.jp/main/html/rd/p/000000036.000063879.html',
          sourceLabel: '三菱商事ライフサイエンス．届出番号 J1063',
          asOf: '2025-05-29',
        },
        eu: {
          text: '研究區間同美國；EFSA 評估的使用條件為每日 300 毫克。',
          source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13158811/',
          sourceLabel: 'EFSA NDA Panel. Safety of β-NMN',
          asOf: '2026-05-11',
        },
      },
      {
        dimension: '安全性警語與限量',
        tw: {
          text: '查無明文。因不得作為食品原料使用，故無對應的限量規定。',
          source: 'https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160',
          sourceLabel: '食藥署 食品原料整合查詢平臺',
          asOf: '2026-07-29',
          note: '查詢範圍為食藥署食品原料整合查詢平臺該筆資料及其備註欄。',
        },
        us: {
          text: 'FDA 未訂每日上限；適用膳食補充劑的嚴重不良事件通報規定。',
        },
        jp: {
          text: '非醫藥品清單未訂限量；2026-09-01 起錠劑膠囊型機能性表示食品須符合 GMP 並加註未經國家評價。',
          source: 'https://jadma.or.jp/contents/blog/foods_with_function_claims',
          sourceLabel: 'JADMA．2024年の機能性表示食品制度の見直し内容と施行期日について',
          asOf: '2026-09-01',
          note: '健康被害情報的報告義務自 2024-09-01 施行。',
        },
        eu: {
          text: 'EFSA：每日 300 毫克、限成人並排除孕婦與哺乳者；NOAEL 每公斤體重每日 400 毫克，暴露邊界 93。',
          source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13158811/',
          sourceLabel: 'EFSA NDA Panel. Safety of β-NMN',
          asOf: '2026-05-11',
        },
      },
      {
        dimension: '主管機關與查證來源',
        tw: {
          text: '衛福部食藥署／食品原料整合查詢平臺。',
          source: 'https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160',
          sourceLabel: '食藥署 食品原料整合查詢平臺',
          asOf: '2026-07-29',
          note: '要確認資料新舊可查政府資料開放平臺同一資料集的最後更新時間（本文查證時為 2026-07-29）。',
        },
        us: {
          text: 'FDA HFP／NDI 通報卷宗 FDA-2022-S-0023、請願卷宗 FDA-2023-P-0872。',
          source: 'https://www.regulations.gov/document/FDA-2023-P-0872-2754',
          sourceLabel: 'Regulations.gov 卷宗 FDA-2023-P-0872',
          asOf: '2025-09-29',
        },
        jp: {
          text: '厚生労働省（食薬区分）／消費者庁（機能性表示食品届出資料庫）。',
          source: 'https://www.caa.go.jp/policies/policy/food_labeling/foods_with_function_claims/search',
          sourceLabel: '消費者庁．機能性表示食品の届出情報検索',
        },
        eu: {
          text: '歐盟執委會（新穎食品授權）／EFSA。',
          source:
            'https://food.ec.europa.eu/food-safety/novel-food/authorisations/summary-applications-and-notifications_en',
          sourceLabel: 'European Commission. Novel Food — summary of applications and notifications',
        },
      },
    ],
  },

  {
    articleSlug: 'red-yeast-rice-regulation-eu-japan-taiwan',
    ingredientSlug: 'red-yeast-rice',
    name: '紅麴',
    nameEn: 'Red Yeast Rice (Monascus purpureus)',
    verdict:
      '四個法域的差別不在誰比較在乎安全，在於誰先把 monacolin K 認領為藥品成分。美國最早（lovastatin 1987 年即以新藥核准），所以走分類禁止；歐盟因為 1997 年前已有食用歷史而無法直接禁，只好用限量加警語把它壓到藥理劑量以下，再撤掉功效聲稱；台灣則替它另外開了一個「健康食品」類別，用規格標準把劑量框在 4.8 到 15 毫克之間，同時要求它標示藥物交互作用警語；日本管的是通報與製造品質，對劑量本身沒有數值規範。',
    originalFindings: [
      '歐盟的每日份低於 3 毫克與台灣健康食品規格標準的每日 4.8 至 15 毫克，方向完全相反且沒有共同基準：前者是 EFSA 依不良反應通報訂的安全天花板，後者的 4.8 毫克是「劑量太低在學理上做不到功效」的宣稱下限，15 毫克才是台灣的上限。',
      '2024 年小林製藥事件的官方原因究明（厚生労働省與國立醫藥品食品衛生研究所，2024-09-18）指向工廠內混入的青黴菌 Penicillium adametzioides 在米培養基上產生的軟毛青黴酸，大鼠七天重複投與試驗出現近端腎小管變性與壞死；由 monacolin K 被修飾而成的化合物 Y、Z 反而未見腎毒性。中文圈初期普遍歸因的橘黴素，並未被官方調查支持。',
      '台灣小綠人的雙軌制落差：紅麴多走「規格標準審查」，食藥署明文寫著無需進行保健功效評估試驗及安全試驗；字號帶「規」字、六碼數字者即屬此軌，功效句尾的「非由實驗確認」七個字就是制度自己寫下的邊界，帶英文字母 A 的才是個案審查。',
    ],
    rows: [
      {
        dimension: '法規定位（食品／藥品／新穎食品／其他）',
        tw: {
          text: '食品。符合「紅麴健康食品規格標準」者可取得健康食品許可證。',
          source: 'https://www.fda.gov.tw/TC/siteListContent.aspx?sid=1758&id=42060',
          sourceLabel: '食藥署．紅麴健康食品規格標準（衛署食字第0960406448號令）',
          asOf: '2007-12-24',
          note: '民國 96 年 12 月 24 日發布、96 年 12 月 31 日施行。',
        },
        us: {
          text: '含強化或添加 lovastatin（＝monacolin K）者視為未核准新藥，不得以膳食補充品販售。',
          source: 'https://www.nccih.nih.gov/health/red-yeast-rice',
          sourceLabel: 'NIH NCCIH. Red Yeast Rice',
          note: '理由是 lovastatin 早於紅麴作為食品或膳食補充品販售之前，即已以新藥身分獲核准。',
        },
        jp: {
          text: '食品。可循機能性表示食品（業者備查）或特定保健用食品（許可制）標示機能。',
          source: 'https://www.caa.go.jp/notice/assets/food_labeling_cms201_240823_01.pdf',
          sourceLabel: '消費者庁食品表示課．機能性表示食品の今後について',
        },
        eu: {
          text: '食品補充品。1997-05-15 前已大量食用故不受新穎食品規範，但列入 1925/2006 附錄三 B 部與 C 部。',
          source: 'https://eur-lex.europa.eu/eli/reg/2022/860/oj/eng',
          sourceLabel: 'Commission Regulation (EU) 2022/860（OJ L 151, 2.6.2022, p. 37）',
          asOf: '2022-06-02',
          note: 'B 部為限用物質、C 部為聯盟監控；後者保留業者補交安全性資料的窗口。',
        },
      },
      {
        dimension: '能不能作為一般食品原料販售',
        tw: {
          text: '可。紅麴米、紅糟等傳統用途不受健康食品規格標準約束。',
          source: 'https://www.fda.gov.tw/TC/siteListContent.aspx?sid=1758&id=42060',
          sourceLabel: '食藥署．紅麴健康食品規格標準',
          asOf: '2007-12-24',
          note: '規格標準管的是要申請健康食品認證的產品；以一般食品身分販售的紅麴膠囊不在適用範圍，台灣查無對一般食品紅麴的 monacolin K 數值上限。',
        },
        us: {
          text: '低 monacolin K 產品實務上仍在架上，含顯著量者不合法。',
          source: 'https://www.nccih.nih.gov/health/red-yeast-rice',
          sourceLabel: 'NIH NCCIH. Red Yeast Rice',
        },
        jp: {
          text: '可。紅麴為傳統食品原料，紅麴色素另依食品衛生法訂有添加物規格基準。',
        },
        eu: {
          text: '補充品可（限量內）；用於其他食品類別須依 2015/2283 取得核准；未列入 1333/2008 故不得作食用色素。',
          source: 'https://eur-lex.europa.eu/eli/reg/2022/860/oj/eng',
          sourceLabel: 'Commission Regulation (EU) 2022/860',
          asOf: '2022-06-02',
        },
      },
      {
        dimension: '市面上常見的產品形式',
        tw: {
          text: '膠囊、錠劑、粉包；另有紅糟肉、紅麴香腸等傳統食品。',
        },
        us: {
          text: '膠囊為主；2017 年 28 品牌分析中無一款把 monacolin K 含量印在標籤上。',
          source: 'https://pubmed.ncbi.nlm.nih.gov/28641460/',
          sourceLabel: 'Cohen PA, Avula B, Khan IA. (2017), Eur J Prev Cardiol 24(13):1431-1434',
          asOf: '2017',
        },
        jp: {
          text: '錠劑、膠囊；2024 年前多以機能性表示食品形式上架。',
          source: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/daietto/index_00013.html',
          sourceLabel: '厚生労働省．紅麹を含む健康食品関係（令和6年3月～）',
          asOf: '2024-03',
        },
        eu: {
          text: '每份 monacolins 低於 3 毫克的補充品；高劑量產品已退出。',
          source: 'https://eur-lex.europa.eu/eli/reg/2022/860/oj/eng',
          sourceLabel: 'Commission Regulation (EU) 2022/860',
          asOf: '2022-06-02',
        },
      },
      {
        dimension: '官方允許的健康聲稱',
        tw: {
          text: '走規格標準審查者可標示「本產品可能有助於降低血中總膽固醇；其功效由學理得知，非由實驗確認」。',
          source: 'https://www.fda.gov.tw/tc/sitecontent.aspx?sid=1776',
          sourceLabel: '食藥署．健康食品概說暨導覽',
          note: '規格標準審查字號為「衛署健食規字」或「衛部健食規字」，六碼數字；個案審查字號帶英文字母 A。',
        },
        us: {
          text: '無。宣稱降膽固醇即落入藥品宣稱。',
          source: 'https://www.nccih.nih.gov/health/red-yeast-rice',
          sourceLabel: 'NIH NCCIH. Red Yeast Rice',
        },
        jp: {
          text: '由業者備查機能性內容並自負科學根據，非政府核准。',
          source: 'https://www.caa.go.jp/notice/assets/food_labeling_cms201_240823_01.pdf',
          sourceLabel: '消費者庁食品表示課．機能性表示食品の今後について',
        },
        eu: {
          text: '無。原 432/2012 的 monacolin K 健康聲稱已由 Regulation (EU) 2024/2041 刪除。',
          source: 'https://eur-lex.europa.eu/eli/reg/2024/2041/oj/eng',
          sourceLabel: 'Commission Regulation (EU) 2024/2041',
          asOf: '2024-07-29',
          note: '原聲稱條件為每日攝取 10 毫克 monacolin K 有助於維持正常血中 LDL 膽固醇濃度。',
        },
      },
      {
        dimension: '人體研究常用劑量 vs 市售劑量',
        tw: {
          text: '研究常用約每日 10 毫克；健康食品規格標準要求每日 4.8 至 15 毫克。',
          source: 'https://www.fda.gov.tw/TC/siteListContent.aspx?sid=1758&id=42060',
          sourceLabel: '食藥署．紅麴健康食品規格標準',
          asOf: '2007-12-24',
        },
        us: {
          text: '研究常用約每日 10 毫克；2017 年調查依廠商建議份量換算為每日 0.09 至 10.94 毫克，差距逾 120 倍。',
          source: 'https://pubmed.ncbi.nlm.nih.gov/28641460/',
          sourceLabel: 'Cohen PA, Avula B, Khan IA. (2017), Eur J Prev Cardiol',
          asOf: '2017',
        },
        jp: {
          text: '查無明文。日本無官方數值規範；厚労省調查指出原料批次間的 monacolin K 濃度並不均一。',
          source: 'https://www.mhlw.go.jp/content/001305186.pdf',
          sourceLabel: '厚生労働省・国立医薬品食品衛生研究所．原因究明結果',
          asOf: '2024-09-18',
          note: '查詢範圍為厚生労働省紅麴專頁與 2024-09-18 公布的原因究明資料。',
        },
        eu: {
          text: '研究常用 10 毫克；法規要求每日份低於 3 毫克。EFSA 2025 測得市售品總量 0.15% 以下至 7.48%（w/w）。',
          source: 'https://pubmed.ncbi.nlm.nih.gov/40027377/',
          sourceLabel: 'EFSA NDA Panel (2025), EFSA Journal 23(2):e9276',
          asOf: '2025-02',
          note: '實測含量與標示含量差距落在負 37% 到正 62%；乳內酯型與開環酸型比例從 1:1 到 114:1 都有。',
        },
      },
      {
        dimension: '安全性警語與限量',
        tw: {
          text: '強制標示不宜與 statin、fibrate 類藥物及葡萄柚併用；橘黴素另依污染物標準分級限量。',
          source: 'https://www.mohw.gov.tw/cp-5274-72288-1.html',
          sourceLabel: '衛生福利部．公告修正「健康食品應加標示事項」',
          asOf: '2024-01-01',
          note: '警語點名可能造成肝腎損傷與橫紋肌溶解症。橘黴素限量（食品中污染物質及毒素衛生標準附表二）：紅麴米 5,000 µg/kg、含紅麴原料之食品及膳食補充品 2,000 µg/kg、紅麴色素 200 µg/kg。',
        },
        us: {
          text: '查無明文。美國未訂數值限量；FDA 曾對強化或添加 lovastatin 的紅麴產品發出警告信。',
          source: 'https://www.nccih.nih.gov/health/red-yeast-rice',
          sourceLabel: 'NIH NCCIH. Red Yeast Rice',
          note: '查詢範圍為該篇引用的 FDA 立場說明與 NCCIH 衛教頁。',
        },
        jp: {
          text: '查無 monacolin K 數值上限；健康被害通報 2024-09-01 義務化、錠劑膠囊 GMP 2026-09-01 實施。',
          source: 'https://www.caa.go.jp/notice/assets/food_labeling_cms201_240823_01.pdf',
          sourceLabel: '消費者庁食品表示課．機能性表示食品の今後について',
          note: '軟毛青黴酸的食品規格基準截至該篇查證時仍在審議程序中，尚未見定案數值。',
        },
        eu: {
          text: '每日份 monacolins 低於 3 毫克，並強制四段警語（孕哺與未滿 18／逾 70 歲、就醫、服藥者、併用者）。',
          source: 'https://eur-lex.europa.eu/eli/reg/2022/860/oj/eng',
          sourceLabel: 'Commission Regulation (EU) 2022/860',
          asOf: '2022-06-02',
          note: '四段警語為：孕婦、哺乳者、未滿 18 歲與超過 70 歲者不應食用；如出現任何健康問題應就醫諮詢；正在服用降膽固醇藥物者不應食用；已在食用其他含紅麴產品者不應食用。',
        },
      },
      {
        dimension: '主管機關與查證來源',
        tw: {
          text: '衛福部食藥署：紅麴健康食品規格標準、健康食品資料查詢。',
          source: 'https://consumer.fda.gov.tw/Food/InfoHealthFood.aspx?nodeID=162',
          sourceLabel: '衛生福利部審核通過之健康食品資料查詢',
        },
        us: {
          text: 'FDA；NIH NCCIH 衛教頁。',
          source: 'https://www.nccih.nih.gov/health/red-yeast-rice',
          sourceLabel: 'NIH NCCIH. Red Yeast Rice',
        },
        jp: {
          text: '消費者庁（機能性表示食品制度）、厚生労働省紅麴專頁。',
          source: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/daietto/index_00013.html',
          sourceLabel: '厚生労働省．紅麹を含む健康食品関係',
          asOf: '2024-03',
        },
        eu: {
          text: '歐盟執委會（EUR-Lex 法規全文）、EFSA。',
          source: 'https://eur-lex.europa.eu/eli/reg/2022/860/oj/eng',
          sourceLabel: 'EUR-Lex. Commission Regulation (EU) 2022/860',
          asOf: '2022-06-02',
        },
      },
    ],
  },
];

export default REGULATIONS_A;
