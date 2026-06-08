import type { LintRule } from '../types';

export const descriptionLengthRule: LintRule = ({ frontmatter }) => {
  const desc = frontmatter.description;
  if (typeof desc !== 'string' || desc.length === 0) {
    return [{ level: 'error', field: 'description', message: '缺少 description，搜尋結果與社群分享會沒有摘要。', fix: '補上 50–160 字的描述。' }];
  }
  if (desc.length < 50) {
    return [{ level: 'warn', field: 'description', message: `description 僅 ${desc.length} 字，可能太短。`, fix: '建議 50–160 字。' }];
  }
  if (desc.length > 160) {
    return [{ level: 'warn', field: 'description', message: `description 達 ${desc.length} 字，搜尋結果可能被截斷。`, fix: '建議縮到 160 字以內。' }];
  }
  return [];
};
