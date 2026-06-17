import { VERDICT_RATING, displayVerdict, type MythVerdict } from '@/utils/myths/schema';
import { AUTHORS, SITE_SAMEAS } from '@/data/authors';

export { SITE_SAMEAS };

const ORG = {
  '@type': 'Organization',
  name: '本日有據',
  url: 'https://evidencetoday.news/',
  sameAs: SITE_SAMEAS,
} as const;

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
