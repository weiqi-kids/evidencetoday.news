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
  .et-fields { display: flex; flex-direction: column; gap: .75rem; overflow: auto; }
  .et-fields label { display: flex; flex-direction: column; gap: .25rem; }
  .et-fields em { color: var(--color-coral, #c0492f); font-style: normal; }
  .et-fields small { color: #777; }
</style>
