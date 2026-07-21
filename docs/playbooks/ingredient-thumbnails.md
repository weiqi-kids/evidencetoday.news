# Playbook：成分解析列表縮圖（cover thumbnail）

> 2026-07-21 建立。統一 `/ingredients` 列表卡片縮圖：把 27 篇「純文字」佔位縮圖改成
> 與該營養素相關的扁平食物插畫；14 篇既有真實照片保留。前台渲染在
> `src/components/blocks/IngredientCard.astro`（`coverImage` → 16:9 `object-fit:cover`）。

## 縮圖的兩種來源

| 型態 | 存法（frontmatter `coverImage`） | 檔案 | 誰在用 |
|---|---|---|---|
| 本地插畫 SVG | `/images/ingredients/<slug>-thumb.svg` | repo 內 SVG | 27 篇（見下表） |
| 圖庫照片 | `https://images.unsplash.com/...`（絕對 URL，不下載） | 外連 | 14 篇 |

- 兩種都合法：`IngredientCard.astro` 的 `safeCoverImage` 守衛對 `http(s)` 直接採用、對 `/…`
  本地路徑會 `existsSync` 檢查 `public/` 下是否存在，缺圖才退回品牌佔位 `/og-thumb/ingredients.webp`。
- **放圖邏輯（鐵則）**：縮圖必須呈現「該成分本身」或「富含該營養素的食物」。例：維生素 C→柑橘、
  鋅→牡蠣、鐵→紅肉。`coverAlt` 同步描述畫面內容（無障礙 + SEO）。

## 插畫 SVG 產生器

- 每張 `viewBox="0 0 1600 900"`，沿用該篇原本文字縮圖的底色（continuity），中央一枚淡色
  「盤子」橢圓 + 扁平食物主體。這批由一次性產生器批次輸出（未進 repo；SVG 本身即最終產物、可直接手改）。
- 要**改某一張插畫**：直接編輯 `public/images/ingredients/<slug>-thumb.svg`（純 SVG、無外部相依、
  build 安全）。改完在 375/768/1280 三寬度確認 + `pnpm build` 零錯誤。
- 要**驗證外觀**：本機無 SVG→PNG 工具時，可用 Playwright 的 headless chromium 對一張含所有縮圖
  的 HTML contact sheet 截圖檢視（`/opt/pw-browsers/.../headless_shell --headless --screenshot`）。

## 27 篇插畫 ↔ 食物對應（放圖邏輯）

蝦紅素→蝦｜鈣→牛奶｜膽鹼→蛋｜輔酵素Q10→花生（堅果）｜膠原蛋白→大骨湯｜肌酸→魚｜膳食纖維→麥穗穀物｜
葉酸→深綠葉菜｜人參→人參根｜葡萄糖胺→扇貝殼（甲殼類）｜鐵→紅肉｜葉黃素→玉米｜鎂→黑巧克力｜
褪黑激素→酸櫻桃+月亮｜水飛薊素→水飛薊花｜Omega-3→鮭魚｜OPC→葡萄（葡萄籽）｜益生菌→發酵蔬菜罐｜
南瓜籽→南瓜+籽｜薑黃→薑黃根+粉｜維生素A→胡蘿蔔｜維生素B群→全麥麵包｜維生素C→柑橘切片｜
維生素D→陽光+鮭魚｜維生素E→杏仁｜維生素K→綠花椰菜｜鋅→牡蠣

## 14 篇既有照片稽核（2026-07-21）

- **無一放錯營養素**。11 篇到位（ashwagandha 根、lions-mane 菇、nattokinase 納豆、postbiotics 優格、
  saffron 花絲、spermidine 小麥、sulforaphane 花椰菜芽、taurine 貝類海鮮、tongkat-ali 根、
  urolithin-a 石榴、hyaluronic-acid 精華滴管—玻尿酸無食物來源，滴管為標準呈現）。
- **偏通用、可日後升級（非錯誤）**：`gaba`（手拿膠囊）、`glutathione`（保健品瓶）、`colostrum`（白色粉末）
  未呈現食物來源。若要升級：glutathione→蘆筍/菠菜，gaba→發酵食物/茶/番茄，colostrum→牛乳意象。

## 想把插畫換成真實照片？

雲端 session 的網路政策會擋掉所有圖庫網域，無法在 CCR 環境抓圖；請走站內編輯器
`ImagePicker`（Unsplash/Pexels，需 worker `UNSPLASH_ACCESS_KEY`，見
[`editor-images.md`](./editor-images.md)）挑圖，`coverImage` 換成圖庫絕對 URL、`coverAlt` 依實際畫面重寫即可，
本地 `-thumb.svg` 可保留當備援。
