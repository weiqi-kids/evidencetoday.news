# Playbook：成分解析列表縮圖（cover thumbnail）

> 2026-07-21 建立、07-22 全面照片化。統一 `/ingredients` 列表卡片縮圖：41 篇全部使用
> 「與該營養素相關的食物」真實照片（14 篇 Unsplash + 27 篇 Wikimedia Commons）。前台渲染在
> `src/components/blocks/IngredientCard.astro`（`coverImage` → 16:9 `object-fit:cover`）。

## 縮圖的兩種來源

| 型態 | 存法（frontmatter `coverImage`） | 檔案 | 誰在用 |
|---|---|---|---|
| Unsplash 照片 | `https://images.unsplash.com/...`（絕對 URL，不下載） | 外連 | 14 篇 |
| Wikimedia Commons 照片 | `https://upload.wikimedia.org/.../1024px-...`（絕對 URL，不下載） | 外連 | 27 篇（見下表） |
| 本地插畫 SVG | `/images/ingredients/<slug>-thumb.svg` | repo 內 SVG | 備援（現無 frontmatter 引用，勿刪） |

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

## 27 篇 Commons 照片 ↔ 食物對應（放圖邏輯）

蝦紅素→熟蝦｜鈣→玻璃瓶鮮奶｜膽鹼→籃裝雞蛋｜輔酵素Q10→花生｜膠原蛋白→大骨高湯麵｜肌酸→冰鎮鯖魚｜
膳食纖維→燕麥片｜葉酸→菠菜｜人參→人參根｜葡萄糖胺→螃蟹（甲殼類）｜鐵→生牛肉韃靼｜葉黃素→甜玉米｜
鎂→黑巧克力｜褪黑激素→櫻桃｜水飛薊素→水飛薊花｜Omega-3→生鮭魚切片｜OPC→紅葡萄｜益生菌→白菜水泡菜｜
南瓜籽→南瓜籽｜薑黃→薑黃根+粉｜維生素A→彩色胡蘿蔔｜維生素B群→全麥麵包｜維生素C→檸檬｜
維生素D→漬沙丁魚｜維生素E→杏仁｜維生素K→綠花椰菜｜鋅→生蠔
（`coverAlt` 描述實際畫面、`coverImageCredit` 記作者+授權；地區版 CC 亦屬有效授權）

## 14 篇既有照片稽核（2026-07-21）

- **無一放錯營養素**。11 篇到位（ashwagandha 根、lions-mane 菇、nattokinase 納豆、postbiotics 優格、
  saffron 花絲、spermidine 小麥、sulforaphane 花椰菜芽、taurine 貝類海鮮、tongkat-ali 根、
  urolithin-a 石榴、hyaluronic-acid 精華滴管—玻尿酸無食物來源，滴管為標準呈現）。
- **偏通用、可日後升級（非錯誤）**：`gaba`（手拿膠囊）、`glutathione`（保健品瓶）、`colostrum`（白色粉末）
  未呈現食物來源。若要升級：glutathione→蘆筍/菠菜，gaba→發酵食物/茶/番茄，colostrum→牛乳意象。

## 自動找照片管線（scripts/fetch-ingredient-photos.mjs + Actions）

雲端 CCR session 的網路政策擋掉所有圖庫網域，無法在 session 內直接抓圖；解法是把「搜圖」
外包給 **GitHub Actions runner（網路不受限）** 跑，流程：

1. `scripts/fetch-ingredient-photos.mjs`：內建 27 個成分的策劃搜尋關鍵字（放圖邏輯的機器可讀版），
   搜 **Wikimedia Commons API**（免金鑰，`filetype:bitmap` 過濾 PDF/影片），只收自由授權
   （CC0/PD/CC BY*/CC BY-SA* 含地區版/Attribution/Copyrighted free use/No restrictions）的
   JPEG/PNG、原圖寬 ≥800，每成分抓 3 張候選縮圖 + `manifest.json`（1024px 標準桶寬 hotlink URL、
   授權、作者、來源頁）落到 `tmp-photo-review/`。作者署名接 `coverImageCredit`（CC BY/BY-SA 必署名）。
   坑備忘（2026-07 驗證）：① Unsplash 無 key 的 napi 端點回 401；② ai-suggest worker `/stock` 的
   push 權驗證吃不了 Actions installation token（`GET /repos` 回應無 `permissions` 欄）→ 403；
   ③ Commons 縮圖寬度會吸附到標準桶值（要 480 回 500px URL），比對縮圖 URL 用 `/\d+px-/` 別寫死；
   ④ `upload.wikimedia.org` 連續下載會 429，需 700ms 間隔 + Retry-After 退避
   （deploy.yml 的外連檢查因此把該網域列入 `--exclude`，否則每次部署被限流拖 30 分鐘）；
   ⑤ **（2026-07-22 事故）縮圖 URL 一律以 API 回傳的 thumburl 為準，禁止自行改寫寬度**——
   手改 `/1024px-` 全數 404、前台縮圖全破。事後修復工具 `scripts/fix-ingredient-photo-urls.mjs`
   （runner 上 HEAD 驗證全部 coverImage、壞的向 API 重取合法 thumburl 並驗 200 後改寫 frontmatter；
   其臨時 workflow 已於修復完成後移除，重跑從 git 歷史撈 `ingredient-photo-fix.yml`）。合法桶值
   實測為 1280（25 篇）；原圖過小者直接用原圖 URL（2 篇）。
2. 臨時 workflow `ingredient-photos.yml`（**任務完成後已移除**，要重跑從 git 歷史撈：
   分支 `claude/ingredient-thumbnails-image-logic-e6it91` 的 `.github/workflows/`）：
   push 且 commit message 含 `[fetch-photos]`（或手動 dispatch）才觸發；runner 跑完把
   `tmp-photo-review/` 用 `GITHUB_TOKEN` 推回同一分支（此類 push 不會再觸發其他 workflow）。
   腳本支援 argv 指定 slug 補撈並合併 manifest（`node scripts/fetch-ingredient-photos.mjs calcium`）。
3. 回到 session `git pull`，**逐張目視驗收**候選圖（照片內容必須符合放圖邏輯，禁止不看圖就接線），
   從 manifest 取 `canonical` URL 填 `coverImage`（與既有 14 篇同參數格式
   `?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`）、重寫 `coverAlt` 描述實際畫面、
   `coverImageCredit` 填攝影師名。
4. 驗收接線完成後：刪除 `tmp-photo-review/` 與臨時 workflow、`pnpm build` 零錯誤再 push。
   搜尋關鍵字要防「同名陷阱」：glass of milk→奶玻璃工藝品、peanuts→史努比、crab→蟹狀星雲、
   broccoli→寶塔花椰菜、cherries→櫻桃木、herring→海鷗叼魚（皆實際踩過，目視驗收不可省）。

另一條人工路：站內編輯器 `ImagePicker`（見 [`editor-images.md`](./editor-images.md)）。
本地 `-thumb.svg` 插畫保留當備援（`IngredientCard` 對缺圖會退回品牌佔位，不會開天窗）。
