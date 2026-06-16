/**
 * GA4 Analytics — pure logic helpers (no DOM, no gtag, no side effects).
 * Side-effecting functions live in the second half of this file.
 */
import type { ConsentStatus } from '@/data/analytics';
import {
  MEASUREMENT_ID,
  CONSENT_KEY,
  CONSENT_EVENT,
  MAX_QUEUE,
  GA_CONFIG,
} from '@/data/analytics';

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

// ---------------------------------------------------------------------------
// Global type declarations (gtag / dataLayer)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ---------------------------------------------------------------------------
// Side-effecting layer — the ONLY place allowed to touch
// window / localStorage / gtag / dataLayer.
// All globals accessed INSIDE functions only, guarded by typeof checks.
// ---------------------------------------------------------------------------

// Module-private state
let consentCache: ConsentStatus | null = null;
let gtagReady = false;
let gtagFailed = false;
const queue: Array<{ name: string; params: Record<string, unknown> }> = [];

// ---------------------------------------------------------------------------
// readConsent
// ---------------------------------------------------------------------------

/**
 * Returns the current consent status.
 * Checks the module cache first; falls back to localStorage → parseConsent.
 * On any localStorage error (private browsing, QuotaExceededError, etc.)
 * returns 'unset' without caching the failure so the next call retries.
 */
export function readConsent(): ConsentStatus {
  if (consentCache !== null) return consentCache;
  try {
    if (typeof localStorage === 'undefined') return 'unset';
    const raw = localStorage.getItem(CONSENT_KEY);
    const status = parseConsent(raw);
    consentCache = status;
    return status;
  } catch {
    return 'unset';
  }
}

// ---------------------------------------------------------------------------
// flushQueue
// ---------------------------------------------------------------------------

/**
 * Drains the pending event queue by sending each item to gtag.
 * No-ops when gtagReady is false or the queue is empty.
 */
function flushQueue(): void {
  while (queue.length > 0 && gtagReady) {
    const item = queue.shift()!;
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', item.name, item.params);
    }
  }
}

// ---------------------------------------------------------------------------
// loadGtag
// ---------------------------------------------------------------------------

/**
 * Idempotent gtag bootstrap. Injects the GA4 script tag and initialises
 * window.dataLayer / window.gtag. Marks gtagReady immediately (dataLayer
 * buffers events until the remote script loads), then flushes the queue.
 *
 * Guards: exits early when already ready/failed, no MEASUREMENT_ID, or SSR.
 */
function loadGtag(): void {
  if (gtagReady || gtagFailed) return;
  if (MEASUREMENT_ID === '') return;
  if (typeof document === 'undefined') return;

  // Bootstrap dataLayer and gtag shim
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function (...args: unknown[]) {
        window.dataLayer!.push(args);
      };
    }
  }

  // Inject the GA4 loader script
  const script = document.createElement('script');
  (script as HTMLScriptElement & { async: boolean }).async = true;
  (script as HTMLScriptElement).src =
    `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.addEventListener('error', () => {
    gtagFailed = true;
    queue.length = 0;
  });
  document.head.appendChild(script);

  // Fire the standard gtag init calls (buffered in dataLayer until remote loads)
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, GA_CONFIG);
  }

  gtagReady = true;
  flushQueue();
}

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------

/**
 * Sends a GA4 event, subject to consent and gtag-readiness.
 *
 * - Consent not granted → event is silently dropped.
 * - gtag not yet ready → event is queued (up to MAX_QUEUE; excess ignored).
 * - gtag ready → event is sent immediately via window.gtag.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (!isTrackable(readConsent(), MEASUREMENT_ID)) return;

  if (!gtagReady) {
    if (queue.length < MAX_QUEUE) {
      queue.push({ name, params });
    }
    return;
  }

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

// ---------------------------------------------------------------------------
// setConsent
// ---------------------------------------------------------------------------

/**
 * Applies a consent action (accept / decline / reset), persists the new
 * status to localStorage, updates the cache, and executes any side effects
 * emitted by the state machine (dispatch → load → flush).
 */
export function setConsent(action: ConsentAction): void {
  const prev = readConsent();
  const { status, effects } = reduceConsent(prev, action);

  // Persist
  try {
    if (typeof localStorage !== 'undefined') {
      const s = serializeConsent(status);
      if (s === '') {
        localStorage.removeItem(CONSENT_KEY);
      } else {
        localStorage.setItem(CONSENT_KEY, s);
      }
    }
  } catch {
    // localStorage unavailable (private mode, storage full, etc.) — continue
  }

  consentCache = status;

  // Execute effects in the order prescribed by the state machine
  for (const effect of effects) {
    if (effect === 'dispatch') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(CONSENT_EVENT, { detail: { status } }),
        );
      }
    } else if (effect === 'load') {
      loadGtag();
    } else if (effect === 'flush') {
      flushQueue();
    }
  }
}

// ---------------------------------------------------------------------------
// bootstrapAnalytics
// ---------------------------------------------------------------------------

/**
 * Loads gtag on page load when consent has ALREADY been granted (on a previous
 * visit or a previous page in this MPA).
 *
 * Without this, gtag was only ever loaded inside setConsent('accept') — so on
 * every subsequent full page load (this is a multi-page Astro site, so every
 * navigation is a fresh JS context) a consented visitor's gtag never loaded:
 * page_view never fired and every queued reading event sat unsent. Call this
 * once per page, as early as practical, from a globally-mounted island.
 *
 * No-op unless consent is 'granted'. loadGtag() is itself idempotent.
 */
export function bootstrapAnalytics(): void {
  if (readConsent() === 'granted') {
    loadGtag();
  }
}

// ---------------------------------------------------------------------------
// onConsentChange
// ---------------------------------------------------------------------------

/**
 * Subscribes to consent-change events dispatched on window.
 * Returns an unsubscribe function. No-ops (returns a no-op unsubscribe)
 * when called in a non-browser (SSR / node) environment.
 */
export function onConsentChange(
  cb: (status: ConsentStatus) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ status: ConsentStatus }>).detail;
    cb(detail.status);
  };

  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

// ---------------------------------------------------------------------------
// __resetAnalyticsForTest — TEST SEAM ONLY, do not call in production code
// ---------------------------------------------------------------------------

/**
 * Resets all module-private state to its initial values.
 * Exported exclusively for use in test suites (vitest beforeEach).
 */
export function __resetAnalyticsForTest(): void {
  consentCache = null;
  gtagReady = false;
  gtagFailed = false;
  queue.length = 0;
}
