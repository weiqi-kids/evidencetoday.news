# Performance & RWD Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 3 real performance bottlenecks (self-host fonts, create favicons, fix nested padding) and standardize responsive breakpoints across all pages using mobile-first approach.

**Architecture:** 7 tasks split into 3 waves. Wave 1 dispatches 5 independent sub-agents in parallel (fonts, favicons, Article layout, breakpoint standardization, news enhancements). Wave 2 runs after Task 3 completes (myths page depends on the new Article layout variant). Wave 3 updates README after everything is done.

**Tech Stack:** Astro 5, fontsource (self-hosted webfonts), sharp (favicon generation), CSS clamp() (fluid spacing), CSS min-width media queries (mobile-first)

---

## Dependency Graph

```
Wave 1 (parallel):  Task 1 ──┐
                    Task 2 ──┤
                    Task 3 ──┼── Wave 3: Task 7
                    Task 5 ──┤
                    Task 6 ──┘
                       │
Wave 2 (sequential):   └── Task 3 done → Task 4
```

## Standardized Breakpoints (all tasks MUST use these)

| Token   | Value    | Usage                              |
|---------|----------|------------------------------------|
| `sm`    | `640px`  | Small phones → larger phones       |
| `md`    | `768px`  | Phones → tablets                   |
| `lg`    | `1024px` | Tablets → desktops                 |
| `xl`    | `1280px` | Desktops → wide screens            |

**Direction:** Always `min-width` (mobile-first). Base styles = mobile, add complexity upward.

---

## Task 1: Self-host Fonts

**Files:**
- Modify: `package.json` (add fontsource deps)
- Modify: `src/layouts/Base.astro:58-64` (remove Google Fonts CDN, add imports)
- Modify: `src/styles/typography.css:5-6` (update comment)
- No changes to: `src/assets/fonts/` (keep existing TTF for satori OG images)

### Context

The biggest performance bottleneck. Currently `Base.astro:58-64` loads 4 font families from Google Fonts CDN via a blocking `<link>`. This causes 2 extra DNS lookups (googleapis.com + gstatic.com) and a blocking CSS fetch before any text renders.

**Fonts needed:**
| Font | Weights | CSS var usage |
|------|---------|---------------|
| Inter | 400, 500, 700 | `--font-ui`, `--font-sans` fallback |
| Noto Sans TC | 400, 700 | `--font-sans` primary |
| Noto Serif TC | 700 | `--font-serif` primary |
| Source Serif 4 | 600, 700 | `--font-display` primary |

- [ ] **Step 1: Install fontsource packages**

```bash
cd /Users/lightman/weiqi.kids/evidencetoday.news
pnpm add @fontsource/inter @fontsource/noto-sans-tc @fontsource/noto-serif-tc @fontsource/source-serif-4
```

Expected: 4 packages added to `package.json` dependencies.

- [ ] **Step 2: Import font CSS in Base.astro**

Replace lines 58-64 in `src/layouts/Base.astro`. Remove the Google Fonts CDN block:

```diff
-    <!-- Google Fonts -->
-    <link rel="preconnect" href="https://fonts.googleapis.com" />
-    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
-    <link
-      href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@700&family=Inter:wght@400;500;700&family=Source+Serif+4:wght@600;700&display=swap"
-      rel="stylesheet"
-    />
```

Add font imports in the frontmatter (top `---` block), after the existing imports:

```astro
---
import TopNav from '@/components/blocks/TopNav.astro';
import Footer from '@/components/blocks/Footer.astro';
import '@/styles/global.css';

/* Self-hosted fonts via fontsource */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/700.css';
import '@fontsource/noto-serif-tc/700.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';

// ... rest of frontmatter
---
```

Astro bundles these CSS imports into optimized stylesheets. The @font-face rules (including CJK unicode-range subsetting) are handled automatically. Font files are copied to `dist/_astro/`.

- [ ] **Step 3: Update typography.css comment**

In `src/styles/typography.css`, replace lines 5-6:

```diff
-   Fonts are loaded via Google Fonts CDN <link> tags in the base layout.
-   Self-hosted woff2 files under /fonts/ can replace the CDN later.
+   Fonts are self-hosted via fontsource, imported in Base.astro.
+   OG image generation uses static TTF instances in src/assets/fonts/.
```

- [ ] **Step 4: Build and verify**

```bash
pnpm build
```

Expected: Zero errors. Verify in build output that `dist/_astro/` contains `.woff2` font files.

```bash
ls dist/_astro/*.woff2 | head -20
```

Expected: Multiple woff2 files (Inter, Noto Sans TC subsets, etc.)

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/layouts/Base.astro src/styles/typography.css
git commit -m "perf: self-host fonts via fontsource, remove Google Fonts CDN"
```

---

## Task 2: Create Favicons

**Files:**
- Create: `scripts/generate-favicons.mjs` (one-time generation script)
- Create: `public/favicon.svg`
- Create: `public/favicon.ico`
- Create: `public/apple-touch-icon.png`

### Context

`Base.astro:53-56` declares 3 favicon paths but no files exist in `public/`. Brand color is teal `oklch(0.38 0.08 200)` which is approximately `#1a6b6e` in hex.

- [ ] **Step 1: Create favicon.svg**

Write `public/favicon.svg` — a teal rounded square with white "ET" text:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1a6b6e"/>
  <text x="256" y="340" text-anchor="middle" font-family="system-ui, sans-serif" font-size="260" font-weight="700" fill="#fff" letter-spacing="-10">ET</text>
</svg>
```

- [ ] **Step 2: Create the favicon generation script**

Write `scripts/generate-favicons.mjs`:

```js
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

// apple-touch-icon.png (180x180)
await sharp(svgBuffer).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('Created apple-touch-icon.png (180x180)');

// favicon.ico — 32x32 PNG wrapped as ICO
// ICO format: header (6 bytes) + entry (16 bytes) + PNG data
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);     // reserved
icoHeader.writeUInt16LE(1, 2);     // ICO type
icoHeader.writeUInt16LE(1, 4);     // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0);        // width
icoEntry.writeUInt8(32, 1);        // height
icoEntry.writeUInt8(0, 2);         // color palette
icoEntry.writeUInt8(0, 3);         // reserved
icoEntry.writeUInt16LE(1, 4);      // color planes
icoEntry.writeUInt16LE(32, 6);     // bits per pixel
icoEntry.writeUInt32LE(png32.length, 8);  // size
icoEntry.writeUInt32LE(22, 12);    // offset (6 + 16)

writeFileSync(join(publicDir, 'favicon.ico'), Buffer.concat([icoHeader, icoEntry, png32]));
console.log('Created favicon.ico (32x32)');
```

- [ ] **Step 3: Run the generation script**

```bash
node scripts/generate-favicons.mjs
```

Expected output:
```
Created apple-touch-icon.png (180x180)
Created favicon.ico (32x32)
```

Verify files exist:
```bash
ls -la public/favicon.svg public/favicon.ico public/apple-touch-icon.png
```

- [ ] **Step 4: Build and verify**

```bash
pnpm build
```

Expected: Zero errors. Check that favicons are in dist:
```bash
ls dist/favicon.svg dist/favicon.ico dist/apple-touch-icon.png
```

- [ ] **Step 5: Commit**

```bash
git add public/favicon.svg public/favicon.ico public/apple-touch-icon.png scripts/generate-favicons.mjs
git commit -m "feat: add favicon.svg, favicon.ico, and apple-touch-icon.png"
```

---

## Task 3: Article Layout — Add Variant System

**Files:**
- Modify: `src/layouts/Article.astro:14-169` (add variant prop, refactor CSS)

### Context

`Article.astro` is the shared layout for articles, myths, and ingredients. Currently `.article-grid` has `background-color: white; padding: 2rem; border-radius` — this creates a white card wrapper. For articles/ingredients this is fine (prose content inside a card). For myths, it creates nested white-on-white boxes because myths has its own `.block` wrappers with `background: #fff; border; border-radius; padding`.

**Strategy A:** Add a `variant` prop. Default `"prose"` keeps current card behavior. `"cards"` makes the grid transparent so child components provide their own visual containers.

Additionally, make padding fluid with `clamp()` to eliminate the "fix mobile breaks desktop" problem.

- [ ] **Step 1: Add variant prop to interface**

In `src/layouts/Article.astro`, add `variant` to the Props interface (line 14-31):

```typescript
interface Props {
  title: string;
  description: string;
  ogImage?: string;
  category: 'article' | 'myth' | 'ingredient';
  variant?: 'prose' | 'cards';
  publishDate: Date;
  updatedDate: Date;
  author?: string;
  reviewer?: string;
  readingTime?: number;
  editorReviewed?: boolean;
  disclosure?: string;
  tags: string[];
  breadcrumbItems: Array<{ label: string; href?: string }>;
  faq?: Array<{ question: string; answer: string }>;
  references?: Array<{ title: string; url?: string; type: string }>;
  tldr?: string;
}
```

- [ ] **Step 2: Destructure variant with default**

Update the destructuring (around line 33-50):

```typescript
const {
  title,
  description,
  ogImage,
  category,
  variant = 'prose',
  publishDate,
  updatedDate,
  author,
  reviewer,
  readingTime,
  editorReviewed = false,
  disclosure,
  tags,
  breadcrumbItems,
  faq,
  references,
  tldr,
} = Astro.props;
```

- [ ] **Step 3: Apply variant class to article-grid**

Change the `<div class="article-grid">` line (around line 75) to:

```astro
    <div class:list={['article-grid', `article-grid--${variant}`]}>
```

- [ ] **Step 4: Rewrite the scoped CSS**

Replace the entire `<style>` block (lines 102-169):

```css
<style>
  .article-layout {
    padding-block: var(--space-page-y);
  }

  .article-header {
    padding-block: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .article-header__meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .article-header h1 {
    max-width: 40ch;
  }

  /* ---- Grid structure ---- */
  .article-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    padding-block: 2rem;
  }

  /* Prose variant: white card wrapping content */
  .article-grid--prose {
    background-color: white;
    border-radius: var(--radius-card);
    padding: clamp(1rem, 0.5rem + 3vw, 2rem);
  }

  /* Cards variant: transparent, sections provide their own containers */
  .article-grid--cards {
    background: transparent;
    padding-inline: 0;
  }

  .article-content {
    max-width: 68ch;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .article-faq {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .article-references {
    margin-top: 0;
  }

  .article-sidebar {
    display: none;
  }

  @media (min-width: 1024px) {
    .article-grid--prose {
      grid-template-columns: 0.7fr 0.3fr;
    }

    .article-sidebar {
      display: block;
      position: sticky;
      top: 6rem;
      align-self: start;
    }
  }
</style>
```

Key changes:
- `.article-grid` is now purely structural (grid + gap + padding-block)
- `.article-grid--prose` adds the white card visual treatment with **fluid padding** via `clamp(1rem, 0.5rem + 3vw, 2rem)` — smoothly transitions from 16px (mobile) to 32px (desktop)
- `.article-grid--cards` is transparent with no inline padding
- Two-column grid only applies to `--prose` variant (myths doesn't need sidebar)
- Sidebar visibility unchanged (still 1024px min-width)

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

Expected: Zero errors. Articles and ingredients pages should look identical to before (they use default `variant="prose"`).

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Article.astro
git commit -m "refactor: add variant prop to Article layout for prose/cards modes"
```

---

## Task 4: Myths Page RWD Rewrite (depends on Task 3)

**Files:**
- Modify: `src/pages/myths/[slug].astro:13,35` (pass variant, rewrite styles)

### Context

The myths page currently passes all content to `Article` layout without specifying a variant. It uses inline CSS (line 35) with:
- `max-width: 760px` breakpoint (inconsistent with rest of site)
- Desktop-first direction (should be mobile-first)
- All CSS compressed on a single line (unreadable)

With Task 3's variant system complete, we pass `variant="cards"` so Article layout provides a transparent grid, and myths' `.block` sections serve as visual containers directly.

**Padding chain BEFORE (mobile 375px):**
```
container: 16px + article-grid: 32px + block: 20px = 68px per side
```

**Padding chain AFTER (mobile 375px):**
```
container: 16px + article-grid--cards: 0px + block: 16px = 32px per side
```

This doubles the available content width on mobile from 239px to 311px.

- [ ] **Step 1: Pass variant="cards" to Article**

On line 13 of `src/pages/myths/[slug].astro`, add `variant="cards"`:

```astro
<Article title={d.title} description={d.ogDescription} ogImage={d.ogImage || d.shareCardImage} category="myth" variant="cards" publishDate={d.publishDate} updatedDate={d.updatedDate} tags={d.topicTags} breadcrumbItems={[{ label: '首頁', href: '/' }, { label: d.title }]}>
```

- [ ] **Step 2: Rewrite the scoped style block**

Replace line 35 (the entire compressed `<style>` block) with properly formatted mobile-first CSS:

```css
<style>
  /* ---- Base (mobile) ---- */
  .block {
    background: #fff;
    border: 1px solid var(--color-fog);
    border-radius: 14px;
    padding: clamp(1rem, 0.5rem + 2vw, 2.125rem);
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .block :is(h1, h2, h3) {
    margin: 0 0 12px;
  }

  .claim p {
    font-size: 1.05rem;
  }

  /* Quick conclusion — single column on mobile */
  .quick {
    background: #edf7ff;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .quick-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .pill {
    display: inline-flex;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: clamp(0.875rem, 0.8rem + 0.5vw, 1.125rem);
    font-weight: 700;
  }

  .verdict {
    background: #fff1db;
    color: #7a4b08;
  }

  .evidence {
    background: #e7efff;
    color: #1e3a8a;
  }

  .quick-summary {
    font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
    font-weight: 600;
  }

  .flow {
    background: #f8fafc;
  }

  .belief {
    background: #fff8eb;
  }

  /* Actions — single column on mobile */
  .cols {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .actions .cols > div:first-child {
    background: #effaf3;
    padding: 0.85rem;
    border-radius: 12px;
  }

  .actions .cols > div:last-child {
    background: #f5f6f8;
    padding: 0.85rem;
    border-radius: 12px;
  }

  .share-block :global(.myth-visual) {
    max-width: 560px;
    margin: 0 auto 0.75rem;
  }

  .share {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-top: 1rem;
  }

  .share button {
    min-height: 44px;
    padding: 0.75rem 1rem;
  }

  button {
    padding: 0.65rem 0.95rem;
    border-radius: 10px;
    border: 1px solid var(--color-fog);
    background: #fff;
  }

  /* ---- Tablet and up (768px) ---- */
  @media (min-width: 768px) {
    .quick {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
    }

    .cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .share {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .share button {
      flex: 1 1 160px;
    }
  }
</style>
```

Key changes:
- Mobile-first: base styles are mobile layout (single column, stacked)
- Single breakpoint at `768px` (aligned with site standard `md`)
- Fluid padding on `.block` via `clamp(1rem, 0.5rem + 2vw, 2.125rem)` — 16px mobile → 34px desktop, smooth transition
- Fluid font sizes on `.pill` and `.quick-summary` via `clamp()`
- Properly formatted and readable CSS

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Expected: Zero errors.

- [ ] **Step 4: Visual check on dev server**

```bash
pnpm dev
```

Open `http://localhost:4321/myths/lemon-water-detox/` (or any myths page). Check:
1. Mobile (375px): blocks should have adequate content width, no excessive padding
2. Tablet (768px): `.quick` and `.cols` switch to 2-column grid
3. Desktop (1280px): full width, padding expands smoothly

- [ ] **Step 5: Commit**

```bash
git add src/pages/myths/[slug].astro
git commit -m "fix: myths page RWD — mobile-first, eliminate nested padding, standardize breakpoint"
```

---

## Task 5: Breakpoint Standardization — Non-news Pages

**Files:**
- Modify: `src/styles/global.css:278-300` (mobile section)
- Modify: `src/pages/articles/[slug].astro:186-190` (related grid breakpoint)
- Modify: `src/pages/ingredients/[slug].astro:178-182` (related grid breakpoint)

### Context

These files use `max-width` (desktop-first) media queries with inconsistent breakpoints. Convert to `min-width` (mobile-first) with standardized values.

- [ ] **Step 1: Rewrite global.css mobile section**

Replace lines 278-300 of `src/styles/global.css`. The current code uses `max-width: 768px` to override desktop defaults for mobile. Convert to mobile-first: make the base values mobile, add `min-width: 768px` for desktop.

The base values (outside media queries) that need to change:

1. `body` line 37: `line-height: 1.7` → `1.65` (mobile value)
2. `.prose` line 149: `line-height: 1.8` → `1.75` (mobile value)
3. `.prose > * + *` line 153: `margin-top: 1.25em` → `1em` (mobile value)
4. `.prose h2` line 161: `margin-top: 1.75em` → `1.5em` (mobile value)
5. `.prose h3` line 165: `margin-top: 1.5em` → `1.25em` (mobile value)

Then replace the `@media (max-width: 768px)` block (lines 280-300) with:

```css
/* ==========================================================================
   Desktop enhancements
   ========================================================================== */

@media (min-width: 768px) {
  body {
    line-height: 1.7;
  }

  .prose {
    line-height: 1.8;
  }

  .prose > * + * {
    margin-top: 1.25em;
  }

  .prose h2 {
    margin-top: 1.75em;
  }

  .prose h3 {
    margin-top: 1.5em;
  }
}
```

- [ ] **Step 2: Fix articles related grid breakpoint**

In `src/pages/articles/[slug].astro`, replace lines 186-190:

```diff
-  @media (max-width: 640px) {
+  @media (max-width: 639.98px) {
```

Actually, convert fully to mobile-first. The related grid should be 1 column by default, 2 columns on `sm` (640px):

Replace the related-content styles (lines 166-191):

```css
<style>
  .related-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .related-content__title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
  }

  .related-content__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-card-gap);
  }

  @media (min-width: 640px) {
    .related-content__grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
```

- [ ] **Step 3: Fix ingredients related grid breakpoint**

In `src/pages/ingredients/[slug].astro`, apply the same change to lines 158-183. Replace the entire `<style>` block:

```css
<style>
  .related-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .related-content__title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
  }

  .related-content__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-card-gap);
  }

  @media (min-width: 640px) {
    .related-content__grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .mechanism-text {
    padding: 1.5rem;
    border-radius: var(--radius-card);
    border: 1px solid var(--color-fog);
    background-color: white;
  }

  .mechanism-text h3 {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 0.75rem;
  }

  .mechanism-text p {
    font-size: var(--text-body);
    color: var(--color-ink);
    line-height: 1.8;
  }
</style>
```

- [ ] **Step 4: Build and verify**

```bash
pnpm build
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/articles/[slug].astro src/pages/ingredients/[slug].astro
git commit -m "refactor: convert to mobile-first breakpoints in global.css, articles, ingredients"
```

---

## Task 6: News Enhancements — OG Image + TrendBubbles + RWD

**Files:**
- Modify: `src/pages/news/[slug].astro:84,460-472` (add ogImage prop, fix breakpoints)
- Modify: `src/pages/news/index.astro:1-11,45-85` (add TrendBubbles, fix breakpoints)

### Context

Two fixes for news pages:
1. `news/[slug].astro:84` doesn't pass `ogImage` prop → uses the site-wide default OG image instead of per-article image
2. `news/index.astro` could benefit from TrendBubbles (already used on homepage) to show trending health topics
3. Both pages use `max-width` breakpoints (600/640/960) — standardize to `min-width`

- [ ] **Step 1: Fix news detail OG image**

In `src/pages/news/[slug].astro`, change line 84 from:

```astro
<Base title={`${displayTitle} | 本日有據`} description={metaDesc} ogType="article">
```

to:

```astro
<Base title={`${displayTitle} | 本日有據`} description={metaDesc} ogImage={data.heroImage || data.thumbnail || `/og/index.png`} ogType="article">
```

- [ ] **Step 2: Convert news detail breakpoints to mobile-first**

In `src/pages/news/[slug].astro`, replace the mobile section (lines 459-472):

```diff
-  /* ---- Mobile ---- */
-  @media (max-width: 640px) {
-    .news-article__title {
-      font-size: 1.4rem;
-    }
-
-    .editor-action {
-      padding: 1.25rem 1.25rem;
-    }
-
-    .related-grid {
-      grid-template-columns: 1fr;
-    }
-  }
```

Replace with mobile-first approach. The base (mobile) values become defaults, desktop values go in `min-width`:

First, change `.news-article__title` (line 267) to use the mobile value as default:

```css
  .news-article__title {
    font-family: var(--font-serif);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-ink);
    line-height: 1.35;
  }
```

Change `.editor-action` (line 411) padding to fluid:

```css
  .editor-action {
    margin: 0 0 2.5rem;
    padding: clamp(1.25rem, 0.75rem + 1.5vw, 1.75rem);
    background: color-mix(in oklch, var(--color-teal) 6%, var(--color-paper));
    border-left: 4px solid var(--color-teal);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
```

Change `.related-grid` (line 453) to mobile-first:

```css
  .related-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-card-gap);
  }
```

Then replace the old `@media (max-width: 640px)` block with:

```css
  @media (min-width: 640px) {
    .news-article__title {
      font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
    }

    .related-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
```

- [ ] **Step 3: Add TrendBubbles to news index**

In `src/pages/news/index.astro`, add imports in the frontmatter:

```astro
---
import Base from '@/layouts/Base.astro';
import { getCollection } from 'astro:content';
import { fmtDate } from '@/utils/date';
import { getDisplayTitle, getNewsCategory, getNewsThumbnail } from '@/utils/news';
import { getTopTags } from '@/utils/tag-stats';
import TrendBubbles from '@/components/charts/TrendBubbles.svelte';

function stripExt(id: string) { return id.replace(/\.[^.]+$/, ''); }

const all = (await getCollection('news', (e) => !e.data.draft))
  .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

const topTags = await getTopTags(12);
---
```

Add the TrendBubbles section after `</header>` and before `<section class="news-grid">`:

```astro
    {topTags.length > 0 && (
      <section class="trend-section">
        <h2 class="trend-section__title">熱門健康話題</h2>
        <div class="trend-section__chart">
          <TrendBubbles tags={topTags} client:visible />
        </div>
      </section>
    )}
```

Add styles for the trend section inside the existing `<style>` block:

```css
  /* ---- Trend bubbles ---- */
  .trend-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border: 1px solid color-mix(in oklch, var(--color-fog) 80%, transparent);
    border-radius: var(--radius-card);
  }

  .trend-section__title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 1rem;
  }

  .trend-section__chart {
    min-height: 200px;
  }
```

- [ ] **Step 4: Convert news index breakpoints to mobile-first**

In the same file, replace the grid media queries (lines 75-85):

```diff
-  .news-grid {
-    display: grid;
-    grid-template-columns: repeat(3, 1fr);
-    gap: var(--space-card-gap);
-  }
-
-  @media (max-width: 960px) {
-    .news-grid {
-      grid-template-columns: repeat(2, 1fr);
-    }
-  }
-
-  @media (max-width: 600px) {
-    .news-grid {
-      grid-template-columns: 1fr;
-    }
-  }
```

With mobile-first:

```css
  .news-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-card-gap);
  }

  @media (min-width: 640px) {
    .news-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .news-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
```

And the mobile card tweaks (lines 181-189):

```diff
-  @media (max-width: 600px) {
-    .news-card__title {
-      -webkit-line-clamp: 2;
-    }
-    .news-card__summary {
-      -webkit-line-clamp: 2;
-    }
-  }
```

Convert to mobile-first — make 2-line clamp the default, 3-line on larger:

Change the base `.news-card__title` (line 155) to clamp at 2:
```css
  .news-card__title {
    /* ... existing properties ... */
    -webkit-line-clamp: 2;
  }
```

Then add desktop override:
```css
  @media (min-width: 640px) {
    .news-card__title {
      -webkit-line-clamp: 3;
    }
  }
```

Remove `.news-card__summary` clamp change (it was already 2 on both mobile and desktop, so no override needed).

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

Expected: Zero errors. `news/index.astro` should show TrendBubbles chart above the grid.

- [ ] **Step 6: Commit**

```bash
git add src/pages/news/[slug].astro src/pages/news/index.astro
git commit -m "feat: news OG image fix, add TrendBubbles to news index, mobile-first breakpoints"
```

---

## Task 7: Update README

**Files:**
- Modify: `README.md:237-282` (performance bottlenecks and iteration sections)

### Context

Several items in README are outdated:
- "OG Image 缺失" → already fully implemented (satori + sharp)
- "Lighthouse CI 未啟用" → already active in warn mode
- Performance bottleneck items resolved by this plan

- [ ] **Step 1: Read current README**

Read `README.md` to get the latest content before editing.

- [ ] **Step 2: Update the bottleneck section**

Replace the "已知效能瓶頸" section (lines 237-260) with:

```markdown
## 已知效能瓶頸（優化方向）

### 1. Pagefind 搜尋頁 CSS/JS

`src/pages/search.astro` 直接載入 Pagefind CSS/JS。改為動態 import 可優化。優先順序低。
```

(Items 1-4 have been resolved: fonts self-hosted, favicon created, OG image already existed, Lighthouse CI already active)

- [ ] **Step 3: Update the iteration section**

Replace the "上線後可迭代" section (lines 278-282) with:

```markdown
### 上線後可迭代

- [ ] Pagefind 搜尋頁動態載入
- [ ] 原料頁補齊更多 pathwaySteps 資料
```

(Self-hosted fonts ✓, OG Image ✓, Lighthouse CI ✓, TrendBubbles on news ✓, PathwayDiagram already implemented)

- [ ] **Step 4: Build to verify no markdown issues**

```bash
pnpm build
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update README — remove resolved bottlenecks, reflect current status"
```

---

## Execution Summary

| Wave | Tasks | Parallel? | Files touched |
|------|-------|-----------|---------------|
| 1 | 1, 2, 3, 5, 6 | Yes (5 agents) | No file overlap |
| 2 | 4 | After Task 3 | `myths/[slug].astro` only |
| 3 | 7 | After all | `README.md` only |

**File ownership (no conflicts):**
- Task 1: `Base.astro`, `typography.css`, `package.json`
- Task 2: `public/favicon.*`, `scripts/generate-favicons.mjs`
- Task 3: `Article.astro`
- Task 4: `myths/[slug].astro`
- Task 5: `global.css`, `articles/[slug].astro`, `ingredients/[slug].astro`
- Task 6: `news/[slug].astro`, `news/index.astro`
- Task 7: `README.md`
