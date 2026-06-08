<script>
  import { getToken } from '@/utils/editor/token';
  import EditorPanel from './EditorPanel.svelte';

  const COLLECTIONS = [
    { value: 'articles', label: '健康文章' },
    { value: 'myths', label: '迷思查證' },
    { value: 'ingredients', label: '成分解析' },
  ];
  let collection = $state('articles');
  let title = $state('');
  let slug = $state('');
  let open = $state(false);
  let initialDoc = $state(null);
  let repoPath = $state('');

  function start() {
    if (!title.trim()) {
      alert('請先填標題');
      return;
    }
    if (!slug.match(/^[a-z0-9-]+$/)) {
      alert('網址代稱只能用小寫英文、數字與連字號，例如 vitamin-c-myth');
      return;
    }
    repoPath = `src/content/${collection}/${slug}.mdx`;
    initialDoc = {
      frontmatter: { title: title.trim(), description: '', publishDate: new Date().toISOString().slice(0, 10) },
      body: '\n（在此撰寫正文）\n',
    };
    open = true;
  }
</script>

{#if getToken()}
  <section class="et-new">
    <h2>新增文章</h2>
    <label>
      <span>分類</span>
      <select bind:value={collection}>
        {#each COLLECTIONS as c}<option value={c.value}>{c.label}</option>{/each}
      </select>
    </label>
    <label>
      <span>標題</span>
      <input placeholder="例：維他命 C 的劑型迷思" bind:value={title} />
    </label>
    <label>
      <span>網址代稱（slug）</span>
      <input placeholder="例：vitamin-c-myth" bind:value={slug} />
      <small>會成為文章網址 <code>/{collection}/你填的代稱</code>；只能用小寫英文、數字、連字號。</small>
    </label>
    <button class="et-create" onclick={start}>建立並編輯</button>
  </section>
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} {initialDoc} onclose={() => (open = false)} />
  {/if}
{/if}

<style>
  .et-new {
    margin-top: clamp(1.5rem, 1rem + 2vw, 2.5rem);
    padding: clamp(1rem, 0.75rem + 1vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: color-mix(in oklch, var(--color-paper) 55%, white);
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-card);
    color: var(--color-ink);
  }
  .et-new h2 {
    font-size: var(--text-h3);
    margin: 0;
  }
  .et-new label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .et-new span {
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
  }
  .et-new small {
    font-size: var(--text-badge);
    color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper));
  }
  .et-new :is(input, select) {
    font-family: var(--font-ui);
    font-size: var(--text-body);
    color: var(--color-ink);
    background: white;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.65rem;
  }
  .et-new :is(input, select):focus-visible {
    outline: 2px solid var(--color-teal);
    outline-offset: 1px;
  }
  .et-create {
    align-self: flex-start;
    min-height: 44px;
    padding: 0.6rem 1.25rem;
    border: 1px solid var(--color-teal);
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: white;
    background: var(--color-teal);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .et-create:hover {
    background: var(--color-teal-hover);
    border-color: var(--color-teal-hover);
  }
  .et-create:focus-visible {
    outline: 2px solid var(--color-coral);
    outline-offset: 2px;
  }
</style>
