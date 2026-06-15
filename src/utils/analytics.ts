/**
 * GA4 Analytics — pure logic helpers (no DOM, no gtag, no side effects).
 * Side-effecting functions (readConsent/setConsent/loadGtag/trackEvent)
 * are a separate task and intentionally absent here.
 */
import type { ConsentStatus } from '@/data/analytics';

// ---------------------------------------------------------------------------
// isTrackable
// ---------------------------------------------------------------------------

/**
 * Returns true only when consent is granted AND a non-empty measurement ID
 * has been configured. Both conditions must be met to allow tracking.
 */
export function isTrackable(status: ConsentStatus, measurementId: string): boolean {
  return status === 'granted' && measurementId !== '';
}

// ---------------------------------------------------------------------------
// computeScrollDepth
// ---------------------------------------------------------------------------

/**
 * Computes what percentage of a content element has been read, measured by
 * how far the bottom of the viewport has progressed through the content block.
 *
 * Formula: ((scrollY + viewportH - contentTop) / contentHeight) * 100
 * Clamped to [0, 100]. Returns 0 when contentHeight <= 0.
 */
export function computeScrollDepth(
  scrollY: number,
  viewportH: number,
  contentTop: number,
  contentHeight: number,
): number {
  if (contentHeight <= 0) return 0;
  const raw = ((scrollY + viewportH - contentTop) / contentHeight) * 100;
  return Math.min(100, Math.max(0, raw));
}

// ---------------------------------------------------------------------------
// pendingMilestones
// ---------------------------------------------------------------------------

/**
 * Returns all milestone values that have been reached (m <= depth) but not
 * yet fired, in ascending order. Supports monotonic backfill: a fast scroll
 * to 95% will return all unfired milestones below that threshold.
 */
export function pendingMilestones(
  depth: number,
  fired: ReadonlySet<number>,
  milestones: readonly number[],
): number[] {
  return milestones.filter((m) => m <= depth && !fired.has(m)).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// parseConsent / serializeConsent
// ---------------------------------------------------------------------------

/**
 * Parses a raw string (e.g. from localStorage) into a ConsentStatus.
 * Only exact matches for 'granted' or 'denied' are recognised; anything
 * else (null, empty string, garbage) maps to 'unset'.
 */
export function parseConsent(raw: string | null): ConsentStatus {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'unset';
}

/**
 * Serialises a ConsentStatus for storage.
 * 'unset' serialises to '' (empty string) so parseConsent round-trips cleanly.
 */
export function serializeConsent(status: ConsentStatus): string {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return '';
}

// ---------------------------------------------------------------------------
// reduceConsent
// ---------------------------------------------------------------------------

export type ConsentAction = 'accept' | 'decline' | 'reset';
export type ConsentEffect = 'dispatch' | 'load' | 'flush';

export interface ConsentTransition {
  status: ConsentStatus;
  effects: Array<ConsentEffect>;
}

/**
 * Deterministic state machine for consent transitions.
 *
 * - accept  → granted.  Effects: ['dispatch','load','flush'] unless already granted.
 * - decline → denied.   Effects: ['dispatch'] unless already denied.
 * - reset   → unset.    Effects: ['dispatch'] unless already unset.
 *
 * When the state does not change, effects is [].
 */
export function reduceConsent(
  prev: ConsentStatus,
  action: ConsentAction,
): ConsentTransition {
  switch (action) {
    case 'accept':
      return {
        status: 'granted',
        effects: prev === 'granted' ? [] : ['dispatch', 'load', 'flush'],
      };
    case 'decline':
      return {
        status: 'denied',
        effects: prev === 'denied' ? [] : ['dispatch'],
      };
    case 'reset':
      return {
        status: 'unset',
        effects: prev === 'unset' ? [] : ['dispatch'],
      };
    default: {
      const _exhaustive: never = action;
      throw new Error(`reduceConsent: unknown action ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// buildEventEnvelope
// ---------------------------------------------------------------------------

/**
 * Merges pageMeta and params into a single event payload object.
 * params take precedence over pageMeta on key collision.
 * Keys whose value is `undefined` are stripped from the result.
 * null, 0, and '' are intentionally kept.
 */
export function buildEventEnvelope(
  params: Record<string, unknown>,
  pageMeta: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...pageMeta, ...params };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
