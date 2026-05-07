import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export async function GET(context: APIContext) {
  const myths = await getCollection('myths', ({ data }) => !data.draft);

  return rss({
    title: '本日有據 — 闢謠',
    description: '破解常見健康迷思，用證據說清楚真相。',
    site: context.site!,
    items: myths
      .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
      .slice(0, 20)
      .map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.publishDate,
        link: `/myths/${stripExt(entry.id)}/`,
      })),
  });
}
