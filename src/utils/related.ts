import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublicEntry } from '@/utils/visibility';

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

function publishTime(data: Record<string, unknown>): number {
  const d = (data.publishDate as Date | undefined) ?? undefined;
  return d ? d.getTime() : 0;
}

async function topByTagOverlap<C extends RelatableCollection>(
  collection: C,
  wanted: Set<string>,
  excludeId: string | undefined,
  limit: number,
): Promise<CollectionEntry<C>[]> {
  if (wanted.size === 0 || limit <= 0) return [];
  const entries = (await getCollection(collection, (e) => isPublicEntry(e.data))) as CollectionEntry<C>[];
  return entries
    .filter((e) => e.id !== excludeId)
    .map((e) => {
      const tags = normTags(e.data as Record<string, unknown>);
      let overlap = 0;
      for (const t of tags) if (wanted.has(t)) overlap += 1;
      return { e, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) =>
      b.overlap - a.overlap ||
      publishTime(b.e.data as Record<string, unknown>) - publishTime(a.e.data as Record<string, unknown>),
    )
    .slice(0, limit)
    .map((x) => x.e);
}

export async function getAutoRelated(opts: {
  tags: string[];
  exclude?: { collection: RelatableCollection; id: string };
  /** 每個桶最多幾筆 */
  perBucket?: number;
  /** 只需要哪些桶（預設全部） */
  buckets?: RelatableCollection[];
}): Promise<AutoRelatedBuckets> {
  const wanted = new Set(opts.tags.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const perBucket = opts.perBucket ?? 3;
  const want = new Set(opts.buckets ?? ['articles', 'myths', 'ingredients', 'videos', 'podcasts']);
  const ex = (c: RelatableCollection) => (opts.exclude?.collection === c ? opts.exclude.id : undefined);

  const [articles, myths, ingredients, videos, podcasts] = await Promise.all([
    want.has('articles') ? topByTagOverlap('articles', wanted, ex('articles'), perBucket) : Promise.resolve([]),
    want.has('myths') ? topByTagOverlap('myths', wanted, ex('myths'), perBucket) : Promise.resolve([]),
    want.has('ingredients') ? topByTagOverlap('ingredients', wanted, ex('ingredients'), perBucket) : Promise.resolve([]),
    want.has('videos') ? topByTagOverlap('videos', wanted, ex('videos'), perBucket) : Promise.resolve([]),
    want.has('podcasts') ? topByTagOverlap('podcasts', wanted, ex('podcasts'), perBucket) : Promise.resolve([]),
  ]);

  return { articles, myths, ingredients, videos, podcasts };
}
