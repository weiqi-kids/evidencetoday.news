<script>
  import { onDestroy } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { slugFromTitle } from '@/utils/editor/slugify';
  import { createArticleIssue } from '@/utils/editor/issue';
  import { fileExists } from '@/utils/editor/github';
  import EditorPanel from './EditorPanel.svelte';

  const COLLECTIONS = [
    { value: 'articles', label: '健康文章' },
    { value: 'myths', label: '迷思查證' },
    { value: 'ingredients', label: '成分解析' },
    { value: 'podcasts', label: 'Podcast' },
    { value: 'videos', label: '短影音' },
    { value: 'news', label: '趨勢新聞' },
  ];
  let collection = $state('articles');
  let title = $state('');
  let customSlug = $state('');
  let showAdvanced = $state(false);
  let direction = $state('');
  let sources = $state('');
  let conclusion = $state('');

  let open = $state(false);
  let initialDoc = $state(null);
  let repoPath = $state('');
  let slug = $state('');

  let taskState = $state(''); // '' | 'pending'
  let issueNumber = $state(0);
  let issueUrl = $state('');
  let taskRepoPath = '';
  let polling = false;
  let pollTimer = null;

  // 決定 slug：自訂有值須合法；否則自動拼音。不合法回 null（已 alert）。
  function resolveSlug() {
    if (!title.trim()) { alert('請先填標題'); return null; }
    const c = customSlug.trim();
    if (c) {
      if (!/^[a-z0-9-]+$/.test(c)) { alert('自訂網址只能用小寫英文、數字與連字號，例如 vitamin-c-myth'); return null; }
      return c;
    }
    return slugFromTitle(title.trim());
  }

  function start() {
    const s = resolveSlug();
    if (!s) return;
    slug = s;
    repoPath = `src/content/${collection}/${slug}.mdx`;
    // 只帶最小必填（標題 + 發佈日期）；其餘欄位在編輯器表單/進階 YAML 補齊，
    // 由 content.schemas 的 Zod gate 把關（每個集合必填欄位不同，不在此硬塞）。
    initialDoc = {
      frontmatter: { title: title.trim(), publishDate: new Date().toISOString().slice(0, 10) },
      body: '',
    };
    open = true;
  }

  async function createTask() {
    const s = resolveSlug();
    if (!s) return;
    slug = s;
    taskRepoPath = `src/content/${collection}/${slug}.mdx`;
    try {
      const issue = await createArticleIssue({ collection, title: title.trim(), slug, direction, sources, conclusion, token: getToken() });
      issueNumber = issue.number;
      issueUrl = issue.url;
      taskState = 'pending';
      startTaskPoll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function stopTaskPoll() {
    polling = false;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function startTaskPoll() {
    polling = true;
    const tick = async () => {
      if (!polling) return;
      try {
        if (await fileExists(taskRepoPath, getToken())) {
          stopTaskPoll();
          // 檔案出現 → 自動開編輯器（EDIT 模式載入 AI 寫好的內容）
          repoPath = taskRepoPath;
          initialDoc = null;
          taskState = '';
          open = true;
          return;
        }
      } catch {
        // 單次失敗忽略，繼續輪詢
      }
      if (polling) pollTimer = setTimeout(tick, 15000);
    };
    pollTimer = setTimeout(tick, 15000);
  }

  function closeTask() {
    stopTaskPoll();
    taskState = '';
  }

  onDestroy(stopTaskPoll);
</script>

{#if getToken()}
  {#if open}
    <EditorPanel {repoPath} {collection} {slug} {initialDoc} onclose={() => (open = false)} />
  {:else if taskState === 'pending'}
    <section class="et-new">
      <h2>AI 寫作任務</h2>
      <p class="et-task-msg">✍️ 已建立寫作任務（Issue #{issueNumber}，進行中）…</p>
      <p class="et-new-note">
        你可以<strong>關閉</strong>這個視窗（任務會繼續；文章寫好後到該網址用「編輯」鈕修改即可），
        或<strong>留著等候</strong>——完成後會自動開啟編輯畫面。
        <a href={issueUrl} target="_blank" rel="noopener noreferrer">查看 Issue →</a>
      </p>
      <button class="et-create" onclick={closeTask}>關閉</button>
    </section>
  {:else}
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

      <button type="button" class="et-adv-toggle" onclick={() => (showAdvanced = !showAdvanced)}>
        {showAdvanced ? '▾' : '▸'} 進階選項
      </button>
      {#if showAdvanced}
        <label>
          <span>自訂網址（slug）</span>
          <input placeholder="留空則由標題自動產生" bind:value={customSlug} />
          <small>選填；只能用小寫英文、數字、連字號。留空會自動以標題拼音產生。</small>
        </label>
        <fieldset class="et-ai-task">
          <legend>AI 代寫（選填，交給 Claude Code 撰寫）</legend>
          <label><span>寫作方向</span><textarea bind:value={direction}></textarea></label>
          <label><span>參考資料源</span><textarea bind:value={sources}></textarea></label>
          <label><span>想表達的結論</span><textarea bind:value={conclusion}></textarea></label>
          <button class="et-create" onclick={createTask}>建立 AI 寫作任務</button>
        </fieldset>
      {/if}

      <button class="et-create" onclick={start}>建立並編輯</button>
    </section>
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
  .et-new h2 { font-size: var(--text-h3); margin: 0; }
  .et-new label { display: flex; flex-direction: column; gap: 0.25rem; }
  .et-new span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .et-new small,
  .et-new-note { font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .et-new-note { margin: 0; }
  .et-task-msg { margin: 0; font-family: var(--font-ui); font-weight: 700; color: var(--color-teal); }
  .et-new :is(input, select, textarea) {
    font-family: var(--font-ui);
    font-size: var(--text-body);
    color: var(--color-ink);
    background: white;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.65rem;
  }
  .et-new textarea { min-height: 3.5rem; resize: vertical; }
  .et-new :is(input, select, textarea):focus-visible { outline: 2px solid var(--color-teal); outline-offset: 1px; }
  .et-adv-toggle {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0.25rem 0;
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: var(--color-teal);
    cursor: pointer;
  }
  .et-ai-task {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-sm);
    padding: 0.75rem;
    margin: 0;
  }
  .et-ai-task legend { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; padding: 0 0.4rem; }
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
  .et-create:hover { background: var(--color-teal-hover); border-color: var(--color-teal-hover); }
  .et-create:focus-visible { outline: 2px solid var(--color-coral); outline-offset: 2px; }
</style>
