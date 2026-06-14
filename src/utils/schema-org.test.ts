import { describe, it, expect } from 'vitest';
import { VERDICT_RATING, MYTH_VERDICTS } from '@/utils/myths/schema';

describe('VERDICT_RATING', () => {
  it('六種 verdict 都有對映', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeTypeOf('number');
    }
  });

  it('正確端與錯誤端落在 1–5 兩極', () => {
    expect(VERDICT_RATING['大致正確']).toBe(5);
    expect(VERDICT_RATING['大致錯誤']).toBe(1);
  });

  it('所有數值介於 1 到 5', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeGreaterThanOrEqual(1);
      expect(VERDICT_RATING[v]).toBeLessThanOrEqual(5);
    }
  });
});
