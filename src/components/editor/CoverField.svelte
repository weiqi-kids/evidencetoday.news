<script>
  import { onMount } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { imageUploadName, repoImagePath, publicImageUrl, blobToBase64 } from '@/utils/editor/image-upload';
  import { compressImage } from '@/utils/editor/image-compress';
  import { asset } from '@/utils/url';
  import { AI_WORKER } from '@/utils/editor/ai-worker';
  import ImagePicker from './ImagePicker.svelte';

  // frontmatter：完整物件；onchange(next) 回傳完整物件；body：給圖庫推關鍵字；
  // addPending({path,base64,publicUrl})：登記待提交圖（存檔時與 .mdx 打包成單一 commit）
  // field/altKey/creditKey：封面相關 frontmatter key（不同集合不同，如 news 用 heroImage）
  let { frontmatter, slug = '', body = '', field = 'coverImage', altKey = 'coverAlt', creditKey = 'coverImageCredit', addPending, onchange } = $props();

  let showPicker = $state(false);
  let uploading = $state(false);
  let uploadError = $state('');
  let sessionPreview = $state(''); // 剛上傳的 object URL，當場顯示不等部署
  let altBusy = $state(false);

  // 去重清單：站上已用過的圖庫圖 id（建置期 admin/used-images.json，可有可無）
  let usedIds = $state([]);
  onMount(async () => {
    try {
      const res = await fetch(asset('admin/used-images.json'));
      if (res.ok) usedIds = (await res.json()).ids ?? [];
    } catch {
      // 拿不到清單就不去重，不阻斷
    }
  });

  let coverImage = $derived(frontmatter[field] ?? '');
  let coverAlt = $derived(frontmatter[altKey] ?? '');
  let coverCredit = $derived(frontmatter[creditKey] ?? '');

  // 預覽來源：本階段剛上傳 > 用 asset() 解析（絕對 URL 原樣、相對補 BASE 並收斂斜線）
  let previewSrc = $derived(
    sessionPreview ? sessionPreview : !coverImage ? '' : asset(coverImage),
  );

  function setField(key, value) {
    onchange({ ...frontmatter, [key]: value });
  }

  // prompt 預填：用標題引導，作者可改
  let initialPrompt = $derived(
    frontmatter.title ? `${frontmatter.title}：簡約編輯風健康主題封面插畫，沉穩色調，無文字` : '',
  );

  async function onpick(result) {
    if (result.source === 'stock') {
      // 圖庫圖：存外部絕對 URL + 攝影師署名，不下載、不壓縮
      sessionPreview = '';
      onchange({ ...frontmatter, [field]: result.url, [creditKey]: result.credit ?? '' });
      showPicker = false;
      return;
    }
    if (result.source === 'library') {
      // 既有 repo 圖：直接設站內路徑，不上傳、無署名
      sessionPreview = '';
      onchange({ ...frontmatter, [field]: result.url, [creditKey]: '' });
      showPicker = false;
      return;
    }
    // 'generated' | 'uploaded'：都是 blob → 壓縮後「登記待提交」（存檔時打包，不即時上傳）
    if (result.source !== 'generated' && result.source !== 'uploaded') return;
    uploading = true; uploadError = '';
    try {
      // 壓縮：封面縮到 ≤1280 寬、轉 WebP，避免 ~3MB 生成圖拖慢網站
      const compressed = await compressImage(result.blob, { maxWidth: 1280, mime: 'image/webp', quality: 0.82 });
      const name = imageUploadName(slug, compressed.type, Date.now());
      const publicUrl = publicImageUrl(name, 'covers');
      addPending?.({ path: repoImagePath(name, 'covers'), base64: await blobToBase64(compressed), publicUrl });
      sessionPreview = URL.createObjectURL(compressed); // 當場預覽（記憶體圖），存檔後才上線
      onchange({ ...frontmatter, [field]: publicUrl, [creditKey]: '' }); // 生成圖無署名 → 清 credit
      showPicker = false;
    } catch (e) {
      uploadError = e instanceof Error ? e.message : String(e);
    } finally {
      uploading = false;
    }
  }

  async function suggestAlt() {
    const token = getToken();
    if (!token) { uploadError = '請先登入管理者帳號'; return; }
    altBusy = true; uploadError = '';
    try {
      const res = await fetch(`${AI_WORKER}/alt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: frontmatter.title ?? '', hint: coverCredit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `alt 產生失敗（${res.status}）`);
      if (data.alt) setField(altKey, data.alt);
    } catch (e) {
      uploadError = e instanceof Error ? e.message : String(e);
    } finally {
      altBusy = false;
    }
  }

  function removeCover() {
    sessionPreview = '';
    onchange({ ...frontmatter, [field]: '', [creditKey]: '' });
  }
</script>

<div class="cf">
  <span class="cf-label">封面圖</span>
  {#if previewSrc}
    <img class="cf-preview" src={previewSrc} alt={coverAlt || '封面預覽'} />
  {:else}
    <div class="cf-preview cf-empty">尚無封面</div>
  {/if}
  <div class="cf-btns">
    <button type="button" class="cf-choose" onclick={() => (showPicker = true)} disabled={uploading}>
      {uploading ? '上傳中…' : coverImage ? '更換封面' : '選擇封面'}
    </button>
    {#if coverImage}<button type="button" class="cf-remove" onclick={removeCover}>移除</button>{/if}
  </div>
  <label class="cf-alt">
    <span class="cf-alt-head">替代文字（alt）
      <button type="button" class="cf-alt-ai" onclick={suggestAlt} disabled={altBusy}>{altBusy ? '產生中…' : 'AI 建議'}</button>
    </span>
    <input value={coverAlt} oninput={(e) => setField(altKey, e.currentTarget.value)} placeholder="描述封面內容，無障礙用" />
  </label>
  {#if coverCredit}<p class="cf-credit">攝影：{coverCredit}</p>{/if}
  {#if uploadError}<p class="cf-err">{uploadError}</p>{/if}
</div>

{#if showPicker}
  <ImagePicker
    {initialPrompt}
    size="landscape"
    title={frontmatter.title ?? ''}
    {body}
    exclude={usedIds}
    {onpick}
    onclose={() => (showPicker = false)}
  />
{/if}

<style>
  /* 整體填滿左欄高度：預覽撐開 (flex:1)，按鈕與 alt 固定在下 */
  .cf { display: flex; flex-direction: column; gap: 0.4rem; height: 100%; }
  .cf-label { font-family: var(--font-ui); font-size: var(--text-meta); font-weight: 600; color: var(--color-ink); }
  .cf-preview { flex: 1 1 auto; width: 100%; min-height: 150px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--color-fog); background: color-mix(in oklch, var(--color-paper) 60%, white); }
  .cf-empty { display: flex; align-items: center; justify-content: center; border-style: dashed; color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); font-family: var(--font-ui); font-size: var(--text-meta); }
  .cf-btns { display: flex; gap: 0.5rem; }
  .cf-choose { font-family: var(--font-ui); font-weight: 600; padding: 0.45rem 1rem; border: none; border-radius: var(--radius-pill); background: var(--color-teal); color: white; cursor: pointer; }
  .cf-choose:disabled { opacity: 0.6; cursor: default; }
  .cf-remove { font-family: var(--font-ui); padding: 0.45rem 0.8rem; border: 1px solid var(--color-fog); border-radius: var(--radius-pill); background: white; cursor: pointer; }
  .cf-alt { display: flex; flex-direction: column; gap: 0.25rem; }
  .cf-alt span { font-family: var(--font-ui); font-size: var(--text-badge); font-weight: 600; color: color-mix(in oklch, var(--color-ink) 70%, var(--color-paper)); }
  .cf-alt-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .cf-alt-ai { font-family: var(--font-ui); font-size: 0.68rem; font-weight: 600; padding: 0.12rem 0.5rem; border: 1px solid var(--color-teal); border-radius: var(--radius-pill); background: white; color: var(--color-teal); cursor: pointer; }
  .cf-alt-ai:disabled { opacity: 0.6; cursor: default; }
  .cf-credit { margin: 0; font-family: var(--font-ui); font-size: var(--text-badge); color: color-mix(in oklch, var(--color-ink) 55%, var(--color-paper)); }
  .cf-alt input { width: 100%; box-sizing: border-box; font-family: var(--font-ui); border: 1px solid var(--color-fog); border-radius: var(--radius-sm); padding: 0.45rem 0.6rem; }
  .cf-err { color: var(--color-coral); font-family: var(--font-ui); font-size: var(--text-meta); margin: 0; }
</style>
