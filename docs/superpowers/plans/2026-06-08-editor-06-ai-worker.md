# AI 建議 Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 AI 建議 Worker：接收編輯器的 `{ task, context, selection }`，呼叫 Anthropic Claude API 產生改寫/摘要/潤飾建議，回傳 `{ suggestion }`；呼叫前以 GitHub token 驗證具 repo 寫入權，避免付費端點被濫用。

**Architecture:** 獨立 Cloudflare Worker，核心純函式 `handle(request, env)`。流程：CORS 預檢 → 驗證 `Authorization` 的 GitHub token 對 repo 有 push 權（GitHub API）→ 以 `buildPrompt` 組提示 → 呼叫 Anthropic Messages API → 回 `{ suggestion }`。`buildPrompt` 與路由皆可在 node 環境 vitest 以 mock fetch 測試。

**Tech Stack:** TypeScript、Cloudflare Workers、Anthropic Messages API、vitest。

**契約來源:** spec「⑤ AI 建議」。

**前置依賴:** vitest 基礎設施（mdx-doc 計畫 Task 1）。隔離後端，可平行。

**決策（已定）:** 供應商 Anthropic Claude；預設模型 `claude-haiku-4-5-20251001`，需要時升 sonnet。

---

### Task 1: Worker 骨架與 `buildPrompt`

**Files:**
- Create: `workers/ai-suggest/wrangler.toml`
- Create: `workers/ai-suggest/src/index.ts`
- Test: `workers/ai-suggest/src/prompt.test.ts`
- Create: `workers/ai-suggest/src/prompt.ts`

- [ ] **Step 1: Write the failing test**

Create `workers/ai-suggest/src/prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('rewrite 任務含選取文字與改寫指示', () => {
    const p = buildPrompt('rewrite', { title: '測試' }, '原句。');
    expect(p).toContain('原句。');
    expect(p).toContain('改寫');
  });
  it('summarize 任務含摘要指示', () => {
    const p = buildPrompt('summarize', {}, '一大段內容。');
    expect(p).toContain('摘要');
  });
  it('未知任務退回潤飾指示', () => {
    const p = buildPrompt('improve', {}, '句子。');
    expect(p).toContain('潤飾');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test workers/ai-suggest/src/prompt.test.ts`
Expected: FAIL，`Failed to resolve import './prompt'`。

- [ ] **Step 3: Write minimal implementation**

Create `workers/ai-suggest/src/prompt.ts`:
```ts
export type SuggestTask = 'rewrite' | 'summarize' | 'improve';

const INSTRUCTION: Record<SuggestTask, string> = {
  rewrite: '請以更清楚、易讀的繁體中文改寫下列文字，保留原意與專業度：',
  summarize: '請用繁體中文為下列文字寫一段精簡摘要：',
  improve: '請潤飾下列繁體中文文字，修正語病與冗詞，保持原意：',
};

export function buildPrompt(task: string, context: Record<string, unknown>, selection: string): string {
  const t = (['rewrite', 'summarize', 'improve'] as const).includes(task as SuggestTask) ? (task as SuggestTask) : 'improve';
  const ctx = context && Object.keys(context).length ? `\n\n文章脈絡：${JSON.stringify(context)}` : '';
  return `${INSTRUCTION[t]}${ctx}\n\n---\n${selection}\n---\n\n只輸出結果文字，不要前後說明。`;
}
```

- [ ] **Step 4: 建立 wrangler.toml 與 entry**

Create `workers/ai-suggest/wrangler.toml`:
```toml
name = "evidencetoday-ai-suggest"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[vars]
ALLOWED_ORIGIN = "https://evidencetoday.news"
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
GITHUB_OWNER = "weiqi-kids"
GITHUB_REPO = "evidencetoday.news"
```

Create `workers/ai-suggest/src/index.ts`:
```ts
import { buildPrompt } from './prompt';

export interface Env {
  ANTHROPIC_API_KEY: string; // wrangler secret
  ANTHROPIC_MODEL: string;
  ALLOWED_ORIGIN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

export default { async fetch(req: Request, env: Env) { return handle(req, env); } };

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  return new Response('not found', { status: 404, headers: cors(env) });
}

export { buildPrompt };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test workers/ai-suggest/src/prompt.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add workers/ai-suggest/
git commit -m "feat(ai): AI 建議 Worker 骨架與 buildPrompt"
```

---

### Task 2: `/suggest` — 驗權 + 呼叫 Claude

**Files:**
- Modify: `workers/ai-suggest/src/index.ts`
- Test: `workers/ai-suggest/src/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `workers/ai-suggest/src/index.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handle, type Env } from './index';

const env: Env = {
  ANTHROPIC_API_KEY: 'sk-test',
  ANTHROPIC_MODEL: 'claude-haiku-4-5-20251001',
  ALLOWED_ORIGIN: 'https://evidencetoday.news',
  GITHUB_OWNER: 'weiqi-kids',
  GITHUB_REPO: 'evidencetoday.news',
};

function req(body: object, auth = 'Bearer ght') {
  return new Request('https://w.dev/suggest', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('/suggest', () => {
  it('無寫入權的 token → 403', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ permissions: { push: false } }), { status: 200 })
    ));
    const res = await handle(req({ task: 'rewrite', context: {}, selection: 'x' }), env);
    expect(res.status).toBe(403);
  });

  it('有寫入權 → 呼叫 Claude，回 { suggestion }', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ permissions: { push: true } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ type: 'text', text: '改寫後的句子。' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await handle(req({ task: 'rewrite', context: {}, selection: '原句。' }), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ suggestion: '改寫後的句子。' });
    // 第二次呼叫是 Anthropic
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init as RequestInit).headers).toMatchObject({ 'x-api-key': 'sk-test', 'anthropic-version': '2023-06-01' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test workers/ai-suggest/src/index.test.ts`
Expected: FAIL（`/suggest` 仍回 404）。

- [ ] **Step 3: Write minimal implementation**

在 `handle` 的 OPTIONS 之後、404 之前加入：
```ts
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/suggest') {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: '缺少授權' }, 401, env);

    // 驗證 token 對 repo 有 push 權
    const repoRes = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'et-ai-suggest' },
    });
    const repo = (await repoRes.json()) as { permissions?: { push?: boolean } };
    if (!repo.permissions?.push) return json({ error: '無 repo 寫入權' }, 403, env);

    const { task, context, selection } = (await request.json()) as { task: string; context: Record<string, unknown>; selection: string };
    const prompt = buildPrompt(task, context, selection);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    const ai = (await aiRes.json()) as { content?: { type: string; text: string }[] };
    const suggestion = ai.content?.find((c) => c.type === 'text')?.text ?? '';
    return json({ suggestion }, 200, env);
  }
```
並在檔案內加入 `json` 輔助：
```ts
function json(obj: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test workers/ai-suggest/src/index.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add workers/ai-suggest/src/index.ts workers/ai-suggest/src/index.test.ts
git commit -m "feat(ai): /suggest 驗 repo 寫入權後呼叫 Claude"
```

---

### Task 3: 編輯面板接入 AI 建議

**Files:**
- Modify: `src/components/editor/EditorPanel.svelte`

- [ ] **Step 1: 加入建議呼叫**

於 `EditorPanel.svelte` `<script>` 加入（`AI_WORKER` 部署後填實際網域）：
```ts
const AI_WORKER = 'https://evidencetoday-ai-suggest.<account>.workers.dev';
let suggestion = $state('');
async function suggest(task) {
  suggestion = '產生中…';
  const res = await fetch(`${AI_WORKER}/suggest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ task, context: { title: frontmatter.title }, selection: body }),
  });
  if (res.ok) suggestion = (await res.json()).suggestion;
  else suggestion = `建議失敗（${res.status}）：請確認已登入管理者帳號。`;
}
function acceptSuggestion() { body = suggestion; suggestion = ''; }
```
markup 加一區：
```svelte
<div class="et-ai">
  <button onclick={() => suggest('improve')}>AI 潤飾正文</button>
  <button onclick={() => suggest('summarize')}>AI 摘要</button>
  {#if suggestion}
    <pre class="et-ai-out">{suggestion}</pre>
    <button onclick={acceptSuggestion}>採用為正文</button>
  {/if}
</div>
```

- [ ] **Step 2: 手動驗證（需 AI Worker 已部署、登入管理者）**

Run: `pnpm dev`；開文章 → 「AI 潤飾正文」→ 顯示建議 → 「採用為正文」覆寫 body → 可再存檔。
Expected: 建議產生並可採納；非管理者帳號顯示失敗引導。

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorPanel.svelte
git commit -m "feat(editor): 編輯面板接入 AI 建議"
```

---

### Task 4: 部署說明

**Files:**
- Create: `workers/ai-suggest/README.md`

- [ ] **Step 1: 撰寫部署文件**

Create `workers/ai-suggest/README.md`:
```markdown
# evidencetoday AI 建議 Worker

## 設定
`cd workers/ai-suggest && npx wrangler secret put ANTHROPIC_API_KEY`
（wrangler.toml 已含 ANTHROPIC_MODEL、ALLOWED_ORIGIN、GITHUB_OWNER/REPO）

## 部署
`cd workers/ai-suggest && npx wrangler deploy`

## 安全
- 端點呼叫前以呼叫者的 GitHub token 驗證對 repo 有 push 權，無權回 403，避免付費 API 被濫用。
- CORS 僅允許 ALLOWED_ORIGIN。
```

- [ ] **Step 2: Commit**

```bash
git add workers/ai-suggest/README.md
git commit -m "docs(ai): AI 建議 Worker 部署說明"
```

---

## Self-Review

- **Spec coverage**：實作 spec「⑤ AI 建議」的 `POST /suggest {task,context,selection}` → `{suggestion}` 契約，採 Anthropic Claude（決策），並加上「驗 repo 寫入權」保護付費端點（超出 spec 的合理強化，於文件載明）。
- **Placeholder scan**：`AI_WORKER` 的 `<account>`、wrangler `[vars]` 為部署值（README 說明），非程式碼 placeholder；其餘步驟附完整程式碼與測試。前端接入 UI 採手動驗證（無瀏覽器測試框架）。
- **Type consistency**：`buildPrompt(task,context,selection)→string`、`Env` 介面、`handle(request,env)`、`json()` 輔助在 index 與測試一致；前端 `suggest(task)` 與 worker 契約一致。
- **平行備註**：Task 1–2（worker 後端）可與其他單元平行；Task 3（前端接入）依賴 spine 的 EditorPanel，屬第三波整合。
