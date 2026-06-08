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
