import { describe, it, expect } from 'vitest';
import { classifySave } from './save-machine';

describe('classifySave', () => {
  it('200/201 → success', () => {
    expect(classifySave(200).state).toBe('success');
    expect(classifySave(201).state).toBe('success');
  });
  it('409 → conflict，訊息含「重新載入」與「網站工程師」', () => {
    const r = classifySave(409);
    expect(r.state).toBe('conflict');
    expect(r.message).toContain('重新載入');
    expect(r.message).toContain('網站工程師');
  });
  it('403 → forbidden，提示無寫入權', () => {
    const r = classifySave(403);
    expect(r.state).toBe('forbidden');
    expect(r.message).toContain('寫入權');
  });
  it('其他狀態 → network，提示內容仍保留', () => {
    const r = classifySave(500);
    expect(r.state).toBe('network');
    expect(r.message).toContain('仍保留');
  });
});
