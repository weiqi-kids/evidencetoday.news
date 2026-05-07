import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export async function GET(context: APIContext) {
  const videos = await getCollection('videos', ({ data }) => !data.draft);

  return rss({
    title: '本日有據 — 短影音',
    description: '三到十分鐘的影片，快速掌握一個健康主題。',
    site: context.site!,
    items: videos
      .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
      .slice(0, 20)
      .map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.publishDate,
        link: `/videos/${stripExt(entry.id)}/`,
      })),
  });
}
