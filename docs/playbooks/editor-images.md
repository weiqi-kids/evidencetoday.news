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
- **圖庫照片（stock）**：存外部絕對 URL，**用標準 markdown 圖 `![攝影：…](url)` 插入內文**（攝影署名存進 `alt`）；封面署名走 `coverImageCredit`。不下載、不壓縮。
- **內文圖一律走標準 markdown 圖，不可注入原始 HTML `<figure>`**：TOAST WYSIWYG 無法 round-trip 原始 HTML——`setMarkdown` 灌入 `<figure><figcaption>` 會被重序列化拆成「未自閉 `<img>` + 裸文字」，造成兩個連動災情：(1) 圖在編輯器選完當下就消失（使用者回報「選圖沒出現」）；(2) 未自閉 `<img>` 讓 MDX 當 JSX 要求閉合標籤 → build 失敗、整站部署連續中斷。故 `onPick` 一律用 `editor.exec('addImage', …)` 插標準 markdown 圖；另在 `toStore()` 以 `selfCloseImg()` 把任何殘留 void `<img>` 正規化成自閉形式當防呆。曾因此讓 `observational-study-nutrition-research-trap.mdx` 連續 build fail。

### 內文圖庫圖的攝影署名（含可點連結）

不靠編輯器灌 HTML，改用「**存標準 markdown 圖 → build 時 rehype 轉 figure**」兩段式，避開 WYSIWYG 的 HTML round-trip 問題：

1. **存檔形式**：`BodyEditor.onPick` 選圖庫圖時，把攝影師名存進 `alt`、攝影師頁網址（worker `/stock` 回傳的 `creditUrl`，即 Unsplash `user.links.html` / Pexels `photographer_url`）記進 `creditMap`；`toStore()` 的 `applyCredits()` 以圖片 url 比對，重寫成 `![攝影師名](url "creditUrl")`（即把 creditUrl 放進 image title）。用 url 比對保底，TOAST 即使動了 alt/title 也能補回。
2. **前台呈現**：`src/utils/rehype-stock-figure.mjs`（掛在 `astro.config.mjs` 的 `markdown.rehypePlugins`，mdx 預設繼承）把「段落只含單一 `<img>`、且 title 是合法圖庫網址」的圖轉成 `<figure class="et-figure">` + `<figcaption>攝影：<a>名字</a></figcaption>`，樣式在 `global.css` 的 `.et-figure`。
3. **連結把關（確保不是幻想連結）**：rehype plugin 只接受 hostname 屬於 `unsplash.com` / `pexels.com`（含子網域）的 http(s) URL；其餘一律不轉、不產生連結。連結來源是圖庫 API 的真實攝影師頁，非 AI 編造。用 hast 結構化節點輸出（非 raw HTML 字串），MDX 會序列化成自閉 `<img />`，不會重蹈未自閉 build fail。測試見 `rehype-stock-figure.test.mjs`。

> 舊資料若只有 `<figure><figcaption>攝影：…</figcaption>` 而無 `creditUrl`（如早期手動修的 `observational-study-...mdx`），維持純文字署名不補連結——不編造不存在的連結。
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

## 六、封面圖診斷與批次補圖（維運手法）

> 2026-06-17「選了圖卻沒上首頁」案例沉澱的 SOP，遇到「封面沒顯示 / 想批次補封面」直接照這走，別重新摸索。

### A. 先分清是「沒存到」還是「快取舊版」

1. **看線上實際 HTML，不要只信瀏覽器畫面**（瀏覽器/CDN 可能給舊版）：
   ```bash
   curl -s https://evidencetoday.news/articles/ -o /tmp/live.html
   grep -o '<div class="article-card__image article-card__image--fallback"' /tmp/live.html | wc -l   # 佔位圖張數
   grep -c "<photo-id>" /tmp/live.html   # 某封面 URL 是否在線上
   ```
2. **本機建置比對**：`pnpm exec astro build`（跳過 prebuild 的 youtube sync）→ 同樣 grep `dist/articles/index.html` 與 `dist/index.html`。本機有、線上沒有 = 純快取/尚未部署；本機也沒有 = 真的資料問題。
3. 注意：`本日有據` 在 logo/footer 也會出現，**只有 `article-card__image--fallback` 那個 `<div>` 才是真的佔位卡**（`ArticleCard.astro`；`MythCard` 無封面、不算）。
4. 哪些文章缺封面：`grep -rLE "^coverImage:" src/content/articles/` 列出沒有 `coverImage` 的檔。

### B. 封面「選了卻沒存到」的已知根因

- `SeoFields.svelte` 的 `date` 欄位曾因 js-yaml 把 `publishDate` 解析成 **Date 物件**而顯示空白，使用者一觸碰即寫回 `''` → `z.coerce.date('')` 驗證失敗 → **整筆 `save()` 中止、連封面一起沒 commit**。已用 `toDateInputValue()` 修掉（細節見 [editor-spine.md「常見陷阱」](./editor-spine.md)）。**任何新增的 `date` 型欄位都要走 `toDateInputValue()`**。
- 教訓：存檔是「全有全無」的單一 commit（`EditorPanel.save()`）。**任一必填欄位驗證失敗，封面圖就一起被丟**。排查封面沒上時，先確認 Zod gate 有沒有默默擋下。

### C. 本地封面路徑在 production build 全數判定「不存在」的根因（2026-07-18 修）

- `ArticleCard.astro`／`IngredientCard.astro`／`Article.astro` 的封面安全守衛，對本地 `/…` 路徑原本用
  `existsSync(new URL('../../../public${coverImage}', import.meta.url))` 判斷檔案是否存在。這段相對路徑
  數學是拿**元件原始 src 檔案的目錄深度**去推算 `public/` 在哪；`astro dev` 下每個元件各自是一個 Vite
  模組，`import.meta.url` 忠實反映原始 src 路徑，因此開發模式測不出問題。
- 但 **production build（`astro build`，`pnpm dev` 之外的路徑）會把元件打包進 Rollup chunk**，多個原本
  分散的 src 檔案合併後共用同一個 chunk 檔的 `import.meta.url`；元件原始目錄深度與 chunk 實際落點不再
  對應，`../../../public` 這類相對推算因而失準——**本地封面路徑因此全數被誤判為不存在，退回品牌灰底
  佔位卡**。外部 `http(s)` 網址不受影響（該分支不會走到 `existsSync`），這正是「近期外連圖網址的文章都
  正常、舊有本地 SVG 封面的成分解析全數空白」的真正原因，實測影響線上 27 篇成分解析（幾乎全部本地
  SVG 封面）＋當時新增卻漏填封面的 10 篇文章／成分解析。三處元件的相對層數也彼此不一致
  （`ArticleCard`/`IngredientCard` 用 `../../../`、`Article.astro` 用 `../../`），巧合下 `Article.astro`
  在此次事故當下仍矇對，但屬同一個脆弱寫法、遲早會因下次重構打包深度改變而跟著壞。
- **修法**：改用 `existsSync(join(process.cwd(), 'public', coverImage))`（`node:path` 的 `join`）。
  `astro build` 執行時的行程 cwd 恆為專案根目錄（本機 `pnpm build`、GitHub Actions checkout 後都是），
  不受 Rollup 怎麼打包、chunk 落在哪個虛擬路徑影響，dev/build 兩種環境一致可靠。**日後任何要用
  `existsSync` 判斷 `public/` 下檔案是否存在的地方，一律用 `process.cwd()` 為基準，不要用
  `import.meta.url` 做相對路徑推算。**
- 驗證方式：`pnpm build` 後用 python/node 腳本正確切開每張卡片（`grep -c` 對單行 minified HTML
  不可靠、只會數「有幾行含關鍵字」而非「出現幾次」），統計 `dist/articles/index.html` 與
  `dist/ingredients/index.html` 裡 `--fallback` 卡片數是否歸零；並對照 `curl` 抓正式站 HTML 走同一套
  統計，本機與正式站數字若不一致，代表本機建置環境（如 Windows 開發機）跟 CI 有落差，須以正式站
  `curl` 結果為準。

### D. 用 `gh` token 直接呼叫 `/stock` worker 批次補封面（headless）

不想一篇篇開前台編輯器時，可直接打 AI worker 的 `/stock`（與編輯器同一來源，回真實 Unsplash/Pexels）：

```bash
TOKEN=$(gh auth token)                         # worker 驗證此 token 對 repo 有 push 權
curl -s -X POST https://evidencetoday-ai-suggest.lightman-chang.workers.dev/stock \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"keywords":"omega 3 fish oil capsule supplement"}'
# 回 photos[]：{ full, credit, creditUrl, provider, id }；full 即 coverImage 值
```

批次補圖流程（照 `CoverField` 的 stock 行為寫 frontmatter）：
1. 蒐集站上已用過的圖 id（避免重複）：`grep -rhE "^coverImage:" src/content/ | grep -oE "photo-[0-9]+-[a-z0-9]+|photos/[0-9]+" | sort -u`。
2. 每篇用主題關鍵字打 `/stock`，挑**第一張非重複的 unsplash**（站上慣例多用 unsplash URL）。
3. **逐張看圖再寫 alt**：下載 `full` 的 `w=400` 版用 Read 工具看，寫準確的繁中 `coverAlt`（無障礙＋符合站上慣例）。
4. **存檔前 HEAD 驗證每個 URL 回 200**（`ArticleCard` 對 https URL 不檢查存在性，404 會變破圖、比佔位圖更糟）。
5. 寫進 frontmatter 三欄：`coverAlt` / `coverImage`(=full) / `coverImageCredit`(=credit)。`pnpm build` 後確認佔位圖歸零。
6. 尊重「有選的用選的圖」：**已有 `coverImage` 的文章不要覆蓋**；只補真的空的。若 rebase 撞到使用者前台剛存的封面，保留對方（theirs）。

### E. 部署行為：`cancelled` ≠ 失敗

GitHub Pages 部署有 concurrency group，**同時只跑一個**。連續 push（例如使用者在前台連存幾次）會讓新部署**取消**還在跑的舊部署 → `gh run list` 看到一排 `cancelled` 是正常的，不是 build fail。只要最新 commit 是目標的祖先，**等最後一筆 `success` 即全部上線**；停止 push 約 5–6 分鐘（含 Pagefind 索引＋連結檢查）會自然完成。等待用 `until gh run list --workflow "Deploy to GitHub Pages" --limit 1 | grep -q completed; do sleep 20; done`。

## 驗證清單

- `pnpm test`（含 `content.schemas.test.ts`、`git-commit`/`image-compress`/`tags-suggest`、worker `index.test.ts`）全綠。
- `pnpm build` 零錯誤（單一真相 schema + 6 集合掛載 EditButton + 影像元件編譯）。
- 本機注入 token：六種內容頁右下角浮出「編輯」→ 開面板 → 封面選擇器四分頁可用、進階 YAML 可改、填壞必填 → 存檔被 Zod gate 擋下。
