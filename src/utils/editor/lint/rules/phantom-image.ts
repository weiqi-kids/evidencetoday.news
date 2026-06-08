import type { LintRule, LintResult } from '../types';

// 偵測指向 repo 內不存在路徑（如 images/N.png、./images/N.png、../images/N.png）的行內圖片，
// 這類相對引用會讓 Rollup 解析失敗、整站 build 中斷（見 2026-06-08 事件）。
// 注意：根路徑絕對引用（/images/...）與絕對網址（https://...）為實際可服務路徑，不在此列。
const INLINE_IMG = /!\[[^\]]*\]\(((?:\.\.?\/)?images\/[^)]+)\)/g;

export const phantomImageRule: LintRule = ({ body }) => {
  const results: LintResult[] = [];
  for (const m of body.matchAll(INLINE_IMG)) {
    results.push({
      level: 'error',
      message: `行內圖片 ${m[1]} 指向不存在的相對路徑，會導致 build 失敗。`,
      fix: '移除此圖片引用，或改為已存在的絕對網址。',
    });
  }
  return results;
};
