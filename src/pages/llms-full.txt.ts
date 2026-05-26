import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { stripPodcastSlug } from '@/utils/podcasts';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const [articles, myths, ingredients, podcasts, videos] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft),
    getCollection('myths', ({ data }) => !data.draft),
    getCollection('ingredients', ({ data }) => !data.draft),
    getCollection('podcasts', ({ data }) => !data.draft),
    getCollection('videos', ({ data }) => !data.draft),
  ]);

  const sortByDate = <T extends { data: { publishDate: Date } }>(arr: T[]) =>
    arr.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const lines: string[] = [
    '# Evidence Today 本日有據 — 完整內容索引',
    `(Generated at build time)`,
    '',
  ];

  lines.push('## 文章');
  for (const entry of sortByDate(articles)) {
    lines.push(`- ${entry.data.title} | /articles/${stripExt(entry.id)}/ | ${fmtDate(entry.data.publishDate)}`);
    lines.push(`  ${entry.data.description}`);
  }
  lines.push('');

  lines.push('## 闢謠');
  for (const entry of sortByDate(myths)) {
    lines.push(`- ${entry.data.title} | /myths/${stripExt(entry.id)}/ | ${fmtDate(entry.data.publishDate)}`);
    lines.push(`  ${entry.data.description}`);
  }
  lines.push('');

  lines.push('## 成分解析');
  for (const entry of sortByDate(ingredients)) {
    lines.push(`- ${entry.data.title} | /ingredients/${stripExt(entry.id)}/ | ${fmtDate(entry.data.publishDate)}`);
    lines.push(`  ${entry.data.description}`);
  }
  lines.push('');

  lines.push('## Podcast');
  for (const entry of sortByDate(podcasts)) {
    lines.push(`- ${entry.data.title} | /podcasts/${stripPodcastSlug(entry.id)}/ | ${fmtDate(entry.data.publishDate)}`);
    lines.push(`  ${entry.data.description}`);
  }
  lines.push('');

  lines.push('## 短影音');
  for (const entry of sortByDate(videos)) {
    lines.push(`- ${entry.data.title} | /videos/${stripExt(entry.id)}/ | ${fmtDate(entry.data.publishDate)}`);
    lines.push(`  ${entry.data.description}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
