import { describe, it, expect } from 'vitest';
import { slugFromTitle } from './slugify';

describe('slugFromTitle', () => {
  it('中文標題轉拼音 slug', () => {
    expect(slugFromTitle('鈣鎂鋅鐵一起補')).toBe('gai-mei-xin-tie-yi-qi-bu');
  });
  it('保留英文/數字（如 GLP-1），轉小寫', () => {
    expect(slugFromTitle('GLP-1 完整指南')).toBe('glp-1-wan-zheng-zhi-nan');
  });
  it('混中英、清符號、收斂連字號', () => {
    expect(slugFromTitle('維他命C劑型迷思')).toBe('wei-ta-ming-c-ji-xing-mi-si');
  });
  it('產不出有效 slug（純符號）→ 用 fallback（可注入 now 以利測試）', () => {
    expect(slugFromTitle('！！！', 123)).toBe('article-123');
  });
});
