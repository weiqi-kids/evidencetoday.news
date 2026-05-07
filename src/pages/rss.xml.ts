import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export async function GET(context: APIContext) {
  const [articles, myths, podcasts, videos] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft),
    getCollection('myths', ({ data }) => !data.draft),
    getCollection('podcasts', ({ data }) => !data.draft),
    getCollection('videos', ({ data }) => !data.draft),
  ]);

  type RssItem = {
    title: string;
    description: string;
    pubDate: Date;
    link: string;
  };

  const items: RssItem[] = [
    ...articles.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.publishDate,
      link: `/articles/${stripExt(e.id)}/`,
    })),
    ...myths.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.publishDate,
      link: `/myths/${stripExt(e.id)}/`,
    })),
    ...podcasts.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.publishDate,
      link: `/podcasts/${stripExt(e.id)}/`,
    })),
    ...videos.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.publishDate,
      link: `/videos/${stripExt(e.id)}/`,
    })),
  ];

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: '本日有據 Evidence Today',
    description: '把健康議題，講得有根據，也講得讓人看得懂。',
    site: context.site!,
    items: items.slice(0, 20),
  });
}
