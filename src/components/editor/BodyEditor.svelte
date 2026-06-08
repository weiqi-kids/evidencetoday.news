<script>
  import { onMount, onDestroy } from 'svelte';
  import Editor from '@toast-ui/editor';
  import '@toast-ui/editor/dist/toastui-editor.css';
  import { getToken } from '@/utils/editor/token';
  import { uploadImage } from '@/utils/editor/image-upload';

  let { value = '', slug = '', onchange } = $props();

  let el;
  let editor;
  let lastSet = value; // 防止 外部更新 ↔ change 事件互相觸發成迴圈

  onMount(() => {
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
