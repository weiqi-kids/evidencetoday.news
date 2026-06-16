<script>
  import { getToken } from '@/utils/editor/token';
  import { b64ToBlob } from '@/utils/editor/image-upload';
  import { AI_WORKER as WORKER } from '@/utils/editor/ai-worker';
  import { addGenerated, markGenUsed } from '@/utils/editor/gen-session';
  import { asset } from '@/utils/url';
  import { listRepoImages } from '@/utils/editor/list-images';

  // onpick(result)：
  //   生成 → { source:'generated', blob, mime, previewUrl }
  //   圖庫 → { source:'stock', url, credit, creditUrl }
  //   上傳 → { source:'uploaded', blob, mime, previewUrl }
  //   既有 → { source:'library', url }
  // size：'landscape'（封面預設）| 'square' | 'portrait'
  // title/body：給「AI 找圖庫」推關鍵字；exclude：已用過的圖庫圖 id（去重）
  let { initialPrompt = '', size = 'landscape', title = '', body = '', exclude = [], onpick, onclose } = $props();

  let tab = $state('generate'); // generate | stock | upload | library
  let prompt = $state(initialPrompt);
  let model = $state('openai'); // 'openai'（gpt-image）| 'flux'
  let busy = $state(false);
  let error = $state('');
  let elapsed = $state(0); // 生成已耗秒數（給回饋，gpt-image 約 20–40 秒）
  // 生成候選累加（re-roll 比較用）；selected 指向其中一張
  let candidates = $state([]); // { b64, mime, previewUrl }
  let selected = $state(null);
  let genCount = $derived(candidates.length);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 非同步生圖：POST /generate-async 拿 jobId → 每 3 秒輪詢 /generate-status 取件。
  // 瀏覽器不再開著長連線苦等，所以不會「Failed to fetch」；慢只是顯示「生成中…Ns」。
  async function generate() {
    if (!prompt.trim()) { error = '請先輸入或調整描述（prompt）'; return; }
    const token = getToken();
    if (!token) { error = '請先登入管理者帳號再生圖'; return; }
    if (genCount >= 10 && !confirm(`本次已生成 ${genCount} 張（每張都會計費），確定再生一張？`)) return;
    busy = true; error = ''; elapsed = 0;
    const timer = setInterval(() => { elapsed += 1; }, 1000);
    try {
      // 1) 啟動工單（很快回 jobId）
      const startRes = await fetch(`${WORKER}/generate-async`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, model, size }),
      });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.jobId) throw new Error(startData.error || `啟動失敗（${startRes.status}）`);
      const jobId = startData.jobId;

      // 2) 輪詢取件（最多 4 分鐘）
      const deadline = Date.now() + 240000;
      while (true) {
        await sleep(3000);
        const stRes = await fetch(`${WORKER}/generate-status?id=${encodeURIComponent(jobId)}`);
        const st = await stRes.json().catch(() => ({}));
        if (st.status === 'done') {
          const cand = { b64: st.b64, mime: st.mime, previewUrl: `data:${st.mime};base64,${st.b64}` };
          candidates = [...candidates, cand];
          selected = cand;
          addGenerated(st.b64, st.mime, crypto.randomUUID()); // C：記下這張，關閉前問是否保留
          break;
        }
        if (st.status === 'error') throw new Error(st.error || '生成失敗');
        // 'pending' 或 'unknown'（KV 傳播延遲）都繼續等，直到截止
        if (Date.now() > deadline) throw new Error('生成逾時（超過 4 分鐘），請重試或改用 Flux。');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      clearInterval(timer);
      busy = false;
    }
  }

  function use() {
    if (!selected) return;
    markGenUsed(selected.b64); // C：選用了 → 不再提示歸檔（會隨文章存檔）
    onpick?.({ source: 'generated', blob: b64ToBlob(selected.b64, selected.mime), mime: selected.mime, previewUrl: selected.previewUrl });
  }

  // ── AI 找圖庫 ──
  let keywords = $state('');
  let stockBusy = $state(false);
  let stockError = $state('');
  let photos = $state([]); // { id, provider, thumb, full, credit, creditUrl }
  let stockSel = $state(null);

  async function searchStock() {
    if (!keywords.trim()) { stockError = '請先輸入關鍵字或按「依本文找圖」'; return; }
    const token = getToken();
    if (!token) { stockError = '請先登入管理者帳號'; return; }
    stockBusy = true; stockError = ''; photos = []; stockSel = null;
    try {
      const res = await fetch(`${WORKER}/stock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ keywords, exclude }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `搜尋失敗（${res.status}）`);
      photos = data.photos ?? [];
      if (!photos.length) stockError = '找不到（未用過的）圖，試試別的關鍵字';
    } catch (e) {
      stockError = e instanceof Error ? e.message : String(e);
    } finally {
      stockBusy = false;
    }
  }

  async function autoKeywords() {
    const token = getToken();
    if (!token) { stockError = '請先登入管理者帳號'; return; }
    stockBusy = true; stockError = '';
    try {
      const res = await fetch(`${WORKER}/keywords`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `關鍵字產生失敗（${res.status}）`);
      keywords = data.keywords ?? '';
      await searchStock();
    } catch (e) {
      stockError = e instanceof Error ? e.message : String(e);
      stockBusy = false;
    }
  }

  function useStock() {
    if (!stockSel) return;
    onpick?.({ source: 'stock', url: stockSel.full, credit: stockSel.credit, creditUrl: stockSel.creditUrl });
  }

  // ── 上傳 ──
  let upBlob = $state(null);
  let upPreview = $state('');
  function onFile(e) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    upBlob = f;
    upPreview = URL.createObjectURL(f);
  }
  function useUpload() {
    if (!upBlob) return;
    onpick?.({ source: 'uploaded', blob: upBlob, mime: upBlob.type, previewUrl: upPreview });
  }

  // ── 圖庫（既有 repo 圖）──
  let libBusy = $state(false);
  let libError = $state('');
  let libImages = $state([]); // { name, dir, path }
  let libSel = $state(null);
  let libLoaded = false;
  async function loadLibrary() {
    if (libLoaded) return;
    const token = getToken();
    if (!token) { libError = '請先登入管理者帳號'; return; }
    libBusy = true; libError = '';
    try {
      libImages = await listRepoImages(token);
      libLoaded = true;
      if (!libImages.length) libError = '圖庫沒有圖片';
    } catch (e) {
      libError = e instanceof Error ? e.message : String(e);
    } finally {
      libBusy = false;
    }
  }
  function gotoLib() {
    tab = 'library';
    loadLibrary();
  }
  function useLibrary() {
    if (!libSel) return;
    onpick?.({ source: 'library', url: libSel.path });
  }
</script>

<div class="ip-overlay" role="dialog" aria-modal="true">
  <div class="ip-panel">
    <header class="ip-head">
      <strong>選擇圖片</strong>
      <nav class="ip-tabs">
        <button class:active={tab === 'generate'} onclick={() => (tab = 'generate')}>AI 生成</button>
        <button class:active={tab === 'stock'} onclick={() => (tab = 'stock')}>AI 找圖庫</button>
        <button class:active={tab === 'upload'} onclick={() => (tab = 'upload')}>上傳</button>
        <button class:active={tab === 'library'} onclick={gotoLib}>圖庫</button>
      </nav>
      <button class="ip-x" onclick={onclose} aria-label="關閉">✕</button>
    </header>

    {#if tab === 'generate'}
      <div class="ip-gen">
        <label class="ip-field">
          <span>描述（prompt）</span>
          <textarea bind:value={prompt} rows="3" placeholder="描述你想要的畫面，例如：簡約編輯風插畫，沉穩色調，無文字"></textarea>
        </label>
        <div class="ip-controls">
          <label class="ip-model">
            <span>模型</span>
            <select bind:value={model}>
              <option value="openai">OpenAI</option>
              <option value="flux">Flux</option>
            </select>
          </label>
          <button class="ip-gen-btn" onclick={generate} disabled={busy}>
            {busy ? `生成中…${elapsed}s` : genCount ? '再畫一張' : '生成'}
          </button>
          {#if genCount && !busy}<span class="ip-count">本次已生成 {genCount} 張</span>{/if}
        </div>

        {#if busy}
          <p class="ip-hint">{model === 'openai' ? 'OpenAI 畫質高但較慢，約需 20–40 秒，請稍候…' : 'Flux 生成中，通常數秒…'}</p>
        {/if}
        {#if error}<p class="ip-error">{error}</p>{/if}

        {#if candidates.length}
          {#if selected}<img class="ip-big" src={selected.previewUrl} alt="生成預覽" />{/if}
          {#if candidates.length > 1}
            <div class="ip-strip">
              {#each candidates as c, i}
                <button class="ip-thumb" class:sel={selected === c} onclick={() => (selected = c)} title="第 {i + 1} 張">
                  <img src={c.previewUrl} alt="候選 {i + 1}" />
                </button>
              {/each}
            </div>
          {/if}
          <div class="ip-actions">
            <button class="ip-use" onclick={use} disabled={!selected}>用這張</button>
          </div>
        {/if}
      </div>
    {/if}

    {#if tab === 'stock'}
      <div class="ip-gen">
        <div class="ip-controls">
          <label class="ip-field ip-grow">
            <span>關鍵字（英文）</span>
            <input bind:value={keywords} placeholder="例：vegetables healthy diet" onkeydown={(e) => e.key === 'Enter' && searchStock()} />
          </label>
          <button class="ip-gen-btn" onclick={autoKeywords} disabled={stockBusy}>依本文找圖</button>
          <button class="ip-tag-btn" onclick={searchStock} disabled={stockBusy}>{stockBusy ? '搜尋中…' : '搜尋'}</button>
        </div>
        <p class="ip-hint">圖片來自 Unsplash / Pexels（免費授權），已自動排除站上用過的圖；選定會標註攝影師。</p>

        {#if stockError}<p class="ip-error">{stockError}</p>{/if}

        {#if photos.length}
          <div class="ip-grid">
            {#each photos as ph}
              <button class="ip-cell" class:sel={stockSel === ph} onclick={() => (stockSel = ph)}>
                <img src={ph.thumb} alt={ph.credit} loading="lazy" />
                <span class="ip-credit">{ph.provider} · {ph.credit}</span>
              </button>
            {/each}
          </div>
          <div class="ip-actions">
            <button class="ip-use" onclick={useStock} disabled={!stockSel}>用這張</button>
          </div>
        {/if}
      </div>
    {/if}

    {#if tab === 'upload'}
      <div class="ip-gen">
        <label class="ip-field">
          <span>從電腦選擇圖片</span>
          <input type="file" accept="image/*" onchange={onFile} />
        </label>
        {#if upPreview}
          <img class="ip-up-preview" src={upPreview} alt="上傳預覽" />
          <div class="ip-actions">
            <button class="ip-use" onclick={useUpload}>用這張</button>
          </div>
        {/if}
      </div>
    {/if}

    {#if tab === 'library'}
      <div class="ip-gen">
        <p class="ip-hint">站上已上傳過的圖（generated / covers / images）。{#if libBusy}載入中…{/if}</p>
        {#if libError}<p class="ip-error">{libError}</p>{/if}
        {#if libImages.length}
          <div class="ip-grid">
            {#each libImages as im}
              <button class="ip-cell" class:sel={libSel === im} onclick={() => (libSel = im)} title={im.name}>
                <img src={asset(im.path)} alt={im.name} loading="lazy" />
                <span class="ip-credit">{im.dir}</span>
              </button>
            {/each}
          </div>
          <div class="ip-actions">
            <button class="ip-use" onclick={useLibrary} disabled={!libSel}>用這張</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .ip-overlay {
    position: fixed; inset: 0; z-index: 70;
    background: oklch(0 0 0 / 0.5);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .ip-panel {
    background: white; border-radius: var(--radius-card, 8px);
    width: min(720px, 100%); max-height: 90vh; overflow: auto;
    box-shadow: var(--shadow-card-hover, 0 10px 40px rgba(0, 0, 0, 0.3));
  }
  .ip-head { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-fog); }
  .ip-head strong { font-family: var(--font-ui); }
  .ip-tabs { display: flex; gap: 0.25rem; flex: 1; flex-wrap: wrap; }
  .ip-tabs button { font-family: var(--font-ui); font-size: var(--text-meta); padding: 0.3rem 0.7rem; border: 1px solid var(--color-fog); border-radius: var(--radius-pill); background: white; cursor: pointer; }
  .ip-tabs button.active { background: var(--color-ink); color: white; border-color: var(--color-ink); }
  .ip-x { border: none; background: none; font-size: 1.1rem; cursor: pointer; color: var(--color-ink); }
  .ip-gen { padding: 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
  .ip-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .ip-field span, .ip-model span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .ip-gen textarea, .ip-gen input[type="text"], .ip-gen input:not([type]) { width: 100%; box-sizing: border-box; font-family: var(--font-ui); font-size: var(--text-body); border: 1px solid var(--color-fog); border-radius: var(--radius-sm); padding: 0.5rem 0.65rem; resize: vertical; }
  .ip-controls { display: flex; align-items: end; gap: 0.75rem; flex-wrap: wrap; }
  .ip-model { display: flex; flex-direction: column; gap: 0.3rem; }
  .ip-model select { font-family: var(--font-ui); padding: 0.45rem 0.6rem; border: 1px solid var(--color-fog); border-radius: var(--radius-sm); }
  .ip-gen-btn { font-family: var(--font-ui); font-weight: 600; padding: 0.5rem 1.1rem; border: none; border-radius: var(--radius-pill); background: var(--color-teal); color: white; cursor: pointer; }
  .ip-gen-btn:disabled { opacity: 0.6; cursor: default; }
  .ip-count { font-family: var(--font-ui); font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .ip-error { color: var(--color-coral); font-family: var(--font-ui); font-size: var(--text-meta); margin: 0; white-space: pre-wrap; }
  .ip-strip { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .ip-thumb { border: 2px solid transparent; border-radius: var(--radius-sm); padding: 0; cursor: pointer; background: none; line-height: 0; overflow: hidden; }
  .ip-thumb.sel { border-color: var(--color-coral); }
  .ip-thumb img { width: 140px; height: 94px; object-fit: cover; display: block; }
  .ip-actions { display: flex; justify-content: flex-end; }
  .ip-use { font-family: var(--font-ui); font-weight: 600; padding: 0.5rem 1.4rem; border: none; border-radius: var(--radius-pill); background: var(--color-coral); color: white; cursor: pointer; }
  .ip-use:disabled { opacity: 0.5; cursor: default; }

  /* AI 找圖庫 */
  .ip-grow { flex: 1; min-width: 0; }
  .ip-tag-btn { font-family: var(--font-ui); font-weight: 600; padding: 0.5rem 1.1rem; border: 1px solid var(--color-teal); border-radius: var(--radius-pill); background: white; color: var(--color-teal); cursor: pointer; }
  .ip-tag-btn:disabled { opacity: 0.6; cursor: default; }
  .ip-hint { margin: 0; font-family: var(--font-ui); font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .ip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-height: 50vh; overflow: auto; }
  .ip-cell { position: relative; border: 2px solid transparent; border-radius: var(--radius-sm); padding: 0; background: none; cursor: pointer; line-height: 0; overflow: hidden; }
  .ip-cell.sel { border-color: var(--color-coral); }
  .ip-cell img { width: 100%; height: 110px; object-fit: cover; display: block; }
  .ip-credit { position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 6px; font-family: var(--font-ui); font-size: 0.62rem; line-height: 1.3; color: white; background: linear-gradient(transparent, rgba(0,0,0,0.7)); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ip-up-preview { width: 100%; max-height: 300px; object-fit: contain; border: 1px solid var(--color-fog); border-radius: var(--radius-sm); background: color-mix(in oklch, var(--color-paper) 60%, white); }
  .ip-big { width: 100%; max-height: 46vh; object-fit: contain; border: 1px solid var(--color-fog); border-radius: var(--radius-sm); background: color-mix(in oklch, var(--color-paper) 60%, white); }
</style>
