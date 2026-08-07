import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublicEntry } from '@/utils/visibility';
import { TOPICS, matchesTopic } from '@/data/topics';

/**
 * 自動相關內容：用 tag 重疊度跨 collection 推薦，作為「文章/趨勢沒手動填 relatedX」時的 fallback。
 * 手動 relatedX（hub↔spoke 結構）仍優先；這裡只補沒填到的桶，避免相關區整片空白。
 *
 * 評分：共享 tag 數量；同分以 publishDate 新者優先。tag 比對大小寫不敏感。
 */

type RelatableCollection = 'articles' | 'myths' | 'ingredients' | 'videos' | 'podcasts';

export interface AutoRelatedBuckets {
  articles: CollectionEntry<'articles'>[];
  myths: CollectionEntry<'myths'>[];
  ingredients: CollectionEntry<'ingredients'>[];
  videos: CollectionEntry<'videos'>[];
  podcasts: CollectionEntry<'podcasts'>[];
}

function normTags(data: Record<string, unknown>): Set<string> {
  const raw = [
    ...((data.tags as string[] | undefined) ?? []),
    ...((data.topicTags as string[] | undefined) ?? []),
  ];
  return new Set(raw.map((t) => t.toLowerCase().trim()).filter(Boolean));
}

/** 這筆內容屬於哪些健康專題（用 title + tags 關鍵字比對，與 hub 頁同一套判定）。 */
function topicsOf(data: Record<string, unknown>): Set<string> {
  const entry = {
    title: (data.title as string | undefined) ?? '',
    tags: [
      ...((data.tags as string[] | undefined) ?? []),
      ...((data.topicTags as string[] | undefined) ?? []),
    ],
  };
  return new Set(TOPICS.filter((tp) => matchesTopic(tp, entry)).map((tp) => tp.slug));
}

function publishTime(data: Record<string, unknown>): number {
  const d = (data.publishDate as Date | undefined) ?? undefined;
  return d ? d.getTime() : 0;
}

async function topByTagOverlap<C extends RelatableCollection>(
  collection: C,
  wanted: Set<string>,
  sourceTopics: Set<string>,
  excludeId: string | undefined,
  limit: number,
): Promise<{ strong: CollectionEntry<C>[]; topic: CollectionEntry<C>[]; weak: CollectionEntry<C>[] }> {
  if ((wanted.size === 0 && sourceTopics.size === 0) || limit <= 0) return { strong: [], topic: [], weak: [] };
  const entries = (await getCollection(collection, (e) => isPublicEntry(e.data))) as CollectionEntry<C>[];
  const pool = entries.filter((e) => e.id !== excludeId);
  if (pool.length === 0) return { strong: [], topic: [], weak: [] };

  /* 標籤稀有度加權（2026-08-07 改，原本是「共享標籤數量」）。
   *
   * 為什麼要改：全站 860 個標籤但分佈極不均——「預防醫學」有 78 篇、「證據判讀」37 篇，
   * 而 668 個標籤只出現在 1 篇。舊算法只數「共享幾個標籤」，於是共享一個「預防醫學」
   * 跟共享一個「褪黑激素」同分，推薦結果被泛用標籤稀釋成「同類文章隨便挑」。
   *
   * 改法是資訊檢索常用的 IDF：一個標籤在候選池裡越少見，共享它就越能代表「真的在談同
   * 一件事」。權重取 log(總數 / 出現篇數)，泛用標籤趨近 0、罕見標籤拿到高分。
   * df 只在「本次候選的 collection」內計算，因為推薦本來就是在該桶內排序。
   */
  const df = new Map<string, number>();
  for (const e of pool) {
    for (const t of normTags(e.data as Record<string, unknown>)) {
      if (wanted.has(t)) df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const N = pool.length;
  const idf = (t: string) => Math.log(N / (df.get(t) ?? N));

  /* 泛用標籤門檻：出現在超過 10% 候選頁的標籤，共享它幾乎不代表「談同一件事」。
   * 2026-08-07 實測，文章頁 223 個推薦連結中有 81 個（36%）只共享「預防醫學」
   * 這一個標籤——那是 78 篇都掛的標籤，等於隨機推薦。
   *
   * 但直接濾掉會讓候選不足的頁面出現空的相關區，對「把讀者留在站內」更不利。
   * 折衷做在 getAutoRelated（全頁層級）：整頁湊得到 2 筆以上「真的相關」時，
   * 泛用湊數的一律不出；湊不到才拿它補位，確保相關區不會整片空白。
   * 分桶各留 1 個是不夠的——5 個桶就會漏 5 個泛用結果進來（2026-08-07 實測 30%）。
   */
  const GENERIC_DF_RATIO = 0.1;
  const isGeneric = (t: string) => (df.get(t) ?? 0) > N * GENERIC_DF_RATIO;

  const scored = pool
    .map((e) => {
      const data = e.data as Record<string, unknown>;
      const tags = normTags(data);
      let score = 0;
      let shared = 0;
      let specific = 0;
      for (const t of tags) {
        if (!wanted.has(t)) continue;
        shared += 1;
        score += idf(t);
        if (!isGeneric(t)) specific += 1;
      }
      let sharedTopics = 0;
      for (const tp of topicsOf(data)) if (sourceTopics.has(tp)) sharedTopics += 1;
      return { e, score, shared, specific, sharedTopics };
    })
    .filter((x) => x.shared > 0 || x.sharedTopics > 0)
    .sort((a, b) =>
      b.score - a.score ||
      b.sharedTopics - a.sharedTopics ||
      b.shared - a.shared ||
      publishTime(b.e.data as Record<string, unknown>) - publishTime(a.e.data as Record<string, unknown>),
    );

  /* 三層優先序（2026-08-07 加入專題層）：
   *   1 共享罕見標籤 —— 最能代表「在談同一件事」
   *   2 同屬一個健康專題 —— 標籤太碎時的主力訊號。實測 108 篇已發布文章中，
   *     有 38 篇找不到任何共享非泛用標籤的同伴，改用專題後降到 21 篇，
   *     每篇候選數中位從 1 個上升到 14 個。
   *   3 只共享泛用標籤 —— 等同隨機推薦，只在前兩層湊不出東西時才用。
   */
  return {
    strong: scored.filter((x) => x.specific > 0).slice(0, limit).map((x) => x.e),
    topic: scored.filter((x) => x.specific === 0 && x.sharedTopics > 0).slice(0, limit).map((x) => x.e),
    weak: scored.filter((x) => x.specific === 0 && x.sharedTopics === 0).slice(0, limit).map((x) => x.e),
  };
}

export async function getAutoRelated(opts: {
  tags: string[];
  /** 來源頁標題，用來判定它屬於哪些健康專題（判定同 hub 頁的 matchesTopic）。 */
  title?: string;
  exclude?: { collection: RelatableCollection; id: string };
  /** 每個桶最多幾筆 */
  perBucket?: number;
  /** 只需要哪些桶（預設全部） */
  buckets?: RelatableCollection[];
}): Promise<AutoRelatedBuckets> {
  const wanted = new Set(opts.tags.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const sourceTopics = topicsOf({ title: opts.title ?? '', tags: opts.tags });
  const perBucket = opts.perBucket ?? 3;
  const want = new Set(opts.buckets ?? ['articles', 'myths', 'ingredients', 'videos', 'podcasts']);
  const ex = (c: RelatableCollection) => (opts.exclude?.collection === c ? opts.exclude.id : undefined);

  const [articles, myths, ingredients, videos, podcasts] = await Promise.all([
    want.has('articles') ? topByTagOverlap('articles', wanted, sourceTopics, ex('articles'), perBucket) : Promise.resolve({ strong: [], topic: [], weak: [] }),
    want.has('myths') ? topByTagOverlap('myths', wanted, sourceTopics, ex('myths'), perBucket) : Promise.resolve({ strong: [], topic: [], weak: [] }),
    want.has('ingredients') ? topByTagOverlap('ingredients', wanted, sourceTopics, ex('ingredients'), perBucket) : Promise.resolve({ strong: [], topic: [], weak: [] }),
    want.has('videos') ? topByTagOverlap('videos', wanted, sourceTopics, ex('videos'), perBucket) : Promise.resolve({ strong: [], topic: [], weak: [] }),
    want.has('podcasts') ? topByTagOverlap('podcasts', wanted, sourceTopics, ex('podcasts'), perBucket) : Promise.resolve({ strong: [], topic: [], weak: [] }),
  ]);

  const buckets = { articles, myths, ingredients, videos, podcasts };
  const count = (k: 'strong' | 'topic') =>
    Object.values(buckets).reduce((n, b) => n + b[k].length, 0);
  /* 全頁層級決定要不要動用下一層：湊得到 2 筆就不往下拿，避免用隨機推薦稀釋版位。
   * 分桶各留一個是不夠的——5 個桶就會漏 5 個泛用結果進來（2026-08-07 實測 30%）。 */
  const useTopic = count('strong') < 2;
  const useWeak = useTopic && count('strong') + count('topic') < 2;
  const pick = <T,>(b: { strong: T[]; topic: T[]; weak: T[] }) =>
    [...b.strong, ...(useTopic ? b.topic : []), ...(useWeak ? b.weak : [])].slice(0, perBucket);

  return {
    articles: pick(articles),
    myths: pick(myths),
    ingredients: pick(ingredients),
    videos: pick(videos),
    podcasts: pick(podcasts),
  };
}
