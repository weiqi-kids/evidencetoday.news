import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('rewrite 任務含選取文字與改寫指示', () => {
    const p = buildPrompt('rewrite', { title: '測試' }, '原句。');
    expect(p).toContain('原句。');
    expect(p).toContain('改寫');
  });
  it('summarize 任務含摘要指示', () => {
    const p = buildPrompt('summarize', {}, '一大段內容。');
    expect(p).toContain('摘要');
  });
  it('未知任務退回潤飾指示', () => {
    const p = buildPrompt('improve', {}, '句子。');
    expect(p).toContain('潤飾');
  });
});
