# 前台編輯器 WYSIWYG 升級設計

- 日期：2026-06-08
- 狀態：設計定案，待實作
- 適用：evidencetoday.news 前台 MDX 編輯器（接續 `2026-06-08-inline-mdx-editor-design.md`）

## 目標

把 `EditorPanel` 主編輯分頁的 body 從純 `<textarea>` 升級成**真·所見即所得（WYSIWYG）**編輯器：工具列（標題層級、粗體、斜體、超連結、清單、引用、圖片）＋ **圖片檔案上傳**。作者在主分頁看不到 markdown 語法；只有「原始碼」分頁才顯示 raw MDX。

## 前提（已驗證）

- 所有 articles / myths 的 body 都是**純 markdown**（無 MDX 元件、import、JSX）→ WYSIWYG 安全。實際用到的語法：H2/H3、粗體、斜體、超連結、項目/有序清單、引用。
- 站台圖片以**絕對路徑**供應；`public/images/` 已存在，檔案以 `/images/<檔名>` 供應。**禁用相對路徑行內圖**（會讓 Rollup build 失敗，見 2026-06-08 幽靈圖事件）。
- `EditorPanel` 已是 `{frontmatter, body}` 模型 + 「SEO 欄位 / 原始碼」雙分頁，且 lazy-load（匿名訪客不載入）。

## 套件選擇

**Toast UI Editor**（`@toast-ui/editor`，MIT）。開箱即有 WYSIWYG + 工具列 + `addImageBlobHook` 圖片上傳鉤子 + markdown round-trip，自寫程式最少。framework-agnostic（掛在 DOM 節點），與 Svelte island 相容。bundle 較大但隨 EditorPanel lazy-load，匿名訪客不載入。

## 架構

```
主分頁「編輯」：
  [標題]  [描述（摘要）]            ← 既有 SeoFields（title + description）
  ┌─────────────────────────────┐
  │ Toast UI WYSIWYG            │  ← body 編輯，工具列 + 圖片上傳
  │ (hideModeSwitch,           │
  │  initialEditType:'wysiwyg')│
  └─────────────────────────────┘
原始碼分頁：完整 raw MDX（frontmatter + body），照舊
```

## 資料流

1. 開啟編輯 → `getFile` → `parse(raw)` → `{frontmatter, body}`。
2. body 餵給 Toast UI：`editor.setMarkdown(body)`。
3. 編輯時：Toast UI `change` 事件 → `body = editor.getMarkdown()` 回寫模型。
4. 切「原始碼」分頁 / 存檔前：以最新 `body` `serialize({frontmatter, body})`。
5. 存檔：`putFile(serialize(...))`，同現況（含 409/403/驗證狀態機）。
6. SEO 欄位（title/description）仍由 `SeoFields` 綁 `frontmatter`，與 body 共用同一模型。

## 圖片上傳流程

1. 在編輯器拖曳 / 貼上 / 透過工具列選圖 → Toast UI 觸發 `addImageBlobHook(blob, callback)`。
2. 產生檔名：`<slug>-<timestamp>.<ext>`（slug 來自當前文章；ext 由 blob MIME 推導；timestamp 由前端傳入避免碰撞）。
3. 把 blob 讀成 base64 → Contents API `PUT public/images/<檔名>`（commit message `content: 上傳圖片 <檔名>`，branch main，新檔不帶 sha）。
4. 成功 → `callback('/images/<檔名>', altText)` → Toast UI 在 body markdown 插入 `![altText](/images/<檔名>)`。
5. 失敗（網路/403）→ 不插入，顯示可行動錯誤訊息（沿用存檔狀態機的措辭風格）。

**檔名/路徑邏輯抽成純函式** `imageUploadName(slug, mime, timestamp)` 與 `repoImagePath(name)`，可單元測試。

## 工具列範圍（YAGNI）

H2、H3、粗體、斜體、超連結、項目清單、有序清單、引用、圖片。**不放**表格、程式碼區塊、H1（內容未使用；H1 是文章標題、由 title 欄位管）。

## 元件邊界

- `BodyEditor.svelte`（新）：包裝 Toast UI，props `{ value, slug, onchange }`；負責 init/destroy、setMarkdown、change→onchange、註冊 `addImageBlobHook`（呼叫注入的 `uploadImage`）。
- `src/utils/editor/image-upload.ts`（新，純邏輯）：`imageUploadName`、`repoImagePath`、`uploadImage({blob, slug, token, timestamp})`（base64 + putFile 到 public/images）。可單元測試（mock fetch）。
- `EditorPanel.svelte`（改）：主分頁以 `BodyEditor` 取代 body `<textarea>`；維持 `{frontmatter, body}` 模型、原始碼分頁、存檔狀態機不變。

## 已知取捨 / 限制

1. **上傳圖片延遲顯示**：圖片 commit 後要等下一次部署（約 1–2 分鐘）才會在 `/images/<檔名>` 可取得；當下編輯器內可能顯示破圖，但 markdown 連結正確。（未來可改用 object URL 即時預覽。）
2. **首次正規化 diff**：第一次以 WYSIWYG 編輯舊文章存檔時，Toast UI 會把 body markdown 正規化成其標準格式（一次性較大 diff，**內容不變**）。
3. **僅限純 markdown body**：若未來某 body 引入 MDX 元件，WYSIWYG 會處理不了——屆時需偵測並退回原始碼模式（目前內容無此情況，列為未來考量）。
4. 圖片上傳是獨立 commit；若使用者上傳後取消編輯，圖片會留在 repo（孤兒檔，無害）。

## 測試

- 純邏輯（`image-upload.ts`：檔名/路徑/上傳）以 vitest mock fetch 單元測試。
- `BodyEditor` / `EditorPanel`（Svelte island）以 `pnpm build` 驗證可編譯；端到端（WYSIWYG 操作、圖片上傳）需部署後手動驗證。
- 確認 Toast UI 在瀏覽器安全（純前端，無 Node `Buffer`/`fs` 相依）——延續 mdx-doc 的瀏覽器安全教訓。

## 範圍（YAGNI）

- **做**：body WYSIWYG（上述工具列）、圖片上傳到 public/images、與既有 title/description/原始碼/存檔流程整合。
- **不做**：表格/程式碼區塊工具、圖片即時預覽（object URL）、圖片管理/刪除、MDX 元件支援、多圖批次。
