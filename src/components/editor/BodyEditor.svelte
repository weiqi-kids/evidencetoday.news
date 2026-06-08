<script>
  import { onMount, onDestroy } from 'svelte';
  import { getToken } from '@/utils/editor/token';
  import { uploadImage } from '@/utils/editor/image-upload';

  let { value = '', slug = '', onchange } = $props();

  let el;
  let editor;
  let lastSet = value; // 防止 外部更新 ↔ change 事件互相觸發成迴圈

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
    link.href = '/vendor/toastui-editor.css';
    document.head.appendChild(link);
  }

  onMount(async () => {
    ensureToastCss();
    const { default: Editor } = await import('@toast-ui/editor');
    editor = new Editor({
      el,
      height: '100%',
      initialEditType: 'wysiwyg',
      hideModeSwitch: true,
      initialValue: value,
      usageStatistics: false,
      toolbarItems: [
        ['heading', 'bold', 'italic'],
        ['link', 'ul', 'ol', 'quote'],
        ['image'],
      ],
      events: {
        change: () => {
          const md = editor.getMarkdown();
          lastSet = md;
          onchange?.(md);
        },
      },
      hooks: {
        addImageBlobHook: async (blob, callback) => {
          try {
            const url = await uploadImage({ blob, slug, token: getToken(), timestamp: Date.now() });
            callback(url, '');
          } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
          }
          return false;
        },
      },
    });
  });

  $effect(() => {
    if (editor && value !== lastSet) {
      lastSet = value;
      editor.setMarkdown(value ?? '');
    }
  });

  onDestroy(() => editor?.destroy?.());
</script>

<div class="et-body-editor" bind:this={el}></div>

<style>
  .et-body-editor { flex: 1; min-height: 14rem; }
</style>
