import { describe, it, expect } from 'vitest';
import { renderSources } from '@/utils/txt-endpoint';

describe('renderSources', () => {
  it('空清單回傳空字串', () => {
    expect(renderSources([])).toBe('');
    expect(renderSources(undefined)).toBe('');
  });

  it('有 url 的來源輸出「- 標題 — url」', () => {
    const out = renderSources([{ title: 'Cochrane 回顧', url: 'https://example.org/a' }]);
    expect(out).toContain('來源：');
    expect(out).toContain('- Cochrane 回顧 — https://example.org/a');
  });

  it('無 url 的來源只輸出標題', () => {
    const out = renderSources([{ title: '某指引' }]);
    expect(out).toContain('- 某指引');
    expect(out).not.toContain('—');
  });

  it('來源區置於前面以空行分隔（方便接在 body 後）', () => {
    const out = renderSources([{ title: 'A', url: 'https://x/y' }]);
    expect(out.startsWith('\n')).toBe(true);
  });
});
