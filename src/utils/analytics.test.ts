import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isTrackable,
  computeScrollDepth,
  pendingMilestones,
  parseConsent,
  serializeConsent,
  reduceConsent,
  buildEventEnvelope,
  readConsent,
  setConsent,
  bootstrapAnalytics,
  trackEvent,
  onConsentChange,
  __resetAnalyticsForTest,
} from '@/utils/analytics';
import { SCROLL_MILESTONES, CONSENT_KEY, CONSENT_EVENT } from '@/data/analytics';

// ---------------------------------------------------------------------------
// isTrackable
// ---------------------------------------------------------------------------
describe('isTrackable', () => {
  it('granted + non-empty ID → true', () => {
    expect(isTrackable('granted', 'G-XXXXXXX')).toBe(true);
  });

  it('granted + empty ID → false', () => {
    expect(isTrackable('granted', '')).toBe(false);
  });

  it('denied + non-empty ID → false', () => {
    expect(isTrackable('denied', 'G-XXXXXXX')).toBe(false);
  });

  it('unset + non-empty ID → false', () => {
    expect(isTrackable('unset', 'G-XXXXXXX')).toBe(false);
  });

  it('denied + empty ID → false', () => {
    expect(isTrackable('denied', '')).toBe(false);
  });

  it('unset + empty ID → false', () => {
    expect(isTrackable('unset', '')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeScrollDepth
// ---------------------------------------------------------------------------
describe('computeScrollDepth', () => {
  it('viewport has not yet reached content top → 0', () => {
    // scrollY=0, viewportH=600, contentTop=800, contentHeight=2000
    // bottom of viewport = 600, contentTop = 800, not reached
    expect(computeScrollDepth(0, 600, 800, 2000)).toBe(0);
  });

  it('bottom of viewport exactly at content bottom → 100', () => {
    // scrollY=1200, viewportH=800, contentTop=400, contentHeight=1600
    // bottom = 2000; contentTop+contentHeight = 2000; (2000-400)/1600*100 = 100
    expect(computeScrollDepth(1200, 800, 400, 1600)).toBe(100);
  });

  it('past the end → clamped to 100', () => {
    // scrollY=2000, viewportH=800, contentTop=400, contentHeight=1600 → >100
    expect(computeScrollDepth(2000, 800, 400, 1600)).toBe(100);
  });

  it('mid-way example: scrollY=0,viewportH=800,contentTop=400,contentHeight=1600 → 25', () => {
    // (0+800-400)/1600*100 = 400/1600*100 = 25
    expect(computeScrollDepth(0, 800, 400, 1600)).toBe(25);
  });

  it('contentHeight <= 0 → 0', () => {
    expect(computeScrollDepth(100, 800, 0, 0)).toBe(0);
  });

  it('contentHeight negative → 0', () => {
    expect(computeScrollDepth(100, 800, 0, -100)).toBe(0);
  });

  it('clamped to 0 when negative (before content)', () => {
    // scrollY=0, viewportH=300, contentTop=800 → bottom=300 < contentTop=800 → negative raw → 0
    expect(computeScrollDepth(0, 300, 800, 1000)).toBe(0);
  });

  it('50% scroll through content', () => {
    // scrollY=800, viewportH=800, contentTop=800, contentHeight=1600
    // bottom=1600; (1600-800)/1600*100 = 50
    expect(computeScrollDepth(800, 800, 800, 1600)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// pendingMilestones
// ---------------------------------------------------------------------------
describe('pendingMilestones', () => {
  it('depth=95 fired={25} → [50,75,90]', () => {
    expect(pendingMilestones(95, new Set([25]), SCROLL_MILESTONES)).toEqual([50, 75, 90]);
  });

  it('depth=10 → [] (no milestone reached)', () => {
    expect(pendingMilestones(10, new Set(), SCROLL_MILESTONES)).toEqual([]);
  });

  it('all fired → []', () => {
    expect(pendingMilestones(95, new Set([25, 50, 75, 90]), SCROLL_MILESTONES)).toEqual([]);
  });

  it('depth=50 with empty fired → [25, 50]', () => {
    expect(pendingMilestones(50, new Set(), SCROLL_MILESTONES)).toEqual([25, 50]);
  });

  it('depth=75 fired={25,50} → [75]', () => {
    expect(pendingMilestones(75, new Set([25, 50]), SCROLL_MILESTONES)).toEqual([75]);
  });

  it('result is ascending', () => {
    const result = pendingMilestones(100, new Set(), SCROLL_MILESTONES);
    expect(result).toEqual([25, 50, 75, 90]);
  });

  it('works with custom milestones array', () => {
    expect(pendingMilestones(60, new Set([10]), [10, 20, 50, 100])).toEqual([20, 50]);
  });

  it('descending input returns ascending output', () => {
    expect(pendingMilestones(100, new Set(), [90, 75, 50, 25])).toEqual([25, 50, 75, 90]);
  });
});

// ---------------------------------------------------------------------------
// parseConsent
// ---------------------------------------------------------------------------
describe('parseConsent', () => {
  it("'granted' → 'granted'", () => {
    expect(parseConsent('granted')).toBe('granted');
  });

  it("'denied' → 'denied'", () => {
    expect(parseConsent('denied')).toBe('denied');
  });

  it('null → unset', () => {
    expect(parseConsent(null)).toBe('unset');
  });

  it("empty string → 'unset'", () => {
    expect(parseConsent('')).toBe('unset');
  });

  it("garbage string → 'unset'", () => {
    expect(parseConsent('yes')).toBe('unset');
    expect(parseConsent('true')).toBe('unset');
    expect(parseConsent('1')).toBe('unset');
    expect(parseConsent('GRANTED')).toBe('unset');
  });
});

// ---------------------------------------------------------------------------
// serializeConsent
// ---------------------------------------------------------------------------
describe('serializeConsent', () => {
  it("'granted' → 'granted'", () => {
    expect(serializeConsent('granted')).toBe('granted');
  });

  it("'denied' → 'denied'", () => {
    expect(serializeConsent('denied')).toBe('denied');
  });

  it("'unset' → ''", () => {
    expect(serializeConsent('unset')).toBe('');
  });

  it('round-trip: serialize then parse returns original status', () => {
    for (const status of ['granted', 'denied', 'unset'] as const) {
      expect(parseConsent(serializeConsent(status))).toBe(status);
    }
  });
});

// ---------------------------------------------------------------------------
// reduceConsent
// ---------------------------------------------------------------------------
describe('reduceConsent', () => {
  it('unset + accept → granted + [dispatch, load, flush]', () => {
    const result = reduceConsent('unset', 'accept');
    expect(result.status).toBe('granted');
    expect(result.effects).toEqual(['dispatch', 'load', 'flush']);
  });

  it('granted + accept → granted + [] (no-op)', () => {
    const result = reduceConsent('granted', 'accept');
    expect(result.status).toBe('granted');
    expect(result.effects).toEqual([]);
  });

  it('denied + accept → granted + [dispatch, load, flush]', () => {
    const result = reduceConsent('denied', 'accept');
    expect(result.status).toBe('granted');
    expect(result.effects).toEqual(['dispatch', 'load', 'flush']);
  });

  it('unset + decline → denied + [dispatch]', () => {
    const result = reduceConsent('unset', 'decline');
    expect(result.status).toBe('denied');
    expect(result.effects).toEqual(['dispatch']);
  });

  it('denied + decline → denied + [] (no-op)', () => {
    const result = reduceConsent('denied', 'decline');
    expect(result.status).toBe('denied');
    expect(result.effects).toEqual([]);
  });

  it('granted + decline → denied + [dispatch]', () => {
    const result = reduceConsent('granted', 'decline');
    expect(result.status).toBe('denied');
    expect(result.effects).toEqual(['dispatch']);
  });

  it('granted + reset → unset + [dispatch]', () => {
    const result = reduceConsent('granted', 'reset');
    expect(result.status).toBe('unset');
    expect(result.effects).toEqual(['dispatch']);
  });

  it('denied + reset → unset + [dispatch]', () => {
    const result = reduceConsent('denied', 'reset');
    expect(result.status).toBe('unset');
    expect(result.effects).toEqual(['dispatch']);
  });

  it('unset + reset → unset + [] (no-op)', () => {
    const result = reduceConsent('unset', 'reset');
    expect(result.status).toBe('unset');
    expect(result.effects).toEqual([]);
  });

  it('unknown action throws at runtime', () => {
    expect(() => reduceConsent('unset', 'bogus' as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildEventEnvelope
// ---------------------------------------------------------------------------
describe('buildEventEnvelope', () => {
  it('merges pageMeta and params', () => {
    const result = buildEventEnvelope({ event: 'click' }, { page: '/home' });
    expect(result).toEqual({ page: '/home', event: 'click' });
  });

  it('params override pageMeta on key collision', () => {
    const result = buildEventEnvelope({ page: '/override' }, { page: '/home', title: 'Home' });
    expect(result.page).toBe('/override');
    expect(result.title).toBe('Home');
  });

  it('undefined values are stripped', () => {
    const result = buildEventEnvelope({ a: undefined, b: 'keep' }, { c: undefined, d: 'keep' });
    expect('a' in result).toBe(false);
    expect('c' in result).toBe(false);
    expect(result.b).toBe('keep');
    expect(result.d).toBe('keep');
  });

  it('null values are KEPT', () => {
    const result = buildEventEnvelope({ a: null }, { b: null });
    expect(result.a).toBeNull();
    expect(result.b).toBeNull();
  });

  it('0 values are KEPT', () => {
    const result = buildEventEnvelope({ count: 0 }, { depth: 0 });
    expect(result.count).toBe(0);
    expect(result.depth).toBe(0);
  });

  it("empty string values are KEPT", () => {
    const result = buildEventEnvelope({ label: '' }, { category: '' });
    expect(result.label).toBe('');
    expect(result.category).toBe('');
  });

  it('empty params and pageMeta → {}', () => {
    expect(buildEventEnvelope({}, {})).toEqual({});
  });

  it('undefined in pageMeta overridden by defined value in params', () => {
    // pageMeta has undefined for 'x', params has value → value wins, undefined stripped
    const result = buildEventEnvelope({ x: 'value' }, { x: undefined });
    expect(result.x).toBe('value');
  });
});

// ---------------------------------------------------------------------------
// analytics side-effects
// ---------------------------------------------------------------------------
// Globals are stubbed directly on globalThis so the module's typeof guards
// see them without requiring jsdom. Restored in afterEach.
// ---------------------------------------------------------------------------

describe('analytics side-effects', () => {
  // Fake localStorage backed by a Map
  let store: Map<string, string>;

  // Capture calls made to gtag
  let gtagCalls: unknown[][];

  // Simple listener registry for window events
  type ListenerMap = Map<string, EventListenerOrEventListenerObject[]>;
  let listeners: ListenerMap;

  // Save originals so we can restore them
  let origWindow: unknown;
  let origDocument: unknown;
  let origLocalStorage: unknown;

  beforeEach(() => {
    __resetAnalyticsForTest();

    store = new Map();
    gtagCalls = [];
    listeners = new Map();

    // Fake localStorage
    const fakeLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };

    // Fake window with event bus + gtag spy
    const fakeWindow: Record<string, unknown> = {
      dataLayer: [] as unknown[],
      gtag: vi.fn((...args: unknown[]) => {
        gtagCalls.push(args);
        (fakeWindow.dataLayer as unknown[]).push(args);
      }),
      addEventListener: (type: string, handler: EventListenerOrEventListenerObject) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type)!.push(handler);
      },
      removeEventListener: (type: string, handler: EventListenerOrEventListenerObject) => {
        const arr = listeners.get(type);
        if (!arr) return;
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      },
      dispatchEvent: (event: Event) => {
        const arr = listeners.get(event.type) ?? [];
        for (const h of arr) {
          if (typeof h === 'function') h(event);
          else h.handleEvent(event);
        }
        return true;
      },
    };

    // Fake document
    const createdElements: unknown[] = [];
    const fakeDocument = {
      head: { appendChild: vi.fn((el: unknown) => { createdElements.push(el); }) },
      createElement: (_tag: string) => {
        // Return a plain object; the module assigns .async and .src on it
        const el: Record<string, unknown> = {};
        // Capture addEventListener on the element (for the 'error' handler)
        const elListeners: Map<string, EventListenerOrEventListenerObject[]> = new Map();
        el.addEventListener = (type: string, h: EventListenerOrEventListenerObject) => {
          if (!elListeners.has(type)) elListeners.set(type, []);
          elListeners.get(type)!.push(h);
        };
        el.__elListeners = elListeners;
        return el;
      },
    };

    origWindow = (globalThis as Record<string, unknown>).window;
    origDocument = (globalThis as Record<string, unknown>).document;
    origLocalStorage = (globalThis as Record<string, unknown>).localStorage;

    (globalThis as Record<string, unknown>).window = fakeWindow;
    (globalThis as Record<string, unknown>).document = fakeDocument;
    (globalThis as Record<string, unknown>).localStorage = fakeLocalStorage;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = origWindow;
    (globalThis as Record<string, unknown>).document = origDocument;
    (globalThis as Record<string, unknown>).localStorage = origLocalStorage;
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // readConsent
  // -------------------------------------------------------------------------

  it('readConsent: returns parsed value from localStorage', () => {
    store.set(CONSENT_KEY, 'granted');
    expect(readConsent()).toBe('granted');
  });

  it('readConsent: returns "unset" when key is absent', () => {
    expect(readConsent()).toBe('unset');
  });

  it('readConsent: returns "unset" when localStorage.getItem throws', () => {
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readConsent()).toBe('unset');
  });

  it('readConsent: uses cache on second call (localStorage not consulted again)', () => {
    store.set(CONSENT_KEY, 'denied');
    readConsent(); // prime cache
    store.set(CONSENT_KEY, 'granted'); // change storage — should be ignored
    expect(readConsent()).toBe('denied'); // still returns cached value
  });

  // -------------------------------------------------------------------------
  // setConsent('accept') — full happy path
  // -------------------------------------------------------------------------

  it('setConsent("accept"): writes "granted" to localStorage', () => {
    setConsent('accept');
    expect(store.get(CONSENT_KEY)).toBe('granted');
  });

  it('setConsent("accept"): dispatches CONSENT_EVENT with status "granted"', () => {
    const received: string[] = [];
    (globalThis as Record<string, unknown>).window &&
      ((globalThis as { window: { addEventListener: (t: string, h: (e: Event) => void) => void } }).window
        .addEventListener(CONSENT_EVENT, (e: Event) => {
          received.push((e as CustomEvent<{ status: string }>).detail.status);
        }));
    setConsent('accept');
    expect(received).toEqual(['granted']);
  });

  it('setConsent("accept"): appends a script to document.head', () => {
    setConsent('accept');
    const doc = (globalThis as Record<string, unknown>).document as {
      head: { appendChild: ReturnType<typeof vi.fn> };
    };
    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('setConsent("accept"): a trackEvent after accept calls window.gtag("event", ...)', () => {
    setConsent('accept');
    trackEvent('test_event', { foo: 'bar' });
    const win = (globalThis as Record<string, unknown>).window as {
      gtag: ReturnType<typeof vi.fn>;
    };
    const eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBeGreaterThanOrEqual(1);
    const lastEvent = eventCalls[eventCalls.length - 1];
    expect(lastEvent[1]).toBe('test_event');
    expect(lastEvent[2]).toEqual({ foo: 'bar' });
  });

  // -------------------------------------------------------------------------
  // bootstrapAnalytics — loads gtag on every page load (no consent banner).
  // GA4 is always loaded so basic traffic (page_view) is collected site-wide.
  // -------------------------------------------------------------------------

  it('bootstrapAnalytics: loads gtag regardless of stored consent (granted)', () => {
    store.set(CONSENT_KEY, 'granted');
    bootstrapAnalytics();
    const doc = (globalThis as Record<string, unknown>).document as {
      head: { appendChild: ReturnType<typeof vi.fn> };
    };
    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('bootstrapAnalytics: loads gtag when consent is "unset" (no banner)', () => {
    bootstrapAnalytics();
    const doc = (globalThis as Record<string, unknown>).document as {
      head: { appendChild: ReturnType<typeof vi.fn> };
    };
    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('bootstrapAnalytics: loads gtag even when consent is "denied"', () => {
    store.set(CONSENT_KEY, 'denied');
    bootstrapAnalytics();
    const doc = (globalThis as Record<string, unknown>).document as {
      head: { appendChild: ReturnType<typeof vi.fn> };
    };
    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('bootstrapAnalytics: fires gtag config (page_view) on load', () => {
    bootstrapAnalytics();
    const configCalls = gtagCalls.filter((c) => c[0] === 'config');
    expect(configCalls.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // setConsent('decline')
  // -------------------------------------------------------------------------

  it('setConsent("decline"): writes "denied" to localStorage', () => {
    setConsent('decline');
    expect(store.get(CONSENT_KEY)).toBe('denied');
  });

  it('setConsent("decline"): dispatches CONSENT_EVENT with status "denied"', () => {
    const received: string[] = [];
    (globalThis as { window: { addEventListener: (t: string, h: (e: Event) => void) => void } })
      .window.addEventListener(CONSENT_EVENT, (e: Event) => {
        received.push((e as CustomEvent<{ status: string }>).detail.status);
      });
    setConsent('decline');
    expect(received).toEqual(['denied']);
  });

  it('trackEvent is no longer consent-gated: queues, then flushes even when consent is "denied"', () => {
    setConsent('decline');                  // denied; decline alone does not load gtag
    trackEvent('engaged_view', { x: 1 });   // gtag not ready → queued, nothing sent yet
    let eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBe(0);
    bootstrapAnalytics();                   // GA4 loads unconditionally → flushes queue
    eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBeGreaterThanOrEqual(1);
    expect(eventCalls[0][1]).toBe('engaged_view');
  });

  // -------------------------------------------------------------------------
  // Queue: events queued before accept are flushed after accept
  // -------------------------------------------------------------------------

  it('trackEvent queues event when granted but gtag not yet ready; flush happens on accept', () => {
    // Start from unset. Call setConsent('accept') to put consent=granted in
    // localStorage and dispatch the event — but we call __resetAnalyticsForTest
    // afterwards to simulate a page reload where gtagReady is still false while
    // localStorage already holds 'granted'.
    setConsent('accept');           // writes 'granted' to store, loads gtag, etc.
    __resetAnalyticsForTest();      // simulate fresh page: gtagReady=false, cache=null

    // Now trackEvent should see readConsent()='granted' but gtagReady=false → queue
    trackEvent('queued_event', { queued: true });

    // Nothing sent to gtag yet
    gtagCalls.length = 0; // clear init calls from the first setConsent above

    // Trigger accept again (prev=granted → same state → no effects, no flush).
    // Instead we go through reset→accept so effects fire.
    setConsent('reset');   // status→unset, dispatches event
    setConsent('accept');  // status→granted, triggers load+flush

    const eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBeGreaterThanOrEqual(1);
    expect(eventCalls[0][1]).toBe('queued_event');
    expect(eventCalls[0][2]).toEqual({ queued: true });
  });

  // -------------------------------------------------------------------------
  // onConsentChange
  // -------------------------------------------------------------------------

  it('onConsentChange: fires callback when CONSENT_EVENT dispatched', () => {
    const received: string[] = [];
    onConsentChange((status) => received.push(status));
    setConsent('accept');
    expect(received).toContain('granted');
  });

  it('onConsentChange: unsubscribe stops future callbacks', () => {
    const received: string[] = [];
    const unsub = onConsentChange((status) => received.push(status));
    setConsent('accept');
    expect(received).toEqual(['granted']);
    unsub();
    // Reset and decline — callback should NOT fire again
    __resetAnalyticsForTest();
    setConsent('decline');
    expect(received).toEqual(['granted']); // still only the one from before
  });

  it('onConsentChange: returns no-op unsubscribe when window is undefined', () => {
    const savedWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = undefined;
    // Must not throw, must return a function
    const unsub = onConsentChange(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
    (globalThis as Record<string, unknown>).window = savedWindow;
  });

  // -------------------------------------------------------------------------
  // No consent banner: events are collected for everyone once gtag loads
  // -------------------------------------------------------------------------

  it('無同意橫幅：unset 狀態下 bootstrap 後 trackEvent 仍會送出富事件', () => {
    // fresh state: localStorage empty → readConsent() === 'unset'
    bootstrapAnalytics(); // GA4 每頁無條件載入
    trackEvent('content_view', { content_type: 'article' });
    trackEvent('scroll', { percent_scrolled: 50 });
    const eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBe(2);
    expect(eventCalls.map((c) => c[1])).toEqual(['content_view', 'scroll']);
  });

  it('trackEvent 在 gtag 尚未就緒時仍會佇列（unset，未 bootstrap）', () => {
    // Without bootstrap, gtag is not ready → event is queued, not dropped.
    trackEvent('scroll', { percent_scrolled: 25 });
    const eventCalls = gtagCalls.filter((c) => c[0] === 'event');
    expect(eventCalls.length).toBe(0); // queued, not sent yet
    bootstrapAnalytics();              // loads gtag → flushes
    const after = gtagCalls.filter((c) => c[0] === 'event');
    expect(after.length).toBe(1);
    expect(after[0][1]).toBe('scroll');
  });
});
