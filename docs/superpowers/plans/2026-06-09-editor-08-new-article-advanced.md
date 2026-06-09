# 新增文章進階選項（自訂網址 + AI 寫作任務）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/admin` 新增文章流程加進階選項：自訂網址（選填+驗證）、以及「建立 AI 寫作任務」——開一張 GitHub Issue 工單交給 Claude Code 撰寫，畫面輪詢目標檔案出現後自動轉進編輯畫面。

**Architecture:** 新增純邏輯 `issue.ts`（工單組裝 + 開 issue），`github.ts` 加 `fileExists`（輪詢用、404 不丟錯）。`NewArticle.svelte` 加進階 UI 與任務狀態機（建立→進行中→完成轉 EditorPanel EDIT 模式），沿用部署輪詢的 setTimeout+旗標+onDestroy 模式。不需 Anthropic 金鑰或 AI Worker——只用編輯器既有的 GitHub token。

**Tech Stack:** TypeScript、Svelte 5、GitHub Issues/Contents API、vitest。

**契約來源:** `docs/superpowers/specs/2026-06-09-new-article-advanced-design.md`

**前置依賴:** 既有 `src/utils/editor/{slugify,token,github}.ts`、`NewArticle.svelte`、`EditorPanel.svelte`、vitest。

---

### Task 1: issue.ts（工單組裝 + 建立 Issue）

**Files:**
- Create: `src/utils/editor/issue.ts`
- Test: `src/utils/editor/issue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/issue.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildIssueBody, createArticleIssue } from './issue';

afterEach(() => vi.restoreAllMocks());

describe('buildIssueBody', () => {
  it('含目標檔案路徑、網址、各欄位', () => {
    const body = buildIssueBody({ collection: 'articles', title: 'X', slug: 'x-1', direction: '寫淺白', sources: 'PubMed', conclusion: '結論Y' });
    expect(body).toContain('src/content/articles/x-1.mdx');
    expect(body).toContain('/articles/x-1/');
    expect(body).toContain('寫淺白');
    expect(body).toContain('PubMed');
    expect(body).toContain('結論Y');
    expect(body).toContain('禁止杜撰');
  });
  it('選填欄位空白 → 顯示「未指定」', () => {
    const body = buildIssueBody({ collection: 'myths', title: 'T', slug: 's' });
    expect(body).toContain('未指定');
  });
});

describe('createArticleIssue', () => {
  it('POST 到 issues，title 帶 [文章]、label article-draft，回 number/url', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ number: 12, html_url: 'https://github.com/weiqi-kids/evidencetoday.news/issues/12' }), { status: 201 }));
    vi.stubGlobal('fetch', spy);
    const r = await createArticleIssue({ collection: 'articles', title: '標題', slug: 's-1', token: 'tok' });
    expect(r).toEqual({ number: 12, url: 'https://github.com/weiqi-kids/evidencetoday.news/issues/12' });
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/weiqi-kids/evidencetoday.news/issues');
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.title).toBe('[文章] 標題');
    expect(sent.labels).toEqual(['article-draft']);
    expect(sent.body).toContain('src/content/articles/s-1.mdx');
  });
  it('非 2xx → 丟可讀錯誤', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
    await expect(createArticleIssue({ collection: 'articles', title: 'T', slug: 's', token: 't' }))
      .rejects.toThrow('建立 Issue 失敗（403）');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/issue.test.ts`
Expected: FAIL，`Failed to resolve import './issue'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/issue.ts`:
```ts
// 與 src/utils/editor/github.ts 的 OWNER/REPO 保持一致
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

export type IssueBrief = {
  collection: string;
  title: string;
  slug: string;
  direction?: string;
  sources?: string;
  conclusion?: string;
};

export function buildIssueBody(b: IssueBrief): string {
  const or = (v?: string) => (v && v.trim() ? v.trim() : '未指定');
  return `## 文章寫作工單

- 分類（collection）: ${b.collection}
- 標題: ${b.title}
- 目標檔案: \`src/content/${b.collection}/${b.slug}.mdx\`
- 網址: \`/${b.collection}/${b.slug}/\`

### 寫作方向
${or(b.direction)}

### 參考資料源
${or(b.sources)}

### 想表達的結論
${or(b.conclusion)}

---
### 給寫作者（Claude Code）
- 依 \`src/content.config.ts\` 的 \`${b.collection}\` schema 填 frontmatter（必填欄位、\`description\` 字數上限）。
- 內容結構與風格參考既有 \`${b.collection}\` 文章與 \`docs/playbooks/article-layout.md\`。
- 健康資訊須有可信來源；\`references\` 用真實連結，**禁止杜撰**。
- 寫到目標檔案後以 **PR** 回傳（不要直接 push main）。
`;
}

export async function createArticleIssue(args: IssueBrief & { token: string }): Promise<{ number: number; url: string }> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: `[文章] ${args.title}`,
      body: buildIssueBody(args),
      labels: ['article-draft'],
    }),
  });
  if (!res.ok) throw new Error(`建立 Issue 失敗（${res.status}）。請確認已登入管理者帳號後重試。`);
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, url: data.html_url };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/issue.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/issue.ts src/utils/editor/issue.test.ts
git commit -m "feat(editor): 文章寫作 Issue 工單組裝與建立"
```

---

### Task 2: github.ts 加 fileExists（輪詢用）

**Files:**
- Modify: `src/utils/editor/github.ts`
- Test: `src/utils/editor/github.test.ts`

- [ ] **Step 1: Write the failing test**

在 `src/utils/editor/github.test.ts` 末端追加：
```ts
import { fileExists } from './github';

describe('fileExists', () => {
  it('200 → true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    expect(await fileExists('src/content/articles/x.mdx', 'tok')).toBe(true);
  });
  it('404 → false（不丟錯，供輪詢）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    expect(await fileExists('src/content/articles/x.mdx', 'tok')).toBe(false);
  });
  it('其他狀態 → 丟錯', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    await expect(fileExists('p', 't')).rejects.toThrow('fileExists 500');
  });
});
```
（若該測試檔尚未 import `vi`/`afterEach`，沿用檔案開頭既有的 vitest import；`github.test.ts` 既有測試已用到 `vi`。）

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/github.test.ts`
Expected: FAIL，`fileExists is not a function`。

- [ ] **Step 3: Write minimal implementation**

在 `src/utils/editor/github.ts` 末端追加（沿用檔案上方既有的 `API` 常數 = `https://api.github.com/repos/.../contents`）：
```ts
// 檢查檔案是否存在於 main（供 AI 寫作任務輪詢；404 回 false 不丟錯）
export async function fileExists(path: string, token: string): Promise<boolean> {
  const res = await fetch(`${API}/${path}?ref=main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return false;
  if (res.ok) return true;
  throw new Error(`fileExists ${res.status}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/github.test.ts`
Expected: PASS（既有 + 3 新）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/github.ts src/utils/editor/github.test.ts
git commit -m "feat(editor): github fileExists 供任務輪詢"
```

---

### Task 3: NewArticle 加進階 UI + AI 寫作任務輪詢

**Files:**
- Modify: `src/components/editor/NewArticle.svelte`（整檔改寫）

- [ ] **Step 1: 改寫 NewArticle.svelte**

整檔覆寫 `src/components/editor/NewArticle.svelte`：
```svelte
<script>
  import { onDestroy } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { slugFromTitle } from '@/utils/editor/slugify';
  import { createArticleIssue } from '@/utils/editor/issue';
  import { fileExists } from '@/utils/editor/github';
  import EditorPanel from './EditorPanel.svelte';

  const COLLECTIONS = [
    { value: 'articles', label: '健康文章' },
    { value: 'myths', label: '迷思查證' },
    { value: 'ingredients', label: '成分解析' },
  ];
  let collection = $state('articles');
  let title = $state('');
  let customSlug = $state('');
  let showAdvanced = $state(false);
  let direction = $state('');
  let sources = $state('');
  let conclusion = $state('');

  let open = $state(false);
  let initialDoc = $state(null);
  let repoPath = $state('');
  let slug = $state('');

  let taskState = $state(''); // '' | 'pending'
  let issueNumber = $state(0);
  let issueUrl = $state('');
  let taskRepoPath = '';
  let polling = false;
  let pollTimer = null;

  // 決定 slug：自訂有值須合法；否則自動拼音。不合法回 null（已 alert）。
  function resolveSlug() {
    if (!title.trim()) { alert('請先填標題'); return null; }
    const c = customSlug.trim();
    if (c) {
      if (!/^[a-z0-9-]+$/.test(c)) { alert('自訂網址只能用小寫英文、數字與連字號，例如 vitamin-c-myth'); return null; }
      return c;
    }
    return slugFromTitle(title.trim());
  }

  function start() {
    const s = resolveSlug();
    if (!s) return;
    slug = s;
    repoPath = `src/content/${collection}/${slug}.mdx`;
    initialDoc = {
      frontmatter: { title: title.trim(), description: '', publishDate: new Date().toISOString().slice(0, 10) },
      body: '',
    };
    open = true;
  }

  async function createTask() {
    const s = resolveSlug();
    if (!s) return;
    slug = s;
    taskRepoPath = `src/content/${collection}/${slug}.mdx`;
    try {
      const issue = await createArticleIssue({ collection, title: title.trim(), slug, direction, sources, conclusion, token: getToken() });
      issueNumber = issue.number;
      issueUrl = issue.url;
      taskState = 'pending';
      startTaskPoll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function stopTaskPoll() {
    polling = false;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function startTaskPoll() {
    polling = true;
    const tick = async () => {
      if (!polling) return;
      try {
        if (await fileExists(taskRepoPath, getToken())) {
          stopTaskPoll();
          // 檔案出現 → 自動開編輯器（EDIT 模式載入 AI 寫好的內容）
          repoPath = taskRepoPath;
          initialDoc = null;
          taskState = '';
          open = true;
          return;
        }
      } catch {
        // 單次失敗忽略，繼續輪詢
      }
      if (polling) pollTimer = setTimeout(tick, 15000);
    };
    pollTimer = setTimeout(tick, 15000);
  }

  function closeTask() {
    stopTaskPoll();
    taskState = '';
  }

  onDestroy(stopTaskPoll);
</script>

{#if getToken()}
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} {initialDoc} onclose={() => (open = false)} />
  {:else if taskState === 'pending'}
    <section class="et-new">
      <h2>AI 寫作任務</h2>
      <p class="et-task-msg">✍️ 已建立寫作任務（Issue #{issueNumber}，進行中）…</p>
      <p class="et-new-note">
        你可以<strong>關閉</strong>這個視窗（任務會繼續；文章寫好後到該網址用「編輯」鈕修改即可），
        或<strong>留著等候</strong>——完成後會自動開啟編輯畫面。
        <a href={issueUrl} target="_blank" rel="noopener noreferrer">查看 Issue →</a>
      </p>
      <button class="et-create" onclick={closeTask}>關閉</button>
    </section>
  {:else}
    <section class="et-new">
      <h2>新增文章</h2>
      <label>
        <span>分類</span>
        <select bind:value={collection}>
          {#each COLLECTIONS as c}<option value={c.value}>{c.label}</option>{/each}
        </select>
      </label>
      <label>
        <span>標題</span>
        <input placeholder="例：維他命 C 的劑型迷思" bind:value={title} />
      </label>

      <button type="button" class="et-adv-toggle" onclick={() => (showAdvanced = !showAdvanced)}>
        {showAdvanced ? '▾' : '▸'} 進階選項
      </button>
      {#if showAdvanced}
        <label>
          <span>自訂網址（slug）</span>
          <input placeholder="留空則由標題自動產生" bind:value={customSlug} />
          <small>選填；只能用小寫英文、數字、連字號。留空會自動以標題拼音產生。</small>
        </label>
        <fieldset class="et-ai-task">
          <legend>AI 代寫（選填，交給 Claude Code 撰寫）</legend>
          <label><span>寫作方向</span><textarea bind:value={direction}></textarea></label>
          <label><span>參考資料源</span><textarea bind:value={sources}></textarea></label>
          <label><span>想表達的結論</span><textarea bind:value={conclusion}></textarea></label>
          <button class="et-create" onclick={createTask}>建立 AI 寫作任務</button>
        </fieldset>
      {/if}

      <button class="et-create" onclick={start}>建立並編輯</button>
    </section>
  {/if}
{/if}

<style>
  .et-new {
    margin-top: clamp(1.5rem, 1rem + 2vw, 2.5rem);
    padding: clamp(1rem, 0.75rem + 1vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: color-mix(in oklch, var(--color-paper) 55%, white);
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-card);
    color: var(--color-ink);
  }
  .et-new h2 { font-size: var(--text-h3); margin: 0; }
  .et-new label { display: flex; flex-direction: column; gap: 0.25rem; }
  .et-new span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .et-new small,
  .et-new-note { font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .et-new-note { margin: 0; }
  .et-task-msg { margin: 0; font-family: var(--font-ui); font-weight: 700; color: var(--color-teal); }
  .et-new :is(input, select, textarea) {
    font-family: var(--font-ui);
    font-size: var(--text-body);
    color: var(--color-ink);
    background: white;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.65rem;
  }
  .et-new textarea { min-height: 3.5rem; resize: vertical; }
  .et-new :is(input, select, textarea):focus-visible { outline: 2px solid var(--color-teal); outline-offset: 1px; }
  .et-adv-toggle {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0.25rem 0;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: var(--color-teal);
    cursor: pointer;
  }
  .et-ai-task {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.75rem;
    margin: 0;
  }
  .et-ai-task legend { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; padding: 0 0.4rem; }
  .et-create {
    align-self: flex-start;
    min-height: 44px;
    padding: 0.6rem 1.25rem;
    border: 1px solid var(--color-teal);
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: white;
    background: var(--color-teal);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .et-create:hover { background: var(--color-teal-hover); border-color: var(--color-teal-hover); }
  .et-create:focus-visible { outline: 2px solid var(--color-coral); outline-offset: 2px; }
</style>
```

- [ ] **Step 2: 驗證測試與 build**

Run: `pnpm test 2>&1 | grep -iE "Tests |FAIL" | tail -2`
Expected: 全綠。

Run: `pnpm build 2>&1 | tail -3`
Expected: `[build] Complete!`。

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/NewArticle.svelte
git commit -m "feat(editor): 新增文章進階選項（自訂網址 + AI 寫作任務輪詢）"
```

---

### Task 4: Playbook 文件同步

**Files:**
- Modify: `docs/playbooks/editor-spine.md`

- [ ] **Step 1: 更新新增文章說明**

在 `docs/playbooks/editor-spine.md` 的「新增文章」相關處補上「進階選項」：
```markdown
### 進階選項（editor-08）
- **自訂網址**：選填 input；空→`slugFromTitle()` 自動拼音，填了須 `^[a-z0-9-]+$`（`resolveSlug()` 驗證，不符 alert 擋下）。對「建立並編輯」與「建立 AI 寫作任務」皆生效。
- **AI 寫作任務**：寫作方向／參考資料源／想表達的結論（選填）→「建立 AI 寫作任務」→ `createArticleIssue()`（`issue.ts`）開 GitHub Issue 工單（`[文章] <title>`、label `article-draft`、body 含目標檔路徑與給 Claude Code 的指示）→ 畫面進「進行中」並每 15s `fileExists()` 輪詢目標檔；檔案出現 → 自動開 `EditorPanel`（EDIT 模式載入 AI 寫好的內容）。引導使用者可關閉或等候；`onDestroy`/closeTask 停止輪詢。
- 不需 Anthropic 金鑰／AI Worker；撰寫由 Claude Code 在 repo 上完成（依 schema/playbook、references 真實連結、PR 回傳）。前提：使用者建立任務後自行跑 CLI 處理該 issue。
```

- [ ] **Step 2: Commit**

```bash
git add docs/playbooks/editor-spine.md
git commit -m "docs(editor): 新增文章進階選項與 AI 寫作任務 playbook"
```

---

## Self-Review

- **Spec coverage**：Task 1 = issue 工單 `buildIssueBody`/`createArticleIssue`（含目標路徑、label、禁杜撰指示）；Task 2 = `fileExists`（404 不丟錯，供輪詢）；Task 3 = NewArticle 進階 UI（自訂網址驗證 `resolveSlug`、三欄、建立任務、輪詢、完成轉 EditorPanel EDIT 模式、可關閉引導、onDestroy 清理）；Task 4 = 文件。涵蓋 spec 全部要求。
- **Placeholder scan**：無 TBD/TODO；每步附完整程式碼與測試。NewArticle/EditorPanel 為 Svelte island，依專案慣例以 build + 手動驗證（無瀏覽器測試框架）。
- **Type consistency**：`IssueBrief`、`createArticleIssue(...)→{number,url}`、`buildIssueBody(IssueBrief)→string`、`fileExists(path,token)→Promise<boolean>` 在 issue.ts/github.ts 與 NewArticle 使用處一致；`resolveSlug()→string|null`、`taskRepoPath` 與 `EditorPanel` 的 `repoPath/collection/slug/initialDoc` props 一致。
- **OWNER/REPO 重複**：issue.ts 重複 github.ts 常數（附註解），刻意不動有測試的 github.ts，可接受的小重複。
