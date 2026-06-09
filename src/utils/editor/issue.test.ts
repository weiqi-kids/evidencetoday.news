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
