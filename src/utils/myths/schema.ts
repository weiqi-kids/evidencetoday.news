export const MYTH_VERDICTS = ['大致正確', '大致錯誤', '證據不足', '情境成立', '過度簡化', '需謹慎'] as const;
export const EVIDENCE_LEVELS = ['高', '中', '低', '資料不足'] as const;
export const SPREAD_LEVELS = ['高', '中', '低'] as const;

export type MythVerdict = (typeof MYTH_VERDICTS)[number];
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const VERDICT_META: Record<MythVerdict, { shortLabel: string; description: string; tone: string; icon: string }> = {
  大致正確: { shortLabel: '偏正確', description: '整體方向正確，但仍需留意限制。', tone: 'positive', icon: '✓' },
  大致錯誤: { shortLabel: '偏錯誤', description: '核心說法與現有證據不符。', tone: 'negative', icon: '!' },
  證據不足: { shortLabel: '待更多證據', description: '目前資料不足以下定論。', tone: 'neutral', icon: '?' },
  情境成立: { shortLabel: '看情境', description: '在特定族群或條件下可能成立。', tone: 'context', icon: '◐' },
  過度簡化: { shortLabel: '過度簡化', description: '有部分事實，但結論被簡化或誇大。', tone: 'caution', icon: '≈' },
  需謹慎: { shortLabel: '須謹慎', description: '可能涉及風險，請勿自行套用。', tone: 'warning', icon: '⚠' },
};

// ClaimReview.reviewRating.ratingValue 用：1=與證據不符，5=與證據一致。
export const VERDICT_RATING: Record<MythVerdict, number> = {
  大致正確: 5,
  情境成立: 4,
  過度簡化: 3,
  證據不足: 2,
  需謹慎: 2,
  大致錯誤: 1,
};

// 顯示用判定字串：修正 enum 中 需謹慎 → 須謹慎 的用字。
export function displayVerdict(verdict: MythVerdict): string {
  return verdict === '需謹慎' ? '須謹慎' : verdict;
}
