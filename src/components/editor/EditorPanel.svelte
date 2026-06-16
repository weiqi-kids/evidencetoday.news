<script>
  import { onMount, onDestroy } from 'svelte';
  import { latestDeployRun } from '@/utils/editor/deploy-status';
  import { getToken } from '@/utils/editor/token';
  import { getFile } from '@/utils/editor/github';
  import { commitFiles } from '@/utils/editor/git-commit';
  import { imageUploadName, b64ToBlob, blobToBase64 } from '@/utils/editor/image-upload';
  import { compressImage } from '@/utils/editor/image-compress';
  import { resetGenSession, unusedGenerated } from '@/utils/editor/gen-session';
  import { parse, serialize } from '@/utils/editor/mdx-doc';
  import { classifySave } from '@/utils/editor/save-machine';
  import { lint } from '@/utils/editor/lint';
  import { validateFrontmatter } from '@/content.schemas';
  import SeoFields from './SeoFields.svelte';
  import BodyEditor from './BodyEditor.svelte';

  let { repoPath, collection, slug, onclose, initialDoc = null } = $props();

  // 待提交檔案（生成/上傳的圖）：存檔時與 .mdx 打包成單一 commit。
  // 存檔時只挑「實際被引用」的（過濾掉 re-roll/換掉的孤兒圖）。
  let pendingFiles = $state([]); // { path, base64, publicUrl }
  function addPending(entry) { pendingFiles = [...pendingFiles, entry]; }

  // C：本階段生成圖記錄；關閉前問是否保留未選用的到圖庫（避免付費生成被丟掉）
  resetGenSession();
  let showKeep = $state(false);
  let keepList = $state([]); // { id, b64, mime, previewUrl, keep }
  let archiving = $state(false);
  let keepError = $state('');

  function attemptClose() {
    const u = unusedGenerated();
    if (!u.length) { onclose(); return; }
    keepList = u.map((i) => ({ ...i, previewUrl: `data:${i.mime};base64,${i.b64}`, keep: true }));
    showKeep = true;
  }

  async function archiveAndClose() {
    const chosen = keepList.filter((k) => k.keep);
    if (!chosen.length) { onclose(); return; }
    archiving = true; keepError = '';
    try {
      const files = [];
      for (let i = 0; i < chosen.length; i++) {
        const compressed = await compressImage(b64ToBlob(chosen[i].b64, chosen[i].mime), { maxWidth: 1280, mime: 'image/webp', quality: 0.82 });
        const name = imageUploadName('gen', compressed.type, Date.now() + i);
        files.push({ path: `public/generated/${name}`, content: await blobToBase64(compressed), encoding: 'base64' });
      }
      const r = await commitFiles({ files, message: `content: 歸檔 ${files.length} 張 AI 生成圖`, token: getToken() });
      if (!r.ok) { keepError = `歸檔失敗（${r.status}），可重試，或按「不保留，直接關閉」`; archiving = false; return; }
      onclose();
    } catch (e) {
      keepError = e instanceof Error ? e.message : String(e);
      archiving = false;
    }
  }

  // AI 建議功能開關：刻意關閉（線上即時潤飾會計費，使用者選擇不啟用）。
  // 要開啟：設好 ai-suggest worker 的 ANTHROPIC_API_KEY secret 後改為 true。
  const AI_ENABLED = false;
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
  let loaded = $state(!!initialDoc); // 內容是否已載入；lint 與表單只在載好後才顯示
  let message = $state('');
  let saveError = $state(''); // 存檔前 Zod 欄位驗證未過時的錯誤訊息（擋存檔）

  // 部署輪詢：存檔成功後若視窗未關，輪詢 deploy 直到上線
  let deployState = $state(''); // '' | 'pending' | 'live' | 'failed'
  let preRunId = null; // 存檔前的最新 deploy run id（baseline）
  let pollTimer = null;
  let polling = false;

  // 即時 lint 警告（純函式、不擋存檔，僅供作者參考）
  let lintResults = $derived(lint({ collection, frontmatter, body }));

  function stopDeployPoll() {
    polling = false;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function startDeployPoll() {
    if (preRunId == null) return; // 拿不到 baseline（無權限等）→ 不輪詢，退回時間提示
    deployState = 'pending';
    polling = true;
    const tick = async () => {
      if (!polling) return;
      try {
        const r = await latestDeployRun(getToken());
        if (r && r.id !== preRunId && r.status === 'completed') {
          deployState = r.conclusion === 'success' ? 'live' : 'failed';
          stopDeployPoll();
          return;
        }
      } catch {
        // 單次失敗忽略，繼續輪詢
      }
      if (polling) pollTimer = setTimeout(tick, 15000);
    };
    pollTimer = setTimeout(tick, 15000);
  }

  onDestroy(stopDeployPoll);

  // 開啟編輯器時鎖住背景捲動，避免滾輪事件穿透到底層文章頁
  onMount(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  });

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
      loaded = true;
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
   * 為 applySource / SEO 分頁切換 / save() 三條路徑共用的唯一真相來源。
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
    if (tab === 'source') {
      if (commitSourceDraft()) tab = 'seo';
      return;
    }
    tab = 'seo';
  }

  async function save() {
    saveError = ''; // 每次嘗試存檔先清掉前一次的驗證錯誤
    // 原始碼分頁直接按儲存時，先把 rawDraft 套回模型；解析失敗則中止存檔（不推送）。
    if (tab === 'source' && !commitSourceDraft()) {
      status = 'error';
      return;
    }
    // 存檔前 Zod 欄位驗證 gate（與 content.config 同一份 schema）：未過則顯示錯誤並中止存檔。
    const _v = validateFrontmatter(collection, frontmatter);
    if (!_v.ok) {
      saveError = '欄位驗證未過：' + _v.errors.map((e) => `${e.path} ${e.message}`).join('；');
      status = 'error';
      return; // 不存檔
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
    // 記下存檔前的最新 deploy run，作為「之後出現的新 run 才是這次的」基準
    try {
      const base = await latestDeployRun(getToken());
      preRunId = base?.id ?? null;
    } catch {
      preRunId = null;
    }
    status = 'saving';
    try {
      // 只打包「實際被內容引用」的待提交圖（過濾掉 re-roll / 換掉的孤兒）
      const usedPending = pendingFiles.filter((p) => content.includes(p.publicUrl));
      const files = [
        ...usedPending.map((p) => ({ path: p.path, content: p.base64, encoding: 'base64' })),
        { path: repoPath, content, encoding: 'utf-8' },
      ];
      const n = usedPending.length;
      const result = await commitFiles({
        files,
        message: `content: ${sha ? '前台編輯' : '前台新增'} ${slug}${n ? `（含 ${n} 張圖）` : ''}`,
        token: getToken(),
      });
      // Git Data API 的非 fast-forward 是 422 → 比照 409 衝突訊息
      const outcome = classifySave(result.ok ? 200 : result.status === 422 ? 409 : result.status);
      message = outcome.message;
      status = outcome.state === 'success' ? 'done' : 'error';
      if (status === 'done') {
        pendingFiles = []; // 成功後清空
        startDeployPoll();
      }
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
  {#if showKeep}
    <div class="et-keep">
      <div class="et-keep-card">
        <h3>要保留生成的圖嗎？</h3>
        <p>你這次生成了 {keepList.length} 張還沒用到的圖。勾選要<strong>保留到圖庫</strong>（之後可重用）的，其餘關閉後丟棄。</p>
        <div class="et-keep-grid">
          {#each keepList as k}
            <label class="et-keep-cell" class:on={k.keep}>
              <img src={k.previewUrl} alt="生成圖" />
              <input type="checkbox" bind:checked={k.keep} />
            </label>
          {/each}
        </div>
        {#if keepError}<p class="et-keep-err">{keepError}</p>{/if}
        <div class="et-keep-actions">
          <button class="et-keep-discard" onclick={onclose} disabled={archiving}>不保留，直接關閉</button>
          <button class="et-keep-save" onclick={archiveAndClose} disabled={archiving}>{archiving ? '保留中…' : '保留勾選的並關閉'}</button>
        </div>
      </div>
    </div>
  {/if}
  <div class="et-panel">
    <header>
      <strong>編輯：{slug}</strong>
      <nav>
        <button onclick={goSeoTab} disabled={tab === 'seo'}>SEO 欄位</button>
        <button onclick={enterSource} disabled={tab === 'source'}>原始碼</button>
      </nav>
      <button onclick={attemptClose} aria-label="關閉">✕</button>
    </header>

    <div class="et-scroll">
      {#if status === 'loading'}<p class="et-loading">載入文章內容中…</p>{/if}

      {#if status !== 'loading' && tab === 'seo'}
        <SeoFields {collection} {frontmatter} {slug} {body} {addPending} onchange={(fm) => (frontmatter = fm)} />
        <div class="et-body">
          <span>內文</span>
          <BodyEditor value={body} {slug} title={frontmatter.title ?? ''} {addPending} onchange={(md) => (body = md)} />
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

      {#if tab === 'seo' && loaded && lintResults.length > 0}
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
          {#if deployState === 'live'}
            <p class="et-done-msg">✅ 已上線！重新整理文章頁就能看到新內容。</p>
            <p class="et-done-sub">可以關閉這個視窗了。</p>
          {:else if deployState === 'failed'}
            <p class="et-done-msg et-done-fail">⚠ 已存檔，但部署失敗。</p>
            <p class="et-done-sub">
              請<a href="https://github.com/weiqi-kids/evidencetoday.news/actions" target="_blank" rel="noopener noreferrer">查看部署進度</a>了解原因，或聯絡網站工程師。
            </p>
          {:else if deployState === 'pending'}
            <p class="et-done-msg">✓ 已存檔，部署中…</p>
            <p class="et-done-sub">
              完成後這裡會自動顯示「已上線」（約 1–2 分鐘）。你也可以直接關閉，網站會在背景更新。
              <a href="https://github.com/weiqi-kids/evidencetoday.news/actions" target="_blank" rel="noopener noreferrer">查看部署進度 →</a>
            </p>
          {:else}
            <p class="et-done-msg">✓ 已存檔並送出更新。可以關閉這個視窗了。</p>
            <p class="et-done-sub">
              網站約 1–2 分鐘後更新，屆時重新整理文章頁即可看到新內容。
              <a href="https://github.com/weiqi-kids/evidencetoday.news/actions" target="_blank" rel="noopener noreferrer">查看部署進度 →</a>
            </p>
          {/if}
          <div class="et-done-actions">
            <button class="et-primary" onclick={attemptClose}>關閉</button>
            <button onclick={() => { stopDeployPoll(); deployState = ''; status = 'ready'; message = ''; }}>繼續編輯</button>
          </div>
        </div>
      {/if}
    </div>

    {#if status !== 'done'}
      <div class="et-foot">
        {#if message}<p class="et-msg">{message}</p>{/if}
        {#if saveError}<p class="et-msg et-save-error">{saveError}</p>{/if}
        <footer>
          <button class="et-primary" onclick={save} disabled={status === 'saving' || status === 'loading'}>儲存</button>
          <button onclick={reload}>重新載入最新版</button>
        </footer>
      </div>
    {/if}
  </div>
</div>

<style>
  .et-overlay { position: fixed; inset: 0; background: oklch(0 0 0 / 0.5); z-index: 60; display: flex; }
  /* C：關閉前的「保留生成圖」對話框 */
  .et-keep { position: absolute; inset: 0; z-index: 70; background: oklch(0 0 0 / 0.4); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .et-keep-card { background: white; border-radius: var(--radius-card); padding: 1.25rem; width: 100%; max-width: 680px; max-height: 85vh; overflow: auto; }
  .et-keep-card h3 { margin: 0 0 0.5rem; font-family: var(--font-ui); }
  .et-keep-card p { margin: 0 0 0.75rem; font-family: var(--font-ui); font-size: var(--text-meta); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .et-keep-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
  .et-keep-cell { position: relative; border: 2px solid transparent; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; line-height: 0; }
  .et-keep-cell.on { border-color: var(--color-coral); }
  .et-keep-cell img { width: 100%; height: 110px; object-fit: cover; display: block; }
  .et-keep-cell input { position: absolute; top: 6px; left: 6px; width: 18px; height: 18px; }
  .et-keep-err { color: var(--color-coral); font-family: var(--font-ui); font-size: var(--text-meta); }
  .et-keep-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
  .et-keep-discard { font-family: var(--font-ui); padding: 0.5rem 1rem; border: 1px solid var(--color-fog); border-radius: var(--radius-pill); background: white; cursor: pointer; }
  .et-keep-save { font-family: var(--font-ui); font-weight: 600; padding: 0.5rem 1.2rem; border: none; border-radius: var(--radius-pill); background: var(--color-teal); color: white; cursor: pointer; }
  .et-keep-save:disabled, .et-keep-discard:disabled { opacity: 0.6; cursor: default; }
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
  /* 中段內容捲動區：表單超出時在面板內捲動，overscroll-behavior:contain 阻止滾輪
     穿透到底層文章頁（搭配 onMount 的 body scroll lock 雙保險） */
  .et-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0.4rem 0.5rem 0;
  }
  .et-foot {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.6rem;
    margin-top: 0.4rem;
    border-top: 1px solid var(--color-fog);
  }
  .et-body { display: flex; flex-direction: column; gap: 0.25rem; min-height: 0; }
  .et-body span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .et-body textarea { min-height: 8rem; }
  .et-source { flex: 1; min-height: 16rem; }
  .et-msg {
    color: var(--color-ink);
    background: var(--color-teal-subtle);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: var(--text-meta);
  }
  .et-save-error {
    color: var(--color-coral);
    background: color-mix(in oklch, var(--color-coral) 12%, white);
    font-weight: 600;
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
  .et-loading {
    margin: 0.75rem 0;
    font-family: var(--font-ui);
    color: color-mix(in oklch, var(--color-ink) 70%, var(--color-paper));
  }
  .et-done-msg {
    margin: 0;
    font-family: var(--font-ui);
    font-weight: 700;
    color: var(--color-teal);
  }
  .et-done-fail { color: var(--color-coral); }
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
