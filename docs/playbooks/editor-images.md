# Playbook：前台編輯器的影像系統 + AI 輔助 + Zod 存檔 gate

> 2026-06 自 appi.news 反向移植的編輯器強化。本份說明影像（封面/內文）、AI 生圖/找圖/標籤/alt、
> 多檔單一 commit、以及「存檔前 Zod 驗證」的運作與設定。spine 核心（登入/面板/雙分頁/部署輪詢）見
> [`editor-spine.md`](./editor-spine.md)。

## 何時看這份

- 改封面欄位 `CoverField.svelte`、圖片選擇器 `ImagePicker.svelte`、內文編輯器 `BodyEditor.svelte` 的插圖流程
- 改影像工具：`image-compress.ts`、`image-upload.ts`、`git-commit.ts`、`list-images.ts`、`gen-session.ts`
- 改 AI 輔助：`tags-suggest.ts`、`ai-worker.ts`，或 `workers/ai-suggest/`（生圖/找圖/標籤/alt 端點）
- 改存檔驗證來源 `src/content.schemas.ts`、或表單欄位描述子 `src/utils/editor/seo-schema.ts`
- 把編輯器掛到新內容類型 / 調整某集合的封面欄位 key

## 一、單一真相 schema（`src/content.schemas.ts`）

6 個集合的 Zod schema 全部集中在 `src/content.schemas.ts`（用 `astro/zod`，瀏覽器/vitest 可打包）：

- `content.config.ts` 只負責 `defineCollection` 包裝，schema 全 import 自此。
- 編輯器存檔前呼叫 `validateFrontmatter(collection, frontmatter)` 用**同一份** schema 驗證。
- 結果：**「編輯器存檔驗證通過」== 「build 不會因 frontmatter 出錯」**，零漂移。改任何欄位只改這一支。
- 新增的共用可選欄位：`coverAlt`、`coverImageCredit`（封面替代文字 + 圖庫攝影師署名），加在全集合，皆 optional。

> ⚠️ 存檔 gate 是**硬擋**：新內容若缺該集合必填欄位（如 myths 的 `verdict`/`references`、videos 的 `youtubeId`），
> 會被擋下並標示欄位。這是刻意的——擋在前面總比 build 掛掉好。先用「進階欄位（YAML）」或表單補齊再存。

## 二、混合式表單（`SeoFields.svelte` + `seo-schema.ts`）

`SeoFields` 由**欄位描述子**驅動，跨 6 集合通用：

- `getCoreFields(collection)`：回該集合的核心 widget 欄位（`title`/長文摘要全寬在上；`tags`/日期/`author`/`category`/`source`/`draft`/`featured` 等進右欄）。
- `getCoverConfig(collection)`：回封面欄位 key（多數 `coverImage`；**news 用 `heroImage`**；myths 的 alt 用既有 `imageAlt`）。
- `handledKeys(collection)`：核心 + 封面 key；其餘 frontmatter 一律落到可折疊「進階欄位（YAML）」區即時解析。
- **`category`/`author` 維持自由文字**（本站無分類法、無 authors 集合）——不做下拉、不建集合。
- `tags` 旁有「從內文推薦標籤」按鈕 → `tags-suggest.ts` → worker `/tags`。

要給某集合多開/少開 widget 欄位，改 `seo-schema.ts` 的 `CORE_BY_COLLECTION` / `COVER_BY_COLLECTION` 即可，毋須動元件。

## 三、影像：封面 + 內文

共用 `ImagePicker.svelte`（四分頁）：

| 分頁 | 來源 | 行為 | 需要 |
|---|---|---|---|
| AI 生成 | OpenAI / Flux | `/generate-async` 拿 jobId → 每 3s 輪詢 `/generate-status` | worker `OPENAI_API_KEY` 或 `FAL_KEY` |
| AI 找圖庫 | Unsplash / Pexels | `/keywords`（依本文）+ `/stock`（搜尋、去重、署名） | worker `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` |
| 上傳 | 本機檔案 | 直接選檔 | 無 |
| 圖庫 | repo 既有圖 | `list-images.ts` 列 `public/{generated,covers,images}` | 已登入 |

落地規則（封面走 `CoverField`、內文走 `BodyEditor` 的工具列 ✦ 鈕）：

- **生成 / 上傳**：`image-compress.ts` 壓成 ≤1280 寬 WebP → 經 `addPending()` 登記為待提交，存檔時與 `.mdx` 打包成**單一 commit**（`git-commit.ts`，Git Data API）。當場用 blob URL 預覽，存檔時 `toStore()` 換回 `/images|/covers` 正式路徑。
- **圖庫照片（stock）**：存外部絕對 URL + 攝影師署名（`coverImageCredit` / 內文 `<figure><figcaption>`），不下載、不壓縮。
- **內文 `<img>` 一律自閉**：MDX 把未自閉的 `<img ...>` 當 JSX 並要求閉合標籤 → build 失敗、整站部署中斷。`BodyEditor` 的 `figure` 樣板用 `<img ... />`，且 `toStore()` 存檔前以 `selfCloseImg()` 把 TOAST WYSIWYG 重序列化吐出的 void `<img src="...">` 一律正規化成自閉形式。曾因此讓 `observational-study-nutrition-research-trap.mdx` 連續 build fail（見「踩過的坑」）。
- **既有 repo 圖**：直接設站內路徑。
- 封面落 `public/covers/`、內文圖落 `public/images/`；存檔只打包「內容實際引用到」的圖（過濾 re-roll 孤兒）。

### 保留生成圖（gen-session.ts）

每次生成都記在模組級 session。關閉編輯器前，若有「生成了但沒用到」的圖，跳出對話框問是否**歸檔到 `public/generated/`**（避免付費生成被丟）。勾選的會以單一 commit 存進圖庫供日後重用。

## 四、AI Worker（`workers/ai-suggest/`）

端點：`/config`、`/generate-async`、`/generate-status`、`/generate`（舊版同步）、`/tags`、`/keywords`、`/stock`、`/alt`、`/suggest`。全部先驗 GitHub token 對 repo 的 push 權。

- 生圖鐵律：`applyPeopleDirective()` 對所有生圖 prompt 強制「畫面若有人物一律台灣人」。
- 文字端點（tags/keywords/alt/suggest）用 Anthropic（`ANTHROPIC_MODEL`，預設 haiku）。
- `wrangler.toml` 需 KV（`GEN_JOBS`）+ Queue（`GEN_QUEUE` / `evidencetoday-gen`）；OpenAI 同步 API 靠 Queue consumer 背景生圖，Flux 走 fal 原生佇列。

### 部署（需帳號互動，用 `! npx wrangler …` 由本人執行）

1. `npx wrangler kv namespace create GEN_JOBS` → 把回傳 id 填回 `wrangler.toml` 的 `GEN_JOBS.id`
2. `npx wrangler queues create evidencetoday-gen`
3. secrets：`npx wrangler secret put ANTHROPIC_API_KEY`（必填）；選配 `OPENAI_API_KEY` / `FAL_KEY` / `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY`
4. `npx wrangler deploy`（在 `workers/ai-suggest/`）
5. 內文「AI 潤飾/摘要」由 `EditorPanel.svelte` 的 `AI_ENABLED` 控制（**目前 `true`**，與標籤/alt/生圖/找圖一致開啟）；要一鍵關掉潤飾/摘要省錢就改回 `false`。生圖/找圖/標籤/alt 各在 ImagePicker/SeoFields/CoverField，不受此旗標影響。

> 缺某把 key 時，對應功能回可讀錯誤、其餘照常（如缺 FAL_KEY → Flux 502；缺 Unsplash/Pexels → 找圖回空）。

## 五、圖庫去重 + 前台封面呈現

- **去重產生器**：`scripts/used-images.mjs`（接在 `package.json` 的 `prebuild`）掃全部 6 集合內容裡的 Unsplash/Pexels URL，產 `public/admin/used-images.json`（`{ids:[…]}`，已 gitignore，build 時重生）。`CoverField` 載入時 fetch 它當 `exclude` 傳給 worker `/stock`，避免推薦站上用過的圖。識別規則 `provider:id` 必須與 worker `stockImageId()` 一致；改其一要同步另一。
- **前台封面**：`coverAlt` 已接到 `ArticleCard` / `IngredientCard`（`<img alt>` fallback）與 `news/[slug]` hero（`alt`）；`coverImageCredit` 在 news hero 右下角以 `攝影：…` 浮層顯示（stock 圖授權署名）。articles/ingredients 詳情頁本站設計無大封面圖，故 credit 主要呈現在 news hero 與卡片縮圖 alt。

## 驗證清單

- `pnpm test`（含 `content.schemas.test.ts`、`git-commit`/`image-compress`/`tags-suggest`、worker `index.test.ts`）全綠。
- `pnpm build` 零錯誤（單一真相 schema + 6 集合掛載 EditButton + 影像元件編譯）。
- 本機注入 token：六種內容頁右下角浮出「編輯」→ 開面板 → 封面選擇器四分頁可用、進階 YAML 可改、填壞必填 → 存檔被 Zod gate 擋下。
