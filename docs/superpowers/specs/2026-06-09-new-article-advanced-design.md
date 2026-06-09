# 新增文章進階選項設計（自訂網址 + AI 寫作任務）

- 日期：2026-06-09
- 狀態：設計定案，待實作
- 適用：evidencetoday.news 前台編輯器新增文章流程（接續 `2026-06-08-inline-mdx-editor-design.md`）

## 目標

在 `/admin` 新增文章流程加一個可展開的「進階選項」：
1. **自訂網址**：選填；留空則由標題自動產生（拼音），填了則須符合 `^[a-z0-9-]+$` 才能建立。
2. **AI 寫作任務**：給標題＋選填的「寫作方向／參考資料源／想表達的結論」，按「建立 AI 寫作任務」用 GitHub Issue 開一張「寫作工單」交給 Claude Code（CLI）撰寫；畫面追蹤到文章檔案產出後自動轉進編輯畫面。

**不需要 Anthropic 金鑰、不需要 AI Worker**——只用編輯器既有的 GitHub OAuth token（`public_repo` 可建 issue、讀檔）。AI 撰寫由 Claude Code 在 repo 上完成（repo-aware、依站台 schema 與證據標準、references 用真實連結、以 PR 回傳），品質遠優於 Worker 內聯單次 API 呼叫。

## 流程

### 自訂網址
- 進階區一個選填 input「自訂網址（slug）」。
- 「建立並編輯」與「建立 AI 寫作任務」前都先決定 slug：input 有值 → 須 `^[a-z0-9-]+$`（不符 `alert` 擋下）；空 → `slugFromTitle(title)`。

### AI 寫作任務
1. 進階區三個選填欄位：寫作方向、參考資料源、想表達的結論（textarea）。
2. 按「建立 AI 寫作任務」：驗標題非空、slug 合法 → `createArticleIssue(...)` 用 Issues API 開 issue（body = 結構化工單，label `article-draft`），回 `{ number, url }`。
3. 畫面切到「任務進行中」狀態：顯示「✍️ AI 寫作任務已建立（Issue #N，進行中）…」＋引導「可關閉（任務繼續，文章寫好後到該網址用編輯鈕改即可）或留著等候（完成自動開編輯畫面）」＋〔查看 Issue→〕＋〔關閉〕。
4. **輪詢**：每 ~15s `fileExists('src/content/<collection>/<slug>.mdx', token)`；檔案出現 → 「✅ 文章已產出！」→ 自動開 `EditorPanel`（EDIT 模式：`initialDoc=null`，`getFile` 載入 AI 寫好的內容讓作者檢視/修改/存檔）。
5. 關閉或元件 `onDestroy` 停止輪詢。

> **前提**：「直到寫好」的等候假設使用者建立任務後即去終端機跑 Claude Code 處理該 issue（寫 .mdx → PR/合併 → 檔案出現 → 偵測到 → 開編輯器）。晚點才跑或先關掉皆可——文章寫好後即為一般可編輯文章，到該網址按「編輯」即可。

## Issue 工單 body（`buildIssueBody`）

```markdown
## 文章寫作工單

- 分類（collection）: <collection>
- 標題: <title>
- 目標檔案: `src/content/<collection>/<slug>.mdx`
- 網址: `/<collection>/<slug>/`

### 寫作方向
<direction 或「未指定」>

### 參考資料源
<sources 或「未指定」>

### 想表達的結論
<conclusion 或「未指定」>

---
### 給寫作者（Claude Code）
- 依 `src/content.config.ts` 的 `<collection>` schema 填 frontmatter（必填欄位、`description` 字數上限）。
- 內容結構與風格參考既有 `<collection>` 文章與 `docs/playbooks/article-layout.md`。
- 健康資訊須有可信來源；`references` 用真實連結，**禁止杜撰**。
- 寫到目標檔案後以 **PR** 回傳（不要直接 push main）。
```

## 元件邊界

- `src/utils/editor/issue.ts`（新）：
  - `buildIssueBody({collection, title, slug, direction, sources, conclusion}): string`（純函式，可單元測試）。
  - `createArticleIssue({collection, title, slug, direction, sources, conclusion, token}): Promise<{number, url}>`（`POST /repos/{owner}/{repo}/issues`，title 例如 `[文章] <title>`，labels `['article-draft']`；mock fetch 測試）。
- `src/utils/editor/github.ts`（改）：加 `fileExists(path, token): Promise<boolean>`——`GET contents`，200→true、404→false、其他→丟錯（供輪詢；不要沿用會 throw 的 getFile）。
- `src/components/editor/NewArticle.svelte`（改）：進階區 UI（自訂網址 + 三欄 + 「建立 AI 寫作任務」按鈕）、任務狀態機（建立→進行中→完成）、輪詢、完成轉 `EditorPanel`（EDIT 模式）。沿用部署輪詢的 `setTimeout` + 旗標 + `onDestroy` 清理模式。

## 測試

- `buildIssueBody`、`createArticleIssue`、`fileExists` 以 vitest（mock fetch）單元測試。
- NewArticle 的 UI/輪詢/轉場以 `pnpm build` 驗證可編譯 + 部署後手動驗證。

## 範圍（YAGNI）

- **做**：自訂網址（選填+驗證）、建立 AI 寫作任務（issue + label）、任務輪詢檔案出現、完成轉編輯。
- **不做**：內聯 Anthropic API 代寫（已棄）、自動化 fulfillment（GitHub Action 自動寫——使用者目前手動跑 CLI）、issue 指派人/多 label、任務取消/重試 UI。

## 待實作時決定的細節
- issue 標題格式（預設 `[文章] <title>`）與 label 名稱（預設 `article-draft`；若 repo 無此 label，GitHub 會自動建立）。
- 輪詢間隔（預設 15s）。
