import { describe, it, expect } from 'vitest';
import {
  isTrackable,
  computeScrollDepth,
  pendingMilestones,
  parseConsent,
  serializeConsent,
  reduceConsent,
  buildEventEnvelope,
} from '@/utils/analytics';
import { SCROLL_MILESTONES } from '@/data/analytics';

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
