<script lang="ts">
  /**
   * ReadingEngagement — invisible Svelte 5 island for GA4 reading-engagement tracking.
   * Renders no visible markup. Mount with client:idle on article/myth/ingredient pages.
   *
   * All events route through trackEvent() which is consent-gated; we never call
   * window.gtag directly.
   */
  import {
    trackEvent,
    buildEventEnvelope,
    computeScrollDepth,
    pendingMilestones,
  } from '@/utils/analytics';
  import {
    SCROLL_MILESTONES,
    ENGAGED_IDLE_TIMEOUT_MS,
    ENGAGED_MAX_MS,
    READ_COMPLETE_THRESHOLD,
  } from '@/data/analytics';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  let {
    contentType,
    slug,
    tags = [],
    author = '',
    queryPattern,
    verdict,
    evidenceLevel,
    readingTime = 0,
    hasRelated = false,
  } = $props<{
    contentType: string;
    slug: string;
    tags?: string[];
    author?: string;
    queryPattern?: string;
    verdict?: string;
    evidenceLevel?: string;
    readingTime?: number;
    hasRelated?: boolean;
  }>();

  // ---------------------------------------------------------------------------
  // Local helpers
  // ---------------------------------------------------------------------------

  /** Map minutes to a reading-time bucket label. */
  function bucket(min: number): '<3' | '3-6' | '6-10' | '10+' {
    if (!min || min < 3) return '<3';
    if (min < 6) return '3-6';
    if (min < 10) return '6-10';
    return '10+';
  }

  /** Round n to d decimal places (default 0). */
  function round(n: number, d = 0): number {
    const factor = 10 ** d;
    return Math.round(n * factor) / factor;
  }

  /**
   * Derive target_type from an internal href prefix.
   * Returns undefined when no known prefix matches.
   */
  function targetTypeFromHref(href: string): string | undefined {
    if (href.includes('/articles/')) return 'article';
    if (href.includes('/myths/')) return 'myth';
    if (href.includes('/ingredients/')) return 'ingredient';
    if (href.includes('/videos/')) return 'video';
    if (href.includes('/podcasts/')) return 'podcast';
    return undefined;
  }

  /** Last non-empty path segment from a URL or pathname. */
  function lastSegment(href: string): string {
    const parts = href.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Minimum gate (sec) to qualify as "read_complete": clamp(floor(readTime*60*0.5), 20, 240). */
  const TIME_GATE_SEC = Math.min(240, Math.max(20, Math.floor(readingTime * 60 * 0.5)));

  // ---------------------------------------------------------------------------
  // pageMeta — built once from props, merged into every event envelope
  // ---------------------------------------------------------------------------

  const pageMeta: Record<string, unknown> = {
    content_type: contentType,
    content_slug: slug,
    content_category: tags[0] ?? '',
    author,
    query_pattern: queryPattern,
    verdict,
    evidence_level: evidenceLevel,
    reading_time_bucket: bucket(readingTime),
  };

  // ---------------------------------------------------------------------------
  // Main $effect — all DOM wiring lives here; cleanup returned
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // ---- Mutable state local to this effect closure -------------------------

    let maxScroll = 0;
    const firedScrollMilestones = new Set<number>();

    let engagedMs = 0;
    let lastActivity = Date.now();
    let lastTickTime = Date.now();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    let readCompleteFired = false;
    let timeGateMet = false;
    let reachedReferences = false;

    let engagedViewSent = false;

    const firedFaqIndexes = new Set<number>();

    let referenceExpandFired = false;

    // ---- content_view -------------------------------------------------------

    trackEvent('content_view', buildEventEnvelope({}, pageMeta));

    // ---- Scroll depth tracking ----------------------------------------------

    const contentEl =
      document.querySelector('.article-content') ?? document.documentElement;

    let rafPending = false;

    function handleScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const rect =
          contentEl === document.documentElement
            ? { top: 0, height: document.documentElement.scrollHeight }
            : (contentEl as HTMLElement).getBoundingClientRect();

        const contentTop =
          contentEl === document.documentElement ? 0 : rect.top + window.scrollY;
        const contentHeight =
          contentEl === document.documentElement
            ? document.documentElement.scrollHeight
            : (contentEl as HTMLElement).offsetHeight;

        const depth = computeScrollDepth(
          window.scrollY,
          window.innerHeight,
          contentTop,
          contentHeight,
        );

        if (depth > maxScroll) {
          maxScroll = depth;
        }

        // Fire pending scroll milestones
        const pending = pendingMilestones(depth, firedScrollMilestones, [
          ...SCROLL_MILESTONES,
        ]);
        for (const m of pending) {
          firedScrollMilestones.add(m);
          trackEvent(
            'scroll',
            buildEventEnvelope({ percent_scrolled: m }, pageMeta),
          );
        }

        // Check read_complete conditions
        checkReadComplete();
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---- Engaged-time tracking ----------------------------------------------

    function isEngaged(): boolean {
      return (
        document.visibilityState === 'visible' &&
        document.hasFocus() &&
        Date.now() - lastActivity <= ENGAGED_IDLE_TIMEOUT_MS
      );
    }

    function tickEngaged() {
      if (!isEngaged()) return;
      const now = Date.now();
      const delta = Math.min(now - lastTickTime, 2000); // guard large gaps
      lastTickTime = now;
      engagedMs = Math.min(ENGAGED_MAX_MS, engagedMs + delta);

      const engagedSec = engagedMs / 1000;
      if (!timeGateMet && engagedSec >= TIME_GATE_SEC) {
        timeGateMet = true;
      }
      checkReadComplete();
    }

    function resetActivity() {
      lastActivity = Date.now();
    }

    function startInterval() {
      if (intervalId !== null) return;
      lastTickTime = Date.now();
      intervalId = setInterval(tickEngaged, 1000);
    }

    function stopInterval() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    // Activity events that reset idle timer
    const ACTIVITY_EVENTS = [
      'scroll',
      'keydown',
      'pointermove',
      'pointerdown',
      'wheel',
      'touchstart',
    ] as const;

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetActivity, { passive: true });
    }

    // Visibility / focus management
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        stopInterval();
        flushEngagedView();
      } else {
        resetActivity();
        startInterval();
      }
    }

    function handleFocus() {
      startInterval();
    }

    function handleBlur() {
      stopInterval();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Start timing immediately if engaged
    startInterval();

    // ---- read_complete gate -------------------------------------------------

    function checkReadComplete() {
      if (readCompleteFired) return;
      if (maxScroll >= READ_COMPLETE_THRESHOLD && timeGateMet) {
        readCompleteFired = true;
        const engagedSec = round(engagedMs / 1000);
        const durationSec = readingTime * 60 || 1;
        trackEvent(
          'read_complete',
          buildEventEnvelope(
            {
              engaged_time_sec: engagedSec,
              completion_ratio: round(engagedSec / durationSec, 2),
            },
            pageMeta,
          ),
        );
      }
    }

    // ---- engaged_view + read_skim flush -------------------------------------

    function flushEngagedView() {
      if (engagedViewSent) return;
      engagedViewSent = true;

      const engagedSec = round(engagedMs / 1000);
      const timeGateEverMet = timeGateMet;

      trackEvent(
        'engaged_view',
        buildEventEnvelope(
          {
            engaged_time_sec: engagedSec,
            max_scroll_percent: round(maxScroll),
            read_completed: readCompleteFired,
            reached_references: reachedReferences,
            transport_type: 'beacon',
          },
          pageMeta,
        ),
      );

      // read_skim: skimmed far but never met the time gate
      if (maxScroll >= 75 && !timeGateEverMet) {
        trackEvent(
          'read_skim',
          buildEventEnvelope({}, pageMeta),
        );
      }
    }

    // pagehide — most reliable unload signal
    function handlePageHide() {
      stopInterval();
      flushEngagedView();
    }

    // bfcache restore — full per-view reset and resume timing
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        engagedViewSent = false;
        engagedMs = 0;
        maxScroll = 0;
        timeGateMet = false;
        readCompleteFired = false;
        reachedReferences = false;
        firedScrollMilestones.clear();
        firedFaqIndexes.clear();
        referenceExpandFired = false;
        lastActivity = Date.now();
        lastTickTime = Date.now();
        startInterval();
      }
    }

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow as EventListener);

    // ---- select_content (related card clicks) --------------------------------

    let relatedGrid: Element | null = null;

    function handleRelatedClick(event: Event) {
      const target = (event.target as Element).closest('a');
      if (!target || !(target instanceof HTMLAnchorElement)) return;
      const href = target.href;
      const targetType = targetTypeFromHref(href);
      const targetSlug = lastSegment(new URL(href, window.location.href).pathname);

      // 1-based index among all <a> in the grid
      const links = Array.from(relatedGrid!.querySelectorAll('a'));
      const linkPosition = links.indexOf(target) + 1;
      const rawText = target.textContent ?? '';
      const linkText = rawText.trim().slice(0, 100);

      trackEvent(
        'select_content',
        buildEventEnvelope(
          {
            content_type: 'related_card',
            item_id: targetSlug,
            source_type: contentType,
            source_slug: slug,
            target_type: targetType,
            target_slug: targetSlug,
            link_position: linkPosition,
            link_text: linkText,
          },
          pageMeta,
        ),
      );
    }

    if (hasRelated) {
      relatedGrid = document.querySelector('.related-content__grid');
      if (relatedGrid) {
        relatedGrid.addEventListener('click', handleRelatedClick);
      }
    }

    // ---- faq_open -----------------------------------------------------------

    const faqContainer = document.querySelector('.article-faq');
    let faqDetailsEls: HTMLDetailsElement[] = [];

    function handleFaqToggle(event: Event) {
      const details = event.target as HTMLDetailsElement;
      if (!details || details.tagName !== 'DETAILS' || !details.open) return;
      if (!details.classList.contains('faq-accordion__item')) return;

      const idx = faqDetailsEls.indexOf(details);
      if (idx === -1 || firedFaqIndexes.has(idx)) return;
      firedFaqIndexes.add(idx);

      const summaryEl = details.querySelector('summary');
      const faqQuestion = (summaryEl?.textContent ?? '').trim().slice(0, 120);

      trackEvent(
        'faq_open',
        buildEventEnvelope(
          { faq_index: idx, faq_question: faqQuestion },
          pageMeta,
        ),
      );
    }

    if (faqContainer) {
      faqDetailsEls = Array.from(
        faqContainer.querySelectorAll('details.faq-accordion__item'),
      ) as HTMLDetailsElement[];
      // toggle does not bubble; use capture
      faqContainer.addEventListener('toggle', handleFaqToggle, true);
    }

    // ---- 來源連結點擊：用 GA4 標準 'click' 事件 + outbound:true + references_expand + reached_references -----------

    const referenceList =
      document.querySelector('.reference-list') ??
      document.querySelector('.article-references');

    function handleReferenceClick(event: Event) {
      const target = (event.target as Element).closest('a[target="_blank"]');
      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.href;
      let hostname = '';
      try {
        hostname = new URL(href).hostname;
      } catch {
        hostname = '';
      }

      const allOutboundLinks = Array.from(
        (referenceList ?? document).querySelectorAll('a[target="_blank"]'),
      ) as HTMLAnchorElement[];
      const referenceIndex = allOutboundLinks.indexOf(target);

      trackEvent(
        'click',
        buildEventEnvelope(
          {
            outbound: true,
            link_url: href,
            link_domain: hostname,
            reference_index: referenceIndex,
          },
          pageMeta,
        ),
      );
    }

    function handleReferenceToggle(event: Event) {
      const details = event.target as HTMLDetailsElement;
      if (!details || details.tagName !== 'DETAILS' || !details.open) return;
      if (!details.classList.contains('reference-list')) return;
      if (referenceExpandFired) return;
      referenceExpandFired = true;
      trackEvent('references_expand', buildEventEnvelope({}, pageMeta));
    }

    let refObserver: IntersectionObserver | null = null;

    if (referenceList) {
      referenceList.addEventListener('click', handleReferenceClick);
      referenceList.addEventListener('toggle', handleReferenceToggle, true);

      refObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              reachedReferences = true;
              refObserver?.disconnect();
              refObserver = null;
            }
          }
        },
        { threshold: 0.1 },
      );
      refObserver.observe(referenceList);
    }

    // ---- Cleanup ------------------------------------------------------------

    return () => {
      stopInterval();

      window.removeEventListener('scroll', handleScroll);

      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetActivity);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow as EventListener);

      if (relatedGrid) {
        relatedGrid.removeEventListener('click', handleRelatedClick);
      }

      if (faqContainer) {
        faqContainer.removeEventListener('toggle', handleFaqToggle, true);
      }

      if (referenceList) {
        referenceList.removeEventListener('click', handleReferenceClick);
        referenceList.removeEventListener('toggle', handleReferenceToggle, true);
      }

      refObserver?.disconnect();
    };
  });
</script>
