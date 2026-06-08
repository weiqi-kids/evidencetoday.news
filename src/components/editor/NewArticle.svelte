<script>
  import { getToken } from '@/utils/editor/token';
  import EditorPanel from './EditorPanel.svelte';

  const COLLECTIONS = ['articles', 'myths', 'ingredients'];
  let collection = $state('articles');
  let slug = $state('');
  let open = $state(false);
  let initialDoc = $state(null);
  let repoPath = $state('');

  function start() {
    if (!slug.match(/^[a-z0-9-]+$/)) {
      alert('slug 僅能用小寫英數與連字號');
      return;
    }
    repoPath = `src/content/${collection}/${slug}.mdx`;
    initialDoc = {
      frontmatter: { title: '', description: '', publishDate: new Date().toISOString().slice(0, 10) },
      body: '\n（在此撰寫正文）\n',
    };
    open = true;
  }
</script>

{#if getToken()}
  <fieldset>
    <legend>新增文章</legend>
    <select bind:value={collection}>{#each COLLECTIONS as c}<option>{c}</option>{/each}</select>
    <input placeholder="slug（例 new-topic）" bind:value={slug} />
    <button onclick={start}>建立並編輯</button>
  </fieldset>
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} {initialDoc} onclose={() => (open = false)} />
  {/if}
{/if}
