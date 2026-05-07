<script>
  import { scaleOrdinal } from 'd3-scale';

  /** @type {{ purpose: string; evidenceLevel: string; summary: string }[]} */
  export let uses = [];

  const levels = ['meta-analysis', 'rct', 'observational', 'animal', 'in-vitro'];
  const levelLabels = {
    'meta-analysis': 'Meta-analysis / 系統性回顧',
    'rct': '隨機對照試驗（RCT）',
    'observational': '觀察性研究',
    'animal': '動物實驗',
    'in-vitro': '體外實驗',
  };

  const colorScale = scaleOrdinal()
    .domain(levels)
    .range([
      'var(--color-teal)',
      'var(--color-cat-article)',
      'var(--color-cat-ingredient)',
      'var(--color-cat-news)',
      'var(--color-fog)',
    ]);

  // Group uses by evidence level
  $: grouped = levels.map((level, i) => ({
    level,
    label: levelLabels[level],
    items: uses.filter((u) => u.evidenceLevel === level),
    strength: 1 - i / (levels.length - 1),
  }));
</script>

<div class="evidence-scale">
  <h3 class="scale-title">證據強度分級</h3>
  {#each grouped as tier}
    <div
      class="tier"
      class:tier--active={tier.items.length > 0}
      class:tier--empty={tier.items.length === 0}
    >
      <div class="tier-row">
        <div
          class="tier-bar"
          style="background-color: {tier.items.length > 0
            ? colorScale(tier.level)
            : 'var(--color-fog)'}; width: {20 + tier.strength * 80}%"
        ></div>
        <div class="tier-info">
          <span class="tier-label">{tier.label}</span>
          {#if tier.items.length > 0}
            <span class="tier-count">{tier.items.length} 項研究</span>
          {/if}
        </div>
      </div>
      {#if tier.items.length > 0}
        <ul class="tier-details">
          {#each tier.items as item}
            <li>{item.purpose}: {item.summary}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</div>

<style>
  .evidence-scale {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.5rem;
    border-radius: var(--radius-card);
    border: 1px solid var(--color-fog);
    background-color: white;
  }

  .scale-title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 0.5rem;
  }

  .tier {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid color-mix(in oklch, var(--color-fog) 60%, transparent);
  }

  .tier:last-child {
    border-bottom: none;
  }

  .tier-row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .tier-bar {
    height: 6px;
    border-radius: 3px;
    transition: width 0.4s ease;
    min-width: 20%;
  }

  .tier--empty .tier-bar {
    opacity: 0.4;
  }

  .tier-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .tier-label {
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: var(--color-ink);
  }

  .tier--empty .tier-label {
    color: color-mix(in oklch, var(--color-ink) 40%, transparent);
  }

  .tier-count {
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    font-weight: 500;
    color: var(--color-teal);
    white-space: nowrap;
  }

  .tier-details {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .tier-details li {
    font-size: var(--text-meta);
    color: color-mix(in oklch, var(--color-ink) 80%, transparent);
    line-height: 1.6;
    padding-left: 1rem;
    position: relative;
  }

  .tier-details li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--color-teal);
  }
</style>
