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
