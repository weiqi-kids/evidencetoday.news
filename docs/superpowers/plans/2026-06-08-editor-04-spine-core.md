# spine 核心（可運作的最小編輯迴圈）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立前台編輯器的核心收斂樞紐：`/admin` 登入頁、偵測 token 才顯示的「編輯」按鈕、GitHub commit client、存檔狀態機（含可行動失敗引導）、raw MDX 編輯面板。完成後即達成「登入 → 編輯既有文章 → 存檔 → 失敗有引導」的完整迴圈。

**Architecture:** 純邏輯（commit client、存檔狀態機、EditDoc 組裝）以 TDD 實作並單元測試；UI（`/admin` Astro 頁、Svelte 編輯 island）依專案既有 island 慣例（`client:idle`）實作。所有部分共用 `EditDoc` 模型與 `mdx-doc` 的 parse/serialize。lint 與 SSR 預覽以介面預留接點，分別由其單元接入。

**Tech Stack:** TypeScript、Svelte 5、Astro、vitest。

**契約來源:** `docs/superpowers/specs/2026-06-08-inline-mdx-editor-design.md`「② Commit」「存檔狀態機」「單一事實來源」。

**前置依賴:** `editor-01-mdx-doc`（需 `parse`/`serialize` 與 vitest）。OAuth Worker（`editor-03`）提供 `/admin#token=` 導回，本計畫 Task 4 消費該契約。

---

### Task 1: GitHub commit client（getFile / putFile）

**Files:**
- Create: `src/utils/editor/github.ts`
- Test: `src/utils/editor/github.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/github.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getFile, putFile } from './github';

afterEach(() => vi.restoreAllMocks());

const utf8ToB64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

describe('getFile', () => {
  it('GET 內容並回傳 utf8 內容與 sha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ content: utf8ToB64('標題：測試\n'), sha: 'sha1' }), { status: 200 })
    ));
    const r = await getFile('src/content/myths/x.mdx', 'tok');
    expect(r).toEqual({ content: '標題：測試\n', sha: 'sha1' });
  });
});

describe('putFile', () => {
  it('成功回傳 status 200', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', spy);
    const status = await putFile({ path: 'src/content/myths/x.mdx', content: '新內容\n', sha: 'sha1', message: 'msg', token: 'tok' });
    expect(status).toBe(200);
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit).method).toBe('PUT');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.branch).toBe('main');
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe('新內容\n');
  });

  it('回傳 GitHub 的錯誤 status（如 409）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('conflict', { status: 409 })));
    const status = await putFile({ path: 'p', content: 'c', sha: 's', message: 'm', token: 't' });
    expect(status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/github.test.ts`
Expected: FAIL，`Failed to resolve import './github'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/github.ts`:
```ts
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

// UTF-8 安全的 base64（瀏覽器與 node 皆可）
function encodeBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getFile(path: string, token: string): Promise<{ content: string; sha: string }> {
  const res = await fetch(`${API}/${path}?ref=main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`getFile ${res.status}`);
  const data = (await res.json()) as { content: string; sha: string };
  return { content: decodeBase64(data.content), sha: data.sha };
}

export async function putFile(args: {
  path: string; content: string; sha: string | null; message: string; token: string;
}): Promise<number> {
  const body: Record<string, unknown> = {
    message: args.message,
    content: encodeBase64(args.content),
    branch: 'main',
  };
  if (args.sha) body.sha = args.sha;
  const res = await fetch(`${API}/${args.path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${args.token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/github.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/github.ts src/utils/editor/github.test.ts
git commit -m "feat(editor): GitHub commit client getFile/putFile"
```

---

### Task 2: 存檔狀態機（含可行動失敗引導）

**Files:**
- Create: `src/utils/editor/save-machine.ts`
- Test: `src/utils/editor/save-machine.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/save-machine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { classifySave } from './save-machine';

describe('classifySave', () => {
  it('200/201 → success', () => {
    expect(classifySave(200).state).toBe('success');
    expect(classifySave(201).state).toBe('success');
  });
  it('409 → conflict，訊息含「重新載入」與「網站工程師」', () => {
    const r = classifySave(409);
    expect(r.state).toBe('conflict');
    expect(r.message).toContain('重新載入');
    expect(r.message).toContain('網站工程師');
  });
  it('403 → forbidden，提示無寫入權', () => {
    const r = classifySave(403);
    expect(r.state).toBe('forbidden');
    expect(r.message).toContain('寫入權');
  });
  it('其他狀態 → network，提示內容仍保留', () => {
    const r = classifySave(500);
    expect(r.state).toBe('network');
    expect(r.message).toContain('仍保留');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/save-machine.test.ts`
Expected: FAIL，`classifySave is not a function`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/save-machine.ts`:
```ts
export type SaveState = 'success' | 'conflict' | 'forbidden' | 'network';

export type SaveOutcome = { state: SaveState; message: string };

export function classifySave(status: number): SaveOutcome {
  if (status === 200 || status === 201) {
    return { state: 'success', message: '已存檔，部署中（約 1–2 分鐘上線）。' };
  }
  if (status === 409) {
    return {
      state: 'conflict',
      message: '檔案已被自動化管線或他人更新。請按「重新載入最新版」，把修改重做一次再存；若反覆衝突，請聯絡網站工程師協助處理合併。',
    };
  }
  if (status === 403) {
    return {
      state: 'forbidden',
      message: '此 GitHub 帳號對 repo 無寫入權，無法存檔。請確認登入的是管理者帳號，或聯絡網站工程師開通權限。',
    };
  }
  return {
    state: 'network',
    message: '網路或 GitHub 連線異常，變更尚未送出。請檢查網路後再按存檔；你的編輯內容仍保留在此頁。',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/save-machine.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/save-machine.ts src/utils/editor/save-machine.test.ts
git commit -m "feat(editor): 存檔狀態機與可行動失敗引導"
```

---

### Task 3: token 存取工具（sessionStorage）

**Files:**
- Create: `src/utils/editor/token.ts`
- Test: `src/utils/editor/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/token.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, KEY } from './token';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

describe('token 工具', () => {
  it('set 後 get 取得同值', () => {
    setToken('tok1');
    expect(getToken()).toBe('tok1');
    expect(KEY).toBe('et_gh_token');
  });
  it('clear 後 get 為 null', () => {
    setToken('tok1');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/token.test.ts`
Expected: FAIL，`Failed to resolve import './token'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/token.ts`:
```ts
export const KEY = 'et_gh_token';

export function getToken(): string | null {
  return sessionStorage.getItem(KEY);
}
export function setToken(token: string): void {
  sessionStorage.setItem(KEY, token);
}
export function clearToken(): void {
  sessionStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/token.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/token.ts src/utils/editor/token.test.ts
git commit -m "feat(editor): sessionStorage token 存取工具"
```

---

### Task 4: `/admin` 登入頁

**Files:**
- Create: `src/pages/admin.astro`
- Create: `src/components/editor/AdminLogin.svelte`

說明：`/admin` 是隱藏頁（不放任何公開連結、不進 sitemap）。元件負責：載入時讀 URL fragment 的 `token`/`state`，比對 sessionStorage 暫存的 `state` 後存入 token、清掉 fragment；顯示登入/登出。

- [ ] **Step 1: 建立 Svelte 登入元件**

Create `src/components/editor/AdminLogin.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { getToken, setToken, clearToken } from '@/utils/editor/token';

  // 部署後填入實際 Worker 網域
  const WORKER = 'https://evidencetoday-github-oauth.<account>.workers.dev';
  let loggedIn = $state(false);

  onMount(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('token');
    const state = hash.get('state');
    const expected = sessionStorage.getItem('et_oauth_state');
    if (token && state && state === expected) {
      setToken(token);
      sessionStorage.removeItem('et_oauth_state');
      history.replaceState(null, '', location.pathname); // 清掉 fragment
    }
    loggedIn = !!getToken();
  });

  function login() {
    const state = Math.random().toString(36).slice(2); // 僅作 CSRF 對照，非密鑰
    sessionStorage.setItem('et_oauth_state', state);
    location.href = `${WORKER}/auth?state=${state}`;
  }
  function logout() {
    clearToken();
    loggedIn = false;
  }
</script>

{#if loggedIn}
  <p>已登入。全站文章現在會出現「編輯」按鈕。</p>
  <button onclick={logout}>登出</button>
{:else}
  <button onclick={login}>用 GitHub 登入</button>
{/if}
```

備註：`state` 用 `Math.random()` 僅作為 CSRF 對照值（非安全密鑰），符合「裝飾層」定位；真正的寫入安全在 GitHub 端驗證。

- [ ] **Step 2: 建立 admin 頁**

Create `src/pages/admin.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
import AdminLogin from '@/components/editor/AdminLogin.svelte';
---
<Base title="管理登入" description="" noindex={true}>
  <main style="max-width: 40rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>管理登入</h1>
    <AdminLogin client:only="svelte" />
  </main>
</Base>
```

備註：若 `Base.astro` 無 `noindex` prop，改在此頁 `<Fragment slot="head"><meta name="robots" content="noindex" /></Fragment>`，並確認 admin 不被 sitemap 收錄。

- [ ] **Step 3: 手動驗證**

Run: `pnpm dev`，瀏覽 `http://localhost:4321/admin`
Expected: 顯示「用 GitHub 登入」按鈕（OAuth 完整流程需 Worker 部署後才能跑通；此步先確認頁面與按鈕渲染正常）。

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin.astro src/components/editor/AdminLogin.svelte
git commit -m "feat(editor): /admin 隱藏登入頁與 OAuth 觸發"
```

---

### Task 5: 編輯按鈕 island（偵測 token 才顯示）

**Files:**
- Create: `src/components/editor/EditButton.svelte`
- Modify: `src/pages/articles/[slug].astro`、`src/pages/myths/[slug].astro`（首波兩個 collection）

- [ ] **Step 1: 建立 EditButton 元件**

Create `src/components/editor/EditButton.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import EditorPanel from './EditorPanel.svelte';

  let { repoPath, collection, slug } = $props();
  let show = $state(false);
  let open = $state(false);

  onMount(() => { show = !!getToken(); });
</script>

{#if show}
  <button class="et-edit-fab" onclick={() => (open = true)} aria-label="編輯這篇">編輯</button>
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} onclose={() => (open = false)} />
  {/if}
{/if}

<style>
  .et-edit-fab {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 50;
    padding: 0.6rem 1rem; border-radius: 999px; border: none;
    background: var(--color-coral, #c0492f); color: #fff; cursor: pointer;
  }
</style>
```

- [ ] **Step 2: 在內容頁掛載（articles 範例）**

在 `src/pages/articles/[slug].astro` frontmatter import：
```astro
import EditButton from '@/components/editor/EditButton.svelte';
```
在頁面內容尾端、`</Article>` 之前加入（`entry` 為該頁既有的內容項變數；若變數名不同請對應調整）：
```astro
<EditButton client:idle repoPath={`src/content/articles/${entry.id}`} collection="articles" slug={entry.id.replace(/\.[^.]+$/, '')} />
```

- [ ] **Step 3: 在 myths 頁同樣掛載**

在 `src/pages/myths/[slug].astro` import 同一元件，於 `</Article>` 之前加入：
```astro
<EditButton client:idle repoPath={`src/content/myths/${entry.id}`} collection="myths" slug={entry.id.replace(/\.[^.]+$/, '')} />
```

- [ ] **Step 4: 手動驗證**

Run: `pnpm dev`；未登入時瀏覽任一篇文章 → **不應**出現編輯按鈕。於 `/admin` 手動在 console 設 `sessionStorage.setItem('et_gh_token','dummy')` 後重新整理文章頁 → 應出現右下角「編輯」FAB。
Expected: 行為符合（gate 由 token 控制）。驗證後清掉 dummy token。

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EditButton.svelte src/pages/articles/[slug].astro src/pages/myths/[slug].astro
git commit -m "feat(editor): 編輯按鈕 island，偵測 token 才顯示"
```

---

### Task 6: 編輯面板（raw MDX 編輯 + 抓最新 + 存檔）

**Files:**
- Create: `src/components/editor/EditorPanel.svelte`

- [ ] **Step 1: 建立編輯面板**

Create `src/components/editor/EditorPanel.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { getFile, putFile } from '@/utils/editor/github';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';

  let { repoPath, slug, onclose } = $props();

  let raw = $state('');
  let sha = $state(null);
  let status = $state('loading'); // loading | ready | saving | done | error
  let message = $state('');

  onMount(async () => {
    try {
      const token = getToken();
      const file = await getFile(repoPath, token); // 抓最新版與 sha
      raw = file.content;
      sha = file.sha;
      status = 'ready';
    } catch (e) {
      status = 'error';
      message = `載入失敗：${e instanceof Error ? e.message : e}。請重新整理再試。`;
    }
  });

  async function save() {
    // 送出前的輕量 frontmatter 護欄（擋掉會讓 build 失敗的格式錯誤）
    try {
      const doc = parse(raw);
      serialize(doc); // 解析+序列化能通過即視為 frontmatter 可用
    } catch (e) {
      status = 'error';
      message = `frontmatter 格式有誤：${e instanceof Error ? e.message : e}。請修正後再存（常見：縮排、缺引號、日期格式）。`;
      return;
    }
    status = 'saving';
    try {
      const code = await putFile({ path: repoPath, content: raw, sha, message: `content: 前台編輯 ${slug}`, token: getToken() });
      const outcome = classifySave(code);
      message = outcome.message;
      status = outcome.state === 'success' ? 'done' : 'error';
    } catch (e) {
      const outcome = classifySave(0); // 視為 network
      message = outcome.message;
      status = 'error';
    }
  }

  async function reload() {
    const file = await getFile(repoPath, getToken());
    raw = file.content; sha = file.sha; status = 'ready'; message = '';
  }
</script>

<div class="et-overlay" role="dialog" aria-modal="true">
  <div class="et-panel">
    <header><strong>編輯：{slug}</strong><button onclick={onclose} aria-label="關閉">✕</button></header>
    {#if status === 'loading'}<p>載入中…</p>{/if}
    {#if status !== 'loading'}
      <textarea bind:value={raw} spellcheck="false"></textarea>
    {/if}
    {#if message}<p class="et-msg">{message}</p>{/if}
    <footer>
      <button onclick={save} disabled={status === 'saving' || status === 'loading'}>儲存</button>
      <button onclick={reload}>重新載入最新版</button>
    </footer>
  </div>
</div>

<style>
  .et-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 60; display: flex; }
  .et-panel { background: #fff; margin: auto; width: min(900px, 94vw); height: 90vh; display: flex; flex-direction: column; border-radius: 12px; padding: 1rem; }
  .et-panel header, .et-panel footer { display: flex; justify-content: space-between; gap: .5rem; }
  .et-panel textarea { flex: 1; width: 100%; font-family: ui-monospace, monospace; font-size: .9rem; margin: .75rem 0; }
  .et-msg { color: var(--color-ink, #222); background: #f5f5f5; padding: .5rem .75rem; border-radius: 8px; }
</style>
```

備註：`reload` 對應 conflict 的「重新載入最新版」可行動引導。lint 側欄與 SSR 真實預覽分別由 `editor-02-lint-engine`、SSR 預覽計畫接入此面板（預留 `raw`/`parse(raw)` 作為輸入）。

- [ ] **Step 2: 手動驗證（需 Worker 已部署、且登入管理者帳號）**

Run: `pnpm dev`，於文章頁點「編輯」→ 載入最新內容 → 改幾個字 → 儲存。
Expected: 成功顯示「已存檔，部署中」；若以無寫入權帳號則顯示 403 引導；若 sha 過期顯示 409 引導 + 可按「重新載入最新版」。

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorPanel.svelte
git commit -m "feat(editor): raw MDX 編輯面板，抓最新 sha、存檔狀態與引導"
```

---

## Self-Review

- **Spec coverage**：實作 spec「② Commit」（getFile 抓最新 sha、putFile 帶 sha/branch）、「存檔狀態機」（classifySave 四態與可行動訊息）、token sessionStorage、`/admin` 登入、token-gated 編輯按鈕、raw 編輯與 frontmatter 護欄。SEO 表單與新增文章由後續 `editor-04b` 計畫接入；lint 側欄與 SSR 預覽預留接點。
- **Placeholder scan**：`WORKER` 與 admin Svelte 的 `<account>` 為部署後填入的網域值（已註明），非程式碼 placeholder；其餘步驟皆附完整程式碼。UI 任務因專案無瀏覽器測試框架，採既有 island 慣例以手動驗證取代自動測試（符合 skill「遵循既有模式」）。
- **Type consistency**：`getFile`→`{content,sha}`、`putFile(args)`→`number`、`classifySave(status)`→`{state,message}`、token 工具 `getToken/setToken/clearToken` 在面板與按鈕中名稱一致；`EditButton`/`EditorPanel` 的 props（repoPath/collection/slug）一致。
- **平行備註**：Task 1–3（純邏輯）可在 mdx-doc 完成後立即進行；Task 4–6（UI）為收斂樞紐，須在 OAuth Worker 契約確定後整合。
