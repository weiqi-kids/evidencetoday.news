<script>
  import { getSeoFields } from '@/utils/editor/seo-schema';
  let { collection, frontmatter, onchange } = $props();
  const fields = getSeoFields(collection);

  function update(key, value) {
    onchange({ ...frontmatter, [key]: value });
  }
</script>

<div class="et-fields">
  {#each fields as f}
    <label>
      <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
      {#if f.type === 'textarea'}
        <textarea value={frontmatter[f.key] ?? ''} oninput={(e) => update(f.key, e.currentTarget.value)}></textarea>
      {:else}
        <input value={frontmatter[f.key] ?? ''} oninput={(e) => update(f.key, e.currentTarget.value)} />
      {/if}
      {#if f.maxLength}
        <small>{String(frontmatter[f.key] ?? '').length} / {f.maxLength}</small>
      {/if}
    </label>
  {/each}
</div>

<style>
  .et-fields { display: flex; flex-direction: column; gap: 0.75rem; overflow: auto; }
  .et-fields label { display: flex; flex-direction: column; gap: 0.25rem; }
  .et-fields span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; color: var(--color-ink); }
  .et-fields em { color: var(--color-coral); font-style: normal; }
  .et-fields small {
    font-size: var(--text-badge);
    color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper));
  }
  .et-fields :is(input, textarea) {
    font-family: var(--font-ui);
    font-size: var(--text-body);
    color: var(--color-ink);
    background: white;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.65rem;
  }
  .et-fields :is(input, textarea):focus-visible {
    outline: 2px solid var(--color-teal);
    outline-offset: 1px;
  }
  .et-fields textarea { min-height: 4rem; resize: vertical; }
</style>
