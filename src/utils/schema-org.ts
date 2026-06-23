import { VERDICT_RATING, displayVerdict, type MythVerdict } from '@/utils/myths/schema';
import { AUTHORS, SITE_SAMEAS } from '@/data/authors';

export { SITE_SAMEAS };

/* ------------------------------------------------------------------ */
/*  Stable entity @ids                                                  */
/*  穩定 @id 讓搜尋引擎與 AI 系統把跨頁的同一實體（機構/網站/作者）合併， */
/*  各內容頁只需以 { '@id': … } 參照，不必每頁重述完整實體。              */
/* ------------------------------------------------------------------ */
export const SITE_URL = 'https://evidencetoday.news';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** 完整 Organization 實體（含 @id / logo / sameAs），供首頁 @graph 定義一次。 */
export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: '本日有據',
  alternateName: 'Evidence Today',
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
  publishingPrinciples: `${SITE_URL}/editorial-policy/`,
  sameAs: SITE_SAMEAS,
} as const;

/** 完整 WebSite 實體，publisher 以 @id 參照 Organization。每頁由 Base layout 輸出一次。 */
export const WEBSITE = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: '本日有據',
  alternateName: 'Evidence Today',
  url: `${SITE_URL}/`,
  inLanguage: 'zh-Hant-TW',
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
} as const;

/** 內容頁用的輕量參照（避免每頁重述完整實體）。 */
export const PUBLISHER_REF = { '@id': ORG_ID } as const;
export const WEBSITE_REF = { '@id': WEBSITE_ID } as const;

/**
 * 站台實體圖（Organization + WebSite，皆帶 @id）。由 Base layout 在每頁輸出一次，
 * 讓所有內容頁的 publisher / isPartOf @id 參照都能在同頁解析，利於搜尋引擎與 AI 合併實體。
 */
export function buildSiteGraph() {
  return { '@context': 'https://schema.org', '@graph': [ORGANIZATION, WEBSITE] };
}

const ORG = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: '本日有據',
  url: `${SITE_URL}/`,
  sameAs: SITE_SAMEAS,
} as const;

/* ------------------------------------------------------------------ */
/*  Citations（schema.org citation）                                    */
/*  把 frontmatter references 轉成 CreativeWork，讓搜尋引擎/AI 看見每篇  */
/*  內容引用的一手來源（title / url / publisher / date / type）。        */
/* ------------------------------------------------------------------ */
interface CitationInput {
  title?: string;
  url?: string;
  journal?: string;
  year?: number;
  type?: string;
  sourceType?: string;
  doi?: string;
  pmid?: string;
}

export function buildCitations(references: CitationInput[] | undefined) {
  if (!references || references.length === 0) return undefined;
  const citations = references
    .filter((r) => r && r.title)
    .map((r) => {
      const citation: Record<string, unknown> = {
        '@type': 'CreativeWork',
        name: r.title,
      };
      if (r.url) citation.url = r.url;
      if (r.journal) citation.publisher = { '@type': 'Organization', name: r.journal };
      if (typeof r.year === 'number') citation.datePublished = String(r.year);
      const kind = r.type || r.sourceType;
      if (kind) citation.genre = kind;
      if (r.doi) citation.sameAs = `https://doi.org/${r.doi}`;
      else if (r.pmid) citation.sameAs = `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`;
      return citation;
    });
  return citations.length > 0 ? citations : undefined;
}

export interface ClaimReviewInput {
  mythClaim: string;
  verdict: MythVerdict;
  verdictSummary: string;
  publishDate: Date;
  updatedDate: Date;
  url: string;
  name?: string;
}

export function buildClaimReview(input: ClaimReviewInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    ...(input.name ? { name: input.name } : {}),
    url: input.url,
    datePublished: input.publishDate.toISOString(),
    dateModified: input.updatedDate.toISOString(),
    claimReviewed: input.mythClaim,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: VERDICT_RATING[input.verdict],
      bestRating: 5,
      worstRating: 1,
      alternateName: displayVerdict(input.verdict),
    },
    itemReviewed: {
      '@type': 'Claim',
      name: input.mythClaim,
      appearance: { '@type': 'CreativeWork', name: '網路流傳說法' },
    },
    reviewBody: input.verdictSummary,
    author: ORG,
    publisher: ORG,
  };
}

interface PersonSchema {
  '@type': 'Person';
  name: string;
  '@id'?: string;
  url?: string;
  jobTitle?: string;
  description?: string;
  knowsAbout?: string[];
  sameAs?: string[];
  worksFor?: Array<{ '@type': 'Organization'; name: string; url?: string }>;
  hasCredential?: {
    '@type': 'EducationalOccupationalCredential';
    name: string;
    credentialCategory: string;
    recognizedBy?: { '@type': 'GovernmentOrganization'; name: string };
  };
}

export function buildPerson(authorName: string): PersonSchema {
  const info = AUTHORS[authorName];
  if (!info) {
    return { '@type': 'Person', name: authorName };
  }
  return {
    '@type': 'Person',
    '@id': `${info.url}#person`,
    name: info.name,
    url: info.url,
    jobTitle: info.jobTitle,
    description: info.description,
    knowsAbout: info.knowsAbout,
    sameAs: info.sameAs,
    ...(info.worksFor && info.worksFor.length
      ? { worksFor: info.worksFor.map((o) => ({ '@type': 'Organization' as const, name: o.name, ...(o.url ? { url: o.url } : {}) })) }
      : {}),
    ...(info.hasCredential
      ? {
          hasCredential: {
            '@type': 'EducationalOccupationalCredential' as const,
            name: info.hasCredential.name,
            credentialCategory: info.hasCredential.credentialCategory,
            ...(info.hasCredential.recognizedBy
              ? {
                  recognizedBy: {
                    '@type': 'GovernmentOrganization' as const,
                    name: info.hasCredential.recognizedBy,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
