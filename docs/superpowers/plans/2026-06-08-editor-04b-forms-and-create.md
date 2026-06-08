# SEO 欄位表單 + 新增文章 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 spine 編輯面板加上結構化 SEO/AEO 欄位表單（與 raw 正文共用同一個 `{frontmatter, body}` 模型），並提供「新增文章」流程。

**Architecture:** 把 `EditorPanel` 的事實來源從字串改為 `{frontmatter, body}` 模型；「SEO 欄位」分頁綁 `frontmatter`、「原始碼」分頁綁 `serialize`。SEO 欄位由 per-collection 的 `SeoFormSchema` 描述子驅動。新增文章＝以預設 frontmatter 建一個 `sha=null` 的模型，存檔走 `putFile`（不帶 sha → 建立新檔）。

**Tech Stack:** TypeScript、Svelte 5、vitest。

**契約來源:** spec「⑥ SEO/AEO 欄位表單」「單一事實來源」「② Commit（新增不帶 sha）」「範圍：新增文章」。

**前置依賴:** `editor-01-mdx-doc`、`editor-04-spine-core`（refactor 其 `EditorPanel`）。

---

### Task 1: per-collection SEO 欄位描述子

**Files:**
- Create: `src/utils/editor/seo-schema.ts`
- Test: `src/utils/editor/seo-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/seo-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getSeoFields } from './seo-schema';

describe('getSeoFields', () => {
  it('myths 含 description 與 ogTitle 欄位描述', () => {
    const fields = getSeoFields('myths');
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('description');
    expect(keys).toContain('ogTitle');
    const desc = fields.find((f) => f.key === 'description')!;
    expect(desc.maxLength).toBe(160);
  });
  it('未知 collection 回傳通用欄位（至少含 description）', () => {
    const fields = getSeoFields('unknown');
    expect(fields.map((f) => f.key)).toContain('description');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/seo-schema.test.ts`
Expected: FAIL，`Failed to resolve import './seo-schema'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/seo-schema.ts`:
```ts
export type SeoFieldDescriptor = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list';
  maxLength?: number;
  required?: boolean;
};

const COMMON: SeoFieldDescriptor[] = [
  { key: 'description', label: 'SEO 描述', type: 'textarea', maxLength: 160, required: true },
  { key: 'ogTitle', label: '社群分享標題', type: 'text', maxLength: 60 },
  { key: 'ogDescription', label: '社群分享描述', type: 'textarea', maxLength: 160 },
  { key: 'ogImage', label: '社群分享圖網址', type: 'image' },
];

const BY_COLLECTION: Record<string, SeoFieldDescriptor[]> = {
  articles: COMMON,
  myths: COMMON,
  ingredients: COMMON,
};

export function getSeoFields(collection: string): SeoFieldDescriptor[] {
  return BY_COLLECTION[collection] ?? COMMON;
}
```

備註：欄位以站上實際 frontmatter 為準（spec 全域常數與 content.config.ts）；如某 collection 欄位不同，於 `BY_COLLECTION` 覆寫即可。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/seo-schema.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/seo-schema.ts src/utils/editor/seo-schema.test.ts
git commit -m "feat(editor): per-collection SEO 欄位描述子"
```

---

### Task 2: EditorPanel 改為 `{frontmatter, body}` 模型 + 分頁

**Files:**
- Modify: `src/components/editor/EditorPanel.svelte`
- Create: `src/components/editor/SeoFields.svelte`

- [ ] **Step 1: 建立 SEO 欄位元件**

Create `src/components/editor/SeoFields.svelte`:
```svelte
<script>
  import { getSeoFields } from '@/utils/editor/seo-schema';
  let { collection, frontmatter, onchange } = $props();
  const fields = getSeoFields(collection);

  function update(key, value) {
    onchange({ ...frontmatter, [key]: value });
  }
</script>

<div class="et-fields">
  {#each fields as f}
    <label>
      <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
      {#if f.type === 'textarea'}
        <textarea value={frontmatter[f.key] ?? ''} oninput={(e) => update(f.key, e.currentTarget.value)}></textarea>
      {:else}
        <input value={frontmatter[f.key] ?? ''} oninput={(e) => update(f.key, e.currentTarget.value)} />
      {/if}
      {#if f.maxLength}
        <small>{String(frontmatter[f.key] ?? '').length} / {f.maxLength}</small>
      {/if}
    </label>
  {/each}
</div>

<style>
  .et-fields { display: flex; flex-direction: column; gap: .75rem; overflow: auto; }
  .et-fields label { display: flex; flex-direction: column; gap: .25rem; }
  .et-fields em { color: var(--color-coral, #c0492f); font-style: normal; }
  .et-fields small { color: #777; }
</style>
```

- [ ] **Step 2: 改寫 EditorPanel 以模型為事實來源**

把 `src/components/editor/EditorPanel.svelte` 的 `<script>` 狀態與載入改為（保留 onclose/props，替換 raw 為模型）：
```svelte
<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { getFile, putFile } from '@/utils/editor/github';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';
  import SeoFields from './SeoFields.svelte';

  let { repoPath, collection, slug, onclose, initialDoc = null } = $props();

  let frontmatter = $state({});
  let body = $state('');
  let sha = $state(null);
  let tab = $state('seo'); // seo | source
  let status = $state(initialDoc ? 'ready' : 'loading');
  let message = $state('');

  onMount(async () => {
    if (initialDoc) { frontmatter = initialDoc.frontmatter; body = initialDoc.body; sha = null; return; }
    try {
      const file = await getFile(repoPath, getToken());
      const doc = parse(file.content);
      frontmatter = doc.frontmatter; body = doc.body; sha = file.sha; status = 'ready';
    } catch (e) {
      status = 'error'; message = `載入失敗：${e instanceof Error ? e.message : e}。請重新整理再試。`;
    }
  });

  // 原始碼分頁：編輯字串後回寫模型
  let rawDraft = $state('');
  function enterSource() { rawDraft = serialize({ frontmatter, body }); tab = 'source'; }
  function applySource() {
    try { const d = parse(rawDraft); frontmatter = d.frontmatter; body = d.body; tab = 'seo'; message = ''; }
    catch (e) { message = `原始碼 frontmatter 有誤：${e instanceof Error ? e.message : e}`; }
  }

  async function save() {
    let content;
    try { content = serialize({ frontmatter, body }); }
    catch (e) { status = 'error'; message = `frontmatter 格式有誤：${e instanceof Error ? e.message : e}。請修正後再存。`; return; }
    status = 'saving';
    try {
      const code = await putFile({ path: repoPath, content, sha, message: `content: ${sha ? '前台編輯' : '前台新增'} ${slug}`, token: getToken() });
      const outcome = classifySave(code);
      message = outcome.message; status = outcome.state === 'success' ? 'done' : 'error';
    } catch { const o = classifySave(0); message = o.message; status = 'error'; }
  }

  async function reload() {
    const file = await getFile(repoPath, getToken());
    const doc = parse(file.content); frontmatter = doc.frontmatter; body = doc.body; sha = file.sha; status = 'ready'; message = '';
  }
</script>
```

- [ ] **Step 3: 改寫 EditorPanel 的 markup（分頁）**

把面板 markup 改為：
```svelte
<div class="et-overlay" role="dialog" aria-modal="true">
  <div class="et-panel">
    <header>
      <strong>編輯：{slug}</strong>
      <nav>
        <button onclick={() => (tab = 'seo')} disabled={tab === 'seo'}>SEO 欄位</button>
        <button onclick={enterSource} disabled={tab === 'source'}>原始碼</button>
      </nav>
      <button onclick={onclose} aria-label="關閉">✕</button>
    </header>

    {#if status === 'loading'}<p>載入中…</p>{/if}

    {#if status !== 'loading' && tab === 'seo'}
      <SeoFields {collection} {frontmatter} onchange={(fm) => (frontmatter = fm)} />
      <label class="et-body"><span>正文</span>
        <textarea bind:value={body} spellcheck="false"></textarea>
      </label>
    {/if}

    {#if tab === 'source'}
      <textarea class="et-source" bind:value={rawDraft} spellcheck="false"></textarea>
      <button onclick={applySource}>套用原始碼</button>
    {/if}

    {#if message}<p class="et-msg">{message}</p>{/if}
    <footer>
      <button onclick={save} disabled={status === 'saving' || status === 'loading'}>儲存</button>
      <button onclick={reload}>重新載入最新版</button>
    </footer>
  </div>
</div>
```
（沿用 spine-core 既有 `<style>`，並可為 `.et-body textarea`、`.et-source` 補上 `min-height` 與等寬字型。）

- [ ] **Step 4: 手動驗證**

Run: `pnpm dev`；登入後開既有文章 → 「SEO 欄位」分頁可編 description/ogTitle 並顯示字數；切「原始碼」可看 serialize 結果、改後「套用原始碼」回寫；存檔成功。
Expected: 兩分頁共用同一模型、互不覆蓋。

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/SeoFields.svelte src/components/editor/EditorPanel.svelte
git commit -m "feat(editor): SEO 欄位表單與 raw 雙分頁共用單一模型"
```

---

### Task 3: 新增文章流程

**Files:**
- Create: `src/components/editor/NewArticle.svelte`
- Modify: `src/pages/admin.astro`

- [ ] **Step 1: 建立新增元件**

Create `src/components/editor/NewArticle.svelte`:
```svelte
<script>
  import { getToken } from '@/utils/editor/token';
  import EditorPanel from './EditorPanel.svelte';

  const COLLECTIONS = ['articles', 'myths', 'ingredients'];
  let collection = $state('articles');
  let slug = $state('');
  let open = $state(false);
  let initialDoc = $state(null);
  let repoPath = $state('');

  function start() {
    if (!slug.match(/^[a-z0-9-]+$/)) { alert('slug 僅能用小寫英數與連字號'); return; }
    repoPath = `src/content/${collection}/${slug}.mdx`;
    initialDoc = {
      frontmatter: { title: '', description: '', publishDate: new Date().toISOString().slice(0, 10) },
      body: '\n（在此撰寫正文）\n',
    };
    open = true;
  }
</script>

{#if getToken()}
  <fieldset>
    <legend>新增文章</legend>
    <select bind:value={collection}>{#each COLLECTIONS as c}<option>{c}</option>{/each}</select>
    <input placeholder="slug（例 new-topic）" bind:value={slug} />
    <button onclick={start}>建立並編輯</button>
  </fieldset>
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} {initialDoc} onclose={() => (open = false)} />
  {/if}
{/if}
```

備註：`initialDoc` 使 `EditorPanel` 以 `sha=null` 進入新增模式，存檔走 `putFile` 不帶 sha → GitHub 建立新檔。預設 frontmatter 僅放最少必填，其餘由 SEO 欄位與正文補齊。

- [ ] **Step 2: 在 /admin 掛載**

在 `src/pages/admin.astro` 的 `<main>` 內、`AdminLogin` 之後加入：
```astro
import NewArticle from '@/components/editor/NewArticle.svelte';
```
（import 置於 frontmatter）markup：
```astro
<NewArticle client:only="svelte" />
```

- [ ] **Step 3: 手動驗證**

Run: `pnpm dev`；於 `/admin` 登入後選 collection、輸入 slug → 建立 → 編輯面板開啟（新增模式）→ 填標題/描述/正文 → 儲存 → 應建立新檔（成功訊息「已存檔，部署中」）。重複既有 slug 會因 GitHub 既有檔無 sha 而回 422/409 → 由狀態機顯示引導。
Expected: 新增流程可用。

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/NewArticle.svelte src/pages/admin.astro
git commit -m "feat(editor): 新增文章流程（sha=null 建立新檔）"
```

---

## Self-Review

- **Spec coverage**：實作 spec「⑥ SEO 欄位表單」（`SeoFieldDescriptor`、per-collection、字數提示）、「單一事實來源」（EditorPanel 以 `{frontmatter, body}` 為模型，SEO 與原始碼分頁共用）、「新增文章」（sha=null → putFile 建檔）。
- **Placeholder scan**：無 TBD/TODO；每個程式步驟附完整程式碼。UI 任務採手動驗證（專案無瀏覽器測試框架）。
- **Type consistency**：`getSeoFields(collection)→SeoFieldDescriptor[]` 與 SeoFields 使用一致；EditorPanel 的 `initialDoc={frontmatter,body}`、`putFile` sha 規則、`classifySave` 與 spine-core 一致；新增與編輯共用同一 `EditorPanel`。
- **平行備註**：本計畫 refactor spine-core 的 EditorPanel，須在 `editor-04-spine-core` 之後；Task 1（seo-schema 純資料）可提早平行完成。
