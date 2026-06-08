# 前台 MDX 編輯器 — 架構與介面契約

- 日期：2026-06-08
- 狀態：架構與契約定案，待平行實作
- 適用：evidencetoday.news（Astro 5 + Svelte 5；生產目前在 GitHub Pages）

## 目標

讓管理者在已部署的前台頁面，登入後直接編輯／新增 Markdown/MDX 文章，存檔 commit 回 `main`，由既有 deploy workflow 自動重建上線。編輯時可看到真實渲染預覽、編輯結構化 SEO/AEO 欄位、取得 lint 與 AI 建議，並在存檔失敗時得到「下一步該怎麼做」的可行動引導。

## 本文件定位

這是**契約優先**文件：先定義各子系統之間的接縫（資料形狀、端點、函式簽名），讓隔離單元能平行開工而不互撞（避免重演 PR #93 式的平行衝突）。各子系統之後各自再寫實作計畫。

## 核心安全觀念

「偵測瀏覽者是否為管理者」拆兩層，真正的邊界在第二層：

1. **裝飾層（前端，可偽造）**：登入後把 GitHub OAuth token 存進 `sessionStorage`。頁面偵測到此值 → 顯示編輯入口；無 → 完全不顯示。只控制 UI 可見性，刻意不防竄改。
2. **真實層（GitHub 強制）**：存檔走 Contents API，GitHub 驗證 token 對 repo 的寫入權。無權者 commit 一律 403。

## 全域常數

```
owner   = weiqi-kids
repo    = evidencetoday.news
branch  = main
collections = articles | myths | ingredients | podcasts | videos | news
repoPath(collection, entryId) = `src/content/${collection}/${entryId}`   // entryId 含副檔名
```

## 單一事實來源（最關鍵的設計）

編輯器的記憶體模型 `EditDoc` 是所有單元的共同貨幣，徹底解耦各子系統：

```ts
type EditDoc = {
  repoPath: string;       // src/content/myths/x.mdx
  collection: string;     // myths
  slug: string;           // x
  sha: string | null;     // 編輯既有檔=最新 sha；新增=null
  frontmatter: object;    // 解析後的 frontmatter 物件
  body: string;           // frontmatter 之後的正文
};
```

- raw MDX 編輯器 ↔ `parse/serialize` 與 EditDoc 雙向綁定
- SEO 欄位表單 ↔ `EditDoc.frontmatter`
- lint 引擎 ← EditDoc
- 預覽 ← `serialize(EditDoc)`
- commit ← `serialize(EditDoc)` + `sha`

## 共同基礎模組（必須最先做）

`mdx-doc`：frontmatter 解析／序列化，所有 UI 與單元都依賴它。

```ts
parse(rawMdx: string): { frontmatter: object, body: string }
serialize(doc: { frontmatter: object, body: string }): string   // 須保留欄位順序、輸出可通過 build 的 YAML
```

序列化必須與現有內容風格一致（參考站上 frontmatter 慣例），避免每次存檔造成大量無意義 diff。

---

## 接縫契約

### ① Auth（OAuth Worker ↔ spine）

Cloudflare Worker，持有 client secret。

```
GET  /auth?state=<csrf>                → 302 至 github.com/login/oauth/authorize
GET  /callback?code=<c>&state=<csrf>   → 以 code+secret 換 token，
                                         302 回 https://evidencetoday.news/admin#token=<t>&state=<csrf>
```

- 前端 `/admin` 讀 URL fragment 的 `token`，比對 `state`，寫入 `sessionStorage.et_gh_token`，再清掉 fragment。
- 之後所有 GitHub API 呼叫帶 `Authorization: Bearer <token>`。
- secret 僅存 Worker env；redirect 來源限 `https://evidencetoday.news`。
- OAuth scope：取得對本 repo `contents` 寫入的最小 scope。

### ② Commit（spine ↔ GitHub Contents API）

```
讀: GET /repos/{owner}/{repo}/contents/{path}?ref=main  → { content(base64), sha }
寫: PUT /repos/{owner}/{repo}/contents/{path}
    body { message, content(base64), sha, branch:"main" }   // 新增檔則不帶 sha
```

- 編輯既有檔：點編輯時**重新 GET 最新 sha 與內容**（不用 build 當下的舊版），避免覆蓋他人變更。
- commit 訊息：既有 `content: 前台編輯 <slug>`；新增 `content: 前台新增 <slug>`。
- spine 需從頁面取得的資料（build 時寫入 island props）：`repoPath`、`collection`、`slug`。

### ③ Preview（SSR 端點 ↔ spine）

Astro hybrid：**僅** `/admin/preview` 一條路 SSR（`export const prerender = false`），其餘全站維持靜態。SSR 需 Cloudflare runtime（見「託管後果」）。

```
POST /admin/preview
  body { collection, slug, rawMdx }
  200  → 完整 HTML（用與線上相同的 layout/元件即時渲染）
  422  → { errors: string[] }（frontmatter/schema 驗證失敗）
```

- spine 把回傳 HTML 載入 iframe 顯示，得到 100% 真實渲染。
- SSR 單元可獨立開工：對固定 fixture（一份 rawMdx）開發，不需等 spine。

### ④ Lint（純函式 ↔ spine，無後端）

```ts
type LintResult = { level:'error'|'warn'|'info', field?:string, message:string, fix?:string };
lint(input:{ collection:string, frontmatter:object, body:string }): LintResult[]
```

- 客端執行，內容變更時 debounce 呼叫，結果顯示於側欄。
- 規則複用 `scripts/check-myth-quality.mjs` 邏輯（標題/描述長度、缺必填欄位、缺 alt、references 數量等）。
- 純函式 → 可完全獨立開發與單元測試。

### ⑤ AI 建議（AI Worker ↔ spine）

```
POST /suggest
  body { task:'rewrite'|'summarize'|'improve', context:object, selection:string }
  200  → { suggestion:string }
```

- 獨立 Cloudflare Worker，持 LLM API key（Worker secret）。
- spine 從編輯器按需呼叫，顯示建議由管理者採納或忽略。
- 後端獨立 → 可平行；前端接線依賴 spine。

### ⑥ SEO/AEO 欄位表單（表單元件 ↔ spine）

- 編輯器兩個面：**結構化 SEO/AEO 欄位** + **raw body**，兩者皆綁同一個 `EditDoc`（單一事實來源，不會各改各的）。
- 每個 collection 一份欄位描述子，驅動表單與即時標籤預覽：

```ts
type SeoFieldDescriptor = {
  key: string;            // frontmatter 欄位名，如 description / ogTitle / socialTitle
  label: string;
  type: 'text'|'textarea'|'image'|'list';
  maxLength?: number;     // 供 lint 與字數提示
  required?: boolean;
};
type SeoFormSchema = Record<Collection, SeoFieldDescriptor[]>;
```

- 表單旁即時顯示「會產生的 JSON-LD / meta 標籤」預覽（由 frontmatter 推導，與線上 `JsonLd` 元件/`<head>` 邏輯一致）。
- 此縫動到編輯器 UI，屬 spine 協調範圍，不與 spine 平行。

---

## 存檔狀態機（含可行動失敗引導）

`idle → validating → saving → {success | conflict409 | forbidden403 | network | validationFailed}`

每個終態都給「下一步」，不只報失敗：

| 狀態 | 訊息與可行動引導 |
|---|---|
| success | 「已存檔，部署中（約 1–2 分鐘上線）。」 |
| conflict409 | 「檔案已被自動化管線或他人更新。請按『重新載入最新版』，把修改重做一次再存；**若反覆衝突，請聯絡網站工程師協助處理合併。**」＋「重新載入最新版」按鈕 |
| forbidden403 | 「此 GitHub 帳號對 repo 無寫入權，無法存檔。請確認登入的是管理者帳號，或**聯絡網站工程師開通權限**。」 |
| network | 「網路或 GitHub 連線異常，變更尚未送出。請檢查網路後再按存檔；**你的編輯內容仍保留在此頁。**」 |
| validationFailed | 「frontmatter 格式有誤：&lt;具體錯誤&gt;。請修正後再存（常見：縮排、缺引號、日期格式）。」 |

`validating` 在送出前跑 `mdx-doc.parse` + 輕量 schema 檢查，把「改壞 main 導致部署 failure」（參考 2026-06-08 幽靈圖事件）擋在 commit 之前。

## 託管後果（待 ② 階段定案）

SSR 預覽端點需要 Cloudflare runtime。最乾淨是整站搬 **Cloudflare Pages**（靜態頁預渲染 + 一條 SSR function，與 OAuth/AI Worker 同平台）。過渡方案：生產維持 GitHub Pages，預覽端點另以 Cloudflare function 提供。此決策保留到實作 ② 時定案，不阻擋 ①④⑤ 開工。

## 平行化地圖

**先做（共同依賴）**：`mdx-doc`（parse/serialize）。被 spine、表單、預覽、lint 共用。

**可完全平行（隔離單元，吃明確輸入吐明確輸出）：**
- OAuth Worker（①）
- SSR 預覽渲染端點（③）— 對 fixture 開發
- lint 引擎（④）— 純函式
- AI 建議 Worker（⑤後端）

**一條線協調收斂（皆動編輯器 UI）：**
- spine（編輯器外殼 + token 接線 + commit + 存檔狀態機）
- SEO 欄位表單（⑥）、新增文章流程
- 最後一次整合，把各隔離單元依契約接上

## 範圍（YAGNI）

- **做**：登入/登出、編輯既有、新增文章、raw + SEO 表單雙面編輯、真實 SSR 預覽、lint + AI 建議、單檔存檔、最新 sha 抓取、衝突/權限/驗證的可行動失敗引導。
- **不做**（日後另議）：刪除檔案、圖片上傳、多檔批次、PR/他人審核流程、版本歷史 UI。

## 待實作時決定的細節

- token 回傳機制最終採 fragment redirect（本文件預設）或 popup+postMessage。
- 編輯入口首波先上哪些 collection（建議 articles + myths）。
- Worker 與 SSR 端點的實際網域、`/admin` redirect_uri 值。
- ② 階段的最終託管（整站 Cloudflare Pages vs 生產留 GH Pages + 預覽 function）。
