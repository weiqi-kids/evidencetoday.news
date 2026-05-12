# Agent Instructions

本專案為健康議題編輯平台「本日有據」（evidencetoday.news）。

## 套件管理器

使用 **pnpm**（不是 npm）。

## 常用任務

### 撰寫趨勢文章

當收到「撰寫趨勢文章」指令時，依 README.md 的「AI 任務：撰寫趨勢文章」章節執行完整流程：搜尋素材 → 評分選題 → 撰寫文章 → 更新去重 → build 驗證 → commit + push。

完整 SOP 見 `docs/news_sop.md`。

### 重要規則

- 日期一律使用台灣時間（UTC+8）
- tags 禁止含 `/`（會導致 build 失敗）
- 禁止聳動用語、具體醫療建議、醫療承諾
- 使用台灣繁體中文，禁止中國用語
- 修改程式碼前必須先讀取完整檔案
- Schema 定義在 `src/content.config.ts`
