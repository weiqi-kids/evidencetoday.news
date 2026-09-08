# 成分母體交叉盤點（2026-09-08 快照）

**這是一次性快照，不是現況。** 要看當下請自己跑指令——本檔每一個數字後面都註明了它是哪一道指令查到的。

盤點對象：`src/content/ingredients/` 全部 94 篇（`pnpm stats`，2026-09-08）。
目的：盤出成分母體與站上其他內容之間的覆蓋缺口，產出可直接拿去寫稿與補內鏈的清單。

## 資料來源與取得方式

| 資料 | 指令 / 來源 | 時間 |
|---|---|---|
| 各類型篇數、公開/排程狀態 | `pnpm stats` | 2026-09-08 |
| 逐頁曝光 / 點擊 / 排名 / CTR | GSC Search Analytics API（`dimensions=page`，`rowLimit=1000`），區間 2026-08-08～2026-09-05，與 `pnpm perf` 同一區間同一憑證 | 2026-09-08 |
| 逐查詢曝光 | 同上，`dimensions=query`，899 列 | 2026-09-08 |
| 索引狀態 | `pnpm index:coverage` | 2026-09-08 |
| 選題候選 | `pnpm insights`（`data/audience-insights.json`） | 2026-09-08 |
| 內鏈 / 提及 / 交叉覆蓋 | 直接掃 `src/content/**`（正文 `/ingredients/<slug>` 連結 ＋ frontmatter `relatedIngredients`） | 2026-09-08 |

**判讀規則（先講清楚，避免看錯）**

1. **剛上線的稿不能當「表現差」的證據。** 94 篇裡有 10 篇還在排程中（發布日 2026-09-10～09-28）、16 篇發布未滿兩週。本檔所有「表現差」的結論只用**發布滿兩週的 67 篇**。
2. **GSC 只能證明「站上已經有頁、但表現不好」，不能證明「沒寫過的題目有沒有需求」。** 站上沒有那一頁，就不會有曝光，查詢清單裡當然是 0。因此第四節「母體缺口」的需求證據主要來自**站內反覆提及次數**，GSC 只在少數幾條能佐證，會逐條標明。
3. `pnpm insights` 的 `topicCandidates` 有一個已知誤判：它的「站內無對應文章」只比對 articles，**不看 ingredients**。所以 ashwagandha、hmb、creatine、glutathione、lactoferrin 這些明明有成分頁的詞，會被它列成「站內無對應文章」。本檔已逐條 grep 過站上實際檔案，沒有沿用那個判斷。

---

## 零、一句話結論

成分頁的問題不是「寫得不夠多」，是**寫完就丟在那裡沒有接上任何東西**：67 篇滿兩週的成分頁裡，38 篇的正文一條內鏈都沒有人連進去；338 篇 articles+myths 裡有 178 篇提到了站上已有專頁的成分，其中 142 篇一條成分連結都沒放。同時，**通用大詞的成分頁已經被證明打不動**（22 篇合計 28 天曝光 148），而**冷門長尾成分頁才是實際在賺曝光的那批**（其餘 45 篇合計 4,738）。

---

## 一、成分頁表現分層

28 天（2026-08-08～09-05）94 篇成分頁合計 **曝光 5,499、點擊 100**。前 10 篇吃掉 40% 曝光、前 20 篇吃掉 65%。
發布滿兩週的 67 篇：曝光中位數 54、曝光為 0 的有 6 篇、曝光 <10 的有 20 篇。

### 1-A｜有需求但排不上（曝光 ≥50、排名 >12）

**這是排名問題，不是標題問題。要的是內鏈／權威／深度，改標題無效。**（分層依據同 `pnpm perf` 的那張表）

| 成分頁 | 曝光 | 點擊 | 排名 | CTR | 正文入鏈 | 連出其他成分 | 有無對應 article | 有無對應 myth |
|---|---|---|---|---|---|---|---|---|
| ashwagandha 南非醉茄 | 270 | 4 | 20.5 | 1.5% | 3 | 0 | 2 | 1 |
| quercetin 槲皮素 | 225 | 3 | 19.5 | 1.3% | 2 | 0 | 1 | 0 |
| nmn | 203 | 3 | 32.0 | 1.5% | 2 | 0 | 3 | 0 |
| creatine 肌酸 | 190 | 2 | 42.7 | 1.1% | 4 | 1 | 4 | 0 |
| taurine 牛磺酸 | 142 | 1 | 28.3 | 0.7% | 1 | 0 | 1 | 0 |
| hyaluronic-acid 玻尿酸 | 123 | 2 | 16.5 | 1.6% | 1 | 0 | 1 | 0 |
| hmb | 123 | 1 | 13.2 | 0.8% | 1 | 0 | **0** | **0** |
| glutathione 穀胱甘肽 | 113 | 0 | 30.5 | 0% | 2 | 0 | 2 | 0 |
| colostrum 牛初乳 | 92 | 0 | 16.0 | 0% | 2 | 0 | 1 | 0 |
| soy-isoflavones 大豆異黃酮 | 69 | 2 | 13.6 | 2.9% | 5 | 0 | 2 | 1 |
| cranberry 蔓越莓 | 65 | 2 | 12.6 | 3.1% | 2 | 0 | 1 | 1 |
| milk-thistle 水飛薊素 | 57 | 1 | 12.1 | 1.8% | 4 | 1 | 1 | 0 |
| rhodiola 紅景天 | 56 | 0 | 12.8 | 0% | 2 | 0 | 1 | 0 |

排除：chromium（149 曝光／排名 14.4）、l-theanine（85／15.0）、lactoferrin（56／14.1）數字符合本層條件，但發布未滿兩週，**不列入處置**，兩週後再看。
`vitamin-e` 亦落在本層，依站主長期指示不列入任何建議。

GSC 逐查詢佐證（同一區間）：`ashwagandha 作用` 43 曝光排名 47.2、`南非醉茄 睡眠` 40 曝光排名 46.9、`nmn` 71 曝光排名 68.5、`肌酸` 55 曝光排名 48.8。這幾個詞站上是**首頁面排在四五頁後**，不是差一名進第一頁——單靠改 title/description 不會動。

### 1-B｜排得到但點不到（曝光 ≥50、排名 ≤12、CTR <2%）

這一層才是標題／描述問題。

| 成分頁 | 曝光 | 排名 | CTR | 正文入鏈 | article | myth |
|---|---|---|---|---|---|---|
| ergothioneine 麥角硫因 | 226 | 7.8 | 1.8% | **0** | **0** | **0** |
| alpha-lipoic-acid α-硫辛酸 | 157 | 11.7 | 0% | **0** | **0** | **0** |
| opc 寡聚原花青素 | 153 | 7.2 | 0.7% | 1 | **0** | **0** |
| lions-mane 猴頭菇菌絲體 | 134 | 11.1 | 0.7% | 2 | **0** | **0** |
| 5-htp | 120 | 10.3 | 0% | 1 | 1 | 0 |
| prebiotics 益生元 | 86 | 8.0 | 0% | 2 | **0** | **0** |
| sulforaphane 蘿蔔硫素 | 86 | 8.6 | 1.2% | **0** | **0** | **0** |
| sesamin 芝麻素 | 64 | 11.7 | 1.6% | **0** | **0** | **0** |
| selenium 硒 | 58 | 7.3 | 0% | **0** | **0** | **0** |
| beta-alanine β-丙胺酸 | 57 | 10.2 | 0% | 1 | **0** | **0** |

`ginkgo-biloba` 亦落在本層，依站主長期指示不列入建議。

`ergothioneine` 特別值得看：GSC 有 `麥角硫因每日攝取量` 40 曝光、排名 7.9、CTR 2.5%——**站上排在第一頁而且有人搜「每日攝取量」，但成分頁的 description 沒有直接回答劑量**。這是最省力的一筆。

### 1-C｜健康（曝光 ≥50、排名 ≤12、CTR ≥2%）

tongkat-ali（250 曝光／CTR 3.6%）、urolithin-a（227／5.7%）、green-tea-extract（246／2.0%）、spermidine（213／2.3%）、valerian（157／2.5%）、nac（133／2.3%）、berberine（91／6.6%）、l-carnitine（83／2.4%）、plant-sterols（73／4.1%）、tart-cherry（65／3.1%）、psyllium（57／3.5%）、evening-primrose-oil（54／3.7%）。

**這 12 篇裡有 10 篇站上完全沒有對應的 article 或 myth**（例外只有 berberine、nac 各有 article）。它們是自己一個人在賺曝光的孤兒頁。

### 1-D｜滿兩週卻幾乎沒有曝光

| 成分頁 | 發布日 | 曝光 | 排名 | 索引狀態（`pnpm index:coverage`） |
|---|---|---|---|---|
| vitamin-c 維生素 C | 2026-03-05 | 0 | — | **Discovered - currently not indexed** |
| collagen 膠原蛋白 | 2026-05-10 | 0 | — | **Discovered - currently not indexed** |
| coenzyme-q10 輔酵素 Q10 | 2026-05-13 | 0 | — | **URL is unknown to Google** |
| turmeric 薑黃 | 2026-04-01 | 0 | — | 本次 API 回 ERR500，未取得 |
| vitamin-b-complex 維生素 B 群 | 2026-03-25 | 0 | — | 已索引 |
| iron 鐵 | 2026-04-28 | 0 | — | 已索引 |
| vitamin-d 維生素 D | 2026-03-21 | 1 | 9.0 | 已索引 |
| whey-protein 乳清蛋白 | 2026-08-22 | 1 | 84.0 | 已索引 |
| magnesium 鎂 | 2026-04-20 | 3 | 60.3 | 已索引 |
| probiotics 益生菌 | 2026-04-09 | 4 | 38.5 | 已索引 |
| calcium 鈣 | 2026-05-17 | 5 | 52.4 | 已索引 |
| glucosamine 葡萄糖胺 | 2026-06-06 | 5 | 18.0 | 已索引 |
| lutein 葉黃素 | 2026-04-24 | 12 | 11.8 | 已索引 |
| omega-3 | 2026-04-17 | 23 | 58.0 | 已索引 |
| zinc 鋅 | 2026-03-13 | 32 | 57.8 | 已索引 |

**要分開看兩種病：** vitamin-c / collagen / coenzyme-q10 是**沒被收錄**（2026-08-21 的紀錄裡就是這三篇，一個月後狀態沒變，`docs/reminders.md` 已結案段有背景）；其餘是**已收錄但排在第 4～8 頁**，那是權威與深度問題，不是索引問題。

### 1-E｜結構性訊號：通用大詞成分頁整批失效

把 22 篇「通用大詞」成分頁（vitamin-a/c/d/k/b-complex、calcium、magnesium、iron、zinc、omega-3、probiotics、collagen、coenzyme-q10、turmeric、dietary-fiber、folate、lutein、glucosamine、whey-protein、melatonin、ginseng、gaba）跟其餘滿兩週的 45 篇對照：

| 分組 | 篇數 | 28 天總曝光 | 曝光中位數 |
|---|---|---|---|
| 通用大詞 | 22 | **148** | **5** |
| 其餘（冷門／長尾成分） | 45 | **4,738** | **86** |

逐查詢也對得上：`葉黃素` 0 曝光、`益生菌` 1、`膠原` 0、`維生素c` 0、`維生素d` 0、`q10` 0、`乳清` 0、`鈣` 1、`鎂` 1；只有 `鋅` 22 曝光但排名約 80。

**判讀**：站上在通用保健大詞上完全沒有立足點，而且不是索引問題（多數已索引）。這批頁不值得再各自微調，要嘛整批當成內鏈樞紐用（見第二節），要嘛只從「情境決策」的長尾角度重新切入，不要正面打大詞。

---

## 二、內鏈缺口（本次最大的一項）

### 2-1｜成分頁沒有人連進去

| 指標 | 數量 |
|---|---|
| 成分頁總數 | 94 |
| **正文一條內鏈都沒有連進去的** | **38** |
| 連 frontmatter `relatedIngredients` 也沒有被指到的（總入鏈 0） | 34 |

總入鏈 0 且**已經滿兩週**的（排除排程中與新稿）：
`alpha-lipoic-acid`、`ergothioneine`、`ginger-extract`、`nac`、`pumpkin-seed`、`resveratrol`、`saffron`、`saw-palmetto`、`selenium`、`sesamin`、`spermidine`、`sulforaphane`、`tongkat-ali`、`urolithin-a`、`choline`。

其中 `ergothioneine`(226)、`urolithin-a`(227)、`tongkat-ali`(250)、`spermidine`(213)、`alpha-lipoic-acid`(157)、`nac`(133)、`sulforaphane`(86)、`sesamin`(64)、`selenium`(58) **是站上曝光排前段的頁，卻是全站內鏈的孤島**。這幾篇是靠自己被 Google 找到的——把內鏈接上去是純增益。

### 2-2｜文章這一側：提到了成分，但沒連過去

掃 338 篇 articles+myths 正文（成分中文名／英文名／常見別名逐一比對，魚油與葉黃素的「劑型比較」頁已與本體去重）：

| 指標 | 數量 |
|---|---|
| 有提到至少一個「站上已有專頁」的成分 | **178 / 338** |
| 其中一條成分連結都沒放的 | **142** |
| 「提到卻沒連」的連結機會總數 | **381** |

單篇缺口最大的前幾篇（每一篇都提到 5 個以上有專頁的成分、卻零成分連結）：

| 文章 | 提到但未連的成分 |
|---|---|
| `articles/stop-supplements-before-surgery` | creatine, dong-quai, ginger-extract, ginseng, omega-3, red-yeast-rice…（11） |
| `articles/men-health-stereotypes-beyond-performance` | ashwagandha, coenzyme-q10, creatine, gaba, l-theanine, omega-3, plant-sterols…（10） |
| `articles/supplement-gummies-dosage-accuracy` | coenzyme-q10, collagen, creatine, folate, lutein, omega-3…（10） |
| `articles/supplement-stacking-risk-guide` | lutein, omega-3, probiotics, turmeric, vitamin-a…（10） |
| `articles/dosage-form-swallowing-vs-efficacy` | coenzyme-q10, collagen, omega-3, probiotics, vitamin-a/d…（8） |
| `articles/minerals-absorption-timing-guide` | calcium, iron, magnesium, vitamin-c, vitamin-d（5） |
| `articles/black-fungus-anticoagulant-bleeding-risk` | cranberry, ginger-extract, omega-3…（5） |

**注意這裡跟第一節接上了**：缺口最大的那批文章提到的，正好是 1-D 那批「已索引但排不上」的通用成分頁（omega-3 全站被提 52 次只被連 2 次、vitamin-d 32 提 1 連、dietary-fiber 30 提 0 連、probiotics 25 提 1 連、collagen 17 提 0 連、vitamin-c 17 提 0 連、folate 15 提 0 連）。**站上最常被講到的成分，正好是內鏈最少、也最沒曝光的那批。**

### 2-3｜一個結構性的洞：45 篇文章的「相關成分」區必定空白

`src/pages/articles/[slug].astro` 與 `myths/[slug].astro` 的邏輯是：只要 `relatedArticles`／`relatedMyths`／`relatedIngredients` **任一**有值，就整組關掉自動推薦（`getAutoRelated`）。

| collection | 有填 relatedIngredients | 填了其他 related 但成分留空 → 自動推薦被關掉、成分區必然空白 | 完全沒填 → 走自動推薦 |
|---|---|---|---|
| articles（225） | 33 | **45** | 147 |
| myths（113） | **0** | 0 | 113 |

那 45 篇是自己把成分出口關掉的，包含站上曝光最高的機會頁之一 `articles/black-fungus-anticoagulant-bleeding-risk`（GSC「吃抗凝血劑可吃黑木耳嗎」154 曝光、排名 8.7、CTR 0.6%）。

myths 那邊 113 篇全部是 `relatedIngredients: []`，靠 tag 自動推薦補，每桶上限 2 篇且只認 tag 重疊——**沒有一篇闢謠是人工指定成分頁的**。

### 2-4｜成分頁彼此不互連

逐叢集數「A 頁的正文有沒有連到 B 頁」：

| 叢集 | 已連 / 可能配對 |
|---|---|
| 競爭吸收（calcium・magnesium・zinc・iron） | **0 / 12** |
| 脂溶性維生素與鈣代謝軸（D・K・A・E・calcium・magnesium） | **0 / 30** |
| 腸道（probiotics・prebiotics・postbiotics・dietary-fiber・psyllium） | **0 / 20** |
| 抗凝血共同禁忌（omega-3・krill-oil・魚油劑型・nattokinase・turmeric・quercetin 等） | 3 / 72 |
| 助眠（melatonin・valerian・gaba・l-theanine・5-htp・magnesium・tart-cherry） | 3 / 42 |
| 適應原（ashwagandha・rhodiola・ginseng・maca・tongkat-ali・bacopa） | **0 / 30** |
| 運動表現（creatine・hmb・beta-alanine・whey-protein・taurine・l-carnitine） | 1 / 30 |
| 抗老 NAD（nmn・resveratrol・urolithin-a・spermidine・ergothioneine・coq10） | **0 / 30** |
| 肝臟（milk-thistle・nac・glutathione・alpha-lipoic-acid・蜆精・雞精） | 1 / 30 |
| 血脂（red-yeast-rice・plant-sterols・omega-3・berberine・psyllium） | **0 / 20** |
| 美容口服（collagen・hyaluronic-acid・glutathione・vitamin-c・珍珠粉・燕窩・opc） | **0 / 42** |
| 眼睛（lutein・zeaxanthin・劑型比較・astaxanthin・opc） | 4 / 20 |
| 魚油家族（omega-3・劑型比較・krill-oil） | 3 / 6 |
| 菇蕈（lions-mane・reishi・antrodia・beta-glucan・ergothioneine） | 4 / 20 |

**唯一有互連的是 2026-09 那批新稿**（魚油劑型、葉黃素劑型、靈芝、牛樟芝、蜆精、四物飲、玉米黃素）。**2026-08 以前寫的成分頁，彼此之間幾乎零連結。**「抗凝血共同禁忌」這個叢集特別可惜——站上流量最好的那組查詢全部繞著它轉（吃抗凝血劑可吃黑木耳嗎 154 曝光、吃清血药可以吃鱼油吗 24、凝血差的人能吃磷虾油吗 25），但 72 個可能配對只連了 3 個。

---

## 三、成分 ↔ 文章／闢謠 交叉覆蓋

判定方式：以成分中文名／英文名／常見別名比對 articles 與 myths 的 **title + slug + tags**（正文提及另外算，見第二節）。以下每一條都已 grep 過 `src/content/` 確認站上真的沒有。

### 3-1｜有成分頁、有曝光，但沒有任何情境決策文（articles）也沒有闢謠

按 28 天曝光排序，只列滿兩週且曝光 ≥50 的：

| 成分頁 | 曝光 | 排名 | 現況 |
|---|---|---|---|
| tongkat-ali 東革阿里 | 250 | 6.7 | 0 article / 0 myth / 0 入鏈 |
| urolithin-a 尿石素 A | 227 | 8.3 | 0 / 0 / 0 入鏈；同時是 GA4 近 28 天成分頁瀏覽第一（26 次） |
| ergothioneine 麥角硫因 | 226 | 7.8 | 0 / 0 / 0 入鏈 |
| spermidine 亞精胺 | 213 | 11.2 | 0 / 0 / 0 入鏈 |
| alpha-lipoic-acid α-硫辛酸 | 157 | 11.7 | 0 / 0 / 0 入鏈 |
| valerian 纈草 | 157 | 8.0 | 0 / 0 |
| opc 寡聚原花青素 | 153 | 7.2 | 0 / 0 |
| lions-mane 猴頭菇菌絲體 | 134 | 11.1 | 0 / 0 |
| nac N-乙醯半胱胺酸 | 133 | 9.8 | 0 / 0 / 0 入鏈 |
| hmb | 123 | 13.2 | 0 / 0 |
| sulforaphane 蘿蔔硫素 | 86 | 8.6 | 0 / 0 / 0 入鏈 |
| prebiotics 益生元 | 86 | 8.0 | 0 / 0 |
| l-carnitine 左旋肉鹼 | 83 | 10.7 | 0 / 0 |
| plant-sterols 植物固醇 | 73 | 7.6 | 0 / 0 |
| tart-cherry 酸櫻桃 | 65 | 10.6 | 0 / 0 |
| sesamin 芝麻素 | 64 | 11.7 | 0 / 0 / 0 入鏈 |
| selenium 硒 | 58 | 7.3 | 0 / 0 / 0 入鏈 |
| psyllium 洋車前子 | 57 | 8.6 | 0 / 0 |
| beta-alanine β-丙胺酸 | 57 | 10.2 | 0 / 0 |
| evening-primrose-oil 月見草油 | 54 | 11.5 | 0 / 0 |

### 3-2｜有 myth 沒有 article

`bromelain`（鳳梨酵素）、`collagen`、`glucosamine`、`iodine`、`lutein`／`zeaxanthin`、`vitamin-c`、`vitamin-d`、`whey-protein`。
這些是「被破過謠、但沒有給讀者一條可執行的決策路徑」的成分。

### 3-3｜有 article 沒有 myth

melatonin（12 篇 article）、red-yeast-rice（5）、creatine（4）、nmn（3）、berberine／glutathione／krill-oil／astaxanthin／iron／dietary-fiber／gaba（各 2）。
melatonin 這一條特別值得注意：**12 篇文章撐起全站超過六成曝光，卻沒有任何一篇闢謠**，而 GSC 上「褪黑激素」相關查詢有一整叢 CTR 偏低的（`褪黑激素` 66 曝光 3.0%、`退黑激素` 32 曝光 6.3%）。

---

## 四、母體缺口：台灣市場常見、站上完全沒有的成分

需求證據以**站內反覆提及**為主（GSC 對「站上沒有的頁」無法給證據，見開頭判讀規則 2）。「深度提及」＝該成分名在該篇出現 ≥3 次。

| 缺的成分 | 站內深度提及 | 已有的相關內容 | GSC 佐證 | 建議 |
|---|---|---|---|---|
| **咖啡因** | **15 篇**（`myths/coffee-osteoporosis-calcium-myth` 81 次、`myths/empty-stomach-coffee-stomach-damage-myth` 63 次、`articles/taurine-energy-drinks-how-much-is-too-much` 38 次） | 2 篇 myth、2 篇 article 以咖啡為題 | 無（站上沒有該頁） | **最高優先**。站上已經有一整叢咖啡因內容卻沒有成分頁可以收攏，是現成的樞紐 |
| **電解質** | **11 篇**（`myths/sweat-electrolyte-sports-drink-myth` 52 次、`myths/muscle-cramp-calcium-myth` 26 次、`articles/food-poisoning-when-see-doctor` 14 次） | 1 篇 myth 以它為題 | 無 | 高。橫跨運動、腹瀉脫水、抽筋三個既有題群 |
| **維生素 B12** | **9 篇**（`articles/vitamin-b12-deficiency-guide` 131 次、`myths/vegetarian-always-healthy-myth` 45 次、`articles/plant-based-diet-nutrients-beyond-b12` 22 次） | 2 篇 article ＋ 1 篇 myth 以它為題；`vitamin-b-complex` 成分頁不等於 B12，且該頁 28 天曝光為 0 | 無 | 高。站上投了 3 篇稿在這個題目上，卻沒有成分頁承接 |
| **色胺酸** | 2 篇但極深（`myths/milk-before-bed-sleep-myth` 123 次、`articles/5-htp-regulation-taiwan-us-eu` 18 次） | 5-HTP 有成分頁，但色胺酸與 5-HTP 不是同一件事 | 無 | 中高。可直接補進助眠叢集，順便把 2-4 節那個 3/42 的助眠互連補起來 |
| **軟骨素 / 非變性二型膠原（UC-II）** | 1 篇但極深（`myths/glucosamine-chondroitin-oa-reversal-myth` 28 次） | 葡萄糖胺有成分頁，軟骨素沒有 | 無 | 中 |
| **木瓜酵素 / 消化酵素** | 2 篇（`myths/pineapple-papaya-enzyme-digestion-myth` 34 次） | 鳳梨酵素有成分頁（排程中，09-14），木瓜酵素沒有 | **有**：`木瓜酵素消炎` 3 曝光排名 11、`木瓜酵素 鳳梨酵素` 2 曝光排名 11 | 中。少數有 GSC 實證的一條 |
| **肌醇 inositol** | 2 篇（`articles/inositol-pcos-anxiety-insomnia` 43 次、`articles/pcos-diagnosis-insulin-resistance-guide` 18 次） | 1 篇 article 以它為題 | 無 | 中 |
| **BCAA / 支鏈胺基酸** | 1 篇（`articles/midlife-fitness-supplement-vs-young` 16 次） | 無 | 無 | 中低。可與運動表現叢集一起補（該叢集互連 1/30） |
| 綜合維他命 | 4 篇 | 無 | 無 | 低。嚴格說不是單一成分，若寫應該寫成 article 不是 ingredient |

**查過、確認站上沒有、但站內外都找不到需求證據，不建議現在寫**：冬蟲夏草、茄紅素、螺旋藻／綠藻、甜菜根、麩醯胺酸、精胺酸、瓜氨酸、藤黃果、白腎豆、甲殼素、CLA、D-甘露糖、卵磷脂、MSM、PQQ、MCT、接骨木莓、紫錐菊、聖潔莓、神經醯胺、大麥若葉、桑黃。列在這裡是為了下次不用再查一次。

---

## 五、可直接執行的清單（依「投入 vs 可能回收」排序）

**不寫新稿就能做的（前四項）**

1. **把 45 篇「相關成分區必定空白」的文章補上 `relatedIngredients`。** 名單在 `docs/audits/` 這份的第 2-3 節可重跑取得；優先做 `black-fungus-anticoagulant-bleeding-risk`、`fish-oil-blood-thinner-interaction`、`krill-oil-anticoagulant-can-i-take-it`、`creatine-creatinine-kidney-checkup-red-flag`、`colostrum-supplement-kids-immunity-worth-it`——這五篇都在 GSC 機會查詢名單上。
2. **正文補內鏈，從第 2-2 節那 7 篇「提到 5 個以上成分卻零連結」的文章開始。** 一篇補 5～8 條，7 篇就是約 50 條，全部指向 1-A／1-D 那批排不上的成分頁。
3. **把抗凝血共同禁忌叢集接起來**（目前 3/72）。這是全站曝光最集中的主題，omega-3、krill-oil、魚油劑型、nattokinase、turmeric、quercetin 六頁互指。
4. **改 `ergothioneine` 的 description 直接回答「每日攝取量」**。GSC 該查詢 40 曝光、排名 7.9、CTR 2.5%，是全站最省力的一筆 CTR 修正。順便看 1-B 其他 CTR 0% 的頁（alpha-lipoic-acid、selenium、prebiotics、beta-alanine、5-htp）。

**要寫新稿的**

5. **咖啡因成分頁**（母體缺口第一名，15 篇深度提及等著連進來）。
6. **電解質成分頁**（11 篇深度提及，橫跨三個既有題群）。
7. **維生素 B12 成分頁**（站上已投 3 篇稿，缺一個承接的成分頁）。
8. **給 1-C／3-1 那批「零 article 零 myth 的高曝光孤兒頁」各配一篇情境決策文**，先做曝光前五：tongkat-ali、urolithin-a、ergothioneine、spermidine、nac。寫法照 `docs/playbooks/winning-article-formula.md`，切角要是「什麼情況該考慮／不該考慮」而不是再寫一次成分介紹（那會撞 `pnpm check:boilerplate`）。
9. **色胺酸成分頁**，同時把助眠叢集互連補起來（目前 3/42）。
10. **melatonin 的第一篇闢謠**（12 篇 article 零闢謠，且該叢集查詢 CTR 普遍偏低）。

**依站主長期指示，銀杏與維生素 E 不列入以上任何建議。**

---

## 六、本次沒做 / 限制

- 唯讀盤點，除本檔外未修改任何檔案。
- 「提及」比對用的是中文名／英文名／別名的字串包含，短名（鎂、鐵、硒、碘、鉻）可能有少量誤判；第四節與第五節列出的每一條缺口都另外 grep 過 `src/content/` 逐一確認。
- `turmeric` 的索引狀態本次 API 回 ERR500，未取得，下次跑 `pnpm index:coverage` 再確認。
- 未跑 `pnpm build`（避免撞並行 agent），因此本檔沒有 `pnpm check:site` 的死連結／出口數據。
