import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitFiles } from './git-commit';

afterEach(() => vi.restoreAllMocks());

function ok(body) { return new Response(JSON.stringify(body), { status: 200 }); }

describe('commitFiles', () => {
  it('依序 ref→commit→blobs→tree→commit→ref，回新 commit sha', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url, init) => {
      calls.push([String(url), init?.method ?? 'GET']);
      if (String(url).endsWith('/git/ref/heads/main')) return ok({ object: { sha: 'BASE' } });
      if (String(url).includes('/git/commits/BASE')) return ok({ tree: { sha: 'BASETREE' } });
      if (String(url).endsWith('/git/blobs')) return ok({ sha: 'BLOB' });
      if (String(url).endsWith('/git/trees')) return ok({ sha: 'NEWTREE' });
      if (String(url).endsWith('/git/commits')) return ok({ sha: 'NEWCOMMIT' });
      if (String(url).endsWith('/git/refs/heads/main')) return ok({});
      throw new Error('unexpected ' + url);
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await commitFiles({
      token: 't',
      message: 'm',
      files: [
        { path: 'public/covers/x.webp', content: 'QUJD', encoding: 'base64' },
        { path: 'src/content/articles/y.mdx', content: '# hi' },
      ],
    });
    expect(res).toEqual({ ok: true, sha: 'NEWCOMMIT' });
    // 兩個檔案 → 兩次 blob
    expect(calls.filter(([u]) => u.endsWith('/git/blobs')).length).toBe(2);
    // tree 帶 base_tree
    const treeCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/git/trees'));
    expect(JSON.parse(treeCall[1].body).base_tree).toBe('BASETREE');
    // ref 更新是 PATCH
    const refUpdate = calls.find(([u, m]) => u.endsWith('/git/refs/heads/main') && m === 'PATCH');
    expect(refUpdate).toBeTruthy();
  });

  it('更新 ref 422（非 fast-forward）→ ok:false, status 422', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/git/ref/heads/main')) return ok({ object: { sha: 'BASE' } });
      if (String(url).includes('/git/commits/BASE')) return ok({ tree: { sha: 'BASETREE' } });
      if (String(url).endsWith('/git/blobs')) return ok({ sha: 'BLOB' });
      if (String(url).endsWith('/git/trees')) return ok({ sha: 'NEWTREE' });
      if (String(url).endsWith('/git/commits')) return ok({ sha: 'NEWCOMMIT' });
      if (String(url).endsWith('/git/refs/heads/main')) return new Response('conflict', { status: 422 });
      throw new Error('unexpected');
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await commitFiles({ token: 't', message: 'm', files: [{ path: 'a.mdx', content: 'x' }] });
    expect(res).toEqual({ ok: false, status: 422 });
  });

  it('blob 失敗 → ok:false 帶 status', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/git/ref/heads/main')) return ok({ object: { sha: 'BASE' } });
      if (String(url).includes('/git/commits/BASE')) return ok({ tree: { sha: 'BASETREE' } });
      if (String(url).endsWith('/git/blobs')) return new Response('no', { status: 403 });
      throw new Error('unexpected');
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await commitFiles({ token: 't', message: 'm', files: [{ path: 'a.mdx', content: 'x' }] });
    expect(res).toEqual({ ok: false, status: 403 });
  });
});
