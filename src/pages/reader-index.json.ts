import type { APIContext } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getPublishedArticles } from '@/utils/articles';
import { classifyArticle } from '@/utils/article-categories';

/**
 * appinews-reader 候選池索引（build 期產出的靜態 JSON）。
 *
 * 契約正本：/root/appinews-reader/contracts/reader-index.schema.json
 * 生產者＝本檔；消費者＝appinews-reader 的 feed/sync.js。
 * **這是兩個服務之間的唯一契約，任一方要改欄位都得先改那份 schema**——
 * 單方面改這裡會靜默壞掉（reader 拿不到欄位只會降級，不會報錯）。
 *
 * 移植自 /root/appi.news/src/pages/reader-index.json.ts，同一套骨架
 * （Astro endpoint 直接吃 collection helper，不走 postbuild 腳本、不重寫第二份
 * isPublic() 判斷）。差異只在資料來源的欄位形狀：
 *
 * - **只收 `articles` collection**（決策已定；myths/ingredients/news/videos/podcasts
 *   不在範圍內，不要自作主張加入）。用 `getPublishedArticles()`
 *   （`src/utils/articles.ts`，內部呼叫 `src/utils/visibility.ts` 的
 *   `isPublicEntry`，全站唯一的公開判斷來源，跟 sitemap／`getStaticPaths` 同一份）。
 * - articles collection **沒有 category 欄位**（跟 appi.news 不同，那邊是
 *   frontmatter enum）。分類改呼叫 `classifyArticle()`
 *   （`src/utils/article-categories.ts`），對文章內容（tags/title/描述關鍵字）
 *   推導出固定 10 個 enum slug 之一，不要發明新的分類體系。
 * - articles **沒有 frontmatter slug 欄位**，slug＝檔名 id 去副檔名。
 *
 * 不會污染 sitemap（@astrojs/sitemap 只收 HTML route），也不會被 check-site.mjs
 * 掃到（那支只掃 dist/**\/*.html）。
 */

/**
 * 候選池篇數上限：目前**不設分類上限、全站 131 篇 articles 全收**。
 *
 * appi.news 用「各分類最新 40 篇聯集」是因為它的日產出量在分類間極不平均，
 * 取最新會讓冷門分類消失。evidencetoday 目前全站僅 131 篇分散在 10 個分類
 * （平均每類 13 篇），全收比再做一層聯集邏輯更簡單，且不會有任何分類被擠掉。
 *
 * **這個決定不是永久的**：等全站 articles 篇數成長到讓單一 JSON 過大
 * （粗估 > 500 篇，或任何一個分類單獨超過 appi.news 採用的 40 篇門檻）時，
 * 要照 appi.news 的做法改成「各分類最新 N 篇聯集＋機械保證 featured 涵蓋」，
 * 不要放著全收到 JSON 大到拖慢 reader 端的下載/解析。
 */
const REVISIT_ARTICLE_COUNT = 500;

/**
 * 台北時區的日期字串（YYYY-MM-DD）。
 * build 跑在 GitHub Actions（UTC），不能用 getDate() 這類本地時間方法判「當日」，
 * 否則台北時間傍晚發佈的精選在 UTC 還算前一天，featured 會整批漏掉。
 */
const TAIPEI_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function taipeiDay(d: Date): string {
  return TAIPEI_DAY.format(d);
}

function articleSlug(a: CollectionEntry<'articles'>): string {
  return a.id.replace(/\.[^.]+$/, '');
}

interface ReaderIndexArticle {
  slug: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  publish_date: string;
  cover_image?: string;
  reading_time?: number;
}

function toEntry(a: CollectionEntry<'articles'>, site: URL | undefined): ReaderIndexArticle {
  const slug = articleSlug(a);
  const entry: ReaderIndexArticle = {
    slug,
    url: new URL(`/articles/${slug}/`, site ?? 'https://evidencetoday.news').toString(),
    title: a.data.title,
    category: classifyArticle(a),
    publish_date: a.data.publishDate.toISOString(),
  };
  if (a.data.description) entry.description = a.data.description;

  // coverImage 目前站上的實際值全部是外部圖床絕對網址（unsplash），但欄位定義本身
  // 允許站內相對路徑，比照 appi.news 做 fallback：外部網址原樣、站內路徑組成絕對網址，
  // 不要對已經是絕對網址的值二次套 URL()（不會出錯但沒必要，且要避免對外部網址誤判 base）。
  if (a.data.coverImage) {
    entry.cover_image = /^https?:\/\//i.test(a.data.coverImage)
      ? a.data.coverImage
      : new URL(a.data.coverImage, site ?? 'https://evidencetoday.news').toString();
  }

  // readingTime 是必填欄位（articlesSchema.readingTime: z.number()），理論上恆存在；
  // 仍防禦性檢查數值合理性，避免髒資料（0 或負值）汙染契約。
  const minutes = a.data.readingTime;
  if (Number.isFinite(minutes) && minutes > 0) entry.reading_time = Math.round(minutes);

  return entry;
}

export async function GET(context: APIContext) {
  const site = context.site;
  const articles = await getPublishedArticles(); // 已依 publishDate 新到舊排序
  const today = taipeiDay(new Date());

  if (articles.length > REVISIT_ARTICLE_COUNT) {
    // 不擋 build（reader 端降級處理已足夠優雅），但留下訊號讓下一個人重新評估
    // 是否該換成 appi.news 的「各分類最新 N 篇聯集」演算法（見檔頭常數註解）。
    console.warn(
      `[reader-index.json] articles 篇數 (${articles.length}) 已超過 ${REVISIT_ARTICLE_COUNT}，` +
        `候選池仍全收——該重新評估是否需要分類上限了。`,
    );
  }

  // 當日精選：featured 且 publishDate 落在台北時區的今天。
  // 沒有就給空陣列——reader 會退回一般排序，不會壞。不要退而求其次塞最新一篇。
  const featured = articles.filter(
    (a) => a.data.featured && taipeiDay(a.data.publishDate) === today,
  );

  // 候選池＝全站已公開 articles（見上方常數註解：目前不做分類上限）。
  // featured 天然是這個集合的子集，不需要另外機械保證涵蓋。
  const pool = articles;

  const siteRoot = new URL('/', site ?? 'https://evidencetoday.news').toString().replace(/\/+$/, '');

  const body = JSON.stringify({
    version: 1,
    generated_at: new Date().toISOString(),
    site: siteRoot,
    featured: featured.map(articleSlug),
    articles: pool.map((a) => toEntry(a, site)),
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
