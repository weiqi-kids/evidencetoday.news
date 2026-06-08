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
    position: fixed; right: 1rem; bottom: 1rem; z-index: 50;
    padding: 0.6rem 1rem; border-radius: 999px; border: none;
    background: var(--color-coral, #c0492f); color: #fff; cursor: pointer;
  }
</style>
