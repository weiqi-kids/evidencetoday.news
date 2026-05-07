import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export async function GET(context: APIContext) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  return rss({
    title: '本日有據 — 文章',
    description: '深度解析健康議題，以系統性回顧與隨機對照試驗為根據。',
    site: context.site!,
    items: articles
      .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
      .slice(0, 20)
      .map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.publishDate,
        link: `/articles/${stripExt(entry.id)}/`,
      })),
  });
}
