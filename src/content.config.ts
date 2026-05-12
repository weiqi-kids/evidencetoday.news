import { defineCollection, z } from 'astro:content';

/* ------------------------------------------------------------------ */
/*  Shared schemas                                                     */
/* ------------------------------------------------------------------ */

const referenceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  type: z.enum([
    'meta-analysis',
    'rct',
    'observational',
    'review',
    'guideline',
    'other',
  ]),
});

const evidenceLevelEnum = z.enum([
  'meta-analysis',
  'rct',
  'observational',
  'animal',
  'in-vitro',
]);

/* ------------------------------------------------------------------ */
/*  articles                                                           */
/* ------------------------------------------------------------------ */

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    author: z.string(),
    reviewer: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    tldr: z.string(),
    readingTime: z.number(),
    editorReviewed: z.boolean().default(true),
    featured: z.boolean().default(false),
    disclosure: z.string().optional(),
    coverImage: z.string().optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .optional(),
    references: z.array(referenceSchema).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  myths                                                              */
/* ------------------------------------------------------------------ */

const myths = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    verdict: z.enum(['true', 'false', 'insufficient', 'contextual']),
    verdictSummary: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    whyItSpreads: z.string(),
    actionAdvice: z.string(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    evidence: z
      .array(
        z.object({
          level: evidenceLevelEnum,
          summary: z.string(),
          references: z.array(referenceSchema).optional(),
        }),
      )
      .min(1),
    references: z.array(referenceSchema),
    relatedArticles: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  ingredients                                                        */
/* ------------------------------------------------------------------ */

const ingredients = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    sortKey: z.string(),
    description: z.string().max(155),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    introduction: z.string(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    disclosure: z.string().optional(),
    uses: z.array(
      z.object({
        purpose: z.string(),
        evidenceLevel: evidenceLevelEnum,
        summary: z.string(),
      }),
    ),
    mechanism: z.string().optional(),
    pathwaySteps: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          enzyme: z.string().optional(),
        }),
      )
      .optional(),
    safety: z
      .object({
        general: z.string(),
        interactions: z
          .array(
            z.object({
              substance: z.string(),
              description: z.string(),
            }),
          )
          .optional(),
        populations: z
          .array(
            z.object({
              group: z.string(),
              note: z.string(),
            }),
          )
          .optional(),
      })
      .optional(),
    references: z.array(referenceSchema),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  podcasts                                                           */
/* ------------------------------------------------------------------ */

const podcasts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    episodeNumber: z.number(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    duration: z.string(),
    audioUrl: z.string().optional(),
    embedUrl: z.string().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    chapters: z
      .array(
        z.object({
          time: z.string(),
          title: z.string(),
        }),
      )
      .optional(),
    showNotes: z.array(z.string()).optional(),
    references: z.array(referenceSchema).optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  videos                                                             */
/* ------------------------------------------------------------------ */

const videos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    youtubeId: z.string(),
    duration: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    tldr: z.string(),
    transcript: z.string().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    references: z.array(referenceSchema).optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  news                                                               */
/* ------------------------------------------------------------------ */

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleDisplay: z.string().optional(),
    subtitle: z.string().optional(),
    category: z.string().optional(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()),
    summary: z.string(),
    heroImage: z.string().optional(),
    thumbnail: z.string().optional(),
    editorPick: z.boolean().default(false),
    editorComment: z.string().optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export const collections = {
  articles,
  myths,
  ingredients,
  podcasts,
  videos,
  news,
};
