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
