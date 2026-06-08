# mdx-doc 共同基礎模組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `mdx-doc` 模組，提供 MDX 檔案的 frontmatter 解析（`parse`）與序列化（`serialize`），作為前台編輯器所有單元的共同貨幣 `EditDoc`。

**Architecture:** 純函式模組，無 UI、無網路。`parse` 把 raw MDX 字串拆成 `{ frontmatter, body }`；`serialize` 反向組回字串，輸出 YAML 須與站上既有 frontmatter 風格一致（不加多餘引號、扁平 list），避免每次存檔產生大量無意義 diff。同時引入 vitest 作為全專案單元測試基礎設施（後續 lint 等單元共用）。

**Tech Stack:** TypeScript、vitest、gray-matter（parse）、js-yaml（serialize）。

**契約來源:** `docs/superpowers/specs/2026-06-08-inline-mdx-editor-design.md`「共同基礎模組」與「單一事實來源」。

---

### Task 1: 引入 vitest 測試基礎設施

**Files:**
- Modify: `package.json`（scripts + devDependencies）
- Create: `vitest.config.ts`

- [ ] **Step 1: 安裝相依**

Run:
```bash
pnpm add -D vitest js-yaml gray-matter @types/js-yaml
```
Expected: `package.json` devDependencies 出現 `vitest`、`js-yaml`、`gray-matter`、`@types/js-yaml`。

- [ ] **Step 2: 建立 vitest 設定**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: 加入 test script**

在 `package.json` 的 `scripts` 加入（保留既有項目，不要刪除）：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 驗證 vitest 可執行**

Run: `pnpm test`
Expected: vitest 啟動並回報 `No test files found`（尚未有測試），exit code 0 或 1 皆可，重點是 vitest 本身能跑起來、無安裝錯誤。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: 引入 vitest 單元測試基礎設施"
```

---

### Task 2: `parse` — 解析 raw MDX 為 frontmatter + body

**Files:**
- Create: `src/utils/editor/mdx-doc.ts`
- Test: `src/utils/editor/mdx-doc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/mdx-doc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parse } from './mdx-doc';

describe('parse', () => {
  it('拆出 frontmatter 物件與 body 字串', () => {
    const raw = `---\ntitle: 測試標題\ntags:\n- 一\n- 二\n---\n\n正文第一段。\n`;
    const result = parse(raw);
    expect(result.frontmatter).toEqual({ title: '測試標題', tags: ['一', '二'] });
    expect(result.body).toBe('正文第一段。\n');
  });

  it('沒有 frontmatter 時 frontmatter 為空物件、body 為原文', () => {
    const raw = `只有正文，沒有 frontmatter。\n`;
    const result = parse(raw);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('只有正文，沒有 frontmatter。\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/mdx-doc.test.ts`
Expected: FAIL，訊息類似 `Failed to resolve import './mdx-doc'` 或 `parse is not a function`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/mdx-doc.ts`:
```ts
import matter from 'gray-matter';

export type EditDocCore = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function parse(rawMdx: string): EditDocCore {
  const { data, content } = matter(rawMdx);
  return { frontmatter: data ?? {}, body: content };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/mdx-doc.test.ts`
Expected: PASS（2 passed）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/mdx-doc.ts src/utils/editor/mdx-doc.test.ts
git commit -m "feat(editor): mdx-doc parse 解析 frontmatter 與 body"
```

---

### Task 3: `serialize` — 將 frontmatter + body 組回 MDX 字串

**Files:**
- Modify: `src/utils/editor/mdx-doc.ts`
- Test: `src/utils/editor/mdx-doc.test.ts`

- [ ] **Step 1: Write the failing test**

在 `src/utils/editor/mdx-doc.test.ts` 末端追加：
```ts
import { serialize } from './mdx-doc';

describe('serialize', () => {
  it('輸出 frontmatter 不加多餘引號、list 扁平縮排', () => {
    const out = serialize({
      frontmatter: { title: '測試標題', tags: ['一', '二'] },
      body: '正文第一段。\n',
    });
    expect(out).toBe(`---\ntitle: 測試標題\ntags:\n  - 一\n  - 二\n---\n\n正文第一段。\n`);
  });

  it('parse 後 serialize 再 parse 的資料不變（round-trip）', () => {
    const original = `---\ntitle: 來回測試\nevidenceLevel: 低\ntags:\n  - 甲\n  - 乙\n---\n\n內文。\n`;
    const once = parse(original);
    const round = parse(serialize(once));
    expect(round.frontmatter).toEqual(once.frontmatter);
    expect(round.body).toBe(once.body);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/mdx-doc.test.ts`
Expected: FAIL，`serialize is not a function`。

- [ ] **Step 3: Write minimal implementation**

在 `src/utils/editor/mdx-doc.ts` 追加：
```ts
import yaml from 'js-yaml';

export function serialize(doc: EditDocCore): string {
  const fm = yaml.dump(doc.frontmatter, {
    lineWidth: -1,      // 不自動折行
    noRefs: true,       // 不產生 YAML anchor/alias
    quotingType: '"',
    forceQuotes: false, // 僅在必要時加引號，貼近站上風格
    indent: 2,
  });
  return `---\n${fm}---\n\n${doc.body}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/mdx-doc.test.ts`
Expected: PASS（全部 passed）。若 list 縮排與預期不符，確認 `indent: 2` 並調整測試斷言為 js-yaml 實際輸出（js-yaml 預設 block list 會以 2 空格縮排 `- `）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/mdx-doc.ts src/utils/editor/mdx-doc.test.ts
git commit -m "feat(editor): mdx-doc serialize 序列化回 MDX 字串"
```

---

### Task 4: 以真實內容驗證 round-trip 不產生雜訊 diff

**Files:**
- Test: `src/utils/editor/mdx-doc.roundtrip.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/mdx-doc.roundtrip.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, serialize } from './mdx-doc';

describe('真實檔案 round-trip', () => {
  it('parse→serialize→parse 後 frontmatter 與 body 等價', () => {
    const raw = readFileSync('src/content/myths/carrots-improve-vision-myth.mdx', 'utf8');
    const a = parse(raw);
    const b = parse(serialize(a));
    expect(b.frontmatter).toEqual(a.frontmatter);
    expect(b.body).toBe(a.body);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `pnpm test src/utils/editor/mdx-doc.roundtrip.test.ts`
Expected: 若 PASS 即達標。若 FAIL，多半是某些 frontmatter 值（日期、巢狀物件）在 round-trip 後型別改變；記錄哪個欄位、在 `serialize` 的 js-yaml 選項或 `parse` 後處理修正，再重跑至 PASS。

- [ ] **Step 3: Commit**

```bash
git add src/utils/editor/mdx-doc.roundtrip.test.ts
git commit -m "test(editor): mdx-doc 對真實 myth 檔 round-trip 驗證"
```

---

## Self-Review

- **Spec coverage**：本計畫實作 spec「共同基礎模組」的 `parse`/`serialize` 簽名與「序列化須與既有風格一致、避免雜訊 diff」要求（Task 3、Task 4）。`EditDoc` 的 `repoPath/collection/slug/sha` 由 spine 計畫負責組裝，本模組只負責 `frontmatter/body`（型別 `EditDocCore`），與 spec 一致。
- **Placeholder scan**：無 TBD/TODO；每個程式步驟均附完整程式碼。
- **Type consistency**：`parse`/`serialize` 皆以 `EditDocCore = { frontmatter, body }` 為介面，前後一致。
- **平行備註**：本模組是所有單元的前置依賴，須最先完成。完成後 lint、spine、SSR 預覽計畫方能引用其型別與函式。
