# OAuth Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個 Cloudflare Worker 作為 GitHub OAuth proxy：`/auth` 導向 GitHub 授權頁，`/callback` 以 code + client secret 換得 access token 並導回 `/admin#token=...`。

**Architecture:** 單一 Worker，核心是純函式 `handle(request, env)`，路由 `/auth` 與 `/callback`。client secret 僅存於 Worker env，前端永不接觸。`handle` 以標準 `Request`/`Response` 實作，token 交換用 `fetch`（測試時 mock），故可在 node 環境的 vitest 直接單元測試。

**Tech Stack:** TypeScript、Cloudflare Workers、wrangler、vitest。

**契約來源:** `docs/superpowers/specs/2026-06-08-inline-mdx-editor-design.md`「① Auth」。

**前置依賴:** vitest 基礎設施（mdx-doc 計畫 Task 1）。不依賴其他單元，可平行開工。

---

### Task 1: Worker 專案骨架

**Files:**
- Create: `workers/github-oauth/wrangler.toml`
- Create: `workers/github-oauth/src/index.ts`

- [ ] **Step 1: 建立 wrangler 設定**

Create `workers/github-oauth/wrangler.toml`:
```toml
name = "evidencetoday-github-oauth"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[vars]
GITHUB_CLIENT_ID = ""          # 部署時填入 OAuth App client id（公開值）
ALLOWED_ORIGIN = "https://evidencetoday.news"
OAUTH_SCOPE = "public_repo"    # 公開 repo 的最小寫入 scope
```

- [ ] **Step 2: 建立 entry 與型別**

Create `workers/github-oauth/src/index.ts`:
```ts
export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string; // 由 wrangler secret 設定
  ALLOWED_ORIGIN: string;
  OAUTH_SCOPE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
};

export async function handle(request: Request, env: Env): Promise<Response> {
  return new Response('not found', { status: 404 });
}
```

- [ ] **Step 3: Commit**

```bash
git add workers/github-oauth/wrangler.toml workers/github-oauth/src/index.ts
git commit -m "chore(oauth): Cloudflare Worker 骨架"
```

---

### Task 2: `/auth` 導向 GitHub 授權頁

**Files:**
- Modify: `workers/github-oauth/src/index.ts`
- Test: `workers/github-oauth/src/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `workers/github-oauth/src/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { handle, type Env } from './index';

const env: Env = {
  GITHUB_CLIENT_ID: 'cid123',
  GITHUB_CLIENT_SECRET: 'secret456',
  ALLOWED_ORIGIN: 'https://evidencetoday.news',
  OAUTH_SCOPE: 'public_repo',
};

describe('/auth', () => {
  it('302 導向 github authorize，帶 client_id、scope、state', async () => {
    const res = await handle(new Request('https://w.dev/auth?state=abc'), env);
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin + loc.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(loc.searchParams.get('client_id')).toBe('cid123');
    expect(loc.searchParams.get('scope')).toBe('public_repo');
    expect(loc.searchParams.get('state')).toBe('abc');
    expect(loc.searchParams.get('redirect_uri')).toBe('https://w.dev/callback');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test workers/github-oauth/src/index.test.ts`
Expected: FAIL（目前 `/auth` 回 404）。

- [ ] **Step 3: Write minimal implementation**

把 `handle` 改為：
```ts
export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/auth') {
    const state = url.searchParams.get('state') ?? '';
    const redirectUri = `${url.origin}/callback`;
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('scope', env.OAUTH_SCOPE);
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('redirect_uri', redirectUri);
    return Response.redirect(authorize.toString(), 302);
  }

  return new Response('not found', { status: 404 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test workers/github-oauth/src/index.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add workers/github-oauth/src/index.ts workers/github-oauth/src/index.test.ts
git commit -m "feat(oauth): /auth 導向 GitHub 授權頁"
```

---

### Task 3: `/callback` 換 token 並導回 /admin

**Files:**
- Modify: `workers/github-oauth/src/index.ts`
- Test: `workers/github-oauth/src/index.test.ts`

- [ ] **Step 1: Write the failing test**

在 `workers/github-oauth/src/index.test.ts` 追加：
```ts
import { vi, afterEach } from 'vitest';

afterEach(() => vi.restoreAllMocks());

describe('/callback', () => {
  it('用 code 換 token，302 導回 ALLOWED_ORIGIN/admin#token=...&state=...', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'tok789' }), { status: 200, headers: { 'content-type': 'application/json' } })
    ));
    const res = await handle(new Request('https://w.dev/callback?code=c1&state=abc'), env);
    expect(res.status).toBe(302);
    const loc = res.headers.get('location')!;
    expect(loc).toBe('https://evidencetoday.news/admin#token=tok789&state=abc');
  });

  it('GitHub 未回 token → 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200, headers: { 'content-type': 'application/json' } })
    ));
    const res = await handle(new Request('https://w.dev/callback?code=bad&state=abc'), env);
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test workers/github-oauth/src/index.test.ts`
Expected: FAIL（`/callback` 仍回 404）。

- [ ] **Step 3: Write minimal implementation**

在 `handle` 的 `/auth` 區塊之後、`return 404` 之前加入：
```ts
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = (await tokenRes.json()) as { access_token?: string };
    if (!data.access_token) {
      return new Response('token exchange failed', { status: 502 });
    }
    const back = `${env.ALLOWED_ORIGIN}/admin#token=${data.access_token}&state=${state}`;
    return Response.redirect(back, 302);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test workers/github-oauth/src/index.test.ts`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add workers/github-oauth/src/index.ts workers/github-oauth/src/index.test.ts
git commit -m "feat(oauth): /callback 換 token 並導回 admin"
```

---

### Task 4: 部署說明（手動步驟，不自動執行）

**Files:**
- Create: `workers/github-oauth/README.md`

- [ ] **Step 1: 撰寫部署文件**

Create `workers/github-oauth/README.md`:
```markdown
# evidencetoday GitHub OAuth Worker

## 一次性設定
1. GitHub → Settings → Developer settings → OAuth Apps → New：
   - Homepage URL: https://evidencetoday.news
   - Authorization callback URL: https://<worker-網域>/callback
2. 取得 Client ID，填入 wrangler.toml 的 GITHUB_CLIENT_ID。
3. 設定 secret：
   `cd workers/github-oauth && npx wrangler secret put GITHUB_CLIENT_SECRET`

## 部署
`cd workers/github-oauth && npx wrangler deploy`

## 驗證
瀏覽 https://<worker-網域>/auth?state=test → 應導向 GitHub 授權頁。
```

- [ ] **Step 2: Commit**

```bash
git add workers/github-oauth/README.md
git commit -m "docs(oauth): Worker 部署說明"
```

---

## Self-Review

- **Spec coverage**：實作 spec「① Auth」的 `/auth`、`/callback` 端點與「導回 `/admin#token=...&state=...`」「secret 僅存 Worker」契約。`ALLOWED_ORIGIN`、`OAUTH_SCOPE` 對應 spec 的 redirect 來源限制與最小 scope。
- **Placeholder scan**：`wrangler.toml` 的 `GITHUB_CLIENT_ID=""` 是部署時填入的設定值（README Task 4 說明），非程式碼 placeholder；其餘步驟皆完整。
- **Type consistency**：`Env` 介面在 index.ts 與測試中一致；`handle(request, env)` 簽名前後一致。
- **平行備註**：完全隔離後端，僅依賴 vitest，可與 mdx-doc、lint 平行。其產出（token 導回 `/admin#token`）是 spine 計畫 `/admin` 頁的輸入契約。
