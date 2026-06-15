<script lang="ts">
  import { readConsent, setConsent, onConsentChange } from '@/utils/analytics';
  import type { ConsentStatus } from '@/data/analytics';

  let status = $state<ConsentStatus>('unset');

  $effect(() => {
    // Read current consent on mount
    status = readConsent();

    // Subscribe to future consent changes
    const unsubscribe = onConsentChange((s) => {
      status = s;
    });

    return () => unsubscribe();
  });

  function handleAccept() {
    status = 'granted';
    setConsent('accept');
  }

  function handleDecline() {
    status = 'denied';
    setConsent('decline');
  }
</script>

{#if status === 'unset'}
  <div
    class="consent-banner"
    role="region"
    aria-label="Cookie 同意"
  >
    <div class="consent-banner__inner">
      <p class="consent-banner__text">
        本站使用 Google Analytics 了解流量來源，包含讀者透過哪個 AI 助理抵達本站，協助我們持續改善內容品質。
        <a class="consent-banner__link" href="/privacy/">了解隱私權政策</a>
      </p>
      <div class="consent-banner__actions">
        <button
          type="button"
          class="consent-banner__btn consent-banner__btn--accept"
          onclick={handleAccept}
        >
          接受
        </button>
        <button
          type="button"
          class="consent-banner__btn consent-banner__btn--decline"
          onclick={handleDecline}
        >
          拒絕
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .consent-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9000;
    background: var(--color-navy);
    color: var(--color-on-dark-body);
    box-shadow: 0 -2px 12px oklch(0 0 0 / 0.18);
    padding: clamp(0.75rem, 1rem + 1vw, 1.25rem) var(--space-page-x);
  }

  .consent-banner__inner {
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .consent-banner__text {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    line-height: 1.6;
    color: var(--color-on-dark-body);
  }

  .consent-banner__link {
    color: var(--color-on-dark-link);
    text-underline-offset: 2px;
    white-space: nowrap;
    margin-left: 0.25rem;
  }

  .consent-banner__link:hover {
    color: var(--color-on-dark-heading);
  }

  .consent-banner__actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .consent-banner__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0.5rem 1.25rem;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }

  .consent-banner__btn--accept {
    background: var(--color-coral);
    color: oklch(1 0 0);
    border-color: var(--color-coral);
  }

  .consent-banner__btn--accept:hover {
    background: var(--color-coral-hover);
    border-color: var(--color-coral-hover);
  }

  .consent-banner__btn--decline {
    background: transparent;
    color: var(--color-on-dark-meta);
    border-color: color-mix(in oklch, var(--color-on-dark-meta) 40%, transparent);
  }

  .consent-banner__btn--decline:hover {
    color: var(--color-on-dark-body);
    border-color: var(--color-on-dark-meta);
  }

  /* Tablet and up (min-width: 640px) */
  @media (min-width: 640px) {
    .consent-banner__inner {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
</style>
