// 列出 repo 既有圖片（public/generated、public/covers、public/images），
// 給編輯器「圖庫」分頁手動瀏覽用。走 GitHub Contents API（每目錄最多 1000 筆，足夠）。
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';
const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

export type ImageDir = 'images' | 'covers' | 'generated';
export interface RepoImage {
  name: string;
  dir: ImageDir;
  path: string; // 站內路徑（無 BASE），如 /images/foo.jpg
}

async function listDir(dir: ImageDir, token: string): Promise<RepoImage[]> {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/public/${dir}?per_page=1000`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return [];
  const items = (await res.json()) as { name: string; type: string }[];
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i.type === 'file' && IMG_EXT.test(i.name))
    .map((i) => ({ name: i.name, dir, path: `/${dir}/${i.name}` }));
}

/** 列出 generated + covers + images 既有圖（generated=保留的 AI 生成圖，優先顯示）。 */
export async function listRepoImages(token: string): Promise<RepoImage[]> {
  const [generated, covers, images] = await Promise.all([
    listDir('generated', token), listDir('covers', token), listDir('images', token),
  ]);
  return [...generated, ...covers, ...images];
}
