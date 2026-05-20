import { getCollection } from 'astro:content';
import { stripPodcastSlug } from '@/utils/podcasts';

const SITE_URL = 'https://evidencetoday.news';
const FEED_URL = `${SITE_URL}/rss.xml`;
const MAX_ITEMS = 50;

type FeedItem = {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: Date;
  category: string;
};

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function ensureDescription(value: string | undefined): string {
  return value?.trim() || '本日有據健康議題內容更新。';
}

export async function GET() {
  const [articles, myths, ingredients, podcasts, news] = await Promise.all([
    getCollection('articles'),
    getCollection('myths'),
    getCollection('ingredients'),
    getCollection('podcasts'),
    getCollection('news'),
  ]);

  const items: FeedItem[] = [
    ...articles
      .filter((entry) => !entry.data.draft && entry.data.title && isValidDate(entry.data.publishDate))
      .map((entry) => {
        const path = `/articles/${stripExt(entry.id)}/`;
        const pubDate = entry.data.updatedDate ?? entry.data.publishDate;
        return { title: entry.data.title, description: ensureDescription(entry.data.description), link: `${SITE_URL}${path}`, guid: `${SITE_URL}${path}`, pubDate, category: '文章' };
      }),
    ...myths
      .filter((entry) => !entry.data.draft && entry.data.title && isValidDate(entry.data.publishDate))
      .map((entry) => {
        const path = `/myths/${stripExt(entry.id)}/`;
        const pubDate = entry.data.updatedDate ?? entry.data.publishDate;
        return { title: entry.data.title, description: ensureDescription(entry.data.verdictSummary || entry.data.description), link: `${SITE_URL}${path}`, guid: `${SITE_URL}${path}`, pubDate, category: '闢謠' };
      }),
    ...ingredients
      .filter((entry) => !entry.data.draft && entry.data.title && isValidDate(entry.data.publishDate))
      .map((entry) => {
        const path = `/ingredients/${stripExt(entry.id)}/`;
        const pubDate = entry.data.updatedDate ?? entry.data.publishDate;
        return { title: entry.data.title, description: ensureDescription(entry.data.description), link: `${SITE_URL}${path}`, guid: `${SITE_URL}${path}`, pubDate, category: '原料' };
      }),
    ...podcasts
      .filter((entry) => !entry.data.draft && entry.data.title && isValidDate(entry.data.publishDate))
      .map((entry) => {
        const path = `/podcasts/${stripPodcastSlug(entry.id)}/`;
        const pubDate = entry.data.updatedDate ?? entry.data.publishDate;
        return { title: entry.data.title, description: ensureDescription(entry.data.summary || entry.data.description), link: `${SITE_URL}${path}`, guid: `${SITE_URL}${path}`, pubDate, category: 'Podcast' };
      }),
    ...news
      .filter((entry) => !entry.data.draft && entry.data.title && isValidDate(entry.data.publishDate))
      .map((entry) => {
        const path = `/news/${stripExt(entry.id)}/`;
        const pubDate = entry.data.publishDate;
        return { title: entry.data.title, description: ensureDescription(entry.data.summary), link: `${SITE_URL}${path}`, guid: `${SITE_URL}${path}`, pubDate, category: '趨勢' };
      }),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, MAX_ITEMS);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml('本日有據 Evidence Today')}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml('本日有據整理健康研究、闢謠、原料知識、Podcast 與健康議題趨勢，提供有根據、看得懂的健康資訊。')}</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
${items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
    </item>`).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
