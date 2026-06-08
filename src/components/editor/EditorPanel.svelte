<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { getFile, putFile } from '@/utils/editor/github';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';
  import { lint } from '@/utils/editor/lint';
  import SeoFields from './SeoFields.svelte';

  let { repoPath, collection, slug, onclose, initialDoc = null } = $props();

  // AI 建議功能開關：AI Worker 部署 + 設好 ANTHROPIC_API_KEY 後改為 true 即可開啟
  const AI_ENABLED = false;
  // AI 建議 Worker（workers.dev 子網域 lightman-chang）
  const AI_WORKER = 'https://evidencetoday-ai-suggest.lightman-chang.workers.dev';
  let suggestion = $state('');
  async function suggest(task) {
    const token = getToken();
    if (!token) { suggestion = '請先登入管理者帳號再使用 AI 建議。'; return; }
    suggestion = '產生中…';
    const res = await fetch(`${AI_WORKER}/suggest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ task, context: { title: frontmatter.title }, selection: body }),
    });
    if (res.ok) suggestion = (await res.json()).suggestion;
    else suggestion = `建議失敗（${res.status}）：請確認已登入管理者帳號。`;
  }
  function acceptSuggestion() {
    if (!confirm('採用建議會覆蓋目前的正文，確定嗎？')) return;
    body = suggestion;
    suggestion = '';
  }

  let frontmatter = $state({});
  let body = $state('');
  let sha = $state(null);
  let tab = $state('seo'); // seo | source
  let status = $state(initialDoc ? 'ready' : 'loading'); // loading | ready | saving | done | error
  let message = $state('');

  // 即時 lint 警告（純函式、不擋存檔，僅供作者參考）
  let lintResults = $derived(lint({ collection, frontmatter, body }));

  onMount(async () => {
    if (initialDoc) {
      frontmatter = initialDoc.frontmatter;
      body = initialDoc.body;
      sha = null;
      return;
    }
    try {
      const file = await getFile(repoPath, getToken()); // 抓最新版與 sha
      const doc = parse(file.content);
      frontmatter = doc.frontmatter;
      body = doc.body;
      sha = file.sha;
      status = 'ready';
    } catch (e) {
      status = 'error';
      message = `載入失敗：${e instanceof Error ? e.message : e}。請重新整理再試。`;
    }
  });

  // 原始碼分頁：編輯字串後回寫模型（兩分頁共用同一個 {frontmatter, body} 模型）
  let rawDraft = $state('');
  function enterSource() {
    rawDraft = serialize({ frontmatter, body });
    tab = 'source';
  }

  /**
   * 將 rawDraft 解析並回寫進 {frontmatter, body} 模型。
   * 成功回傳 true 並清空訊息；失敗回傳 false 並設定錯誤訊息（不切換分頁、不改模型）。
   * 為 applySource / SEO 分頁切換 / save() 三條路徑共用的唯一真相來源，
   * 確保原始碼分頁的編輯只會被「套用進模型」或「以解析錯誤擋下」，不會被默默丟棄。
   */
  function commitSourceDraft() {
    try {
      const d = parse(rawDraft);
      frontmatter = d.frontmatter;
      body = d.body;
      message = '';
      return true;
    } catch (e) {
      message = `原始碼 frontmatter 有誤：${e instanceof Error ? e.message : e}，請先修正`;
      return false;
    }
  }

  function applySource() {
    if (commitSourceDraft()) tab = 'seo';
  }

  function goSeoTab() {
    // 由原始碼分頁切回 SEO 前，先套用草稿；解析失敗則留在原始碼分頁顯示錯誤。
    if (tab === 'source') {
      if (commitSourceDraft()) tab = 'seo';
      return;
    }
    tab = 'seo';
  }

  async function save() {
    // 原始碼分頁直接按儲存時，先把 rawDraft 套回模型；解析失敗則中止存檔（不推送）。
    if (tab === 'source' && !commitSourceDraft()) {
      status = 'error';
      return;
    }
    // 送出前的輕量 frontmatter 護欄（擋掉會讓 build 失敗的格式錯誤）
    let content;
    try {
      content = serialize({ frontmatter, body });
    } catch (e) {
      status = 'error';
      message = `frontmatter 格式有誤：${e instanceof Error ? e.message : e}。請修正後再存。`;
      return;
    }
    status = 'saving';
    try {
      const code = await putFile({
        path: repoPath,
        content,
        sha,
        message: `content: ${sha ? '前台編輯' : '前台新增'} ${slug}`,
        token: getToken(),
      });
      const outcome = classifySave(code);
      message = outcome.message;
      status = outcome.state === 'success' ? 'done' : 'error';
    } catch {
      const o = classifySave(0); // 視為 network
      message = o.message;
      status = 'error';
    }
  }

  async function reload() {
    const file = await getFile(repoPath, getToken());
    const doc = parse(file.content);
    frontmatter = doc.frontmatter;
    body = doc.body;
    sha = file.sha;
    status = 'ready';
    message = '';
  }
</script>

<div class="et-overlay" role="dialog" aria-modal="true">
  <div class="et-panel">
    <header>
      <strong>編輯：{slug}</strong>
      <nav>
        <button onclick={goSeoTab} disabled={tab === 'seo'}>SEO 欄位</button>
        <button onclick={enterSource} disabled={tab === 'source'}>原始碼</button>
      </nav>
      <button onclick={onclose} aria-label="關閉">✕</button>
    </header>

    {#if status === 'loading'}<p>載入中…</p>{/if}

    {#if status !== 'loading' && tab === 'seo'}
      <SeoFields {collection} {frontmatter} onchange={(fm) => (frontmatter = fm)} />
      <label class="et-body"><span>正文</span>
        <textarea bind:value={body} spellcheck="false"></textarea>
      </label>
      {#if AI_ENABLED}
        <div class="et-ai">
          <button onclick={() => suggest('improve')}>AI 潤飾正文</button>
          <button onclick={() => suggest('summarize')}>AI 摘要</button>
          {#if suggestion}
            <pre class="et-ai-out">{suggestion}</pre>
            <button onclick={acceptSuggestion}>採用為正文</button>
          {/if}
        </div>
      {/if}
    {/if}

    {#if tab === 'source'}
      <textarea class="et-source" bind:value={rawDraft} spellcheck="false"></textarea>
      <button onclick={applySource}>套用原始碼</button>
    {/if}

    {#if tab === 'seo' && lintResults.length > 0}
      <ul class="et-lint" aria-label="內容檢查建議">
        {#each lintResults as r}
          <li class="et-lint-{r.level}">
            <span class="et-lint-level">{r.level}</span>
            <span class="et-lint-msg">{r.message}{#if r.field} <code>({r.field})</code>{/if}</span>
            {#if r.fix}<span class="et-lint-fix">建議：{r.fix}</span>{/if}
          </li>
        {/each}
      </ul>
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
  .et-panel { background: #fff; margin: auto; width: min(900px, 94vw); height: 90vh; display: flex; flex-direction: column; border-radius: 12px; padding: 1rem; overflow: hidden; }
  .et-panel header, .et-panel footer { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .et-panel nav { display: flex; gap: .25rem; }
  .et-panel textarea { width: 100%; font-family: ui-monospace, monospace; font-size: .9rem; }
  .et-body { display: flex; flex-direction: column; gap: .25rem; flex: 1; margin: .75rem 0; min-height: 0; }
  .et-body textarea { flex: 1; min-height: 8rem; }
  .et-source { flex: 1; min-height: 12rem; margin: .75rem 0; }
  .et-msg { color: var(--color-ink, #222); background: #f5f5f5; padding: .5rem .75rem; border-radius: 8px; }
  .et-ai { display: flex; flex-wrap: wrap; align-items: flex-start; gap: .5rem; margin-bottom: .5rem; }
  .et-ai-out { flex: 1 1 100%; white-space: pre-wrap; background: #f5f5f5; padding: .5rem .75rem; border-radius: 8px; margin: 0; font-family: inherit; }
  .et-lint { list-style: none; margin: 0 0 .5rem; padding: 0; display: flex; flex-direction: column; gap: .25rem; max-height: 8rem; overflow: auto; font-size: .85rem; }
  .et-lint li { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; padding: .35rem .5rem; border-radius: 6px; background: #f7f7f7; }
  .et-lint-level { font-weight: 700; text-transform: uppercase; font-size: .7rem; letter-spacing: .03em; }
  .et-lint-error .et-lint-level { color: #c0392b; }
  .et-lint-warn .et-lint-level { color: #b8860b; }
  .et-lint-info .et-lint-level { color: #555; }
  .et-lint-error { border-left: 3px solid #c0392b; }
  .et-lint-warn { border-left: 3px solid #e0a800; }
  .et-lint-info { border-left: 3px solid #bbb; }
  .et-lint-fix { color: #555; flex: 1 1 100%; }
</style>
