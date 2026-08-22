// 靜態頁的 lastmod：取該頁 .astro 原始檔的 git commit 日期。
//
// 為什麼要有：本站原本只對「有 frontmatter 日期」的內容頁輸出 lastmod，
// 靜態頁（首頁／分類／政策頁）一律留白。留白比給 build 時間好，但**首頁與分類頁
// 往往是最重要的頁**，完全沒有新鮮度訊號等於白放棄。而它們其實有真實來源可取：
// src/pages/<路徑>.astro 的 git commit 日期。
//
// 🔴 只在「對得到真實原始檔」時給值，對不到就回 null 讓呼叫端維持留白——
//    絕不退回 build 時間，那會讓每次部署都宣稱全站更新（假訊號比沒有更糟）。
// ⚠️ CI 的 checkout 必須 fetch-depth: 0，淺 clone 會讓所有檔案回同一天。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createPageGitDate(importMetaUrl) {
  const ROOT = dirname(fileURLToPath(importMetaUrl));
  const git = (rel) => {
    try {
      return execFileSync('git', ['log', '-1', '--format=%cs', '--', rel],
        { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    } catch { return null; }
  };
  return (pathname) => {
    const p = pathname.replace(/^\/|\/$/g, '');
    const cands = p === ''
      ? ['src/pages/index.astro', 'src/pages/index.mdx']
      : [`src/pages/${p}.astro`, `src/pages/${p}/index.astro`, `src/pages/${p}.mdx`];
    for (const c of cands) if (existsSync(join(ROOT, c))) return git(c);
    return null;
  };
}
