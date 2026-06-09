import { describe, it, expect, vi, afterEach } from 'vitest';
import { latestDeployRun } from './deploy-status';

afterEach(() => vi.restoreAllMocks());

describe('latestDeployRun', () => {
  it('回傳最新 deploy run 的 id/status/conclusion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ workflow_runs: [{ id: 7, status: 'completed', conclusion: 'success' }] }), { status: 200 })
    ));
    expect(await latestDeployRun('tok')).toEqual({ id: 7, status: 'completed', conclusion: 'success' });
  });

  it('查詢 deploy.yml 在 main 的執行', async () => {
    const spy = vi.fn(async () => new Response('{"workflow_runs":[]}', { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await latestDeployRun('tok');
    expect(spy.mock.calls[0][0]).toContain('/actions/workflows/deploy.yml/runs?branch=main');
  });

  it('非 2xx → null（無權限/錯誤時放棄輪詢）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
    expect(await latestDeployRun('tok')).toBeNull();
  });

  it('沒有任何 run → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"workflow_runs":[]}', { status: 200 })));
    expect(await latestDeployRun('tok')).toBeNull();
  });
});
