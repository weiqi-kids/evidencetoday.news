import type { LintRule } from '../types';

export const mythReferencesRule: LintRule = ({ collection, frontmatter }) => {
  if (collection !== 'myths') return [];
  const refs = frontmatter.references;
  const count = Array.isArray(refs) ? refs.length : 0;
  if (count < 2) {
    return [{ level: 'error', field: 'references', message: `迷思文章至少需 2 筆 references，目前 ${count} 筆。`, fix: '補足可信來源至 2 筆以上。' }];
  }
  return [];
};
