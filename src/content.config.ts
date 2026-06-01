import { defineCollection, z } from 'astro:content';

/* ------------------------------------------------------------------ */
/*  Shared schemas                                                     */
/* ------------------------------------------------------------------ */

const referenceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  type: z.enum([
    'meta-analysis',
    'systematic-review',
    'cochrane-review',
    'rct',
    'cohort',
    'case-control',
    'cross-sectional',
    'observational',
    'review',
    'guideline',
    'official-agency',
    'expert-review',
    'safety-database',
    'other',
  ]),
  sourceType: z.enum([
    '論文',
    '官方資料',
    '新聞',
    '社群來源',
    '其他',
    'systematic-review',
    'meta-analysis',
    'cochrane-review',
    'rct',
    'cohort',
    'case-control',
    'cross-sectional',
    'observational',
    'animal',
    'in-vitro',
    'case-report',
    'guideline',
    'official-agency',
    'expert-review',
    'safety-database',
  ]).optional(),
  evidenceType: z.string().optional(),
  authors: z.string().optional(),
  journal: z.string().optional(),
  year: z.number().optional(),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  population: z.string().optional(),
  interventionOrExposure: z.string().optional(),
  comparison: z.string().optional(),
  outcome: z.string().optional(),
  mainFinding: z.string().optional(),
  limitation: z.string().optional(),
  quotedExcerpt: z.string().optional(),
  relevanceToMyth: z.string().optional(),
  note: z.string().optional(),
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
    summary: z.string().max(155).optional(),
    author: z.string(),
    reviewer: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    tldr: z.string(),
    question: z.string().optional(),
    aiAnswer: z.string().optional(),
    quickAnswer: z.string().optional(),
    citationAnswer: z.string().optional(),
    targetAudience: z.string().optional(),
    evidenceBasis: z.string().optional(),
    queryPattern: z.enum(['ingredient-explainer','myth-check','taiwan-regulation-market','audience-stage-guide','comparison']).optional(),
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
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().max(220),
    category: z.string().optional(),
    mythClaim: z.string(),
    verdict: z.enum(['大致正確', '大致錯誤', '證據不足', '情境成立', '過度簡化', '需謹慎']),
    verdictSummary: z.string(),
    evidenceLevel: z.enum(['高', '中', '低', '資料不足', '目前不足']),
    cardConclusion: z.string().optional(),
    thirtySecondConclusion: z.array(z.string()).optional(),
    confidenceNote: z.string().optional(),
    datePublished: z.coerce.date().optional(),
    dateModified: z.coerce.date().optional(),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    topicTags: z.array(z.string()),
    rumorSources: z.array(z.string()),
    spreadLevel: z.enum(['高', '中', '低']),
    applicableContext: z.array(z.string()),
    notApplicableContext: z.array(z.string()),
    tldr: z.array(z.string()).min(1),
    currentSituation: z.string(),
    popularVersions: z.array(z.string()),
    whyItSpreads: z.union([
      z.array(z.string()),
      z.object({
        commonClaim: z.string(),
        shortVideoVersion: z.string().optional(),
        adVersion: z.string().optional(),
        familyChatVersion: z.string().optional(),
      }),
    ]),
    plainLanguageReasoning: z.string().optional(),
    plainLanguageAnalysis: z.string(),
    reasoningCards: z
      .array(
        z.object({
          title: z.string(),
          tone: z.enum(['blue', 'red']),
          items: z.array(z.string()).min(1),
        }),
      )
      .optional(),
    scientificEvidence: z.string(),
    evidenceSummary: z
      .object({
        bottomLine: z.string(),
        evidenceItems: z.array(
          z.object({
            title: z.string(),
            authors: z.string().optional(),
            journal: z.string().optional(),
            year: z.number().optional(),
            sourceType: z.enum([
              'systematic-review',
              'meta-analysis',
              'cochrane-review',
              'rct',
              'cohort',
              'case-control',
              'cross-sectional',
              'observational',
              'animal',
              'in-vitro',
              'case-report',
              'guideline',
              'official-agency',
              'expert-review',
              'safety-database',
            ]),
            url: z.string().url(),
            doi: z.string().optional(),
            pmid: z.string().optional(),
            population: z.string().optional(),
            interventionOrExposure: z.string().optional(),
            comparison: z.string().optional(),
            outcome: z.string().optional(),
            mainFinding: z.string(),
            limitation: z.string().optional(),
            quotedExcerpt: z.string(),
            relevanceToMyth: z.string().optional(),
          }),
        ),
        evidenceGaps: z.string(),
      })
      .optional(),
    evidencePyramid: z.object({
      systematicReview: z.enum(['有', '無', '部分']).optional(),
      randomizedControlledTrial: z.enum(['有', '無', '部分']).optional(),
      observationalStudy: z.enum(['有', '無', '部分']).optional(),
      animalOrInVitro: z.enum(['有', '無', '部分']).optional(),
      expertOpinionOrMechanism: z.enum(['有', '無', '部分']).optional(),
    }),
    safeActions: z.array(z.string()),
    avoidActions: z.array(z.string()),
    shareCardImage: z.string(),
    coverImage: z.string().optional(),
    heroImage: z.string().optional(),
    imageAlt: z.string().optional(),
    ogTitle: z.string(),
    ogDescription: z.string(),
    ogImage: z.string().optional(),
    author: z.string(),
    reviewer: z.string().optional(),
    editor: z.string(),
    disclosureStatus: z.string().optional(),
    safePractice: z.string().optional(),
    whoShouldBeCareful: z.array(z.string()).optional(),
    whenToSeekProfessionalAdvice: z.string().optional(),
    status: z.enum(['published', 'under-review']).default('published'),
    needsEditorialReview: z.boolean().optional(),
    deleteCandidate: z.boolean().optional(),
    correctionLog: z.array(z.object({ date: z.string(), description: z.string() })).default([]),
    medicalDisclaimer: z.string(),
    references: z.array(referenceSchema).min(1),
    relatedArticles: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
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
    embedUrl: z.string().url().optional(),
    externalUrl: z.string().url().optional(),
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
    summary: z.string().max(500).optional(),
    keyPoints: z.array(z.string()).optional(),
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
    question: z.string().optional(),
    aiAnswer: z.string().optional(),
    quickAnswer: z.string().optional(),
    citationAnswer: z.string().optional(),
    targetAudience: z.string().optional(),
    evidenceBasis: z.string().optional(),
    queryPattern: z.enum(['ingredient-explainer','myth-check','taiwan-regulation-market','audience-stage-guide','comparison']).optional(),
    transcript: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    references: z.array(referenceSchema).optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
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
    intro: z.string().optional(),
    keyPoints: z.array(z.string()).min(3).max(8).optional(),
    termBox: z.array(z.object({
      term: z.string(),
      definition: z.string(),
    })).optional(),
    cautionNote: z.string().optional(),
    evidenceNote: z.string().optional(),
    pmid: z.string().optional(),
    references: z.array(referenceSchema).optional(),
    sourcePending: z.boolean().default(false),
    sourcePendingReason: z.string().optional(),
    editorPick: z.boolean().default(false),
    editorPoints: z.array(z.string()).min(2).max(8).optional(),
    editorComment: z.union([z.string(), z.array(z.string())]).optional(),
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
