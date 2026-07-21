import { getCollection } from 'astro:content';
import { isPublicEntry } from '@/utils/visibility';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'] as const;

export interface TagCount {
  tag: string;
  count: number;
}

export async function getTopTags(limit = 20): Promise<TagCount[]> {
  const allEntries = (
    await Promise.all(COLLECTIONS.map((c) => getCollection(c)))
  )
    .flat()
    .filter((e: any) => isPublicEntry(e.data));

  const tagCounts = new Map<string, number>();
  for (const entry of allEntries) {
    for (const tag of (entry as any).data.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
