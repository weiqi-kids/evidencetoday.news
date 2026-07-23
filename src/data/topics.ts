// 健康專題（topic hub）定義 —— 把同一主題的文章、闢謠、成分解析、Podcast、短影音、趨勢
// 整理在一起，建立 hub↔spoke 的內鏈結構，利於讀者建立完整理解，也利於搜尋引擎/AI 認識主題權威。
//
// 內容歸屬採「關鍵字比對 title + tags」自動收斂（matchKeywords），避免手寫易過期的 slug 清單；
// 各主題頁只渲染「真的有比對到內容」的區塊。前台名稱用「健康專題」，不用技術詞「主題集群」。

export interface Topic {
  slug: string;
  /** 前台主題名稱 */
  name: string;
  /** 主題簡介（1–2 句，進 meta description 與頁首） */
  intro: string;
  /** 30 秒重點（3–5 點） */
  thirtySecond: string[];
  /** 比對內容歸屬用的關鍵字（小寫，比對 title + tags） */
  matchKeywords: string[];
  /** 常見疑問（自然、貼主題；會輸出 FAQPage JSON-LD） */
  faq: { question: string; answer: string }[];
  /** 專題卡封面圖（圖庫熱連結；缺則前台退品牌佔位） */
  image?: string;
  /** 封面圖無障礙描述 */
  imageAlt?: string;
  /** 封面圖出處署名（Wikimedia Commons 作者＋授權；供資料層保留 CC 署名） */
  imageCredit?: string;
}

export const TOPICS: Topic[] = [
  {
    slug: 'omega-3',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Raw_salmon_fillets.jpg/1280px-Raw_salmon_fillets.jpg",
    imageAlt: "生鮭魚排切片",
    imageCredit: "FULVIO_TOGNON（CC0）",
    name: 'Omega-3 與魚油',
    intro: '把 Omega-3、魚油、EPA 與 DHA 的相關文章、闢謠與成分解析整理在一起，幫你看懂濃度、劑型與適用對象。',
    thirtySecond: [
      'Omega-3 主要指 EPA 與 DHA，兩者在身體裡的角色並不完全相同。',
      '「濃度越高越好」不一定成立，要看每日實際攝取量與個人需求。',
      '魚油不是每個人都需要補，先看飲食與健康狀況再決定。',
    ],
    matchKeywords: ['omega', '魚油', 'epa', 'dha', '磷蝦', 'krill', '脂肪酸'],
    faq: [
      {
        question: 'EPA 和 DHA 差在哪裡？',
        answer:
          'EPA 與 DHA 都是 Omega-3 脂肪酸，但研究關注的方向不太一樣：EPA 較常被討論與循環、發炎相關的議題，DHA 則較常與腦部、視網膜的結構討論在一起。市售魚油的 EPA／DHA 比例不同，挑選時可以對照自己想了解的方向，但仍需以整體飲食與個人狀況為準。',
      },
      {
        question: '魚油濃度越高就一定越好嗎？',
        answer:
          '不一定。濃度高代表每顆膠囊的 Omega-3 含量較高，但真正重要的是每天實際攝取到多少 EPA＋DHA、以及是否符合自己的需求。濃度只是換算的一個環節，並不直接等於效果更好。',
      },
    ],
  },
  {
    slug: 'lutein',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Spinacia_oleracea_bd-2.jpg/1280px-Spinacia_oleracea_bd-2.jpg",
    imageAlt: "新鮮菠菜葉",
    imageCredit: "Kayser Ahmad（CC BY-SA 4.0）",
    name: '葉黃素與護眼營養',
    intro: '整理葉黃素、玉米黃素與護眼相關的成分解析與常見說法，說清楚證據能支持到哪裡。',
    thirtySecond: [
      '葉黃素與玉米黃素是兩種類胡蘿蔔素，常一起出現在護眼討論裡。',
      '它們較常被討論的是與黃斑部相關的研究，而非「改善近視」。',
      '日常深綠色蔬菜也含葉黃素，補充劑不是唯一來源。',
    ],
    matchKeywords: ['葉黃素', 'lutein', '玉米黃素', 'zeaxanthin', '護眼', '黃斑', '蝦紅素', 'astaxanthin'],
    faq: [
      {
        question: '葉黃素和玉米黃素有什麼不同？',
        answer:
          '葉黃素（lutein）與玉米黃素（zeaxanthin）都是會聚集在視網膜黃斑部的類胡蘿蔔素，結構相近、常被一起研究與標示。市售產品多半會同時含有兩者，差別主要在比例。兩者都來自飲食，深綠色蔬菜與部分黃色蔬果都含有。',
      },
      {
        question: '葉黃素可以改善近視或讓視力變好嗎？',
        answer:
          '目前研究比較常討論的是葉黃素與黃斑部健康的關聯，而不是「改善近視度數」或「讓視力變好」。把它理解成飲食營養的一部分會比較貼近證據，過度期待單一成分能逆轉視力問題並不合適。',
      },
    ],
  },
  {
    slug: 'calcium-vitamin-d',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Glass_milk_bottle_cardboard_cap_and_opener.jpg/1280px-Glass_milk_bottle_cardboard_cap_and_opener.jpg",
    imageAlt: "玻璃瓶裝鮮奶",
    imageCredit: "Bruce C. Cooper (uploader)（CC BY-SA 4.0）",
    name: '鈣與維生素 D',
    intro: '鈣與維生素 D 常被一起討論。這裡整理它們的角色、補充常見迷思與實際證據。',
    thirtySecond: [
      '維生素 D 與鈣的吸收與利用有關，因此常被放在一起談。',
      '補鈣＋維生素 D 是否能預防骨折，要看對象與整體生活型態。',
      '維生素 D 的角色不只在骨骼，但也不該被誇大成萬用。',
    ],
    matchKeywords: ['維生素d', 'vitamin d', '維他命d', '鈣', '骨質', '骨鬆', '骨折'],
    faq: [
      {
        question: '鈣和維生素 D 為什麼常一起討論？',
        answer:
          '維生素 D 與鈣在體內的吸收與調節有關，因此在骨骼健康的討論裡常被放在一起。不過「一起補充」是否帶來預期效果，會受到年齡、原本的營養狀態、活動量與整體飲食影響，並不是補了就一定有同樣結果。',
      },
      {
        question: '維生素 D 補越多越好嗎？',
        answer:
          '維生素 D 屬於脂溶性，攝取過量有累積的疑慮，並不是越多越好。多數情況下，先了解自己的狀況、再決定是否補充與補多少，會比盲目追求高劑量更合理。',
      },
    ],
  },
  {
    slug: 'supplement-guide',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Omega_3_capsules_in_white_bottle_%2852715127894%29.jpg/1280px-Omega_3_capsules_in_white_bottle_%2852715127894%29.jpg",
    imageAlt: "保健食品膠囊與瓶罐",
    imageCredit: "Jernej Furman from Slovenia（CC BY 2.0）",
    name: '保健食品怎麼選',
    intro: '保健食品標示、劑量、劑型與行銷話術怎麼看？整理常見判讀方式，幫你少花冤枉錢。',
    thirtySecond: [
      '標示上的毫克數、濃度與每日份量，要一起看才有意義。',
      '「有體感」不等於「有功效」，兩者是不同概念。',
      '先看自己的飲食缺口，再決定要不要補、補什麼。',
    ],
    matchKeywords: ['保健食品', '補充劑', '劑量', '營養補充', '膠囊', '軟糖', '劑型', '保健品', '堆疊', '交互作用'],
    faq: [
      {
        question: '保健食品標示上的毫克數該怎麼看？',
        answer:
          '標示的毫克數通常是「每份」或「每顆」的含量，要對照建議份量與一天實際吃的量，才知道真正攝取到多少。有些產品會把總重量或複方總量寫得很大，但單一有效成分其實不高，看清楚是哪個成分、多少量，比看到大數字就安心更重要。',
      },
      {
        question: '吃了有感覺，是不是代表有效？',
        answer:
          '「體感」與「功效」是兩回事。有些感覺來自心理預期、作息改變或其他同時發生的因素，未必是該成分的直接作用。判斷一個保健食品是否值得，仍要回到證據與自己的需求，而不是單靠當下的感覺。',
      },
    ],
  },
  {
    slug: 'blood-lipids',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Doctor_taking_blood_sample_for_COVID-19_rapid_testing.png/1280px-Doctor_taking_blood_sample_for_COVID-19_rapid_testing.png",
    imageAlt: "抽血採檢血液樣本",
    imageCredit: "Truyền Hình Pháp Luật（CC BY 3.0）",
    name: '血脂與膽固醇',
    intro: '膽固醇、三酸甘油脂、LDL 與 HDL 的報告怎麼讀？整理血脂相關文章、闢謠與飲食討論。',
    thirtySecond: [
      'LDL、HDL 與三酸甘油脂各代表不同面向，不能只看總膽固醇。',
      '飲食只是影響血脂的因素之一，遺傳與生活型態也有份量。',
      '紅麴等成分有其討論，但不能取代醫療評估。',
    ],
    matchKeywords: ['膽固醇', '三酸甘油', '血脂', 'ldl', 'hdl', '紅麴', 'monacolin', 'cholesterol', '脂蛋白'],
    faq: [
      {
        question: '三酸甘油脂偏高和飲食有什麼關係？',
        answer:
          '三酸甘油脂容易受到近期飲食影響，特別是精緻醣類、酒精與整體熱量。不過它同時也受體重、運動、作息與個人體質影響，因此單靠「少吃某一樣」未必能完全反映，通常要看整體生活型態與後續追蹤。',
      },
      {
        question: '健檢報告膽固醇紅字，一定要吃藥嗎？',
        answer:
          '膽固醇是否需要處理、用什麼方式處理，要看的是整體風險而非單一數字，包含 LDL、HDL、三酸甘油脂與其他健康狀況。報告出現紅字代表需要進一步了解，但要不要用藥屬於個別醫療評估，宜與醫療人員討論。',
      },
    ],
  },
  {
    slug: 'blood-sugar',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/%2820250417%29_Blood_glucose_meter_09.jpg/1280px-%2820250417%29_Blood_glucose_meter_09.jpg",
    imageAlt: "以血糖機檢測指尖血糖",
    imageCredit: "Roy Zuo（CC BY-SA 4.0）",
    name: '血糖與糖尿風險',
    intro: '空腹血糖、糖化指標與糖尿病前期怎麼理解？整理血糖相關的研究、文章與常見迷思。',
    thirtySecond: [
      '血糖要看的不只是單次數字，趨勢與糖化指標也重要。',
      '「水果很甜所以不能吃」是常見誤解，份量與種類才是關鍵。',
      '糖尿病前期是提醒，而不是宣判，生活型態仍有調整空間。',
    ],
    matchKeywords: ['血糖', '糖化', '胰島素', '糖尿', '升糖', 'glucose', 'glp', '空腹血糖', '前期'],
    faq: [
      {
        question: '糖尿病患者完全不能吃水果嗎？',
        answer:
          '多數討論並不主張完全不吃水果，而是強調份量、種類與整體飲食搭配。水果含有纖維與營養素，重點在於攝取的量與頻率，以及和其他醣類來源的平衡，個別情況仍建議依專業評估調整。',
      },
      {
        question: '空腹血糖正常，就代表血糖一定沒問題嗎？',
        answer:
          '空腹血糖只是其中一個面向。有些情況下空腹值正常，但飯後血糖或糖化指標已出現變化，因此通常會搭配不同指標一起看，而不是只用單一數字下結論。',
      },
    ],
  },
  {
    slug: 'liver-kidney-test',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Laboratory_Test_Tubes%3B_from_a_medical_laboratory_in_Abuja%2C_Nigeria.jpg/1280px-Laboratory_Test_Tubes%3B_from_a_medical_laboratory_in_Abuja%2C_Nigeria.jpg",
    imageAlt: "實驗室採血試管",
    imageCredit: "Frankincense Diala（CC0）",
    name: '肝腎功能檢查',
    intro: '肝指數、腎功能與尿酸等檢查數值代表什麼？整理相關文章與保健成分的證據討論。',
    thirtySecond: [
      '肝、腎指數是反映目前狀態的參考，需要對照整體狀況解讀。',
      '「保肝」「養腎」保健品的證據有限，不能取代檢查與評估。',
      '數值異常先了解原因，再決定是否需要進一步處理。',
    ],
    matchKeywords: ['肝功能', '腎功能', '肝指數', '尿酸', '痛風', '肌酸酐', '肝臟', '腎臟', '保肝', '護肝', '薊', 'milk thistle', 'tudca'],
    faq: [
      {
        question: '保肝保健品真的能保護肝臟嗎？',
        answer:
          '市面上常見的保肝成分（如水飛薊等）有一些研究討論，但證據強度與適用情境仍有限，並不能保證「保護肝臟」或取代必要的檢查與評估。維持作息、飲食與避免過量飲酒，往往比依賴單一保健品更實際。',
      },
      {
        question: '肝腎指數紅字一定代表生病了嗎？',
        answer:
          '指數異常代表「需要進一步了解」，但不等於確診某種疾病。數值可能受到近期作息、用藥、運動或檢驗條件影響，通常要結合其他資料與後續追蹤，才能判斷代表什麼。',
      },
    ],
  },
  {
    slug: 'sleep',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Girl_asleep_with_her_smooth_Collie.JPG/1280px-Girl_asleep_with_her_smooth_Collie.JPG",
    imageAlt: "在床上熟睡",
    imageCredit: "David Shankbone（CC BY 3.0）",
    name: '睡眠與助眠',
    intro: '睡不好的原因很多，助眠的選項也不只一種。這裡把褪黑激素、助眠成分、生理時鐘與睡眠品質的相關文章、闢謠與成分解析整理在一起。',
    thirtySecond: [
      '睡不好先找原因，再決定要不要、以及用什麼方式助眠。',
      '褪黑激素在台灣屬處方藥，劑量與使用時機都有講究，不是吃越多越好。',
      '規律作息與生理時鐘，往往比單一助眠品更影響睡眠品質。',
    ],
    matchKeywords: ['睡眠', '助眠', '失眠', '睡不著', '安眠', '褪黑激素', 'melatonin', 'gaba', '生理時鐘', '時差', '睡眠品質', '打呼', '打鼾', '睡眠呼吸中止'],
    faq: [
      {
        question: '睡不著就吃褪黑激素，是安全的做法嗎？',
        answer:
          '褪黑激素在台灣屬於處方藥，代表使用前適合先經專業評估，而不是自行長期服用。它比較常被討論的是調整生理時鐘（例如時差），對「單純睡不著」不一定是最合適的第一步。先釐清失眠的可能原因，再決定要不要用、用多少，會比直接補充更合理。',
      },
      {
        question: '助眠保健品這麼多種，該怎麼選？',
        answer:
          '不同助眠成分被討論的方向不太一樣，有些偏放鬆、有些偏調整入睡節奏，證據強度也各有差異。與其先挑產品，更實際的做法是先看自己的睡眠問題出在哪裡（入睡困難、淺眠、還是作息不規律），再對照哪一類方式比較貼近，並把生活型態一起納入考量。',
      },
    ],
  },
  {
    slug: 'womens-health',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Practicing_Yoga_%2860123020%29.jpeg/1280px-Practicing_Yoga_%2860123020%29.jpeg",
    imageAlt: "女性練習瑜伽",
    imageCredit: "Giuseppe Milo（CC BY 3.0）",
    name: '更年期與女性健康',
    intro: '更年期、經期與女性營養需求，在不同人生階段差異很大。這裡整理更年期症狀管理、經痛、女性營養與相關保健的證據討論。',
    thirtySecond: [
      '更年期不只是熱潮紅，症狀多元，前中後期的需求也不一樣。',
      '經痛是否需要就醫，取決於型態與影響程度，不是忍過去就好。',
      '女性營養（如鐵）容易被忽略，補之前先了解自己缺在哪。',
    ],
    matchKeywords: ['更年期', 'menopause', '停經', '經痛', '月經', '女性', '雌激素', 'pcos', '多囊', '血色素', '貧血'],
    faq: [
      {
        question: '更年期保健食品這麼多，真的有幫助嗎？',
        answer:
          '更年期相關的保健成分有些有研究討論，但效果、適用對象與證據強度差異不小，且不同階段（前期、中期、後期）的需求本來就不一樣。與其期待單一產品解決所有症狀，先了解自己主要困擾的是什麼，再與專業討論如何處理，會比照著廣告選購更實際。',
      },
      {
        question: '經痛到底正不正常，什麼時候該就醫？',
        answer:
          '經痛可分為原發性與續發性，前者較常見、與生理過程有關，後者則可能反映其他狀況。若疼痛程度明顯影響生活、和過去不同、或伴隨其他異常，通常會建議就醫評估，而不是一律當成「本來就會痛」而忽略。',
      },
    ],
  },
  {
    slug: 'sports-nutrition',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Aluminium_Dumbbell.jpg/1280px-Aluminium_Dumbbell.jpg",
    imageAlt: "健身啞鈴",
    imageCredit: "Designproduct（CC BY-SA 4.0）",
    name: '運動營養與肌肉',
    intro: '增肌、補充蛋白質、預防肌少症，年輕人與熟齡族的需求並不一樣。這裡整理運動營養、肌酸、蛋白質與肌肉保養的相關內容。',
    thirtySecond: [
      '肌肉會隨年齡流失，維持肌肉不是健身族的專利。',
      '肌酸與蛋白質是研究較充分的運動營養，但用法要看目標與族群。',
      '「多吃蛋白質就會長肌肉」過度簡化，訓練與總熱量同樣重要。',
    ],
    matchKeywords: ['肌酸', 'creatine', '肌少症', '運動營養', '蛋白質', '乳清', '高蛋白', '健身', '肌肉', '重訓', '熟齡健身'],
    faq: [
      {
        question: '肌酸只有健身的人需要嗎？',
        answer:
          '肌酸較常被討論的是運動表現，但它與肌肉、隨年齡的肌力維持也有相關研究，因此討論對象不只限於健身族。是否補充、怎麼補，仍要看個人的目標、飲食與健康狀況，並把訓練與整體營養一起考量，而不是單靠補充品。',
      },
      {
        question: '喝高蛋白會傷腎嗎？',
        answer:
          '對腎功能正常的人，適量攝取蛋白質目前並沒有一致證據顯示會造成腎臟損害；但對本身已有慢性腎臟病的人，蛋白質攝取確實需要依醫囑控制。關鍵在於「本身的腎功能狀態」與「攝取量」，而不是把高蛋白一律當成傷腎。',
      },
    ],
  },
  {
    slug: 'gut-health',
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Greek_yoghurt_cucumbers_garlic.jpg/1280px-Greek_yoghurt_cucumbers_garlic.jpg",
    imageAlt: "希臘優格佐小黃瓜",
    imageCredit: "Nikodem Nijaki（CC BY-SA 3.0）",
    name: '腸道健康與菌相',
    intro: '益生菌、益生元、後生元與膳食纖維，都是腸道保健的熱門詞。這裡整理腸道菌相、腸腦軸與相關成分的證據，說清楚各自能支持到哪裡。',
    thirtySecond: [
      '益生菌不是人人吃了都有感，菌株、劑量與個人狀況都有影響。',
      '益生元、後生元與益生菌是不同概念，別被行銷名詞混為一談。',
      '膳食纖維是腸道健康的基礎，補充品不該取代日常飲食。',
    ],
    matchKeywords: ['腸道', '益生菌', 'probiotic', '腸腦軸', '菌相', '益生元', '後生元', '膳食纖維', '腸道菌', '益菌', '腸胃'],
    faq: [
      {
        question: '益生菌是不是每個人吃了都有幫助？',
        answer:
          '益生菌的效果與菌株、劑量、保存與個人腸道狀況都有關，並不是所有人吃了都會有明顯感受。有些研究針對特定情況顯示幫助，但不能一概而論成「人人都需要、吃了都有效」。先看自己的需求與飲食，再決定要不要補會比較實際。',
      },
      {
        question: '益生菌、益生元、後生元差在哪？',
        answer:
          '簡單說，益生菌是活的有益菌、益生元是餵養這些菌的成分（常見於膳食纖維）、後生元則是菌的代謝產物或成分。三者概念不同，行銷上常被包裝成「黃金組合」，但各自的證據與適用情境仍有差異，理解區別有助於避免被名詞混淆。',
      },
    ],
  },
];

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

/** 比對單筆內容是否屬於某主題：對 title + tags（小寫）做關鍵字包含判斷。 */
export function matchesTopic(
  topic: Topic,
  entry: { title?: string; tags?: string[] },
): boolean {
  const haystack = [entry.title ?? '', ...(entry.tags ?? [])].join(' ').toLowerCase();
  return topic.matchKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}
