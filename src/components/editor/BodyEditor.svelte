<script>
  import { onMount, onDestroy } from 'svelte';
  import { imageUploadName, repoImagePath, publicImageUrl, blobToBase64 } from '@/utils/editor/image-upload';
  import { compressImage } from '@/utils/editor/image-compress';
  import { asset } from '@/utils/url';
  import ImagePicker from './ImagePicker.svelte';

  // addPending：登記待提交圖（存檔時與 .mdx 打包成單一 commit）
  let { value = '', slug = '', title = '', addPending, onchange } = $props();

  let el;
  let editor;
  let lastSet = value; // 防止 外部更新 ↔ change 事件互相觸發成迴圈（皆為「儲存形式」）
  let showPicker = $state(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  let blobMap = []; // 生成/上傳圖的 blob 預覽 URL ↔ 正式路徑（存檔時換回）

  // 進 TOAST：站內路徑（/images、/covers）補 BASE，編輯器才載得到（連舊文章既有圖一併修好）
  function toDisplay(md) {
    if (!md || !BASE) return md ?? '';
    return md.replace(/(\]\(|src=["'])(\/(?:images|covers)\/)/g, (_m, p1, p2) => p1 + BASE + p2);
  }
  // 出 TOAST：去掉 BASE 還原站內路徑；blob URL 換回正式路徑 → onchange 一律拿到「儲存形式」
  function toStore(md) {
    if (!md) return md ?? '';
    let out = md;
    if (BASE) out = out.split(`${BASE}/images/`).join('/images/').split(`${BASE}/covers/`).join('/covers/');
    for (const m of blobMap) out = out.split(m.blobUrl).join(m.storedUrl);
    return selfCloseImg(out);
  }
  // MDX 把未自閉的 <img ...> 當 JSX → 要求閉合標籤 → build 失敗。TOAST WYSIWYG 重序列化
  // 圖庫 <figure> 時可能吐出 void 形式的 <img src="...">（甚至剝掉 figure 外殼），故存檔前一律
  // 正規化成自閉 <img ... />，確保任何來源的內文圖都是合法 MDX。
  function selfCloseImg(md) {
    return md.replace(/<img\b([^>]*?)\s*\/?>/gi, (_m, attrs) => `<img${attrs} />`);
  }

  // Toast UI 的 CSS 以 runtime <link> 注入（指向 public/vendor 的靜態副本），
  // 刻意不走 import()——否則 Astro 會把它收進文章頁 render-blocking 的 route CSS，
  // 害匿名訪客下載 ~170KB 永遠用不到的編輯器樣式。public/vendor/toastui-editor.css
  // 是 node_modules/@toast-ui/editor/dist/toastui-editor.css 的副本（升級 toast 時需同步更新）。
  function ensureToastCss() {
    const id = 'toastui-editor-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/vendor/toastui-editor.css`;
    document.head.appendChild(link);
  }

  onMount(async () => {
    ensureToastCss();
    const { default: Editor } = await import('@toast-ui/editor');

    // 自訂工具列鈕：做成與其他鈕一致的 32x32 圖示按鈕（TOAST 不會幫自訂 el 套外殼，所以手動比照）
    const aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.setAttribute('aria-label', 'AI 生成 / 找圖庫 / 上傳 / 既有圖庫');
    aiBtn.title = 'AI 生成 / 找圖庫 / 上傳 / 既有圖庫';
    aiBtn.style.cssText = 'width:32px;height:32px;margin:0 5px;padding:0;border:1px solid transparent;border-radius:3px;background:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#555;';
    aiBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="M18.5 13.5l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" opacity=".65"/></svg>';
    aiBtn.addEventListener('mouseenter', () => { aiBtn.style.background = '#f4f4f4'; aiBtn.style.borderColor = '#e5e5e5'; });
    aiBtn.addEventListener('mouseleave', () => { aiBtn.style.background = 'transparent'; aiBtn.style.borderColor = 'transparent'; });
    aiBtn.addEventListener('click', () => { showPicker = true; });

    // ⚠️ 含原始 HTML（多為遷移文章）→ 強制 markdown 模式。
    // WYSIWYG 會把 HTML 重新序列化：併行、吃掉空行 → 文章結構毀損。
    // 鎖死模式（hideModeSwitch）避免切到 WYSIWYG 又被重序列化。新文章（無 HTML）才用 WYSIWYG。
    const hasRawHtml = /<\w+[\s/>]/.test(value || '');
    editor = new Editor({
      el,
      height: '78vh', // TOAST 會把此值設為 el 的 inline height（直接拉高內文編輯區）
      initialEditType: hasRawHtml ? 'markdown' : 'wysiwyg',
      hideModeSwitch: true,
      initialValue: toDisplay(value),
      usageStatistics: false,
      toolbarItems: [
        ['heading', 'bold', 'italic'],
        ['link', 'ul', 'ol', 'quote'],
        ['image', { name: 'aiImage', tooltip: 'AI 生成 / 找圖庫 / 上傳 / 既有圖庫', el: aiBtn }],
      ],
      events: {
        change: () => {
          const stored = toStore(editor.getMarkdown());
          lastSet = stored;
          onchange?.(stored);
        },
      },
      hooks: {
        addImageBlobHook: async (blob, callback) => {
          try {
            const compressed = await compressImage(blob, { maxWidth: 1280, mime: 'image/webp', quality: 0.82 });
            const name = imageUploadName(slug, compressed.type, Date.now());
            const publicUrl = publicImageUrl(name);
            addPending?.({ path: repoImagePath(name), base64: await blobToBase64(compressed), publicUrl });
            // 插入 blob URL 當場可預覽；toStore 存檔時換回 publicUrl
            const objUrl = URL.createObjectURL(compressed);
            blobMap.push({ blobUrl: objUrl, storedUrl: publicUrl });
            callback(objUrl, '');
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
          }
          return false;
        },
      },
    });
  });

  // ImagePicker 選定 → 插入內文。插入「顯示用 URL」當場可預覽；存檔時換回「儲存用路徑」。
  async function onPick(result) {
    showPicker = false;
    try {
      let displayUrl;
      let storedUrl;
      let credit = '';
      if (result.source === 'stock') {
        displayUrl = storedUrl = result.url; credit = result.credit || ''; // 外部絕對 URL，編輯器/上線都可載
      } else if (result.source === 'library') {
        storedUrl = result.url; // 站內路徑（無 BASE，由 build 補）
        displayUrl = asset(storedUrl); // 編輯器預覽補 BASE 才載得到
      } else {
        // generated | uploaded：壓縮後登記待提交（存檔時打包）；blob URL 當場預覽
        const compressed = await compressImage(result.blob, { maxWidth: 1280, mime: 'image/webp', quality: 0.82 });
        const name = imageUploadName(slug, compressed.type, Date.now());
        storedUrl = publicImageUrl(name);
        addPending?.({ path: repoImagePath(name), base64: await blobToBase64(compressed), publicUrl: storedUrl });
        displayUrl = URL.createObjectURL(compressed);
        blobMap.push({ blobUrl: displayUrl, storedUrl }); // toStore 存檔時換回
      }
      editor?.exec('addImage', { imageUrl: displayUrl, altText: '' });
      // 圖庫圖署名：把剛插入的 markdown image 換成 <figure> + <figcaption>
      if (credit && editor) {
        const md = editor.getMarkdown();
        const imgMd = `![](${displayUrl})`;
        const figure = `<figure>\n  <img src="${displayUrl}" alt="" />\n  <figcaption>攝影：${credit}</figcaption>\n</figure>`;
        if (md.includes(imgMd)) editor.setMarkdown(md.replace(imgMd, figure));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  $effect(() => {
    if (editor && value !== lastSet) {
      lastSet = value;
      editor.setMarkdown(toDisplay(value ?? '')); // value 是儲存形式 → 顯示時補 BASE
    }
  });

  onDestroy(() => editor?.destroy?.());
</script>

<div class="et-body-editor" bind:this={el}></div>

{#if showPicker}
  <ImagePicker
    initialPrompt={title ? `${title}：內文示意插圖，沉穩色調` : ''}
    size="landscape"
    {title}
    body={value}
    exclude={[]}
    onpick={onPick}
    onclose={() => (showPicker = false)}
  />
{/if}

<style>
  /* 內文編輯區拉高到接近滿版。TOAST 會把 height(78vh) 設成 el 的 inline 高度；
     此元件是 modal flex 容器裡的可收縮子項，需 flex-shrink:0 才不會被壓回 min-height。 */
  .et-body-editor { height: 78vh; min-height: 22rem; flex-shrink: 0; }
</style>
