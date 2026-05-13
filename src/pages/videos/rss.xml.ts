import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import shortsData from '@/data/youtube-shorts.json';
import { videoItemsSchema } from '@/lib/youtube';

export async function GET(context: APIContext) {
  const videos = videoItemsSchema.safeParse(shortsData).success ? videoItemsSchema.parse(shortsData) : [];
  return rss({
    title: '本日有據 — 短影音',
    description: '本日有據 YouTube Shorts 同步列表。',
    site: context.site!,
    items: videos.slice(0, 20).map((v) => ({ title: v.title, description: v.title, pubDate: v.publishedAt ? new Date(v.publishedAt) : new Date(), link: '/videos/' })),
  });
}
