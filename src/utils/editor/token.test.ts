import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, KEY } from './token';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

describe('token 工具', () => {
  it('set 後 get 取得同值', () => {
    setToken('tok1');
    expect(getToken()).toBe('tok1');
    expect(KEY).toBe('et_gh_token');
  });
  it('clear 後 get 為 null', () => {
    setToken('tok1');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
