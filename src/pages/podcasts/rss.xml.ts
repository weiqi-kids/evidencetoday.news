import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { stripPodcastSlug } from '@/utils/podcasts';
import { isPublicEntry } from '@/utils/visibility';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export async function GET(context: APIContext) {
  const podcasts = await getCollection('podcasts', ({ data }) => isPublicEntry(data));

  return rss({
    title: '本日有據 — Podcast',
    description: '用耳朵吸收健康知識，通勤路上也能學。',
    site: context.site!,
    items: podcasts
      .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
      .slice(0, 20)
      .map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.publishDate,
        link: `/podcasts/${stripPodcastSlug(entry.id)}/`,
      })),
  });
}
