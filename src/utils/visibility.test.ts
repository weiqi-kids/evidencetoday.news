import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isPublicEntry } from './visibility';

describe('isPublicEntry', () => {
  const base = { publishDate: new Date('2020-01-01') };

  it('顯示已發布、非草稿、發布日在過去的內容', () => {
    expect(isPublicEntry({ ...base })).toBe(true);
  });

  it('隱藏 draft', () => {
    expect(isPublicEntry({ ...base, draft: true })).toBe(false);
  });

  it('隱藏 under-review（myths）', () => {
    expect(isPublicEntry({ ...base, status: 'under-review' })).toBe(false);
  });

  it('隱藏 publishDate 在未來的排程稿', () => {
    const future = new Date('2020-01-01').getTime();
    const publishDate = new Date(future + 30 * 86400_000);
    expect(isPublicEntry({ publishDate }, future)).toBe(false);
  });

  it('到達發布時間後即公開', () => {
    const now = new Date('2020-02-01').getTime();
    expect(isPublicEntry({ publishDate: new Date('2020-01-15') }, now)).toBe(true);
  });
});

// 防回歸：前台任何公開面都必須用 isPublicEntry()，不得只濾 `!data.draft`。
// 只濾 draft 會讓「未來日期的排程稿」透過 .txt / RSS / llms-full / tags 提前洩漏全文。
// 參見 src/utils/visibility.ts 註解「單一真相來源」。
describe('排程可見性單一真相來源（防回歸）', () => {
  const SCAN_DIRS = ['../pages', '.'];
  const BARE_DRAFT = /!\s*[A-Za-z_][\w.]*\.draft\b/;

  function collectFiles(dirUrl: URL): string[] {
    const out: string[] = [];
    for (const dirent of readdirSync(dirUrl, { withFileTypes: true })) {
      const childUrl = new URL(`${dirent.name}${dirent.isDirectory() ? '/' : ''}`, dirUrl);
      if (dirent.isDirectory()) {
        out.push(...collectFiles(childUrl));
      } else if (/\.(ts|astro)$/.test(dirent.name) && !/\.test\.ts$/.test(dirent.name)) {
        out.push(fileURLToPath(childUrl));
      }
    }
    return out;
  }

  const files = SCAN_DIRS.flatMap((dir) => collectFiles(new URL(`${dir}/`, import.meta.url)));

  it('src/pages 與 src/utils 沒有裸露的 `!…draft` 可見性判斷', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (BARE_DRAFT.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders, `這些位置請改用 isPublicEntry()：\n${offenders.join('\n')}`).toEqual([]);
  });
});
