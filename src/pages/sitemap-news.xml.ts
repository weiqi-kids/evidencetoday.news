import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getDisplayTitle } from '@/utils/news';
import { isPublicEntry } from '@/utils/visibility';

// Google News Sitemap（與一般 @astrojs/sitemap 分開）：
// 只收「近 48 小時內發布」的 news，每筆帶 <news:publication>/<news:publication_date>/<news:title>，
// 這是 Google News 探索新聞的命脈——一般 sitemap 沒有這些標記，等於沒告訴 Google「這是新聞」。
// robots.txt 已用 Sitemap: 行指向本檔；pnpm sitemap:submit 亦會一併提交給 GSC。
// 站每日皆重建（news-cron + optimize-cron 會 push），故 48h 視窗每次部署自動滾動更新。
const SITE_URL = 'https://evidencetoday.news';
const PUBLICATION_NAME = '本日有據';
const LANGUAGE = 'zh-tw'; // Google News 語言碼：中文（台灣）用 zh-tw（規範特例，非 zh-Hant-TW）
const WINDOW_MS = 48 * 60 * 60 * 1000; // 僅收近 48 小時（Google News sitemap 規範）
const MAX_URLS = 1000; // Google News sitemap 單檔上限

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  const entries = (await getCollection('news', ({ data }) => isPublicEntry(data)))
    .filter((e) => e.data.publishDate instanceof Date && !Number.isNaN(e.data.publishDate.getTime()))
    .filter((e) => now - e.data.publishDate.getTime() <= WINDOW_MS)
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
    .slice(0, MAX_URLS);

  const urls = entries
    .map((e) => {
      const slug = e.id.replace(/\.[^.]+$/, '');
      const loc = `${SITE_URL}/news/${slug}/`;
      const title = getDisplayTitle(e.data.titleDisplay, e.data.title);
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(PUBLICATION_NAME)}</news:name>
        <news:language>${LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${e.data.publishDate.toISOString()}</news:publication_date>
      <news:title>${xmlEscape(title)}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
