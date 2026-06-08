<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';

  let { repoPath, collection, slug } = $props();
  let show = $state(false);
  let open = $state(false);
  let EditorPanel = $state(null);

  onMount(() => { show = !!getToken(); });

  async function openEditor() {
    if (!EditorPanel) EditorPanel = (await import('./EditorPanel.svelte')).default;
    open = true;
  }
</script>

{#if show}
  <button class="et-edit-fab" onclick={openEditor} aria-label="編輯這篇">編輯</button>
  {#if open && EditorPanel}
    <EditorPanel {repoPath} {collection} {slug} onclose={() => (open = false)} />
  {/if}
{/if}

<style>
  .et-edit-fab {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 50;
    min-height: 44px;
    padding: 0.6rem 1.25rem;
    border: 2px solid var(--color-coral);
    border-radius: var(--radius-pill);
    background: var(--color-coral);
    color: white;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-card);
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .et-edit-fab:hover {
    background: var(--color-coral-hover);
    border-color: var(--color-coral-hover);
  }
  .et-edit-fab:focus-visible {
    outline: 2px solid var(--color-teal);
    outline-offset: 2px;
  }
</style>
