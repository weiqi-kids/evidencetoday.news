<script>
  import { onMount } from 'svelte';
  import yaml from 'js-yaml';
  import { getCoreFields, getCoverConfig, handledKeys } from '@/utils/editor/seo-schema';
  import { getToken } from '@/utils/editor/token';
  import { fetchSuggestedTags, mergeTags } from '@/utils/editor/tags-suggest';
  import CoverField from './CoverField.svelte';

  // frontmatter：完整物件；onchange(next) 回傳完整物件
  // body：內文（給 AI 推薦標籤）；addPending：登記待提交圖（封面圖選擇器用）
  let { collection, frontmatter, slug = '', body = '', addPending, onchange } = $props();

  const coreFields = getCoreFields(collection);
  const cover = getCoverConfig(collection);
  const HANDLED = handledKeys(collection);
  const fullFields = coreFields.filter((f) => f.full);
  const sideFields = coreFields.filter((f) => !f.full);

  // 進階 YAML：非 HANDLED key 的子物件，序列化成 YAML 字串供編輯
  function advObject(fm) {
    const o = {};
    for (const k of Object.keys(fm)) if (!HANDLED.includes(k)) o[k] = fm[k];
    return o;
  }
  let advText = $state(yaml.dump(advObject(frontmatter), { lineWidth: -1, forceQuotes: false }));
  let advError = $state('');

  function setCore(key, value) {
    onchange({ ...frontmatter, [key]: value });
  }
  function onAdvInput(text) {
    advText = text;
    try {
      const adv = text.trim() ? yaml.load(text) : {};
      advError = '';
      // 合併：保留 HANDLED key，覆寫其餘
      const kept = {};
      for (const k of HANDLED) if (k in frontmatter) kept[k] = frontmatter[k];
      onchange({ ...kept, ...(adv || {}) });
    } catch (e) {
      advError = 'YAML 格式錯誤：' + e.message;
    }
  }
  function tagsToText(v) { return Array.isArray(v) ? v.join(', ') : (v ?? ''); }
  function textToTags(t) { return t.split(',').map((s) => s.trim()).filter(Boolean); }

  // AI 推薦標籤
  let tagsBusy = $state(false);
  let tagsError = $state('');
  async function recommendTags() {
    const token = getToken();
    if (!token) { tagsError = '請先登入管理者帳號'; return; }
    tagsBusy = true; tagsError = '';
    try {
      const suggested = await fetchSuggestedTags({ title: frontmatter.title ?? '', body, token });
      setCore('tags', mergeTags(Array.isArray(frontmatter.tags) ? frontmatter.tags : [], suggested));
    } catch (e) {
      tagsError = e instanceof Error ? e.message : String(e);
    } finally {
      tagsBusy = false;
    }
  }
</script>

<div class="ef">
  <!-- 上方全寬：標題、長文摘要 -->
  {#each fullFields as f}
    <label class="ef-full">
      <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
      {#if f.type === 'textarea'}
        <textarea value={frontmatter[f.key] ?? ''} oninput={(e) => setCore(f.key, e.currentTarget.value)}></textarea>
      {:else}
        <input value={frontmatter[f.key] ?? ''} oninput={(e) => setCore(f.key, e.currentTarget.value)} />
      {/if}
      {#if f.maxLength}<small>{String(frontmatter[f.key] ?? '').length} / {f.maxLength}</small>{/if}
    </label>
  {/each}

  <!-- 中段左右兩欄：封面 + 其餘核心欄位 -->
  <div class="ef-cols">
    <div class="ef-left">
      <CoverField {frontmatter} {slug} {body} field={cover.field} altKey={cover.altKey} creditKey={cover.creditKey} {addPending} onchange={(fm) => onchange(fm)} />
    </div>

    <div class="ef-right">
      {#each sideFields as f}
        {#if f.type === 'tags'}
          <label>
            <span class="ef-tags-head">{f.label}
              <button type="button" class="ef-tag-ai" onclick={recommendTags} disabled={tagsBusy}>
                {tagsBusy ? '推薦中…' : '從內文推薦標籤'}
              </button>
            </span>
            <input value={tagsToText(frontmatter[f.key])} oninput={(e) => setCore(f.key, textToTags(e.currentTarget.value))} placeholder="逗號分隔" />
            {#if tagsError}<small class="ef-err">{tagsError}</small>{/if}
          </label>
        {:else if f.type === 'bool'}
          <label class="ef-check"><input type="checkbox" checked={!!frontmatter[f.key]} onchange={(e) => setCore(f.key, e.currentTarget.checked)} /> {f.label}</label>
        {:else if f.type === 'date'}
          <label>
            <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
            <input type="date" value={String(frontmatter[f.key] ?? '').slice(0, 10)} oninput={(e) => setCore(f.key, e.currentTarget.value)} />
          </label>
        {:else if f.type === 'textarea'}
          <label>
            <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
            <textarea value={frontmatter[f.key] ?? ''} oninput={(e) => setCore(f.key, e.currentTarget.value)}></textarea>
          </label>
        {:else}
          <label>
            <span>{f.label}{#if f.required}<em> *</em>{/if}</span>
            <input value={frontmatter[f.key] ?? ''} oninput={(e) => setCore(f.key, e.currentTarget.value)} />
          </label>
        {/if}
      {/each}
    </div>
  </div>

  <details class="ef-adv">
    <summary>進階欄位（YAML）</summary>
    <textarea class="ef-adv-yaml" value={advText} oninput={(e) => onAdvInput(e.currentTarget.value)}></textarea>
    {#if advError}<small class="ef-err">{advError}</small>{/if}
  </details>

  <p class="ef-note">社群分享的標題、描述與分享圖由系統依「標題」「描述」自動產生，無需手動設定。</p>
</div>

<style>
  .ef { display: flex; flex-direction: column; gap: 0.75rem; }
  .ef label { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
  .ef span { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; color: var(--color-ink); }
  .ef em { color: var(--color-coral); font-style: normal; }
  .ef :is(input, textarea, select) {
    width: 100%; box-sizing: border-box;
    font-family: var(--font-ui); font-size: var(--text-body); color: var(--color-ink);
    background: white; border: 1px solid var(--color-fog); border-radius: var(--radius-sm); padding: 0.5rem 0.65rem;
  }
  .ef :is(input, textarea):focus-visible { outline: 2px solid var(--color-teal); outline-offset: 1px; }
  .ef textarea { min-height: 4rem; resize: vertical; }
  .ef small { font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .ef-err { color: var(--color-coral); }
  .ef-note { margin: 0; font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }

  /* mobile-first：預設單欄；≥sm(640) 才左右兩欄（左欄封面高度由右欄撐開 stretch）。
     CLAUDE.md 規範：斷點只用 min-width，禁 max-width media query。 */
  .ef-cols { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: stretch; }
  .ef-left { display: flex; flex-direction: column; }
  .ef-right { display: flex; flex-direction: column; gap: 0.6rem; }

  .ef-tags-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .ef-tag-ai { font-family: var(--font-ui); font-size: var(--text-badge); font-weight: 600; padding: 0.2rem 0.6rem; border: 1px solid var(--color-teal); border-radius: var(--radius-pill); background: white; color: var(--color-teal); cursor: pointer; }
  .ef-tag-ai:disabled { opacity: 0.6; cursor: default; }

  .ef-check { flex-direction: row; align-items: center; gap: 0.4rem; }
  .ef-check input { width: auto; }

  .ef-adv summary { cursor: pointer; font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; }
  .ef .ef-adv-yaml { width: 100%; box-sizing: border-box; min-height: 14rem; margin-top: 0.4rem; resize: vertical; font-family: ui-monospace, monospace; }

  @media (min-width: 640px) {
    .ef-cols { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  }
</style>
