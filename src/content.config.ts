import { defineCollection } from 'astro:content';
import {
  articlesSchema,
  mythsSchema,
  ingredientsSchema,
  podcastsSchema,
  videosSchema,
  newsSchema,
} from './content.schemas';

// Schema 定義集中在 src/content.schemas.ts（單一真相來源），供 build 與前台編輯器共用。
// 改欄位請改那支，這裡只負責 defineCollection 包裝。

export const collections = {
  articles: defineCollection({ type: 'content', schema: articlesSchema }),
  myths: defineCollection({ type: 'content', schema: mythsSchema }),
  ingredients: defineCollection({ type: 'content', schema: ingredientsSchema }),
  podcasts: defineCollection({ type: 'content', schema: podcastsSchema }),
  videos: defineCollection({ type: 'content', schema: videosSchema }),
  news: defineCollection({ type: 'content', schema: newsSchema }),
};
