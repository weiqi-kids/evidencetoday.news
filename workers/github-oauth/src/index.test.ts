import { describe, it, expect, vi, afterEach } from 'vitest';
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

  it('fetch 拋出網路錯誤 → 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const res = await handle(new Request('https://w.dev/callback?code=c&state=s'), env);
    expect(res.status).toBe(502);
  });

  it('回應非 JSON（.json() 拋錯）→ 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>err</html>', { status: 502 })));
    const res = await handle(new Request('https://w.dev/callback?code=c&state=s'), env);
    expect(res.status).toBe(502);
  });

  it('state 含特殊字元時編碼導回，避免 fragment 注入', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'tok789' }), { status: 200, headers: { 'content-type': 'application/json' } })
    ));
    const res = await handle(new Request('https://w.dev/callback?code=c1&state=a%26b'), env);
    expect(res.status).toBe(302);
    const loc = res.headers.get('location')!;
    expect(loc).toContain('state=a%26b');
    expect(loc).not.toContain('b&state');
  });
});
