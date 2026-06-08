# SSR 真實預覽端點 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供 `/admin/preview` SSR 端點，用與線上相同的 layout/元件即時渲染編輯中的 MDX，讓管理者看到真實畫面；並將站台託管自 GitHub Pages 遷移至 Cloudflare Pages 以支援 SSR。

**Architecture:** 採 Astro hybrid：全站維持預渲染靜態，僅 `/admin/preview` 一條路 `export const prerender = false` 由 Cloudflare runtime SSR。預覽路由解析傳入的 rawMdx → frontmatter + body，將「frontmatter 驅動的版型」交給與線上共用的 Astro 渲染元件（100% 真實），「正文 body」以與站台一致的 markdown 管線渲染為 HTML。完整「body 內 MDX 自訂元件」不在範圍（站上正文多為純 markdown，spec 已載明）。

**Tech Stack:** Astro、@astrojs/cloudflare、Cloudflare Pages、vitest。

**契約來源:** spec「③ Preview」「託管後果」。

**前置依賴:** `editor-01-mdx-doc`（parse）。與 spine 整合時由 `EditorPanel` 呼叫本端點。

**決策（已定）:** 全站遷移至 Cloudflare Pages。

---

### Task 1: 加入 Cloudflare adapter（hybrid）

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: 安裝 adapter**

Run: `pnpm add @astrojs/cloudflare`
Expected: `package.json` 出現 `@astrojs/cloudflare`。

- [ ] **Step 2: 設定 adapter 為 hybrid**

在 `astro.config.mjs` 加入（保留既有 integrations）：
```js
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // ...既有設定...
  output: 'static',            // 預設靜態；個別路由以 prerender=false 開 SSR
  adapter: cloudflare(),
});
```

- [ ] **Step 3: 驗證 build 仍通過**

Run: `pnpm build`
Expected: build 成功（目前無 SSR 路由，等同全靜態 + adapter 就緒）。若 adapter 對某些 Node API 報錯，記錄並於該處改用 web 標準 API。

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: 加入 @astrojs/cloudflare adapter(hybrid)"
```

---

### Task 2: 抽出可重用的「正文 markdown → HTML」工具

**Files:**
- Create: `src/utils/editor/render-body.ts`
- Test: `src/utils/editor/render-body.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/editor/render-body.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderBody } from './render-body';

describe('renderBody', () => {
  it('把 markdown 正文轉成 HTML', async () => {
    const html = await renderBody('## 小標\n\n一段內文。');
    expect(html).toContain('<h2');
    expect(html).toContain('小標');
    expect(html).toContain('一段內文。');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/editor/render-body.test.ts`
Expected: FAIL，`Failed to resolve import './render-body'`。

- [ ] **Step 3: Write minimal implementation**

安裝渲染相依（與站台 markdown 行為一致；Astro 內部用 remark/rehype，這裡用同家族）：
Run: `pnpm add marked`

Create `src/utils/editor/render-body.ts`:
```ts
import { marked } from 'marked';

export async function renderBody(body: string): Promise<string> {
  return marked.parse(body, { async: true });
}
```

備註：此為正文近似渲染（與站台外框/版型分離）。若日後要求與站台 remark/rehype 外掛完全一致，可改接 Astro 的 markdown 處理器；本範圍以一致觀感為準。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/editor/render-body.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/utils/editor/render-body.ts src/utils/editor/render-body.test.ts package.json pnpm-lock.yaml
git commit -m "feat(editor): 正文 markdown→HTML 渲染工具"
```

---

### Task 3: `/admin/preview` SSR 端點

**Files:**
- Create: `src/pages/admin/preview.ts`

說明：以 API route 形式回傳完整 HTML。版型重用：呼叫與線上相同的 layout/區塊渲染。為讓既有 `[slug].astro` 的版型可被重用，若其 markup 尚未抽成元件，於本 Task 將「frontmatter→版型」抽成共用 Astro 元件 `src/components/render/MythView.astro` / `ArticleView.astro`，供靜態頁與本預覽端點共用（DRY）。

- [ ] **Step 1: 抽出版型元件（以 myths 為首波）**

把 `src/pages/myths/[slug].astro` 的 `<Article>…</Article>` 主體（frontmatter 驅動的各 section）抽成 `src/components/render/MythView.astro`，介面：
```astro
---
interface Props { data: Record<string, any>; bodyHtml?: string; }
const { data: d, bodyHtml } = Astro.props;
---
<!-- 將原 [slug].astro 內各 <section class="block" …> 搬到此處，
     凡讀 entry.data 的改讀 d；若有正文 body 區塊則插入 set:html={bodyHtml} -->
```
並讓 `src/pages/myths/[slug].astro` 改為使用 `<MythView data={d} />`，確保**靜態頁輸出不變**（build diff 僅為重構）。

- [ ] **Step 2: 建立 SSR 預覽端點**

Create `src/pages/admin/preview.ts`:
```ts
import type { APIRoute } from 'astro';
import { parse } from '@/utils/editor/mdx-doc';
import { renderBody } from '@/utils/editor/render-body';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import MythView from '@/components/render/MythView.astro';

export const prerender = false; // 此路由 SSR

const VIEWS: Record<string, any> = { myths: MythView };

export const POST: APIRoute = async ({ request }) => {
  let payload: { collection: string; slug: string; rawMdx: string };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ errors: ['請求格式錯誤'] }), { status: 400 });
  }

  const View = VIEWS[payload.collection];
  if (!View) {
    return new Response(JSON.stringify({ errors: [`暫不支援預覽 collection：${payload.collection}`] }), { status: 422 });
  }

  let frontmatter: Record<string, unknown>;
  let body: string;
  try {
    ({ frontmatter, body } = parse(payload.rawMdx));
  } catch (e) {
    return new Response(JSON.stringify({ errors: [`frontmatter 解析失敗：${e instanceof Error ? e.message : e}`] }), { status: 422 });
  }

  const bodyHtml = await renderBody(body);
  const container = await AstroContainer.create();
  const html = await container.renderToString(View, { props: { data: frontmatter, bodyHtml } });

  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
};
```

備註：用 Astro Container API 於 runtime 把共用版型元件渲染成 HTML，達成「與線上相同版型」。首波支援 myths；其餘 collection 在 `VIEWS` 補對應 View 元件即可擴充。

- [ ] **Step 3: 手動驗證（本機）**

Run: `pnpm dev`，以 curl 對端點 POST：
```bash
curl -s -X POST http://localhost:4321/admin/preview \
  -H 'content-type: application/json' \
  -d '{"collection":"myths","slug":"demo","rawMdx":"---\ntitle: 預覽測試\ndescription: 測試\n---\n\n## 內文\n\n一段話。"}' | head -40
```
Expected: 回傳含該 myth 版型結構與「內文/一段話」的 HTML。

- [ ] **Step 4: Commit**

```bash
git add src/components/render/MythView.astro src/pages/myths/[slug].astro src/pages/admin/preview.ts
git commit -m "feat(editor): /admin/preview SSR 端點重用版型即時渲染"
```

---

### Task 4: 編輯面板接入預覽

**Files:**
- Modify: `src/components/editor/EditorPanel.svelte`

- [ ] **Step 1: 在面板加「預覽」分頁**

於 `EditorPanel.svelte` 的 `<script>` 加入：
```ts
let previewHtml = $state('');
async function preview() {
  const content = serialize({ frontmatter, body });
  const res = await fetch('/admin/preview', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ collection, slug, rawMdx: content }),
  });
  if (res.ok) { previewHtml = await res.text(); tab = 'preview'; }
  else { const d = await res.json().catch(() => ({})); message = `預覽失敗：${(d.errors || ['未知錯誤']).join('；')}`; }
}
```
header 的 `<nav>` 加一顆 `<button onclick={preview}>預覽</button>`；markup 加：
```svelte
{#if tab === 'preview'}
  <iframe class="et-preview" srcdoc={previewHtml} title="預覽"></iframe>
{/if}
```
（`.et-preview { flex:1; width:100%; border:1px solid #ddd; }`）

- [ ] **Step 2: 手動驗證**

Run: `pnpm dev`；登入後開 myth 文章 → 改內容 → 點「預覽」→ iframe 顯示與線上相同版型的真實渲染。
Expected: 預覽即時且版型一致。

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorPanel.svelte
git commit -m "feat(editor): 編輯面板接入 SSR 真實預覽"
```

---

### Task 5: 部署遷移至 Cloudflare Pages（手動步驟）

**Files:**
- Create: `docs/playbooks/cloudflare-pages-migration.md`
- Modify: `.github/workflows/deploy.yml`（停用 GitHub Pages 部署或改為 wrangler pages deploy）

- [ ] **Step 1: 撰寫遷移文件**

Create `docs/playbooks/cloudflare-pages-migration.md`，內容涵蓋：
```markdown
# Cloudflare Pages 遷移

1. Cloudflare Dashboard → Pages → 連接 GitHub repo weiqi-kids/evidencetoday.news
2. Build command: `pnpm build`；Build output: `dist`
3. 環境變數/相容性：Node 相容旗標、`compatibility_date`
4. 自訂網域 evidencetoday.news 指向 Cloudflare Pages（更新 DNS）
5. 確認 /admin/preview 為 SSR function 正常運作
6. 移除或停用既有 GitHub Pages 部署，避免雙重發布
```

- [ ] **Step 2: 調整既有部署 workflow**

在 `.github/workflows/deploy.yml` 將 GitHub Pages 發布步驟停用（或改為 `wrangler pages deploy dist`）。保留 build、Pagefind、lychee、Lighthouse 等檢查步驟。

- [ ] **Step 3: Commit**

```bash
git add docs/playbooks/cloudflare-pages-migration.md .github/workflows/deploy.yml
git commit -m "docs: Cloudflare Pages 遷移說明與部署調整"
```

---

## Self-Review

- **Spec coverage**：實作 spec「③ Preview」的 `POST /admin/preview {collection,slug,rawMdx}` → 200 HTML / 422 errors 契約，與「託管後果」的 Cloudflare Pages 遷移。預覽用 Container API 重用線上版型元件（frontmatter 100% 真實），body 以一致 markdown 管線渲染（spec 已載明 body 多為純 markdown，完整 MDX 元件不在範圍）。
- **Placeholder scan**：`MythView.astro` 內以註解指示「搬移既有 section」是重構動作說明，搭配「靜態頁輸出不變」驗收，非邏輯 placeholder。其餘步驟具體。Task 1 的 adapter Node API 相容性以「記錄並改 web API」描述，屬執行時排錯指引。
- **Type consistency**：`parse`→`{frontmatter,body}`、`renderBody(string)→Promise<string>`、端點請求/回應形狀與 spec 一致；`EditorPanel` 沿用既有 `serialize`/`collection`/`slug`。
- **平行備註**：Task 2（render-body 純函式）可平行；Task 1/3/5（adapter、SSR 端點、遷移）牽動全站建置與託管，須與 spine 整合後進行，屬第三波。
