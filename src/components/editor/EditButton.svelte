<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import EditorPanel from './EditorPanel.svelte';

  let { repoPath, collection, slug } = $props();
  let show = $state(false);
  let open = $state(false);

  onMount(() => { show = !!getToken(); });
</script>

{#if show}
  <button class="et-edit-fab" onclick={() => (open = true)} aria-label="編輯這篇">編輯</button>
  {#if open}
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
