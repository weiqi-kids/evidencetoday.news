# WYSIWYG 編輯器升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把前台編輯器主分頁的 body 從純 textarea 升級為 Toast UI WYSIWYG 編輯器（工具列 + 圖片上傳到 `public/images/`），原始碼分頁仍顯示完整 raw MDX。

**Architecture:** 新增純邏輯 `image-upload.ts`（檔名/路徑/上傳，可單元測試）與 `BodyEditor.svelte`（包裝 Toast UI、註冊 addImageBlobHook）。`EditorPanel` 主分頁以 `BodyEditor` 取代 body textarea，維持 `{frontmatter, body}` 模型、原始碼分頁與存檔狀態機不變。Toast UI 隨已 lazy-load 的 EditorPanel chunk 載入，匿名訪客不受影響。

**Tech Stack:** TypeScript、Svelte 5、@toast-ui/editor、vitest。

**契約來源:** `docs/superpowers/specs/2026-06-08-wysiwyg-editor-design.md`

**前置依賴:** 既有 `src/utils/editor/{mdx-doc,github,token}.ts`、`EditorPanel.svelte`、vitest。

---

### Task 1: image-upload 純邏輯（檔名／路徑）

**Files:**
- Create: `src/utils/editor/image-upload.ts`
- Test: `src/utils/editor/image-upload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/image-upload.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extForMime, imageUploadName, repoImagePath, publicImageUrl } from './image-upload';

describe('image-upload 檔名/路徑', () => {
  it('extForMime 對應常見圖片 MIME，未知退 png', () => {
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/svg+xml')).toBe('svg');
    expect(extForMime('application/octet-stream')).toBe('png');
  });
  it('imageUploadName 用 slug + 時間戳 + 副檔名，slug 清成小寫安全字元', () => {
    expect(imageUploadName('vitamin-c-myth', 'image/jpeg', 1700000000000)).toBe('vitamin-c-myth-1700000000000.jpg');
    expect(imageUploadName('A B/c', 'image/png', 1)).toBe('a-b-c-1.png');
    expect(imageUploadName('', 'image/png', 5)).toBe('image-5.png');
  });
  it('repoImagePath 與 publicImageUrl', () => {
    expect(repoImagePath('x-1.png')).toBe('public/images/x-1.png');
    expect(publicImageUrl('x-1.png')).toBe('/images/x-1.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/image-upload.test.ts`
Expected: FAIL，`Failed to resolve import './image-upload'`。

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/editor/image-upload.ts`:
```ts
const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export function extForMime(mime: string): string {
  return MIME_EXT[mime] ?? 'png';
}

export function imageUploadName(slug: string, mime: string, timestamp: number): string {
  const safe = (slug || 'image').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'image';
  return `${safe}-${timestamp}.${extForMime(mime)}`;
}

export function repoImagePath(name: string): string {
  return `public/images/${name}`;
}

export function publicImageUrl(name: string): string {
  return `/images/${name}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/image-upload.test.ts`
Expected: PASS（3 passed）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/image-upload.ts src/utils/editor/image-upload.test.ts
git commit -m "feat(editor): 圖片上傳檔名/路徑純邏輯"
```

---

### Task 2: uploadImage（base64 + Contents API PUT）

**Files:**
- Modify: `src/utils/editor/image-upload.ts`
- Test: `src/utils/editor/image-upload.test.ts`

- [ ] **Step 1: Write the failing test**

在 `src/utils/editor/image-upload.test.ts` 追加：
```ts
import { vi, afterEach } from 'vitest';
import { uploadImage } from './image-upload';

afterEach(() => vi.restoreAllMocks());

function blobOf(bytes: number[], type: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

describe('uploadImage', () => {
  it('PUT 圖片到 public/images 並回傳 /images/ 路徑', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', spy);
    const url = await uploadImage({ blob: blobOf([1, 2, 3], 'image/png'), slug: 'demo', token: 'tok', timestamp: 42 });
    expect(url).toBe('/images/demo-42.png');
    const [reqUrl, init] = spy.mock.calls[0];
    expect(reqUrl).toBe('https://api.github.com/repos/weiqi-kids/evidencetoday.news/contents/public/images/demo-42.png');
    expect((init as RequestInit).method).toBe('PUT');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.branch).toBe('main');
    expect(Buffer.from(body.content, 'base64')).toEqual(Buffer.from([1, 2, 3]));
  });

  it('失敗回非 2xx → 丟出可讀錯誤', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
    await expect(uploadImage({ blob: blobOf([0], 'image/png'), slug: 'd', token: 't', timestamp: 1 }))
      .rejects.toThrow('圖片上傳失敗（403）');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/image-upload.test.ts`
Expected: FAIL，`uploadImage is not a function`。

- [ ] **Step 3: Write minimal implementation**

在 `src/utils/editor/image-upload.ts` 追加（OWNER/REPO 與 `github.ts` 一致，刻意重複避免動到既有檔；若日後要 DRY，從 github.ts 匯出）：
```ts
// 與 src/utils/editor/github.ts 的 OWNER/REPO 保持一致
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

// 瀏覽器與 node 皆安全的 blob → base64（無 Node Buffer 相依）
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function uploadImage(args: {
  blob: Blob; slug: string; token: string; timestamp: number;
}): Promise<string> {
  const name = imageUploadName(args.slug, args.blob.type, args.timestamp);
  const path = repoImagePath(name);
  const content = await blobToBase64(args.blob);
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: `content: 上傳圖片 ${name}`, content, branch: 'main' }),
  });
  if (!res.ok) throw new Error(`圖片上傳失敗（${res.status}）。請確認已登入管理者帳號後重試。`);
  return publicImageUrl(name);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/image-upload.test.ts`
Expected: PASS（全部）。`Blob.arrayBuffer()`、`btoa` 在 node 18+ 與瀏覽器皆可用。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/image-upload.ts src/utils/editor/image-upload.test.ts
git commit -m "feat(editor): uploadImage 上傳圖片到 public/images"
```

---

### Task 3: 安裝 Toast UI + BodyEditor.svelte 包裝元件

**Files:**
- Modify: `package.json`（新增 @toast-ui/editor）
- Create: `src/components/editor/BodyEditor.svelte`

- [ ] **Step 1: 安裝 Toast UI Editor**

Run: `pnpm add @toast-ui/editor`
Expected: `package.json` dependencies 出現 `@toast-ui/editor`。

- [ ] **Step 2: 建立 BodyEditor 元件**

Create `src/components/editor/BodyEditor.svelte`:
```svelte
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
          return false; // 阻止 Toast UI 預設把圖片塞成 base64
        },
      },
    });
  });

  // 由「原始碼」分頁套用回來時，外部 value 改變 → 同步進編輯器（有 guard 防迴圈）
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
  /* Toast UI 自帶樣式，這裡僅控制容器尺寸 */
</style>
```

備註：`Editor` 與其 CSS 為 static import，但 BodyEditor 只被 lazy-load 的 `EditorPanel` 匯入，故 Toast UI 落在 EditorPanel chunk、匿名訪客不載入。`new Editor()` 在 `onMount`（瀏覽器）才執行，SSG 不會碰到。

- [ ] **Step 3: 驗證可編譯**

Run: `pnpm build 2>&1 | tail -5`
Expected: `[build] Complete!`。若 Toast UI 在 SSR/prerender 階段報 `document is not defined`，確認 `new Editor()` 僅在 `onMount`、且 BodyEditor 只經由 EditorPanel 的動態 import 被引用（不要在任何 `.astro` 直接 import BodyEditor）。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/editor/BodyEditor.svelte
git commit -m "feat(editor): BodyEditor 包裝 Toast UI WYSIWYG + 圖片上傳鉤子"
```

---

### Task 4: 在 EditorPanel 主分頁以 BodyEditor 取代 body textarea

**Files:**
- Modify: `src/components/editor/EditorPanel.svelte`

- [ ] **Step 1: 匯入 BodyEditor**

在 `EditorPanel.svelte` `<script>` 的 import 區加入：
```js
import BodyEditor from './BodyEditor.svelte';
```

- [ ] **Step 2: 替換 SEO 分頁中的 body textarea**

把主分頁（`{#if status !== 'loading' && tab === 'seo'}` 區塊內）原本的正文 `<label class="et-body">…<textarea bind:value={body}>…</label>` 改為：
```svelte
      <div class="et-body">
        <span>正文</span>
        <BodyEditor value={body} {slug} onchange={(md) => (body = md)} />
      </div>
```
（保留 `SeoFields` 與 AI 區塊；只替換正文那塊。`.et-body` 既有樣式沿用——它是 `flex-direction: column; flex: 1`，BodyEditor 容器會撐滿。）

- [ ] **Step 3: 驗證可編譯與既有測試**

Run: `pnpm test 2>&1 | grep -iE "Tests |FAIL" | tail -2`
Expected: 全綠（純邏輯測試不受 UI 影響）。

Run: `pnpm build 2>&1 | tail -3`
Expected: `[build] Complete!`。

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/EditorPanel.svelte
git commit -m "feat(editor): 主分頁正文改用 BodyEditor WYSIWYG"
```

---

### Task 5: Playbook 文件同步

**Files:**
- Modify: `docs/playbooks/editor-spine.md`

- [ ] **Step 1: 更新編輯面板說明**

在 `docs/playbooks/editor-spine.md` 的「SEO 欄位 / 原始碼雙分頁」附近，補上：
```markdown
## 正文 WYSIWYG（editor-07）

- 主分頁正文以 `BodyEditor.svelte`（包 `@toast-ui/editor`）做 WYSIWYG：工具列含
  標題(H2/H3)、粗體、斜體、超連結、項目/有序清單、引用、圖片。`hideModeSwitch`、
  `initialEditType: 'wysiwyg'`，作者看不到 markdown 語法；raw MDX 只在「原始碼」分頁。
- body 與模型同步：Toast UI `change` → `onchange(getMarkdown())` 回寫 `body`；外部
  （原始碼套用）改 `value` → `$effect` `setMarkdown`，以 `lastSet` guard 防迴圈。
- **圖片上傳**：`addImageBlobHook` → `src/utils/editor/image-upload.ts` 的 `uploadImage`
  把圖 base64 `PUT` 到 `public/images/<slug-時間戳.ext>`（獨立 commit），回傳 `/images/<檔名>`
  絕對路徑插入 body（禁相對路徑，見幽靈圖事件）。**圖片要等下次部署才會在 `/images/` 取得**。
- Toast UI 隨 lazy-load 的 EditorPanel chunk 載入，匿名訪客不載入；瀏覽器安全（無 Node 相依）。
- 已知：首次以 WYSIWYG 編輯舊文存檔，markdown 會被 Toast UI 正規化（一次性 diff，內容不變）。
```

- [ ] **Step 2: Commit**

```bash
git add docs/playbooks/editor-spine.md
git commit -m "docs(editor): 正文 WYSIWYG 與圖片上傳 playbook"
```

---

## Self-Review

- **Spec coverage**：Task 1–2 對應 spec「圖片上傳流程」與「檔名/路徑純函式」；Task 3 對應「套件選擇 Toast UI」「BodyEditor 元件邊界」「工具列範圍」「瀏覽器安全」；Task 4 對應「架構/資料流」（主分頁 body 改 WYSIWYG、模型同步、原始碼分頁與存檔不變）；Task 5 對應文件。已知取捨（延遲顯示、正規化 diff）寫入 playbook。
- **Placeholder scan**：無 TBD/TODO；每個程式步驟附完整程式碼與測試。UI 任務（BodyEditor/EditorPanel）因專案無瀏覽器測試框架，採 `pnpm build` 驗證 + 端到端手動，符合既有慣例。
- **Type consistency**：`uploadImage({blob,slug,token,timestamp})→Promise<string>`、`imageUploadName/repoImagePath/publicImageUrl/extForMime` 簽名在 Task 1/2 與 BodyEditor 使用處一致；BodyEditor props `{value, slug, onchange}` 與 EditorPanel 傳入一致。
- **OWNER/REPO 重複**：image-upload.ts 重複 github.ts 的常數（附註解），刻意避免動到有測試的 github.ts；屬可接受的小重複。
