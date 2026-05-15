# Agent Instructions

本專案為健康議題編輯平台「本日有據」（evidencetoday.news）。

## 套件管理器

使用 **pnpm**（不是 npm）。

## 修改紀律（任何 AI agent 都必須遵守）

**改功能程式碼時，必須同步更新文件**。命中以下任一路徑 = 功能改動：

- `src/components/`、`src/layouts/`、`src/styles/`、`src/lib/`、`src/utils/`
- `src/pages/` 內 `.astro` / `.ts` / `.svelte`
- `scripts/`、`.github/workflows/`
- `astro.config.mjs`、`src/content.config.ts`、`package.json`（scripts/dependencies）

→ **必須同時** 改 `README.md` 或 `docs/playbooks/*.md` 對應檔案。沒同步的 PR 會被 `docs-sync-check` workflow 擋下，無法合併。例外場景在 PR body / commit message 加 `[skip docs]` 跳過（限 typo / 純測試 / build 設定微調）。

純內容變動（`src/content/`、`src/data/policies/`、`public/images/` 等）不在此規則內。

對應的 playbook 在 `docs/playbooks/`：topnav / design-tokens / article-layout / home-hero / d3-charts / external-apis / new-content-type / ci-cd。動之前先看對應 playbook 的「鎖定參數」與「常見陷阱」。

## 常用任務

### 撰寫趨勢文章

當收到「撰寫趨勢文章」指令時，依 README.md 的「AI 任務：撰寫趨勢文章」章節執行完整 7 步驟流程：

1. 準備（讀取 config + 去重紀錄）
2. 搜尋素材（8 組查詢，平行執行）
3. 評分與選題（五維度加權 → 分組 → **產出 n 份工單，有多少合格素材就寫多少篇**）
4. 撰寫文章（**每份工單各一篇，共 n 篇**，平行撰寫）
5. **自動審核**（每篇獨立審核，build + frontmatter + 內容品質，不通過就修正，連續 3 輪未改善才判定未收斂）
6. 更新去重紀錄
7. 發布（push main 或開 PR）

**關鍵要求：不要只寫一篇。** 有多少合格素材就分組成多少篇文章。步驟 5 的審核必須全部通過才能進入步驟 6。開出的 PR 應該是可以直接 merge 的狀態。

### 重要規則

- 日期一律使用台灣時間（UTC+8）
- tags 禁止含 `/`（會導致 build 失敗）
- 禁止聳動用語、具體醫療建議、醫療承諾
- 使用台灣繁體中文，禁止中國用語
- 修改程式碼前必須先讀取完整檔案
- Schema 定義在 `src/content.config.ts`
- 完整 SOP 見 `docs/news_sop.md`
