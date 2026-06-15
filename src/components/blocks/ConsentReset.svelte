<script lang="ts">
  import { readConsent, setConsent, onConsentChange } from '@/utils/analytics';
  import type { ConsentStatus } from '@/data/analytics';

  let status = $state<ConsentStatus>('unset');
  let resetConfirmed = $state(false);

  $effect(() => {
    // Read current consent on mount
    status = readConsent();

    // Subscribe to future consent changes
    const unsubscribe = onConsentChange((s) => {
      status = s;
    });

    return () => unsubscribe();
  });

  function statusLabel(s: ConsentStatus): string {
    if (s === 'granted') return '目前狀態：已接受分析';
    if (s === 'denied') return '目前狀態：已拒絕分析';
    return '目前狀態：尚未選擇';
  }

  function handleReset() {
    setConsent('reset');
    resetConfirmed = true;
  }
</script>

<div class="consent-reset">
  <p class="consent-reset__status">{statusLabel(status)}</p>
  {#if !resetConfirmed}
    <button
      type="button"
      class="consent-reset__btn"
      onclick={handleReset}
    >
      變更我的選擇
    </button>
  {:else}
    <p class="consent-reset__confirm">
      已清除，重新整理或前往其他頁面即可重新選擇。
    </p>
  {/if}
</div>

<style>
  .consent-reset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 1rem 1.25rem;
    background: var(--color-teal-subtle);
    border: 1px solid var(--color-teal-light);
    border-radius: var(--radius-sm);
  }

  .consent-reset__status {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    color: var(--color-ink);
    line-height: 1.6;
  }

  .consent-reset__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0.5rem 1.25rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-teal);
    background: transparent;
    color: var(--color-teal);
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }

  .consent-reset__btn:hover {
    background: var(--color-teal);
    color: oklch(1 0 0);
  }

  .consent-reset__confirm {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    color: var(--color-teal-hover);
    line-height: 1.6;
  }
</style>
