import { getCollection, type CollectionEntry } from 'astro:content';

export const isPublishedArticle = (entry: CollectionEntry<'articles'>) => !entry.data.draft;

export async function getPublishedArticles() {
  return (await getCollection('articles', isPublishedArticle))
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}
