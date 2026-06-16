import { describe, it, expect, vi, afterEach } from 'vitest';
import { mergeTags, fetchSuggestedTags } from './tags-suggest';

afterEach(() => vi.restoreAllMocks());

describe('mergeTags', () => {
  it('新標籤接在現有清單後面，去重保序', () => {
    expect(mergeTags(['健康', '醫療'], ['醫療', '骨質疏鬆', '健康', '營養'])).toEqual(['健康', '醫療', '骨質疏鬆', '營養']);
  });
  it('現有為空 → 等於 suggested 去重', () => {
    expect(mergeTags([], ['A', 'A', 'B'])).toEqual(['A', 'B']);
  });
  it('去前後空白比對', () => {
    expect(mergeTags([' 健康 '], ['健康', '新'])).toEqual([' 健康 ', '新']);
  });
});

describe('fetchSuggestedTags', () => {
  it('POST /tags 回 { tags }', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ tags: ['骨質疏鬆'] }), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    const tags = await fetchSuggestedTags({ title: 't', body: 'b', token: 'tok' });
    expect(tags).toEqual(['骨質疏鬆']);
    expect(spy.mock.calls[0][0]).toMatch(/\/tags$/);
    expect((spy.mock.calls[0][1] as RequestInit).headers).toMatchObject({ authorization: 'Bearer tok' });
  });
  it('非 2xx → 丟錯', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: '無權' }), { status: 403 })));
    await expect(fetchSuggestedTags({ title: 't', body: 'b', token: 'x' })).rejects.toThrow('無權');
  });
});
