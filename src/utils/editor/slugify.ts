import { pinyin } from 'pinyin-pro';

// 由標題自動產生 URL slug：中文轉拼音（無聲調），英文/數字原樣保留（nonZh:'consecutive'），
// 其餘符號收斂為連字號、轉小寫、截斷至 60 字。產不出有效 slug 時用 fallback。
// 只在 /admin 的新增文章流程使用，使用者不需自己填 slug。
export function slugFromTitle(title: string, now = Date.now()): string {
  const romanized = pinyin(title || '', { toneType: 'none', nonZh: 'consecutive' });
  const slug = romanized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || `article-${now}`;
}
