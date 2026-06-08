<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { getFile, putFile } from '@/utils/editor/github';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';

  let { repoPath, slug, onclose } = $props();

  let raw = $state('');
  let sha = $state(null);
  let status = $state('loading'); // loading | ready | saving | done | error
  let message = $state('');

  onMount(async () => {
    try {
      const token = getToken();
      const file = await getFile(repoPath, token); // 抓最新版與 sha
      raw = file.content;
      sha = file.sha;
      status = 'ready';
    } catch (e) {
      status = 'error';
      message = `載入失敗：${e instanceof Error ? e.message : e}。請重新整理再試。`;
    }
  });

  async function save() {
    // 送出前的輕量 frontmatter 護欄（擋掉會讓 build 失敗的格式錯誤）
    try {
      const doc = parse(raw);
      serialize(doc); // 解析+序列化能通過即視為 frontmatter 可用
    } catch (e) {
      status = 'error';
      message = `frontmatter 格式有誤：${e instanceof Error ? e.message : e}。請修正後再存（常見：縮排、缺引號、日期格式）。`;
      return;
    }
    status = 'saving';
    try {
      const code = await putFile({ path: repoPath, content: raw, sha, message: `content: 前台編輯 ${slug}`, token: getToken() });
      const outcome = classifySave(code);
      message = outcome.message;
      status = outcome.state === 'success' ? 'done' : 'error';
    } catch (e) {
      const outcome = classifySave(0); // 視為 network
      message = outcome.message;
      status = 'error';
    }
  }

  async function reload() {
    const file = await getFile(repoPath, getToken());
    raw = file.content; sha = file.sha; status = 'ready'; message = '';
  }
</script>

<div class="et-overlay" role="dialog" aria-modal="true">
  <div class="et-panel">
    <header><strong>編輯：{slug}</strong><button onclick={onclose} aria-label="關閉">✕</button></header>
    {#if status === 'loading'}<p>載入中…</p>{/if}
    {#if status !== 'loading'}
      <textarea bind:value={raw} spellcheck="false"></textarea>
    {/if}
    {#if message}<p class="et-msg">{message}</p>{/if}
    <footer>
      <button onclick={save} disabled={status === 'saving' || status === 'loading'}>儲存</button>
      <button onclick={reload}>重新載入最新版</button>
    </footer>
  </div>
</div>

<style>
  .et-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 60; display: flex; }
  .et-panel { background: #fff; margin: auto; width: min(900px, 94vw); height: 90vh; display: flex; flex-direction: column; border-radius: 12px; padding: 1rem; }
  .et-panel header, .et-panel footer { display: flex; justify-content: space-between; gap: .5rem; }
  .et-panel textarea { flex: 1; width: 100%; font-family: ui-monospace, monospace; font-size: .9rem; margin: .75rem 0; }
  .et-msg { color: var(--color-ink, #222); background: #f5f5f5; padding: .5rem .75rem; border-radius: 8px; }
</style>
