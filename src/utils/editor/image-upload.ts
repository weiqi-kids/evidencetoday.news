const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export function extForMime(mime: string): string {
  return MIME_EXT[mime] ?? 'png';
}

export function imageUploadName(slug: string, mime: string, timestamp: number): string {
  const safe = (slug || 'image').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'image';
  return `${safe}-${timestamp}.${extForMime(mime)}`;
}

export function repoImagePath(name: string): string {
  return `public/images/${name}`;
}

export function publicImageUrl(name: string): string {
  return `/images/${name}`;
}

// 與 src/utils/editor/github.ts 的 OWNER/REPO 保持一致
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

// 瀏覽器與 node 皆安全的 blob → base64（無 Node Buffer 相依）
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function uploadImage(args: {
  blob: Blob; slug: string; token: string; timestamp: number;
}): Promise<string> {
  const name = imageUploadName(args.slug, args.blob.type, args.timestamp);
  const path = repoImagePath(name);
  const content = await blobToBase64(args.blob);
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: `content: 上傳圖片 ${name}`, content, branch: 'main' }),
  });
  if (!res.ok) throw new Error(`圖片上傳失敗（${res.status}）。請確認已登入管理者帳號後重試。`);
  return publicImageUrl(name);
}
