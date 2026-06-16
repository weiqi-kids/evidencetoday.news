import { describe, it, expect } from 'vitest';
import { mergeBuckets, computeDataHealth } from './assemble.mjs';

describe('mergeBuckets', () => {
  it('合併多個策略桶為單一三桶', () => {
    const a = { topicCandidates: [{ topic: 't1' }], writingDirectives: [], siteOptimizations: [] };
    const b = { topicCandidates: [{ topic: 't2' }], writingDirectives: [{ directive: 'd' }], siteOptimizations: [] };
    const merged = mergeBuckets([a, b]);
    expect(merged.topicCandidates).toHaveLength(2);
    expect(merged.writingDirectives).toHaveLength(1);
    expect(merged.siteOptimizations).toHaveLength(0);
  });
});

describe('computeDataHealth', () => {
  it('標記 sparse 當事件與 GSC 列都極少', () => {
    expect(computeDataHealth({ ga4Events: 0, gscRows: 2 }).sparse).toBe(true);
    expect(computeDataHealth({ ga4Events: 500, gscRows: 50 }).sparse).toBe(false);
  });
});
