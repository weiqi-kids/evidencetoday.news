import { describe, it, expect, vi, afterEach } from 'vitest';
import { getFile, putFile, fileExists } from './github';

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
