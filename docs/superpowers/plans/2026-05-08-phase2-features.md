# Phase 2 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete 4 Phase 2 features: Lighthouse CI, TrendBubbles chart, PathwayDiagram, OG Image auto-generation.

**Architecture:** Each feature is independent. Lighthouse CI is config-only. TrendBubbles uses d3-force + SVG in a Svelte island. PathwayDiagram is pure SVG + Svelte. OG Image uses satori + sharp in an Astro static endpoint.

**Tech Stack:** Astro 5, Svelte 5, d3-force, satori, sharp, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-05-08-phase2-features-design.md` v1.2

**Testing strategy:** No test framework in this project. Verification is `pnpm build` (build success) + `pnpm dev` (visual check). TypeScript errors caught at build time.

**Important patterns from existing code:**
- All `[slug].astro` pages use `entry.id.replace(/\.[^.]+$/, '')` to get slug (strips file extension)
- Import alias: `@/` → `src/` (configured in `tsconfig.json`)
- Svelte components use Svelte 4 `export let` syntax (not Svelte 5 `$props()`) — follow existing pattern
- All ogImage props pass through Article/Media layout → Base layout

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `lighthouserc.json` | Lighthouse CI thresholds (warn mode) |
| `src/utils/tag-stats.ts` | Cross-collection tag frequency counter |
| `src/components/charts/TrendBubbles.svelte` | d3-force bubble chart for hot tags |
| `src/components/charts/PathwayDiagram.svelte` | SVG node-link metabolic pathway diagram |
| `src/utils/og-fonts.ts` | Load .ttf fonts for satori |
| `src/utils/og-template.ts` | OG image JSX template |
| `src/pages/og/[...slug].png.ts` | Astro static endpoint generating OG PNGs |
| `src/assets/fonts/NotoSansTC-Regular.ttf` | Font for satori (build only) |
| `src/assets/fonts/NotoSansTC-Bold.ttf` | Font for satori (build only) |

### Modified files

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml:57-62` | Uncomment + rewrite Lighthouse CI step |
| `package.json` | Add d3-force, @types/d3-force, satori, sharp |
| `src/content.config.ts:126` | Add `pathwaySteps` field after `mechanism` |
| `src/content/ingredients/vitamin-c.mdx` | Add `pathwaySteps` demo data |
| `src/pages/index.astro:469-477` | Replace trends placeholder with TrendBubbles |
| `src/pages/news/index.astro:111-121` | Replace placeholder with TrendBubbles |
| `src/pages/ingredients/[slug].astro:93` | Add PathwayDiagram before EvidenceScale |
| `src/layouts/Base.astro:17` | Change ogImage default to `/og/index.png` |
| `src/pages/articles/[slug].astro:91` | ogImage fallback to auto-generated |
| `src/pages/myths/[slug].astro:79` | ogImage fallback to auto-generated |
| `src/pages/ingredients/[slug].astro:74` | ogImage fallback to auto-generated |
| `src/pages/videos/[slug].astro:74` | ogImage fallback to auto-generated |
| `src/pages/podcasts/[slug].astro:88` | ogImage fallback to auto-generated |

---

## Task 1: Lighthouse CI

**Files:**
- Create: `lighthouserc.json`
- Modify: `.github/workflows/deploy.yml:57-62`

- [ ] **Step 1: Create `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost/",
        "http://localhost/articles/omega-3-guide/",
        "http://localhost/ingredients/vitamin-c/"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.95 }],
        "categories:accessibility": ["warn", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

- [ ] **Step 2: Update `deploy.yml` — replace commented Lighthouse block**

Replace lines 57-62 in `.github/workflows/deploy.yml`:

```yaml
      # - name: Lighthouse CI
      #   uses: treosh/lighthouse-ci-action@v12
      #   with:
      #     urls: |
      #       https://evidencetoday.news/
      #     uploadArtifacts: true
```

With:

```yaml
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
          staticDistDir: ./dist
        continue-on-error: true
```

- [ ] **Step 3: Verify build still succeeds**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build`
Expected: Build succeeds (Lighthouse CI only runs in GitHub Actions, not locally)

- [ ] **Step 4: Commit**

```bash
git add lighthouserc.json .github/workflows/deploy.yml
git commit -m "ci: enable Lighthouse CI with warn-mode thresholds

Test 3 representative pages (home, article, ingredient) against
local dist/ using staticDistDir. All assertions are warnings
(continue-on-error) to avoid blocking deploys initially.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Install d3-force dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install d3-force and its types**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm add d3-force && pnpm add -D @types/d3-force`

- [ ] **Step 2: Verify install succeeded**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm ls d3-force @types/d3-force`
Expected: Both packages listed

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add d3-force for TrendBubbles chart

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create tag-stats utility

**Files:**
- Create: `src/utils/tag-stats.ts`

- [ ] **Step 1: Create `src/utils/tag-stats.ts`**

```typescript
import { getCollection } from 'astro:content';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'] as const;

export interface TagCount {
  tag: string;
  count: number;
}

export async function getTopTags(limit = 20): Promise<TagCount[]> {
  const allEntries = (
    await Promise.all(COLLECTIONS.map((c) => getCollection(c)))
  )
    .flat()
    .filter((e: any) => !e.data.draft);

  const tagCounts = new Map<string, number>();
  for (const entry of allEntries) {
    for (const tag of (entry as any).data.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm exec astro check 2>&1 | head -20`
Expected: No errors in `tag-stats.ts`

- [ ] **Step 3: Commit**

```bash
git add src/utils/tag-stats.ts
git commit -m "feat: add cross-collection tag frequency utility

Aggregates tags from all 6 content collections, filters drafts,
returns top N tags sorted by frequency.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Create TrendBubbles component

**Files:**
- Create: `src/components/charts/TrendBubbles.svelte`

- [ ] **Step 1: Create `src/components/charts/TrendBubbles.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import { forceSimulation, forceCollide, forceCenter, forceX, forceY } from 'd3-force';
  import { scaleSqrt } from 'd3-scale';

  /** @type {{ tag: string; count: number }[]} */
  export let tags = [];

  let svgEl;
  let width = 400;
  let height = 280;
  let nodes = [];
  let hoveredIndex = -1;
  let tooltipX = 0;
  let tooltipY = 0;

  const radiusScale = scaleSqrt()
    .domain([1, Math.max(...tags.map((t) => t.count), 1)])
    .range([18, 55]);

  onMount(() => {
    const rect = svgEl.parentElement.getBoundingClientRect();
    width = rect.width;
    height = Math.max(280, rect.height);

    nodes = tags.map((t) => ({
      ...t,
      r: radiusScale(t.count),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const sim = forceSimulation(nodes)
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide((d) => d.r + 3).strength(0.8))
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(height / 2).strength(0.05))
      .on('tick', () => {
        nodes = [...nodes];
      });

    return () => sim.stop();
  });

  function handleMouseEnter(i, event) {
    hoveredIndex = i;
    const rect = svgEl.getBoundingClientRect();
    tooltipX = event.clientX - rect.left;
    tooltipY = event.clientY - rect.top - 10;
  }

  function handleMouseLeave() {
    hoveredIndex = -1;
  }

  function tierClass(count) {
    const max = Math.max(...tags.map((t) => t.count), 1);
    const ratio = count / max;
    if (ratio > 0.66) return 'bubble--high';
    if (ratio > 0.33) return 'bubble--mid';
    return 'bubble--low';
  }
</script>

<div class="trend-bubbles">
  <svg bind:this={svgEl} viewBox="0 0 {width} {height}" role="img" aria-label="熱門標籤氣泡圖">
    {#each nodes as node, i}
      <g
        transform="translate({node.x},{node.y})"
        class="bubble-group {tierClass(node.count)}"
        class:bubble-group--hovered={hoveredIndex === i}
        on:mouseenter={(e) => handleMouseEnter(i, e)}
        on:mouseleave={handleMouseLeave}
        role="listitem"
      >
        <circle r={node.r} />
        {#if node.r >= 30}
          <text
            text-anchor="middle"
            dominant-baseline="central"
            class="bubble-label"
          >{node.tag}</text>
        {/if}
      </g>
    {/each}
  </svg>

  {#if hoveredIndex >= 0 && nodes[hoveredIndex]}
    <div class="tooltip" style="left:{tooltipX}px;top:{tooltipY}px">
      <strong>{nodes[hoveredIndex].tag}</strong>
      <span>{nodes[hoveredIndex].count} 次</span>
    </div>
  {/if}
</div>

<noscript>
  <p>熱門標籤：{tags.map((t) => `${t.tag}（${t.count} 次）`).join('、')}</p>
</noscript>

<style>
  .trend-bubbles {
    position: relative;
    border-radius: var(--radius-card);
    border: 1px solid var(--color-fog);
    background-color: white;
    min-height: 280px;
    overflow: hidden;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 280px;
  }

  .bubble-group circle {
    transition: transform 0.2s ease;
    cursor: default;
  }

  .bubble--high circle {
    fill: var(--color-teal);
  }

  .bubble--mid circle {
    fill: color-mix(in oklch, var(--color-teal) 60%, white);
  }

  .bubble--low circle {
    fill: color-mix(in oklch, var(--color-teal) 30%, white);
  }

  .bubble-group--hovered circle {
    transform: scale(1.1);
  }

  .bubble-label {
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    font-weight: 600;
    fill: white;
    pointer-events: none;
  }

  .bubble--low .bubble-label {
    fill: var(--color-ink);
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-sm);
    background-color: var(--color-ink);
    color: white;
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
</style>
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -5`
Expected: Build succeeds (component not yet used in any page)

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/TrendBubbles.svelte
git commit -m "feat: add TrendBubbles d3-force bubble chart component

SVG-based bubble chart using d3-force for layout. Each bubble
represents a tag sized by frequency. Hover shows tooltip with
count. Three color tiers via color-mix().

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Integrate TrendBubbles into pages

**Files:**
- Modify: `src/pages/index.astro:1-13,469-477,995-1026`
- Modify: `src/pages/news/index.astro:1-7,111-121,309-336`

- [ ] **Step 1: Update `src/pages/index.astro` — add import and data**

Add import after line 12 (`import HeroParticles...`):

```astro
import TrendBubbles from '@/components/charts/TrendBubbles.svelte';
import { getTopTags } from '@/utils/tag-stats';
```

Add data fetch after the existing collection queries in the frontmatter (before the closing `---`):

```astro
const topTags = await getTopTags();
```

- [ ] **Step 2: Update `src/pages/index.astro` — replace placeholder**

Replace lines 469-477:

```astro
        <div class="trends-layout__right">
          <div class="trends-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span class="trends-placeholder__title">趨勢圖表</span>
            <span class="trends-placeholder__subtitle">即將推出</span>
          </div>
        </div>
```

With:

```astro
        <div class="trends-layout__right">
          <TrendBubbles tags={topTags} client:visible />
        </div>
```

- [ ] **Step 3: Update `src/pages/index.astro` — remove placeholder styles**

Remove the following CSS rules from the `<style>` block (lines 995-1025):

```css
  .trends-placeholder { ... }
  .trends-placeholder :global(svg) { ... }
  .trends-placeholder__title { ... }
  .trends-placeholder__subtitle { ... }
```

- [ ] **Step 4: Update `src/pages/news/index.astro` — add import and data**

Add imports after line 7 (`import { getCollection, getEntry } from 'astro:content';`):

```astro
import TrendBubbles from '@/components/charts/TrendBubbles.svelte';
import { getTopTags } from '@/utils/tag-stats';
```

Add data fetch in the frontmatter (after existing data queries, before closing `---`):

```astro
const topTags = await getTopTags();
```

- [ ] **Step 5: Update `src/pages/news/index.astro` — replace placeholder**

Replace lines 111-121:

```astro
    <!-- Section 3: Trend Radar Placeholder -->
    <section class="news-section">
      <h2 class="news-section__title">健康議題雷達</h2>
      <div class="trend-chart-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <span class="trend-chart-placeholder__title">趨勢圖表</span>
        <span class="trend-chart-placeholder__subtitle">D3 互動圖表即將推出</span>
      </div>
    </section>
```

With:

```astro
    <!-- Section 3: Trend Radar -->
    <section class="news-section">
      <h2 class="news-section__title">健康議題雷達</h2>
      <TrendBubbles tags={topTags} client:visible />
    </section>
```

- [ ] **Step 6: Update `src/pages/news/index.astro` — remove placeholder styles**

Remove from `<style>` block (lines 309-336):

```css
  /* Trend chart placeholder */
  .trend-chart-placeholder { ... }
  .trend-chart-placeholder__title { ... }
  .trend-chart-placeholder__subtitle { ... }
```

- [ ] **Step 7: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/pages/index.astro src/pages/news/index.astro
git commit -m "feat: integrate TrendBubbles into home and news pages

Replace placeholder blocks with live d3-force bubble chart.
Data sourced from all collections via getTopTags() utility.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Add pathwaySteps schema and demo data

**Files:**
- Modify: `src/content.config.ts:126`
- Modify: `src/content/ingredients/vitamin-c.mdx:23`

- [ ] **Step 1: Update `src/content.config.ts` — add pathwaySteps field**

After line 126 (`mechanism: z.string().optional(),`), add:

```typescript
    pathwaySteps: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          enzyme: z.string().optional(),
        }),
      )
      .optional(),
```

- [ ] **Step 2: Update `src/content/ingredients/vitamin-c.mdx` — add pathwaySteps data**

After line 23 (the `mechanism:` field), add:

```yaml
pathwaySteps:
  - name: "抗壞血酸"
    description: "維他命 C 的活性形式，作為電子供體參與反應"
  - name: "電子轉移"
    description: "捐出一個電子，形成抗壞血酸自由基（半穩定態）"
    enzyme: "抗壞血酸氧化酶"
  - name: "脯胺酸羥化"
    description: "羥化脯胺酸殘基，為膠原蛋白三螺旋結構所必需"
    enzyme: "脯胺酸羥化酶"
  - name: "膠原蛋白合成"
    description: "穩定的三螺旋膠原蛋白分子組裝完成"
  - name: "去氫抗壞血酸"
    description: "氧化態，可被還原酶或穀胱甘肽還原回活性形式"
    enzyme: "去氫抗壞血酸還原酶"
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -5`
Expected: Build succeeds (schema change is backward-compatible since field is optional)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/ingredients/vitamin-c.mdx
git commit -m "feat: add pathwaySteps schema field for ingredient metabolic pathways

Optional array of {name, description, enzyme?} steps. Includes
vitamin C demo data showing ascorbic acid metabolic pathway.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Create PathwayDiagram component

**Files:**
- Create: `src/components/charts/PathwayDiagram.svelte`

- [ ] **Step 1: Create `src/components/charts/PathwayDiagram.svelte`**

```svelte
<script>
  /** @type {{ name: string; description: string; enzyme?: string }[]} */
  export let steps = [];

  let hoveredIndex = -1;
  let tooltipX = 0;
  let tooltipY = 0;
  let containerEl;

  const NODE_W = 100;
  const NODE_H = 44;
  const GAP = 60;
  const PADDING = 24;

  $: totalW = steps.length * NODE_W + (steps.length - 1) * GAP + PADDING * 2;
  $: totalH = NODE_H + PADDING * 2 + 24;

  function nodeX(i) {
    return PADDING + i * (NODE_W + GAP);
  }

  function handleMouseEnter(i, event) {
    hoveredIndex = i;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      tooltipX = event.clientX - rect.left;
      tooltipY = event.clientY - rect.top - 10;
    }
  }

  function handleMouseLeave() {
    hoveredIndex = -1;
  }
</script>

<div class="pathway-diagram" bind:this={containerEl}>
  <h3 class="pathway-title">機制與代謝路徑</h3>

  <div class="pathway-scroll">
    <svg viewBox="0 0 {totalW} {totalH}" role="img" aria-label="代謝路徑圖">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-fog)" />
        </marker>
      </defs>

      {#each steps as step, i}
        <!-- Node -->
        <g
          transform="translate({nodeX(i)},{PADDING})"
          class="pathway-node"
          class:pathway-node--hovered={hoveredIndex === i}
          on:mouseenter={(e) => handleMouseEnter(i, e)}
          on:mouseleave={handleMouseLeave}
          role="listitem"
        >
          <rect
            width={NODE_W}
            height={NODE_H}
            rx="8"
            ry="8"
          />
          <text
            x={NODE_W / 2}
            y={NODE_H / 2}
            text-anchor="middle"
            dominant-baseline="central"
            class="node-label"
          >{step.name}</text>
        </g>

        <!-- Arrow + enzyme label -->
        {#if i < steps.length - 1}
          <line
            x1={nodeX(i) + NODE_W}
            y1={PADDING + NODE_H / 2}
            x2={nodeX(i + 1)}
            y2={PADDING + NODE_H / 2}
            stroke="var(--color-fog)"
            stroke-width="2"
            marker-end="url(#arrow)"
          />
          {#if steps[i + 1].enzyme}
            <text
              x={nodeX(i) + NODE_W + GAP / 2}
              y={PADDING - 4}
              text-anchor="middle"
              class="enzyme-label"
            >{steps[i + 1].enzyme}</text>
          {/if}
        {/if}
      {/each}
    </svg>
  </div>

  {#if hoveredIndex >= 0 && steps[hoveredIndex]}
    <div class="tooltip" style="left:{tooltipX}px;top:{tooltipY}px">
      {steps[hoveredIndex].description}
    </div>
  {/if}
</div>

<noscript>
  <ol>
    {#each steps as step}
      <li><strong>{step.name}</strong>{step.enzyme ? `（${step.enzyme}）` : ''}：{step.description}</li>
    {/each}
  </ol>
</noscript>

<style>
  .pathway-diagram {
    position: relative;
    padding: 1.5rem;
    border-radius: var(--radius-card);
    border: 1px solid var(--color-fog);
    background-color: white;
  }

  .pathway-title {
    font-family: var(--font-sans);
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: 1rem;
  }

  .pathway-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  svg {
    display: block;
    min-width: 100%;
    height: auto;
  }

  .pathway-node rect {
    fill: white;
    stroke: var(--color-teal);
    stroke-width: 2;
    transition: stroke 0.2s ease;
    cursor: default;
  }

  .pathway-node--hovered rect {
    stroke: var(--color-coral);
    stroke-width: 2.5;
  }

  .node-label {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    fill: var(--color-ink);
    pointer-events: none;
  }

  .enzyme-label {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 500;
    fill: var(--color-cat-ingredient);
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    background-color: var(--color-ink);
    color: white;
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    max-width: 240px;
    pointer-events: none;
    z-index: 10;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .pathway-scroll {
      margin: 0 -1.5rem;
      padding: 0 1.5rem;
    }
  }
</style>
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/PathwayDiagram.svelte
git commit -m "feat: add PathwayDiagram SVG node-link component

Horizontal node-link diagram for metabolic pathways. Pure SVG +
Svelte (no d3). Nodes show step names, arrows show enzyme names.
Hover reveals description tooltip. Horizontal scroll on mobile.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Integrate PathwayDiagram into ingredient page

**Files:**
- Modify: `src/pages/ingredients/[slug].astro:1-10,71-95`

- [ ] **Step 1: Update `src/pages/ingredients/[slug].astro` — add import**

Add after line 6 (`import EvidenceScale from '@/components/charts/EvidenceScale.svelte';`):

```astro
import PathwayDiagram from '@/components/charts/PathwayDiagram.svelte';
```

- [ ] **Step 2: Update `src/pages/ingredients/[slug].astro` — add PathwayDiagram before EvidenceScale**

Before line 93 (`<EvidenceScale uses={data.uses} client:visible />`), add:

```astro
  {data.pathwaySteps && data.pathwaySteps.length > 0 ? (
    <PathwayDiagram steps={data.pathwaySteps} client:visible />
  ) : data.mechanism ? (
    <section class="mechanism-text">
      <h3>作用機制</h3>
      <p>{data.mechanism}</p>
    </section>
  ) : null}
```

- [ ] **Step 3: Add mechanism-text styles**

Add to the `<style>` block in `src/pages/ingredients/[slug].astro`:

```css
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
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -10`
Expected: Build succeeds. Vitamin C page should now render PathwayDiagram. Other ingredients without `pathwaySteps` show mechanism text or nothing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ingredients/\[slug\].astro
git commit -m "feat: integrate PathwayDiagram into ingredient pages

Shows interactive pathway diagram when pathwaySteps data exists,
falls back to mechanism text, or hides section entirely.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Install satori and sharp

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install satori and sharp**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm add satori && pnpm add -D sharp`

- [ ] **Step 2: Verify install**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm ls satori sharp`
Expected: Both packages listed

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add satori and sharp for OG image generation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Download fonts for satori

**Files:**
- Create: `src/assets/fonts/NotoSansTC-Regular.ttf`
- Create: `src/assets/fonts/NotoSansTC-Bold.ttf`

- [ ] **Step 1: Create fonts directory and download fonts**

```bash
mkdir -p /Users/lightman/weiqi.kids/evidencetoday.news/src/assets/fonts

# Download Noto Sans TC from Google Fonts GitHub release
# Regular (400)
curl -L -o /Users/lightman/weiqi.kids/evidencetoday.news/src/assets/fonts/NotoSansTC-Regular.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"

# Bold (700) — Google variable fonts bundle all weights in one file
# We use the same variable font file, satori handles weight selection
cp /Users/lightman/weiqi.kids/evidencetoday.news/src/assets/fonts/NotoSansTC-Regular.ttf \
   /Users/lightman/weiqi.kids/evidencetoday.news/src/assets/fonts/NotoSansTC-Bold.ttf
```

Note: Google Fonts provides Noto Sans TC as a single variable font file containing all weights. If the URL above doesn't work, manually download from https://fonts.google.com/noto/specimen/Noto+Sans+TC (click "Download family") and extract the `.ttf` file.

- [ ] **Step 2: Verify font files exist and have reasonable size**

Run: `ls -lh /Users/lightman/weiqi.kids/evidencetoday.news/src/assets/fonts/`
Expected: Two `.ttf` files, each several MB

- [ ] **Step 3: Commit**

```bash
git add src/assets/fonts/
git commit -m "assets: add Noto Sans TC fonts for OG image generation

Variable font TTF files used by satori at build time only.
Not served to browsers (kept in src/assets, not public/).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Create OG image utilities

**Files:**
- Create: `src/utils/og-fonts.ts`
- Create: `src/utils/og-template.ts`

- [ ] **Step 1: Create `src/utils/og-fonts.ts`**

```typescript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FONT_DIR = new URL('../assets/fonts/', import.meta.url);

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

export async function loadFonts() {
  if (fontCache) return fontCache;

  const [regular, bold] = await Promise.all([
    readFile(fileURLToPath(new URL('NotoSansTC-Regular.ttf', FONT_DIR))),
    readFile(fileURLToPath(new URL('NotoSansTC-Bold.ttf', FONT_DIR))),
  ]);

  fontCache = {
    regular: regular.buffer as ArrayBuffer,
    bold: bold.buffer as ArrayBuffer,
  };

  return fontCache;
}
```

- [ ] **Step 2: Create `src/utils/og-template.ts`**

```typescript
import satori from 'satori';
import { loadFonts } from './og-fonts';

const CATEGORY_LABELS: Record<string, string> = {
  articles: '深度文章',
  myths: '迷思查核',
  ingredients: '原料檢視',
  podcasts: 'Podcast',
  videos: '影片',
};

// oklch → hex approximations (satori doesn't support oklch)
// These should be verified with a converter tool
const CATEGORY_COLORS: Record<string, string> = {
  articles: '#2d8185',
  myths: '#b85a3a',
  ingredients: '#3a8a4a',
  podcasts: '#6a5aad',
  videos: '#8a7030',
};

const TEAL_HEX = '#1a6b6e';

export async function generateOgSvg(title: string, collection: string): Promise<string> {
  const fonts = await loadFonts();
  const label = CATEGORY_LABELS[collection];
  const pillColor = CATEGORY_COLORS[collection] || TEAL_HEX;

  const markup = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '1200px',
        height: '630px',
        backgroundColor: TEAL_HEX,
        padding: '60px 80px',
      },
      children: [
        // Category pill (skip for website/homepage)
        ...(label
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    marginBottom: '24px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          backgroundColor: pillColor,
                          color: 'white',
                          padding: '6px 20px',
                          borderRadius: '9999px',
                          fontSize: '20px',
                          fontWeight: 700,
                        },
                        children: label,
                      },
                    },
                  ],
                },
              },
            ]
          : []),
        // Title
        {
          type: 'div',
          props: {
            style: {
              color: 'white',
              fontSize: '48px',
              fontWeight: 700,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            },
            children: title,
          },
        },
        // Separator
        {
          type: 'div',
          props: {
            style: {
              marginTop: 'auto',
              borderTop: '1px solid rgba(255, 255, 255, 0.4)',
              paddingTop: '20px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 400,
                  },
                  children: '本日有據 Evidence Today',
                },
              },
            ],
          },
        },
      ],
    },
  };

  return satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Noto Sans TC',
        data: fonts.regular,
        weight: 400,
        style: 'normal' as const,
      },
      {
        name: 'Noto Sans TC',
        data: fonts.bold,
        weight: 700,
        style: 'normal' as const,
      },
    ],
  });
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -5`
Expected: Build succeeds (utilities not yet imported by any endpoint)

- [ ] **Step 4: Commit**

```bash
git add src/utils/og-fonts.ts src/utils/og-template.ts
git commit -m "feat: add OG image font loader and template utilities

og-fonts.ts loads Noto Sans TC from src/assets/fonts/ with caching.
og-template.ts generates 1200x630 SVG via satori with brand colors,
category pill, title, and site name.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Create OG image endpoint

**Files:**
- Create: `src/pages/og/[...slug].png.ts`

- [ ] **Step 1: Create `src/pages/og/[...slug].png.ts`**

```typescript
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import { generateOgSvg } from '@/utils/og-template';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos'] as const;

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { slug: string }; props: { title: string; collection: string } }[] = [];

  for (const collection of COLLECTIONS) {
    const entries = await getCollection(collection, ({ data }) => !data.draft);
    for (const entry of entries) {
      paths.push({
        params: { slug: `${collection}/${stripExt(entry.id)}` },
        props: { title: entry.data.title, collection },
      });
    }
  }

  // Homepage
  paths.push({
    params: { slug: 'index' },
    props: { title: '本日有據 Evidence Today', collection: 'website' },
  });

  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { title, collection } = props as { title: string; collection: string };
  const svg = await generateOgSvg(title, collection);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -20`
Expected: Build succeeds. Should see OG image routes being generated in output (e.g., `/og/articles/omega-3-guide.png`, `/og/index.png`).

- [ ] **Step 3: Verify generated files exist**

Run: `ls /Users/lightman/weiqi.kids/evidencetoday.news/dist/og/ 2>/dev/null && find /Users/lightman/weiqi.kids/evidencetoday.news/dist/og -name "*.png" | head -5`
Expected: PNG files under `dist/og/`

- [ ] **Step 4: Commit**

```bash
git add src/pages/og/
git commit -m "feat: add OG image static endpoint

Generates PNG images for all content pages at build time via
satori + sharp. Each content type gets a branded card with
category pill and title.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Integrate OG images into layouts

**Files:**
- Modify: `src/layouts/Base.astro:17`
- Modify: `src/pages/articles/[slug].astro:91`
- Modify: `src/pages/myths/[slug].astro:79`
- Modify: `src/pages/ingredients/[slug].astro:74`
- Modify: `src/pages/videos/[slug].astro:74`
- Modify: `src/pages/podcasts/[slug].astro:88`

- [ ] **Step 1: Update `src/layouts/Base.astro` — change default ogImage**

Change line 17:

```astro
  ogImage = '/og-default.jpg',
```

To:

```astro
  ogImage = '/og/index.png',
```

- [ ] **Step 2: Update `src/pages/articles/[slug].astro` — ogImage auto fallback**

Change line 91:

```astro
  ogImage={data.coverImage}
```

To:

```astro
  ogImage={data.coverImage || `/og/articles/${slug}.png`}
```

- [ ] **Step 3: Update `src/pages/myths/[slug].astro` — ogImage auto fallback**

Change line 79:

```astro
  ogImage={data.coverImage}
```

To:

```astro
  ogImage={data.coverImage || `/og/myths/${slug}.png`}
```

- [ ] **Step 4: Update `src/pages/ingredients/[slug].astro` — ogImage auto fallback**

Change line 74:

```astro
  ogImage={data.coverImage}
```

To:

```astro
  ogImage={data.coverImage || `/og/ingredients/${slug}.png`}
```

- [ ] **Step 5: Update `src/pages/videos/[slug].astro` — ogImage auto fallback**

Change line 74:

```astro
  ogImage={data.coverImage}
```

To:

```astro
  ogImage={data.coverImage || `/og/videos/${slug}.png`}
```

- [ ] **Step 6: Update `src/pages/podcasts/[slug].astro` — ogImage auto fallback**

Change line 88:

```astro
  ogImage={data.coverImage}
```

To:

```astro
  ogImage={data.coverImage || `/og/podcasts/${slug}.png`}
```

- [ ] **Step 7: Verify build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 8: Spot-check OG meta tag in built HTML**

Run: `grep 'og:image' /Users/lightman/weiqi.kids/evidencetoday.news/dist/articles/omega-3-guide/index.html`
Expected: Should contain `/og/articles/omega-3-guide.png` (or the coverImage if set)

- [ ] **Step 9: Commit**

```bash
git add src/layouts/Base.astro src/pages/articles/\[slug\].astro src/pages/myths/\[slug\].astro src/pages/ingredients/\[slug\].astro src/pages/videos/\[slug\].astro src/pages/podcasts/\[slug\].astro
git commit -m "feat: wire auto-generated OG images into all content layouts

Each [slug].astro page falls back to /og/{collection}/{slug}.png
when no coverImage is specified. Base layout default changed from
/og-default.jpg to /og/index.png.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full clean build**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && rm -rf dist && pnpm build 2>&1 | tail -20`
Expected: Build completes successfully with all pages + OG images generated

- [ ] **Step 2: Verify all key outputs exist**

Run:

```bash
echo "=== OG Images ===" && \
find /Users/lightman/weiqi.kids/evidencetoday.news/dist/og -name "*.png" | wc -l && \
echo "=== Lighthouse config ===" && \
cat /Users/lightman/weiqi.kids/evidencetoday.news/lighthouserc.json | head -3 && \
echo "=== Ingredient page has PathwayDiagram ===" && \
grep -l "PathwayDiagram\|pathway-diagram" /Users/lightman/weiqi.kids/evidencetoday.news/dist/ingredients/vitamin-c/index.html && \
echo "=== Home page has TrendBubbles ===" && \
grep -c "trend-bubbles\|bubble-group" /Users/lightman/weiqi.kids/evidencetoday.news/dist/index.html
```

Expected: OG PNG count > 0, lighthouserc exists, pathway and bubble references found in HTML

- [ ] **Step 3: Dev server visual check**

Run: `cd /Users/lightman/weiqi.kids/evidencetoday.news && pnpm dev`

Manually verify in browser:
1. `http://localhost:4321/` → TrendBubbles visible in trends section (right column)
2. `http://localhost:4321/news/` → TrendBubbles visible
3. `http://localhost:4321/ingredients/vitamin-c/` → PathwayDiagram visible above EvidenceScale
4. View page source → og:image meta tag points to `/og/.../*.png`
