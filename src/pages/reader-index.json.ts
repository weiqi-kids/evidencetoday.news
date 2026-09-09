import type { APIContext } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublicEntry } from '@/utils/visibility';
import { classifyArticle } from '@/utils/article-categories';
import { TOPICS } from '@/data/topics';

/**
 * reader 候選池索引（build 期產出的靜態 JSON）。
 *
 * 契約正本：my-line-bot-customer 的 reader/contracts/reader-index.schema.json
 * 生產者＝本檔；消費者＝reader 的 feed/sync.js。
 * **這是兩個服務之間的唯一契約，任一方要改欄位都得先改那份 schema**——
 * 單方面改這裡會靜默壞掉（reader 拿不到欄位只會降級，不會報錯）。
 *
 * ── 2026-09-07：從「只收 articles」改成五條線 ─────────────────────────────
 *
 * 舊版這裡寫著「只收 articles collection（決策已定；myths/ingredients/news/videos/
 * podcasts 不在範圍內，不要自作主張加入）」。**那個決策已由業主推翻**：機器人只看得到
 * 全站 26% 的內容，而 news／ingredients／myths 正是讀者最想要的「最新消息」與「判讀類」。
 *
 * videos／podcasts 仍然不收——兩者都已停更（最後一篇分別是 2026-05 與 2026-04），
 * 而且形式是影音，套不進「一張卡＋看全文」的動線。
 *
 * 每一筆多帶一個 `type`，reader 的版位表用它排班（第 1 則放最新的 news、第 3 則放判讀類…）。
 * **類型與主題是兩個軸**，不可混為一談：
 *   type      內容來自哪個集合。**不用猜**，站台直接給。
 *   category  主題（睡眠、更年期…）。由 classifyArticle() 從標題與標籤推導。
 * 「一則睡眠的新聞」與「一篇睡眠的成分解析」主題相同、類型不同，而它們在版位表裡的
 * 角色與「多舊算舊」的答案都不一樣——這就是一個軸不夠用的原因。
 *
 * ⚠️ **slug 前綴規則不可更改。** reader 拿 slug 當資料庫主鍵，而且它會被簽進
 * `/r/` 一次性網址裡——那些網址已經躺在使用者的對話記錄中。所以：
 *   articles  **不加前綴**（既有 148 篇的 /r/ 連結必須繼續有效）
 *   其餘四條  一律加集合前綴
 * 前綴不只是為了整齊：`ingredients` 與 `topic-overviews` 各有一篇 `lutein` 與 `omega-3`
 * 同名，不加前綴會在 reader 端互相覆蓋，而且**不會有任何錯誤**——就是有一篇安靜地消失。
 *
 * 不會污染 sitemap（@astrojs/sitemap 只收 HTML route），也不會被 check-site.mjs
 * 掃到（那支只掃 dist/**\/*.html）。
 */

/**
 * 候選池篇數上限。超過只印警告，不擋 build。
 *
 * 2026-09-07 從 500 提高到 1200：五條線合計約 489 篇，實測 JSON 約 357 KB
 * （每篇約 750 bytes），reader 每小時抓一次，這個大小沒有問題。
 * 真的逼近 1200 時再考慮 appi.news 那套「各分類最新 N 篇聯集」，不要提前優化。
 */
const REVISIT_ARTICLE_COUNT = 1200;

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

/** 檔名去副檔名。五個集合的路由都是這樣組 slug 的（各自的 getStaticPaths 已逐一核對）。 */
function fileSlug(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

type ReaderType = 'article' | 'news' | 'interpretation' | 'topic';

interface ReaderIndexArticle {
  slug: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  type: ReaderType;
  publish_date: string;
  cover_image?: string;
  reading_time?: number;
}

/** 各集合攤平之後的中間形狀。往下的處理不再需要知道它來自哪個集合。 */
interface Normalized {
  id: string;
  slug: string;
  url: string;
  title: string;
  description?: string;
  publishDate: Date;
  coverImage?: string;
  readingTime?: number;
  tags: string[];
  tldr?: string;
  type: ReaderType;
}

const siteBase = (site: URL | undefined): URL | string => site ?? 'https://evidencetoday.news';

/**
 * 圖片網址正規化。站上的值有兩種：外部圖床的絕對網址（unsplash）與站內相對路徑。
 * 已經是絕對網址的不要再套一次 URL()——不會出錯，但沒必要，也避免對外部網址誤判 base。
 */
function absoluteImage(value: string | undefined, site: URL | undefined): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : new URL(value, siteBase(site)).toString();
}

/**
 * 主題分類。**全站只有 classifyArticle() 一支分類器**，不為新集合另外發明第二套——
 * 兩份判準遲早會漂移，而漂移的症狀是「同一篇在不同地方屬於不同分類」。
 *
 * 它讀的是 id／title／description／tldr／tags（見 getSearchText），所以餵一個只帶那幾個
 * 欄位的物件即可。型別上做一次轉換，因為它的簽章標的是 articles，但它並不依賴 articles
 * 特有的任何欄位。
 *
 * ⚠️ 已知落差：這支分類器當初是為 articles 寫的，套到 news 與 ingredients 上會分得不準。
 * 這不影響主動線（版位排班靠的是 type 不是 category），只影響分類選單。
 * 要調的話請等上線後看實際分佈，不要在沒有資料的情況下猜關鍵字。
 */
function categoryOf(n: Normalized): string {
  return classifyArticle({
    id: n.id,
    data: { title: n.title, description: n.description, tags: n.tags, tldr: n.tldr },
  } as unknown as CollectionEntry<'articles'>);
}

function toEntry(n: Normalized, site: URL | undefined): ReaderIndexArticle {
  const entry: ReaderIndexArticle = {
    slug: n.slug,
    url: n.url,
    title: n.title,
    category: categoryOf(n),
    type: n.type,
    publish_date: n.publishDate.toISOString(),
  };
  if (n.description) entry.description = n.description;

  const cover = absoluteImage(n.coverImage, site);
  if (cover) entry.cover_image = cover;

  // 只有 articles 有 readingTime。髒資料（0 或負值）不進契約。
  if (typeof n.readingTime === 'number' && Number.isFinite(n.readingTime) && n.readingTime > 0) {
    entry.reading_time = Math.round(n.readingTime);
  }

  return entry;
}

// ── 各集合的攤平器 ─────────────────────────────────────────────────────────
//
// 每支只回答「這個集合的欄位叫什麼」。集合之間的欄位差異比想像中大（news 沒有
// description、topic-overviews 連 title 與 publishDate 都沒有），所以必須逐集合寫，
// 不能靠一個通用的取值函式——那種函式在欄位缺漏時只會安靜地給 undefined，
// 而 title 或 publish_date 缺了會讓 reader 端整筆略過（sync.js 的 REQUIRED）。

function normalizeArticles(entries: CollectionEntry<'articles'>[], site: URL | undefined): Normalized[] {
  return entries.map((a) => {
    const slug = fileSlug(a.id);
    return {
      id: a.id,
      slug, // ⚠️ 不加前綴：既有的 /r/ 一次性網址靠它，改了就全部失效
      url: new URL(`/articles/${slug}/`, siteBase(site)).toString(),
      title: a.data.title,
      description: a.data.description,
      publishDate: a.data.publishDate,
      coverImage: a.data.coverImage,
      readingTime: a.data.readingTime,
      tags: a.data.tags ?? [],
      tldr: typeof a.data.tldr === 'string' ? a.data.tldr : undefined,
      type: 'article',
    };
  });
}

function normalizeNews(entries: CollectionEntry<'news'>[], site: URL | undefined): Normalized[] {
  return entries.map((a) => {
    const slug = fileSlug(a.id);
    return {
      id: a.id,
      slug: `news/${slug}`,
      url: new URL(`/news/${slug}/`, siteBase(site)).toString(),
      // titleDisplay 是版面用的短標；契約要的是內容標題本身，所以用 title。
      title: a.data.title,
      // news 沒有 description 欄位，summary 才是必填的那一個。
      description: a.data.summary,
      publishDate: a.data.publishDate,
      coverImage: a.data.heroImage ?? a.data.thumbnail ?? a.data.coverImage,
      tags: a.data.tags ?? [],
      type: 'news',
    };
  });
}

function normalizeMyths(entries: CollectionEntry<'myths'>[], site: URL | undefined): Normalized[] {
  return entries.map((a) => {
    const slug = fileSlug(a.id);
    return {
      id: a.id,
      slug: `myths/${slug}`,
      url: new URL(`/myths/${slug}/`, siteBase(site)).toString(),
      title: a.data.title,
      // 缺 description 時用「30 秒結論」頂上——那是闢謠最想讓人看到的一句。
      description: a.data.description ?? a.data.thirtySecondConclusion,
      publishDate: a.data.publishDate,
      coverImage: a.data.coverImage ?? a.data.heroImage,
      tags: a.data.tags ?? [],
      tldr: typeof a.data.tldr === 'string' ? a.data.tldr : undefined,
      type: 'interpretation',
    };
  });
}

function normalizeIngredients(
  entries: CollectionEntry<'ingredients'>[],
  site: URL | undefined,
): Normalized[] {
  return entries.map((a) => {
    const slug = fileSlug(a.id);
    return {
      id: a.id,
      slug: `ingredients/${slug}`,
      url: new URL(`/ingredients/${slug}/`, siteBase(site)).toString(),
      title: a.data.title,
      description: a.data.description,
      publishDate: a.data.publishDate,
      coverImage: a.data.coverImage,
      tags: a.data.tags ?? [],
      type: 'interpretation',
    };
  });
}

/**
 * 主題總覽。這個集合與其他四個形狀差最多：**沒有 title、也沒有 publishDate**，
 * 只有 topicSlug／seoTitle？／seoDescription？／updatedDate。
 *
 * 標題與簡介從 src/data/topics.ts 的 TOPICS 補（那是主題名稱的正本），
 * publish_date 用 updatedDate。對不上 TOPICS 的 topicSlug 直接丟掉——那種內容在站上
 * 本來也渲染不出來（topics/[slug].astro 是照著 TOPICS 產路徑的），推出去會是死連結。
 */
function normalizeTopics(
  entries: CollectionEntry<'topic-overviews'>[],
  site: URL | undefined,
): Normalized[] {
  const out: Normalized[] = [];
  for (const a of entries) {
    const topic = TOPICS.find((t) => t.slug === a.data.topicSlug);
    if (!topic) continue;
    out.push({
      id: a.id,
      slug: `topic-overviews/${a.data.topicSlug}`,
      url: new URL(`/topics/${topic.slug}/`, siteBase(site)).toString(),
      title: a.data.seoTitle ?? topic.name,
      description: a.data.seoDescription ?? topic.intro,
      // 沒有發佈日，用最後更新日。主題總覽是常青內容，reader 那邊也沒有替它設時效窗，
      // 所以這個日期只影響排序上的新舊，不影響它會不會被推出來。
      publishDate: a.data.updatedDate,
      tags: topic.matchKeywords ?? [],
      type: 'topic',
    });
  }
  return out;
}

export async function GET(context: APIContext) {
  const site = context.site;
  const today = taipeiDay(new Date());

  // 公開判斷一律走 isPublicEntry（draft／status: under-review／發佈日在未來）。
  // 那是全站唯一的可見性來源，與 sitemap、各集合的 getStaticPaths 同一份，不要另寫第二套。
  const pick = <T extends { data: Record<string, unknown> }>(entries: T[]): T[] =>
    entries.filter((e) => isPublicEntry(e.data));

  const [articles, news, myths, ingredients, topicOverviews] = await Promise.all([
    getCollection('articles'),
    getCollection('news'),
    getCollection('myths'),
    getCollection('ingredients'),
    getCollection('topic-overviews'),
  ]);

  const pool: Normalized[] = [
    ...normalizeArticles(pick(articles), site),
    ...normalizeNews(pick(news), site),
    ...normalizeMyths(pick(myths), site),
    ...normalizeIngredients(pick(ingredients), site),
    ...normalizeTopics(pick(topicOverviews), site),
  ].sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

  // slug 撞號的最後一道防線。前綴規則已經處理掉已知的兩組（lutein／omega-3），
  // 但這裡仍要擋——reader 端撞號的症狀是「有一篇安靜地消失」，沒有任何錯誤訊息，
  // 而在 build 期發現它只要一個 Set。
  const seen = new Set<string>();
  const unique = pool.filter((n) => {
    if (seen.has(n.slug)) {
      console.warn(`[reader-index.json] slug 重複，已略過：${n.slug}（${n.id}）`);
      return false;
    }
    seen.add(n.slug);
    return true;
  });

  if (unique.length > REVISIT_ARTICLE_COUNT) {
    // 不擋 build（reader 端降級處理已足夠優雅），但留下訊號讓下一個人重新評估
    // 是否該換成 appi.news 的「各分類最新 N 篇聯集」演算法（見上方常數註解）。
    console.warn(
      `[reader-index.json] 候選池篇數 (${unique.length}) 已超過 ${REVISIT_ARTICLE_COUNT}，` +
        `目前仍全收——該重新評估是否需要分類上限了。`,
    );
  }

  // 當日精選：articles 的 featured 且發佈日就是今天。
  //
  // ⚠️ 2026-09-07 起這**不再是第 1 則的主要來源**。reader 的版位表改成
  // 「第 1 則＝48 小時內最新的 news」（fresh 版位），完全自動、不需要有人每天標記。
  // 這個欄位留著是因為契約仍要求它，而且它是「站方想指定某一篇」時的覆寫管道。
  // 留空是正常狀態——實際上全站只標過 2 篇，而且都不是當天。
  const featured = pick(articles)
    .filter((a) => a.data.featured && taipeiDay(a.data.publishDate) === today)
    .map((a) => fileSlug(a.id));

  const siteRoot = new URL('/', siteBase(site)).toString().replace(/\/+$/, '');

  const body = JSON.stringify({
    version: 1,
    generated_at: new Date().toISOString(),
    site: siteRoot,
    featured,
    articles: unique.map((n) => toEntry(n, site)),
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
