export interface TxtReference {
  title: string;
  url?: string;
}

// 把 references 格式化為純文字來源清單，接在 body 之後。空清單回傳空字串。
export function renderSources(refs: readonly TxtReference[] | undefined): string {
  if (!refs || refs.length === 0) return '';
  const lines = refs.map((r) => (r.url ? `- ${r.title} — ${r.url}` : `- ${r.title}`));
  return `\n\n來源：\n${lines.join('\n')}`;
}
