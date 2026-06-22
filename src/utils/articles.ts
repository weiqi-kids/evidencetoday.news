import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublicEntry } from '@/utils/visibility';

export const isPublishedArticle = (entry: CollectionEntry<'articles'>) => isPublicEntry(entry.data);

export async function getPublishedArticles() {
  return (await getCollection('articles', isPublishedArticle))
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}
