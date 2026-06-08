# lint 引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 SEO/AEO lint 引擎：給定 `{ collection, frontmatter, body }`，回傳一組可行動的警告 `LintResult[]`，供編輯器側欄即時顯示。

**Architecture:** 純函式、客端執行、無網路。一個 `lint` 聚合器呼叫多條獨立 rule 函式，每條 rule 各自 `(input) => LintResult[]`，易於單元測試與日後擴充。規則參考 `scripts/check-myth-quality.mjs` 與一般 SEO/AEO 準則，並納入「幽靈行內圖片」偵測（對應 2026-06-08 幽靈圖導致部署失敗事件）。

**Tech Stack:** TypeScript、vitest。

**契約來源:** `docs/superpowers/specs/2026-06-08-inline-mdx-editor-design.md`「④ Lint」。

**前置依賴:** 需先完成 `2026-06-08-editor-01-mdx-doc.md` 的 Task 1（vitest 基礎設施）。不依賴 mdx-doc 的 parse/serialize（本引擎吃已解析輸入），故可與其餘單元平行。

---

### Task 1: 型別與 `lint` 聚合器骨架

**Files:**
- Create: `src/utils/editor/lint/types.ts`
- Create: `src/utils/editor/lint/index.ts`
- Test: `src/utils/editor/lint/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/lint/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lint } from './index';

describe('lint 聚合器', () => {
  it('內容完全正常時回傳空陣列', () => {
    const result = lint({
      collection: 'articles',
      frontmatter: { description: '這是一段長度適中、介於五十到一百六十字之間的描述，用來確保 SEO 摘要不會過短也不會被截斷，符合搜尋結果顯示需求。' },
      body: '正文沒有任何問題。\n',
    });
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/lint/index.test.ts`
Expected: FAIL，`Failed to resolve import './index'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/lint/types.ts`:
```ts
export type LintLevel = 'error' | 'warn' | 'info';

export type LintResult = {
  level: LintLevel;
  field?: string;
  message: string;
  fix?: string;
};

export type LintInput = {
  collection: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export type LintRule = (input: LintInput) => LintResult[];
```

Create `src/utils/editor/lint/index.ts`:
```ts
import type { LintInput, LintResult, LintRule } from './types';

const RULES: LintRule[] = [];

export function lint(input: LintInput): LintResult[] {
  return RULES.flatMap((rule) => rule(input));
}

export { RULES };
export type { LintInput, LintResult, LintRule } from './types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/lint/index.test.ts`
Expected: PASS（1 passed，空 RULES → 空結果）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/lint/types.ts src/utils/editor/lint/index.ts src/utils/editor/lint/index.test.ts
git commit -m "feat(editor): lint 引擎型別與聚合器骨架"
```

---

### Task 2: 規則 — description 長度（SEO）

**Files:**
- Create: `src/utils/editor/lint/rules/description-length.ts`
- Modify: `src/utils/editor/lint/index.ts`
- Test: `src/utils/editor/lint/rules/description-length.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/lint/rules/description-length.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { descriptionLengthRule } from './description-length';

const base = { collection: 'articles', body: '' };

describe('descriptionLengthRule', () => {
  it('缺 description → error', () => {
    const r = descriptionLengthRule({ ...base, frontmatter: {} });
    expect(r).toEqual([
      { level: 'error', field: 'description', message: '缺少 description，搜尋結果與社群分享會沒有摘要。', fix: '補上 50–160 字的描述。' },
    ]);
  });

  it('description 過短（<50）→ warn', () => {
    const r = descriptionLengthRule({ ...base, frontmatter: { description: '太短的描述。' } });
    expect(r[0].level).toBe('warn');
    expect(r[0].field).toBe('description');
  });

  it('長度適中（50–160）→ 無警告', () => {
    const desc = '一'.repeat(80);
    const r = descriptionLengthRule({ ...base, frontmatter: { description: desc } });
    expect(r).toEqual([]);
  });

  it('過長（>160）→ warn', () => {
    const desc = '一'.repeat(180);
    const r = descriptionLengthRule({ ...base, frontmatter: { description: desc } });
    expect(r[0].level).toBe('warn');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/lint/rules/description-length.test.ts`
Expected: FAIL，`Failed to resolve import './description-length'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/lint/rules/description-length.ts`:
```ts
import type { LintRule } from '../types';

export const descriptionLengthRule: LintRule = ({ frontmatter }) => {
  const desc = frontmatter.description;
  if (typeof desc !== 'string' || desc.length === 0) {
    return [{ level: 'error', field: 'description', message: '缺少 description，搜尋結果與社群分享會沒有摘要。', fix: '補上 50–160 字的描述。' }];
  }
  if (desc.length < 50) {
    return [{ level: 'warn', field: 'description', message: `description 僅 ${desc.length} 字，可能太短。`, fix: '建議 50–160 字。' }];
  }
  if (desc.length > 160) {
    return [{ level: 'warn', field: 'description', message: `description 達 ${desc.length} 字，搜尋結果可能被截斷。`, fix: '建議縮到 160 字以內。' }];
  }
  return [];
};
```

- [ ] **Step 4: 註冊規則並驗證**

在 `src/utils/editor/lint/index.ts` 修改 import 與 RULES：
```ts
import type { LintInput, LintResult, LintRule } from './types';
import { descriptionLengthRule } from './rules/description-length';

const RULES: LintRule[] = [descriptionLengthRule];
```
（其餘維持不變）

Run: `pnpm test src/utils/editor/lint/`
Expected: PASS（description-length 全過；index.test.ts 仍過，因為 Task 1 測試的正常內容 description 長度落在 50–160）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/lint/rules/description-length.ts src/utils/editor/lint/rules/description-length.test.ts src/utils/editor/lint/index.ts
git commit -m "feat(editor): lint 規則 description 長度檢查"
```

---

### Task 3: 規則 — 幽靈行內圖片偵測（對應部署失敗坑）

**Files:**
- Create: `src/utils/editor/lint/rules/phantom-image.ts`
- Modify: `src/utils/editor/lint/index.ts`
- Test: `src/utils/editor/lint/rules/phantom-image.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/lint/rules/phantom-image.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { phantomImageRule } from './phantom-image';

const base = { collection: 'articles', frontmatter: {} };

describe('phantomImageRule', () => {
  it('body 含相對 images/ 行內圖片 → error（會讓 build 失敗）', () => {
    const r = phantomImageRule({ ...base, body: '段落。\n\n![圖說](images/3.svg)\n\n下一段。' });
    expect(r).toHaveLength(1);
    expect(r[0].level).toBe('error');
    expect(r[0].message).toContain('images/3.svg');
  });

  it('多張幽靈圖各自回報', () => {
    const r = phantomImageRule({ ...base, body: '![a](images/1.png)\n![b](images/2.png)' });
    expect(r).toHaveLength(2);
  });

  it('一般絕對網址圖片不報', () => {
    const r = phantomImageRule({ ...base, body: '![ok](https://example.com/a.png)' });
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/lint/rules/phantom-image.test.ts`
Expected: FAIL，`Failed to resolve import './phantom-image'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/lint/rules/phantom-image.ts`:
```ts
import type { LintRule, LintResult } from '../types';

// 偵測指向 repo 內不存在路徑（如 images/N.png）的行內圖片，
// 這類相對引用會讓 Rollup 解析失敗、整站 build 中斷（見 2026-06-08 事件）。
const INLINE_IMG = /!\[[^\]]*\]\((images\/[^)]+)\)/g;

export const phantomImageRule: LintRule = ({ body }) => {
  const results: LintResult[] = [];
  for (const m of body.matchAll(INLINE_IMG)) {
    results.push({
      level: 'error',
      message: `行內圖片 ${m[1]} 指向不存在的相對路徑，會導致 build 失敗。`,
      fix: '移除此圖片引用，或改為已存在的絕對網址。',
    });
  }
  return results;
};
```

- [ ] **Step 4: 註冊規則並驗證**

在 `src/utils/editor/lint/index.ts` 加入：
```ts
import { phantomImageRule } from './rules/phantom-image';

const RULES: LintRule[] = [descriptionLengthRule, phantomImageRule];
```
（保留既有 import 與其餘內容）

Run: `pnpm test src/utils/editor/lint/`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/lint/rules/phantom-image.ts src/utils/editor/lint/rules/phantom-image.test.ts src/utils/editor/lint/index.ts
git commit -m "feat(editor): lint 規則 幽靈行內圖片偵測"
```

---

### Task 4: 規則 — myths references 數量（複用 check-myth-quality 準則）

**Files:**
- Create: `src/utils/editor/lint/rules/myth-references.ts`
- Modify: `src/utils/editor/lint/index.ts`
- Test: `src/utils/editor/lint/rules/myth-references.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/lint/rules/myth-references.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mythReferencesRule } from './myth-references';

describe('mythReferencesRule', () => {
  it('myths 且 references 少於 2 → error', () => {
    const r = mythReferencesRule({
      collection: 'myths',
      frontmatter: { references: [{ title: '只有一個', url: 'https://a.test' }] },
      body: '',
    });
    expect(r[0].level).toBe('error');
    expect(r[0].field).toBe('references');
  });

  it('myths 且 references >= 2 → 無警告', () => {
    const r = mythReferencesRule({
      collection: 'myths',
      frontmatter: { references: [{ title: 'a', url: 'https://a.test' }, { title: 'b', url: 'https://b.test' }] },
      body: '',
    });
    expect(r).toEqual([]);
  });

  it('非 myths collection 不適用此規則', () => {
    const r = mythReferencesRule({ collection: 'articles', frontmatter: {}, body: '' });
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/lint/rules/myth-references.test.ts`
Expected: FAIL，`Failed to resolve import './myth-references'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/lint/rules/myth-references.ts`:
```ts
import type { LintRule } from '../types';

export const mythReferencesRule: LintRule = ({ collection, frontmatter }) => {
  if (collection !== 'myths') return [];
  const refs = frontmatter.references;
  const count = Array.isArray(refs) ? refs.length : 0;
  if (count < 2) {
    return [{ level: 'error', field: 'references', message: `迷思文章至少需 2 筆 references，目前 ${count} 筆。`, fix: '補足可信來源至 2 筆以上。' }];
  }
  return [];
};
```

- [ ] **Step 4: 註冊規則並驗證**

在 `src/utils/editor/lint/index.ts` 加入：
```ts
import { mythReferencesRule } from './rules/myth-references';

const RULES: LintRule[] = [descriptionLengthRule, phantomImageRule, mythReferencesRule];
```

Run: `pnpm test src/utils/editor/lint/`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/lint/rules/myth-references.ts src/utils/editor/lint/rules/myth-references.test.ts src/utils/editor/lint/index.ts
git commit -m "feat(editor): lint 規則 myths references 數量"
```

---

## Self-Review

- **Spec coverage**：實作 spec「④ Lint」契約的 `LintResult` 型別與 `lint(input)` 簽名（Task 1），並以三條具體規則覆蓋 SEO（description）、build 安全（幽靈圖）、內容品質（myths references，複用 check-myth-quality 準則）。規則清單可持續擴充。
- **Placeholder scan**：無 TBD/TODO；每個程式步驟均附完整程式碼與測試。
- **Type consistency**：所有規則皆為 `LintRule = (LintInput) => LintResult[]`，與 Task 1 型別一致；`index.ts` 的 `RULES` 陣列逐 Task 累加，import 名稱一致。
- **平行備註**：本單元僅依賴 vitest 基礎設施（mdx-doc 計畫 Task 1），不依賴其實作，可與 OAuth Worker、SSR 預覽等平行開工。
