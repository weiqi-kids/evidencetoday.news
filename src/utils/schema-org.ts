import { VERDICT_RATING, type MythVerdict } from '@/utils/myths/schema';

const ORG = {
  '@type': 'Organization',
  name: '本日有據',
  url: 'https://evidencetoday.news/',
} as const;

export interface ClaimReviewInput {
  mythClaim: string;
  verdict: MythVerdict;
  verdictSummary: string;
  publishDate: Date;
  updatedDate: Date;
  url: string;
}

export function buildClaimReview(input: ClaimReviewInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: input.url,
    datePublished: input.publishDate.toISOString(),
    dateModified: input.updatedDate.toISOString(),
    claimReviewed: input.mythClaim,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: VERDICT_RATING[input.verdict],
      bestRating: 5,
      worstRating: 1,
      alternateName: input.verdict,
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
