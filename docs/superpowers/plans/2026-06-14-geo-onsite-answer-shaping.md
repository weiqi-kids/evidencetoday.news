# GEO 站內答案化：.txt 端點 + llms.txt 方法論 + 寫作 SOP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 AI 取用的純文字版（`.txt` 端點）開頭即重點摘要、文末附來源出處；llms.txt 補「方法論/為何可信」段；寫作 SOP 納入答案化原則。提高被 AI 原文引用與連帶引用一手來源的機率。

**Architecture:** 新增共用純函式 `renderSources()`（把 references 陣列格式化為純文字來源清單）於 `src/utils/txt-endpoint.ts`，以 TDD 單元測試。四個 `.txt` 端點（articles/myths/ingredients/podcasts）改為「header → 重點摘要 → body → 來源」。llms.txt.ts 加方法論段。content-guide.md 加答案化 SOP 章節。

**Tech Stack:** Astro 5 endpoint routes、TypeScript、vitest。

**範圍：** spec A3（.txt 答案化）+ A2（llms.txt 方法論）+ B（寫作 SOP）。**不含** D1 referrer 監測（需 analytics 供應商/隱私政策決定，另議）。

**各類型摘要來源（重點摘要區用）：**
- articles：`d.tldr`（string）
- myths：`d.verdict` + `d.verdictSummary` + `d.tldr`（string[]）
- ingredients：`d.description`（無 tldr 欄位）
- podcasts：`d.description`

**references 欄位：** articles/podcasts 為 optional、myths/ingredients 必填。`referenceSchema = { title: string, url?: string, type: enum, ... }`。

---

## File Structure

- **Create** `src/utils/txt-endpoint.ts` — `renderSources(refs)` 純函式。
- **Create** `src/utils/txt-endpoint.test.ts` — vitest 單元測試。
- **Modify** `src/pages/articles/[slug].txt.ts`、`src/pages/myths/[slug].txt.ts`、`src/pages/ingredients/[slug].txt.ts`、`src/pages/podcasts/[slug].txt.ts` — 套用摘要 + 來源。
- **Modify** `src/pages/llms.txt.ts` — 加方法論段。
- **Modify** `docs/content-guide.md` — 加答案化 SOP 章節。

---

## Task 1: renderSources 共用純函式

**Files:**
- Create: `src/utils/txt-endpoint.ts`
- Test: `src/utils/txt-endpoint.test.ts`

- [ ] **Step 1: 先寫失敗測試** — 建立 `src/utils/txt-endpoint.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { renderSources } from '@/utils/txt-endpoint';

describe('renderSources', () => {
  it('空清單回傳空字串', () => {
    expect(renderSources([])).toBe('');
    expect(renderSources(undefined)).toBe('');
  });

  it('有 url 的來源輸出「- 標題 — url」', () => {
    const out = renderSources([{ title: 'Cochrane 回顧', url: 'https://example.org/a' }]);
    expect(out).toContain('來源：');
    expect(out).toContain('- Cochrane 回顧 — https://example.org/a');
  });

  it('無 url 的來源只輸出標題', () => {
    const out = renderSources([{ title: '某指引' }]);
    expect(out).toContain('- 某指引');
    expect(out).not.toContain('—');
  });

  it('來源區置於前面以空行分隔（方便接在 body 後）', () => {
    const out = renderSources([{ title: 'A', url: 'https://x/y' }]);
    expect(out.startsWith('\n')).toBe(true);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗** — Run: `pnpm test -- src/utils/txt-endpoint.test.ts` — Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作** — 建立 `src/utils/txt-endpoint.ts`：

```ts
export interface TxtReference {
  title: string;
  url?: string;
}

// 把 references 格式化為純文字來源清單，接在 body 之後。空清單回傳空字串。
export function renderSources(refs: readonly TxtReference[] | undefined): string {
  if (!refs || refs.length === 0) return '';
  const lines = refs.map((r) => (r.url ? `- ${r.title} — ${r.url}` : `- ${r.title}`));
  return `\n\n來源：\n${lines.join('\n')}`;
}
```

- [ ] **Step 4: 跑測試確認通過** — Run: `pnpm test -- src/utils/txt-endpoint.test.ts` — Expected: PASS（4 測試綠）。

- [ ] **Step 5: commit**

```bash
git add src/utils/txt-endpoint.ts src/utils/txt-endpoint.test.ts
git commit -m "feat(txt): 新增 renderSources 純函式（.txt 端點來源清單）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 四個 .txt 端點套用「重點摘要 + 來源」

四個端點目前結構皆為 `header\n---\nbody`。改為 `header\n---\n重點摘要\n---\nbody{來源}`。`renderSources` 已處理空清單。

**Files:** Modify 四檔。先 READ 每一檔再改（各檔 header 欄位略有不同，勿改 header 既有欄位）。

- [ ] **Step 1: articles** — `src/pages/articles/[slug].txt.ts`：頂部加 `import { renderSources } from '@/utils/txt-endpoint';`。把 `return new Response(\`${header}\n---\n${body}\`, ...)` 改為：
```ts
  const summary = `重點摘要：${d.tldr}`;
  const sources = renderSources(d.references);
  return new Response(`${header}\n---\n${summary}\n---\n${body}${sources}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
```

- [ ] **Step 2: myths** — `src/pages/myths/[slug].txt.ts`：加同一 import。myths 的 `d.tldr` 是 string[]、且有 `verdict`/`verdictSummary`。把 return 改為：
```ts
  const summary = [
    `判定：${d.verdict}`,
    `結論：${d.verdictSummary}`,
    `重點摘要：`,
    ...d.tldr.map((t) => `- ${t}`),
  ].join('\n');
  const sources = renderSources(d.references);
  return new Response(`${header}\n---\n${summary}\n---\n${body}${sources}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
```

- [ ] **Step 3: ingredients** — `src/pages/ingredients/[slug].txt.ts`：加 import。無 tldr，用 `d.description`：
```ts
  const summary = `重點摘要：${d.description}`;
  const sources = renderSources(d.references);
  return new Response(`${header}\n---\n${summary}\n---\n${body}${sources}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
```

- [ ] **Step 4: podcasts** — `src/pages/podcasts/[slug].txt.ts`：加 import。用 `d.description`，references 為 optional（renderSources 自動處理）：
```ts
  const summary = `重點摘要：${d.description}`;
  const sources = renderSources(d.references);
  return new Response(`${header}\n---\n${summary}\n---\n${body}${sources}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
```

- [ ] **Step 5: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');for(const t of ['articles','myths','ingredients','podcasts']){const base='dist/'+t;if(!fs.existsSync(base)){console.log('skip',t);continue;}const ds=fs.readdirSync(base).filter(d=>fs.existsSync(base+'/'+d+'.txt')||fs.existsSync(base+'/'+d+'/index.txt'));const f=fs.existsSync(base+'/'+ds[0]+'.txt')?base+'/'+ds[0]+'.txt':base+'/'+ds[0]+'/index.txt';const txt=fs.readFileSync(f,'utf8');if(!txt.includes('重點摘要'))throw new Error('缺重點摘要: '+f);console.log('OK',f.replace('dist/',''),'| 重點摘要✓','| 來源:'+(txt.includes('來源：')?'有':'無'));}"
```
Expected: 四類型各印一行 OK 含「重點摘要✓」，build 零錯誤。（注意 .txt 端點在 dist 可能是 `<slug>.txt` 或 `<slug>/index.txt`，腳本兩種都試。）

- [ ] **Step 6: commit**
```bash
git add src/pages/articles/\[slug\].txt.ts src/pages/myths/\[slug\].txt.ts src/pages/ingredients/\[slug\].txt.ts src/pages/podcasts/\[slug\].txt.ts
git commit -m "feat(txt): .txt 端點開頭加重點摘要、文末附來源

讓 AI 取用的純文字版開頭即答案、附一手來源 URL，提高被引用機率。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: llms.txt 加方法論段

**Files:** Modify `src/pages/llms.txt.ts`（目前為靜態字串 `body`）。

- [ ] **Step 1: 加方法論段** — READ 現有 `src/pages/llms.txt.ts`。在「重要頁面」段「之後」、「內容類型」段「之前」插入一段：
```
## 方法論（為何可信）
- 以證據分級呈現結論：系統性回顧 / RCT / 觀察性研究 / 動物或體外 / 專家意見。
- 每篇附一手來源（研究、官方機構），可於各內容的 .txt 純文字版文末查得。
- 利益揭露與編輯原則公開：見上方連結。
- 闢謠內容以 schema.org ClaimReview 標註判定（大致正確～大致錯誤）。
```
（直接插入字串模板，維持既有格式風格。）

- [ ] **Step 2: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');const t=fs.readFileSync('dist/llms.txt','utf8');if(!t.includes('方法論'))throw new Error('llms.txt 缺方法論段');console.log('OK llms.txt 含方法論段')"
```
Expected: 印出 OK，build 零錯誤。

- [ ] **Step 3: commit**
```bash
git add src/pages/llms.txt.ts
git commit -m "feat(llms): llms.txt 加方法論段（證據分級/來源/揭露/ClaimReview）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 寫作 SOP 加答案化原則（docs）

**Files:** Modify `docs/content-guide.md`。

- [ ] **Step 1: 加章節** — READ `docs/content-guide.md`，在合適位置（內容撰寫規範附近）新增一節：

```markdown
## GEO 答案化原則（提高被 AI 引用）

撰寫新增/修改內容時，依下列原則讓內容更容易被 AI 搜尋原文引用：

- **標題即真實問句**：用使用者會打的自然語言問句當標題/小標（「維他命 C 真的能預防感冒嗎？」），而非名詞短語。
- **段落首句先給結論（BLUF / 倒金字塔）**：AI 抽取段落首句，結論不要埋在段末。
- **可引用短斷言**：短、自足、附數字與出處（「根據 2020 年 Cochrane 回顧，一般人群常規補充對感冒病程縮短約 8%」）。
- **對比用表格或清單**：AI 容易結構化抽取。
- **`tldr` / 重點摘要寫成可獨立成立的答案**：不依賴上下文即可被整段引用（同步出現在該內容的 `.txt` 純文字版開頭）。
- **每個 `references` 附 `url`**：一手來源 URL 會出現在 `.txt` 版文末，讓 AI 連帶引用原始研究。
- **闢謠**：`verdict` 與 `verdictSummary` 要能單獨回答「X 是真的嗎」，對應 ClaimReview 結構化資料。
```

- [ ] **Step 2: commit**
```bash
git add docs/content-guide.md
git commit -m "docs: content-guide 加 GEO 答案化原則章節

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 驗證清單

- [ ] `pnpm test` 全綠（含新 renderSources 測試）。
- [ ] `pnpm build` 零錯誤。
- [ ] 四類型 .txt 產出開頭含「重點摘要」、有 references 者文末含「來源：」。
- [ ] `dist/llms.txt` 含方法論段。
- [ ] content-guide.md 有答案化章節。

## 注意

- `.txt` 端點不影響前台 HTML 版型（無前台可見區塊問題）。
- 動到 `src/pages/*.ts`、`src/utils/`，docs-sync 由本 plan 檔 + content-guide/architecture 變動滿足。
- D1 referrer 監測不在本 plan：需先決定 analytics 方式（隱私友善服務 vs 自建 Cloudflare Worker beacon）與更新 privacy.astro。
