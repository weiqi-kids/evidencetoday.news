<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { getFile, putFile } from '@/utils/editor/github';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';
  import { lint } from '@/utils/editor/lint';
  import SeoFields from './SeoFields.svelte';
  import BodyEditor from './BodyEditor.svelte';

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
      <div class="et-body">
        <span>正文</span>
        <BodyEditor value={body} {slug} onchange={(md) => (body = md)} />
      </div>
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

    {#if status === 'done'}
      <div class="et-done">
        <p class="et-done-msg">✓ 已存檔並送出更新。可以關閉這個視窗了。</p>
        <p class="et-done-sub">
          網站約 1–2 分鐘後更新，屆時重新整理文章頁即可看到新內容。
          <a href="https://github.com/weiqi-kids/evidencetoday.news/actions" target="_blank" rel="noopener noreferrer">查看部署進度 →</a>
        </p>
        <div class="et-done-actions">
          <button class="et-primary" onclick={onclose}>關閉</button>
          <button onclick={() => { status = 'ready'; message = ''; }}>繼續編輯</button>
        </div>
      </div>
    {:else}
      {#if message}<p class="et-msg">{message}</p>{/if}
      <footer>
        <button class="et-primary" onclick={save} disabled={status === 'saving' || status === 'loading'}>儲存</button>
        <button onclick={reload}>重新載入最新版</button>
      </footer>
    {/if}
  </div>
</div>

<style>
  .et-overlay { position: fixed; inset: 0; background: oklch(0 0 0 / 0.5); z-index: 60; display: flex; }
  .et-panel {
    background: color-mix(in oklch, var(--color-paper) 55%, white);
    color: var(--color-ink);
    margin: auto;
    width: min(900px, 94vw);
    height: 90vh;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-card);
    padding: clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
    overflow: hidden;
    box-shadow: var(--shadow-card-hover);
  }
  .et-panel header, .et-panel footer { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .et-panel header strong { font-family: var(--font-ui); font-size: var(--text-body); }
  .et-panel nav { display: flex; gap: 0.25rem; }

  .et-panel button {
    min-height: 44px;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: var(--color-ink);
    background: color-mix(in oklch, var(--color-paper) 40%, white);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .et-panel button:hover { background: var(--color-teal-subtle); }
  .et-panel button:focus-visible { outline: 2px solid var(--color-teal); outline-offset: 2px; }
  .et-panel button:disabled { opacity: 0.5; pointer-events: none; }
  .et-panel button.et-primary { background: var(--color-teal); border-color: var(--color-teal); color: white; }
  .et-panel button.et-primary:hover { background: var(--color-teal-hover); border-color: var(--color-teal-hover); }

  .et-panel textarea {
    width: 100%;
    font-family: ui-monospace, 'SFMono-Regular', monospace;
    font-size: var(--text-meta);
    color: var(--color-ink);
    background: white;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.65rem;
  }
  .et-panel textarea:focus-visible { outline: 2px solid var(--color-teal); outline-offset: 1px; }
  .et-body { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; margin: 0.75rem 0; min-height: 0; }
  .et-body span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .et-body textarea { flex: 1; min-height: 8rem; }
  .et-source { flex: 1; min-height: 12rem; margin: 0.75rem 0; }
  .et-msg {
    color: var(--color-ink);
    background: var(--color-teal-subtle);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: var(--text-meta);
  }
  .et-done {
    background: var(--color-teal-subtle);
    border: 1px solid color-mix(in oklch, var(--color-teal) 24%, var(--color-fog));
    border-radius: var(--radius-sm);
    padding: clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .et-done-msg {
    margin: 0;
    font-family: var(--font-ui);
    font-weight: 700;
    color: var(--color-teal);
  }
  .et-done-sub {
    margin: 0;
    font-size: var(--text-meta);
    color: color-mix(in oklch, var(--color-ink) 70%, var(--color-paper));
  }
  .et-done-sub a { color: var(--color-teal); font-weight: 600; white-space: nowrap; }
  .et-done-actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
  .et-ai { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
  .et-ai-out {
    flex: 1 1 100%;
    white-space: pre-wrap;
    background: var(--color-teal-subtle);
    color: var(--color-ink);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    margin: 0;
    font-family: inherit;
    font-size: var(--text-meta);
  }
  .et-lint {
    list-style: none;
    margin: 0 0 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 8rem;
    overflow: auto;
    font-size: var(--text-meta);
  }
  .et-lint li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    border-radius: var(--radius-sm);
    background: color-mix(in oklch, var(--color-paper) 60%, white);
  }
  .et-lint-level { font-weight: 700; text-transform: uppercase; font-size: var(--text-badge); letter-spacing: 0.03em; }
  .et-lint-error .et-lint-level { color: var(--color-verdict-false); }
  .et-lint-warn .et-lint-level { color: var(--color-verdict-contextual); }
  .et-lint-info .et-lint-level { color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .et-lint-error { border-left: 3px solid var(--color-verdict-false); }
  .et-lint-warn { border-left: 3px solid var(--color-verdict-contextual); }
  .et-lint-info { border-left: 3px solid var(--color-fog); }
  .et-lint-fix { color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); flex: 1 1 100%; }
</style>
