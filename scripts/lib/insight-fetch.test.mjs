import { describe, it, expect } from 'vitest';
import { normalizeGa4Rows, normalizeGscRows } from './insight-fetch.mjs';

describe('normalizeGa4Rows', () => {
  it('依 dimension/metric 名稱組成物件，數值轉 number', () => {
    const apiJson = {
      rows: [
        { dimensionValues: [{ value: 'article' }], metricValues: [{ value: '12' }] },
      ],
    };
    expect(normalizeGa4Rows(apiJson, ['content_type'], ['eventCount']))
      .toEqual([{ content_type: 'article', eventCount: 12 }]);
  });
  it('無 rows → 空陣列', () => {
    expect(normalizeGa4Rows({}, ['x'], ['y'])).toEqual([]);
  });
});

describe('normalizeGscRows', () => {
  it('攤平 keys 並保留 clicks/impressions/ctr/position', () => {
    const apiJson = { rows: [{ keys: ['褪黑激素'], clicks: 0, impressions: 4, ctr: 0, position: 10.75 }] };
    expect(normalizeGscRows(apiJson, ['query']))
      .toEqual([{ query: '褪黑激素', clicks: 0, impressions: 4, ctr: 0, position: 10.75 }]);
  });
  it('無 rows → 空陣列', () => {
    expect(normalizeGscRows({}, ['query'])).toEqual([]);
  });
});
