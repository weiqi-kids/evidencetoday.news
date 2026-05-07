# Evidence Today Plan 1: Foundation Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete static website with all pages, layouts, components, and content collections — a fully browsable site without d3.js interactivity or SEO/AEO endpoints.

**Architecture:** Astro v5 static site with Svelte islands for interactive components (FAQ accordion, TOC scroll spy, search, mobile menu). Content managed via Astro Content Collections with Zod schemas. Design system built on oklch CSS custom properties with color-mix() for derived colors.

**Tech Stack:** Astro 5, Svelte 5, pnpm, TypeScript, oklch CSS, Google Fonts (self-hosted)

**Spec:** `docs/superpowers/specs/2026-05-07-evidencetoday-design.md` (v1.3)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/content.config.ts`
- Create: `src/env.d.ts`
- Create: `public/CNAME`
- Create: `public/robots.txt`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/lightman/weiqi.kids/evidencetoday.news
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "evidencetoday-news",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm add astro @astrojs/svelte @astrojs/sitemap @astrojs/mdx svelte
pnpm add -D typescript @types/node
```

- [ ] **Step 4: Create astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://evidencetoday.news',
  integrations: [svelte(), sitemap(), mdx()],
  output: 'static',
  build: { format: 'directory' },
});
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 6: Create src/env.d.ts**

```typescript
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 7: Create public files**

`public/CNAME`:
```
evidencetoday.news
```

`public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://evidencetoday.news/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
dist/
.astro/
.DS_Store
*.log
```

- [ ] **Step 9: Create empty content.config.ts placeholder**

```typescript
import { defineCollection, z } from 'astro:content';

// Collections will be defined in Task 3
export const collections = {};
```

- [ ] **Step 10: Verify build**

```bash
pnpm build
```

Expected: Build succeeds (no pages yet, but config is valid).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize Astro project with Svelte, sitemap, MDX integrations"
```

---

### Task 2: Design Tokens & Typography

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/typography.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Create tokens.css**

```css
:root {
  /* Brand colors (oklch) */
  --color-teal: oklch(0.38 0.08 200);
  --color-navy: oklch(0.25 0.03 245);
  --color-paper: oklch(0.96 0.01 90);
  --color-ink: oklch(0.22 0.01 260);
  --color-fog: oklch(0.89 0.01 220);
  --color-coral: oklch(0.56 0.18 28);

  /* Category colors */
  --color-cat-article: oklch(0.45 0.09 195);
  --color-cat-myth: oklch(0.48 0.14 30);
  --color-cat-ingredient: oklch(0.48 0.10 140);
  --color-cat-podcast: oklch(0.45 0.10 280);
  --color-cat-video: oklch(0.45 0.12 65);
  --color-cat-news: oklch(0.42 0.08 230);

  /* Verdict colors */
  --color-verdict-true: oklch(0.48 0.12 160);
  --color-verdict-false: oklch(0.42 0.14 25);
  --color-verdict-insufficient: oklch(0.50 0.05 240);
  --color-verdict-contextual: oklch(0.50 0.10 75);

  /* Derived colors */
  --color-teal-subtle: color-mix(in oklch, var(--color-teal) 8%, var(--color-paper));
  --color-teal-light: color-mix(in oklch, var(--color-teal) 14%, var(--color-paper));
  --color-teal-hover: color-mix(in oklch, var(--color-teal) 85%, black);
  --color-coral-hover: color-mix(in oklch, var(--color-coral) 85%, black);

  /* Dark background text */
  --color-on-dark-heading: oklch(1.00 0 0);
  --color-on-dark-body: oklch(0.85 0.01 220);
  --color-on-dark-meta: oklch(0.75 0.01 220);
  --color-on-dark-link: oklch(0.75 0.15 28);

  /* Spacing */
  --space-page-x: clamp(1rem, 0.5rem + 2vw, 2rem);
  --space-page-y: clamp(2rem, 1.5rem + 2vw, 3rem);
  --space-card-gap: clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
  --space-section-gap: clamp(2.5rem, 2rem + 2vw, 4rem);

  /* Border radius */
  --radius-pill: 9999px;
  --radius-card: 1.5rem;
  --radius-sm: 0.5rem;

  /* Shadows */
  --shadow-card: 0 1px 3px oklch(0 0 0 / 0.08);
  --shadow-card-hover: 0 4px 12px oklch(0 0 0 / 0.12);
}
```

- [ ] **Step 2: Create typography.css**

```css
@font-face {
  font-family: 'Noto Sans TC';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/NotoSansTC-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Noto Sans TC';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/NotoSansTC-Bold.woff2') format('woff2');
}

@font-face {
  font-family: 'Noto Serif TC';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/NotoSerifTC-Bold.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/Inter-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/Inter-Bold.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/SourceSerif4-SemiBold.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/SourceSerif4-Bold.woff2') format('woff2');
}

:root {
  --font-serif: 'Noto Serif TC', 'Source Serif 4', serif;
  --font-sans: 'Noto Sans TC', 'Inter', sans-serif;
  --font-ui: 'Inter', 'Noto Sans TC', sans-serif;
  --font-display: 'Source Serif 4', 'Noto Serif TC', serif;

  --text-h1: clamp(2rem, 1.5rem + 2vw, 3rem);
  --text-h2: clamp(1.625rem, 1.25rem + 1.5vw, 2rem);
  --text-h3: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-body: clamp(1.0625rem, 1rem + 0.25vw, 1.125rem);
  --text-lead: clamp(1.125rem, 1rem + 0.5vw, 1.25rem);
  --text-meta: clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem);
  --text-caption: 0.875rem;
  --text-badge: 0.75rem;
}
```

- [ ] **Step 3: Create global.css**

```css
@import './tokens.css';
@import './typography.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: 1.8;
  color: var(--color-ink);
  background-color: var(--color-paper);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.3;
  font-weight: 700;
  color: var(--color-ink);
}

h1 {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  line-height: 1.2;
}

h2 {
  font-size: var(--text-h2);
}

h3 {
  font-size: var(--text-h3);
}

a {
  color: var(--color-teal);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

a:hover {
  text-decoration-thickness: 2px;
}

a:focus-visible {
  outline: 2px solid var(--color-teal);
  outline-offset: 2px;
  border-radius: 2px;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

button {
  cursor: pointer;
  font: inherit;
}

/* Skip to content */
.skip-to-content {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: var(--color-teal);
  color: white;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.skip-to-content:focus {
  top: 1rem;
}

/* Prose (Markdown content) */
.prose {
  max-width: 68ch;
}

.prose p {
  margin-bottom: 1.5em;
}

.prose h2 {
  margin-top: 2em;
  margin-bottom: 0.75em;
}

.prose h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose ul,
.prose ol {
  margin-bottom: 1.5em;
  padding-left: 1.5em;
}

.prose li {
  margin-bottom: 0.5em;
}

.prose blockquote {
  border-left: 4px solid var(--color-teal);
  background: var(--color-paper);
  padding: 1rem 1.5rem;
  margin: 1.5em 0;
}

.prose a {
  text-decoration: underline;
}

/* Utility */
.container {
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 var(--space-page-x);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 767px) {
  .prose p {
    margin-bottom: 1.25em;
  }

  .prose h2 {
    margin-top: 1.5em;
  }
}
```

- [ ] **Step 4: Download fonts**

```bash
mkdir -p public/fonts
# Download from Google Fonts API (woff2 format)
# Noto Sans TC 400, 700
# Noto Serif TC 700
# Inter 400, 500, 700
# Source Serif 4 600, 700
```

Note: Font files need to be downloaded manually from Google Fonts and placed in `public/fonts/`. Use the subset for Traditional Chinese (TC) to keep file sizes reasonable.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ public/fonts/ public/robots.txt public/CNAME
git commit -m "feat: add design tokens (oklch), typography, and global CSS"
```

---

### Task 3: Content Collection Schemas

**Files:**
- Modify: `src/content.config.ts`

- [ ] **Step 1: Define all collection schemas**

```typescript
import { defineCollection, z } from 'astro:content';

const referenceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  type: z.enum(['meta-analysis', 'rct', 'observational', 'review', 'guideline', 'other']),
});

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    author: z.string(),
    reviewer: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    tldr: z.string(),
    readingTime: z.number(),
    editorReviewed: z.boolean().default(true),
    featured: z.boolean().default(false),
    disclosure: z.string().optional(),
    coverImage: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    references: z.array(referenceSchema).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const myths = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    verdict: z.enum(['true', 'false', 'insufficient', 'contextual']),
    verdictSummary: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    whyItSpreads: z.string(),
    actionAdvice: z.string(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    evidence: z.array(z.object({
      level: z.enum(['meta-analysis', 'rct', 'observational', 'animal', 'in-vitro']),
      summary: z.string(),
      references: z.array(z.string()).optional(),
    })).min(1),
    references: z.array(referenceSchema),
    relatedArticles: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const ingredients = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    sortKey: z.string(),
    description: z.string().max(155),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    tags: z.array(z.string()),
    introduction: z.string(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    disclosure: z.string().optional(),
    uses: z.array(z.object({
      purpose: z.string(),
      evidenceLevel: z.enum(['meta-analysis', 'rct', 'observational', 'animal', 'in-vitro']),
      summary: z.string(),
    })),
    mechanism: z.string().optional(),
    safety: z.object({
      general: z.string(),
      interactions: z.array(z.object({
        substance: z.string(),
        description: z.string(),
      })).optional(),
      populations: z.array(z.object({
        group: z.string(),
        note: z.string(),
      })).optional(),
    }).optional(),
    references: z.array(referenceSchema),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const podcasts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    episodeNumber: z.number(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    duration: z.string(),
    audioUrl: z.string().url().optional(),
    embedUrl: z.string().url().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    chapters: z.array(z.object({
      time: z.string(),
      title: z.string(),
    })).optional(),
    showNotes: z.array(z.string()).optional(),
    references: z.array(referenceSchema).optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

const videos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(155),
    youtubeId: z.string(),
    duration: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    tldr: z.string(),
    transcript: z.string().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    references: z.array(referenceSchema).optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    source: z.string(),
    sourceUrl: z.string().url().optional(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()),
    summary: z.string(),
    editorPick: z.boolean().default(false),
    editorComment: z.string().optional(),
    relatedArticles: z.array(z.string()).optional(),
    relatedMyths: z.array(z.string()).optional(),
    relatedIngredients: z.array(z.string()).optional(),
    relatedVideos: z.array(z.string()).optional(),
    relatedPodcasts: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  articles,
  myths,
  ingredients,
  podcasts,
  videos,
  news,
};
```

- [ ] **Step 2: Create content directories**

```bash
mkdir -p src/content/{articles,myths,ingredients,podcasts,videos,news}
mkdir -p src/data/policies
```

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts src/content/ src/data/
git commit -m "feat: define Content Collection schemas for all 6 content types"
```

---

### Task 4: Sample Content

**Files:**
- Create: `src/content/articles/omega-3-guide.mdx`
- Create: `src/content/myths/vitamin-c-cold.mdx`
- Create: `src/content/ingredients/vitamin-c.mdx`
- Create: `src/content/podcasts/ep01-supplements.mdx`
- Create: `src/content/videos/sprouted-potato.mdx`
- Create: `src/content/news/weekly-radar-2026-w18.md`

- [ ] **Step 1: Create sample article**

`src/content/articles/omega-3-guide.mdx`:
```mdx
---
title: "Omega-3 怎麼吃才有根據？EPA、DHA 與日常補充的關鍵差異"
description: "從常見迷思、研究證據到日常使用情境，整理成一般人看得懂的完整指南。"
author: "編輯室"
reviewer: "主編"
publishDate: 2026-04-03
updatedDate: 2026-04-03
tags: ["omega-3", "EPA", "DHA", "保健食品"]
tldr: "一般人不需要把所有研究細節背下來，但至少要知道：EPA 與 DHA 雖然都屬於 Omega-3，卻不是完全相同；看功能時，要先看研究目的、族群、劑量與期間，而不是只看一個漂亮的廣告句子。"
readingTime: 9
editorReviewed: true
featured: true
faq:
  - question: "Omega-3 跟魚油一樣嗎？"
    answer: "魚油是 Omega-3 的常見來源之一，但 Omega-3 也存在於亞麻籽油、核桃等植物性食物中。"
  - question: "每天需要吃多少 Omega-3？"
    answer: "各國建議不同，一般建議每日攝取 250-500mg EPA+DHA，但具體劑量應諮詢醫療專業人員。"
references:
  - title: "Omega-3 Fatty Acids and Cardiovascular Disease: A Systematic Review"
    url: "https://example.com/omega3-review"
    type: "meta-analysis"
  - title: "EPA vs DHA: Differential Effects on Cardiovascular Risk Factors"
    url: "https://example.com/epa-dha-rct"
    type: "rct"
relatedMyths: ["vitamin-c-cold"]
relatedIngredients: ["vitamin-c"]
draft: false
---

## EPA 與 DHA 是什麼？

Omega-3 脂肪酸是一組多元不飽和脂肪酸，其中最受關注的是 EPA（二十碳五烯酸）和 DHA（二十二碳六烯酸）。

## 研究最常討論哪些用途？

心血管健康、腦部功能、發炎反應是最常被研究的三大方向。

## 每日攝取建議

不同組織的建議範圍從 250mg 到 500mg 不等，高劑量使用（超過 2g/日）應在醫療監督下進行。
```

- [ ] **Step 2: Create sample myth**

`src/content/myths/vitamin-c-cold.mdx`:
```mdx
---
title: "感冒時狂補維生素 C 一定有效？"
description: "不是一句有效或沒效就能講完，而要看族群、劑量、時間點與期待目的。"
verdict: "contextual"
verdictSummary: "維生素 C 對一般人感冒後的症狀縮短效果有限，但對高強度運動者的預防有較明確的證據支持。關鍵在於族群、劑量與使用時機。"
publishDate: 2026-04-01
updatedDate: 2026-04-01
tags: ["維生素C", "感冒", "免疫"]
whyItSpreads: "維生素 C 與免疫力的連結在大眾文化中根深蒂固，加上維生素 C 容易取得且被認為安全，形成了「多吃一定沒壞處」的直覺。"
actionAdvice: "日常飲食中攝取足量維生素 C（蔬果為主）已足夠。感冒後大量補充的效益有限，不建議以此取代休息和就醫。"
featured: true
evidence:
  - level: "meta-analysis"
    summary: "Cochrane 系統性回顧顯示，常規補充維生素 C 對一般人感冒發生率無顯著影響，但可能縮短感冒持續時間約 8%。"
  - level: "rct"
    summary: "針對馬拉松跑者等高強度運動族群，每日補充 200mg 以上維生素 C 可降低感冒風險約 50%。"
  - level: "observational"
    summary: "觀察性研究顯示，維生素 C 攝取不足的族群補充後可能改善免疫功能，但證據等級較低。"
references:
  - title: "Vitamin C for preventing and treating the common cold (Cochrane Review)"
    url: "https://example.com/cochrane-vitc"
    type: "meta-analysis"
relatedArticles: ["omega-3-guide"]
relatedIngredients: ["vitamin-c"]
draft: false
---

## 結論摘要

維生素 C 對一般人感冒後的症狀縮短效果有限，但對高強度運動者的預防有較明確的證據支持。

## 為什麼會流傳

維生素 C 與免疫力的連結在大眾文化中根深蒂固。

## 證據整理

### Meta-analysis / 系統性回顧

Cochrane 系統性回顧分析了 29 項試驗，結果顯示常規補充維生素 C 對一般人感冒發生率無顯著影響。

### 隨機對照試驗（RCT）

針對高強度運動族群的試驗顯示較明確的預防效果。

### 觀察性研究

攝取不足的族群補充後可能有益，但證據等級較低。

## 一般人怎麼做最安全

日常飲食中攝取足量維生素 C 已足夠，感冒後大量補充的效益有限。
```

- [ ] **Step 3: Create sample ingredient**

`src/content/ingredients/vitamin-c.mdx`:
```mdx
---
title: "維生素 C"
titleEn: "Vitamin C (Ascorbic Acid)"
sortKey: "ㄨ"
description: "維生素 C 是一種水溶性維生素，研究常討論其在免疫支持、抗氧化與膠原蛋白合成中的角色。"
publishDate: 2026-04-01
updatedDate: 2026-04-01
tags: ["維生素C", "抗氧化", "免疫"]
introduction: "維生素 C（抗壞血酸）是人體無法自行合成的必需營養素，需從飲食中攝取。常見於柑橘類水果、奇異果、甜椒等食物中。"
featured: false
uses:
  - purpose: "免疫功能支持"
    evidenceLevel: "meta-analysis"
    summary: "系統性回顧顯示維生素 C 可能在高壓力條件下降低感冒風險，但對一般人的感冒預防效果有限。"
  - purpose: "抗氧化作用"
    evidenceLevel: "rct"
    summary: "多項 RCT 確認維生素 C 可降低氧化壓力標記物，但臨床意義仍在研究中。"
  - purpose: "膠原蛋白合成"
    evidenceLevel: "observational"
    summary: "維生素 C 是膠原蛋白合成的必要輔因子，缺乏會導致壞血病。"
safety:
  general: "一般成人每日攝取上限為 2000mg，超量可能導致腸胃不適或腹瀉。"
  interactions:
    - substance: "鐵劑"
      description: "維生素 C 可促進非血基質鐵的吸收，與鐵劑同時服用可能增強鐵的吸收效果。"
  populations:
    - group: "腎臟疾病患者"
      note: "高劑量維生素 C 可能增加草酸鈣腎結石風險，應諮詢醫師。"
references:
  - title: "Vitamin C for preventing and treating the common cold"
    url: "https://example.com/cochrane-vitc"
    type: "meta-analysis"
  - title: "Dietary Reference Intakes for Vitamin C"
    type: "guideline"
relatedArticles: ["omega-3-guide"]
relatedMyths: ["vitamin-c-cold"]
draft: false
---

## 是什麼

維生素 C（抗壞血酸）是人體無法自行合成的必需營養素。

## 研究常探討的用途

研究最常討論維生素 C 在免疫支持、抗氧化與膠原蛋白合成方面的角色。

## 安全性與交互作用

一般成人每日攝取上限為 2000mg。
```

- [ ] **Step 4: Create sample podcast**

`src/content/podcasts/ep01-supplements.mdx`:
```mdx
---
title: "保健食品正確的打開方式：先看需求，再談補充"
description: "把保健食品放回日常飲食與健康生活型態的脈絡，不用神化，也不要妖魔化。"
episodeNumber: 1
publishDate: 2026-03-15
duration: "32:15"
embedUrl: "https://open.spotify.com/embed/episode/example"
tags: ["保健食品", "日常補充", "飲食"]
featured: true
chapters:
  - time: "00:00"
    title: "開場：為什麼要談保健食品？"
  - time: "05:30"
    title: "常見誤解：保健食品等於藥物嗎？"
  - time: "15:00"
    title: "如何判斷自己需不需要補充？"
  - time: "25:00"
    title: "購買前要看什麼？"
showNotes:
  - "保健食品不等於藥物，不應取代均衡飲食"
  - "先評估飲食缺口，再考慮補充"
  - "注意成分標示、劑量與第三方檢驗"
relatedArticles: ["omega-3-guide"]
relatedIngredients: ["vitamin-c"]
draft: false
---

## 本集摘要

這一集我們從日常飲食出發，討論保健食品在什麼情境下值得考慮、什麼情境下其實不需要。
```

- [ ] **Step 5: Create sample video**

`src/content/videos/sprouted-potato.mdx`:
```mdx
---
title: "30 秒看懂：發芽馬鈴薯為什麼不能亂吃？"
description: "把龍葵鹼的風險、判斷方式與處理原則講成短短一支影片。"
youtubeId: "dQw4w9WgXcQ"
duration: "0:34"
publishDate: 2026-04-02
tags: ["食品安全", "馬鈴薯", "龍葵鹼"]
tldr: "發芽馬鈴薯含有龍葵鹼（茄鹼），加熱無法完全破壞。發芽、變綠或有苦味的馬鈴薯應整顆丟棄，不建議只削掉芽眼後食用。"
featured: false
relatedArticles: ["omega-3-guide"]
draft: false
---

## 文字稿

發芽馬鈴薯含有龍葵鹼，這是一種天然毒素。加熱無法完全破壞它。如果馬鈴薯已經發芽、變綠或有苦味，建議整顆丟棄。
```

- [ ] **Step 6: Create sample news**

`src/content/news/weekly-radar-2026-w18.md`:
```markdown
---
title: "腸道菌群與免疫力的新發現：Nature 最新研究摘要"
source: "Nature Medicine"
sourceUrl: "https://example.com/nature-gut-immunity"
publishDate: 2026-04-03
tags: ["腸道菌群", "免疫", "研究新知"]
summary: "一項發表在 Nature Medicine 的新研究指出，特定腸道細菌代謝物可能直接影響免疫細胞的活化路徑。"
editorPick: true
editorComment: "這項研究的規模和方法論值得關注，但目前仍在動物模型階段，離臨床應用還有距離。"
relatedIngredients: ["vitamin-c"]
draft: false
---

一項發表在 Nature Medicine 的新研究指出，特定腸道細菌代謝物可能直接影響免疫細胞的活化路徑。
```

- [ ] **Step 7: Create sample policy pages**

`src/data/policies/about.md`:
```markdown
# 關於本日有據

本日有據（Evidence Today）是一個以文章、Podcast、短影音、闢謠與原料整理為核心的健康編輯平台。

## 我們做什麼

我們透過多種內容形式，把健康議題講得有根據、可理解、可查證。

## 內容產出流程

我們的內容由 AI 輔助初稿撰寫，再經人類主編審稿把關後發佈。每篇內容都標示作者、審稿人、發佈日與最後更新日。

## 為什麼要做這個站

我們認為，健康資訊不應該只有兩種極端：過度簡化的健康農場文，或難以閱讀的學術論文。本日有據試圖在這兩者之間找到平衡。
```

`src/data/policies/medical-disclaimer.md`:
```markdown
# 醫療聲明

本站所有內容僅供一般健康資訊參考，不構成醫療診斷、治療建議或處方。

如有任何健康問題，請諮詢合格的醫療專業人員。

本站盡力確保所有內容的正確性，但不保證內容的即時性與完整性。健康資訊會隨著新研究的發表而更新，請以最新版本為準。
```

`src/data/policies/editorial-policy.md`:
```markdown
# 編輯政策

## 內容產出流程

1. **選題**：由主編根據研究趨勢、讀者需求與社群討論決定
2. **初稿**：由 AI 輔助撰寫初稿，提供結構與初步內容
3. **主編審稿**：人類主編逐段審核事實、語氣、引用來源
4. **發佈**：通過審稿後發佈，標示作者與審稿人
5. **定期更新**：重要內容定期檢視，根據新研究更新

## AI 使用聲明

本站使用 AI 工具輔助內容產出，包括初稿撰寫與資料整理。所有 AI 產出的內容都經過人類主編審核後才會發佈。AI 工具不會取代編輯判斷，而是作為提高效率的輔助工具。

## 引用來源標準

我們優先引用系統性回顧與隨機對照試驗，並在每篇內容中標註證據等級。
```

`src/data/policies/disclosure.md`:
```markdown
# 利益揭露政策

## 與相關組織的關係

（此處需填入實際的利益關係說明）

## 編輯獨立性

本站的編輯內容不受任何商業合作影響。所有內容決策由編輯團隊獨立做出。

## 產品標示規則

當文章或原料頁涉及特定產品或品牌時，我們會在頁面頂部以明顯方式標示利益關係。

## 利益衝突處理

若主編或作者與特定產品、品牌或組織存在利益關係，該內容將由其他編輯人員審核。
```

- [ ] **Step 8: Verify build with content**

```bash
pnpm build
```

Expected: Build succeeds, content collections are validated.

- [ ] **Step 9: Commit**

```bash
git add src/content/ src/data/
git commit -m "feat: add sample content for all 6 content types and policy pages"
```

---

### Task 5: UI Components

**Files:**
- Create: `src/components/ui/Button.astro`
- Create: `src/components/ui/Badge.astro`
- Create: `src/components/ui/CategoryTag.astro`
- Create: `src/components/ui/VerdictBadge.astro`
- Create: `src/components/ui/Breadcrumb.astro`
- Create: `src/components/ui/SearchBar.astro`

- [ ] **Step 1: Create Button.astro**

```astro
---
interface Props {
  variant?: 'primary' | 'secondary' | 'cta' | 'ghost';
  href?: string;
  class?: string;
  [key: string]: any;
}

const { variant = 'primary', href, class: className, ...rest } = Astro.props;

const Tag = href ? 'a' : 'button';
---

<Tag
  href={href}
  class:list={['btn', `btn--${variant}`, className]}
  {...rest}
>
  <slot />
</Tag>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    min-height: 44px;
    border: none;
    border-radius: var(--radius-pill);
    font-family: var(--font-sans);
    font-size: var(--text-meta);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.15s, transform 0.1s;
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-teal);
    outline-offset: 2px;
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn:disabled,
  .btn[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn--primary {
    background-color: var(--color-teal);
    color: white;
  }
  .btn--primary:hover { background-color: var(--color-teal-hover); }

  .btn--secondary {
    background-color: transparent;
    color: var(--color-teal);
    border: 1px solid var(--color-teal);
  }
  .btn--secondary:hover { background-color: var(--color-teal-subtle); }

  .btn--cta {
    background-color: var(--color-coral);
    color: white;
  }
  .btn--cta:hover { background-color: var(--color-coral-hover); }

  .btn--ghost {
    background-color: transparent;
    color: var(--color-teal);
  }
  .btn--ghost:hover { background-color: var(--color-teal-subtle); }

  @media (max-width: 767px) {
    .btn--full-mobile {
      width: 100%;
      justify-content: center;
    }
  }
</style>
```

- [ ] **Step 2: Create Badge.astro**

```astro
---
interface Props {
  variant?: 'editor' | 'evidence';
  class?: string;
}

const { variant = 'editor', class: className } = Astro.props;
---

<span class:list={['badge', `badge--${variant}`, className]}>
  <slot />
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .badge--editor {
    background-color: var(--color-teal-light);
    color: var(--color-teal);
  }

  .badge--evidence {
    background-color: var(--color-fog);
    color: var(--color-ink);
  }
</style>
```

- [ ] **Step 3: Create CategoryTag.astro**

```astro
---
interface Props {
  category: 'article' | 'myth' | 'ingredient' | 'podcast' | 'video' | 'news';
  class?: string;
}

const { category, class: className } = Astro.props;

const labels: Record<string, string> = {
  article: '文章',
  myth: '闢謠',
  ingredient: '原料',
  podcast: 'Podcast',
  video: '短影音',
  news: '趨勢',
};
---

<span class:list={['cat-tag', `cat-tag--${category}`, className]}>
  {labels[category] || category}
</span>

<style>
  .cat-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-badge);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .cat-tag--article {
    background-color: color-mix(in oklch, var(--color-cat-article) 14%, var(--color-paper));
    color: var(--color-cat-article);
  }
  .cat-tag--myth {
    background-color: color-mix(in oklch, var(--color-cat-myth) 14%, var(--color-paper));
    color: var(--color-cat-myth);
  }
  .cat-tag--ingredient {
    background-color: color-mix(in oklch, var(--color-cat-ingredient) 14%, var(--color-paper));
    color: var(--color-cat-ingredient);
  }
  .cat-tag--podcast {
    background-color: color-mix(in oklch, var(--color-cat-podcast) 14%, var(--color-paper));
    color: var(--color-cat-podcast);
  }
  .cat-tag--video {
    background-color: color-mix(in oklch, var(--color-cat-video) 14%, var(--color-paper));
    color: var(--color-cat-video);
  }
  .cat-tag--news {
    background-color: color-mix(in oklch, var(--color-cat-news) 14%, var(--color-paper));
    color: var(--color-cat-news);
  }
</style>
```

- [ ] **Step 4: Create VerdictBadge.astro**

```astro
---
interface Props {
  verdict: 'true' | 'false' | 'insufficient' | 'contextual';
  size?: 'sm' | 'lg';
  class?: string;
}

const { verdict, size = 'sm', class: className } = Astro.props;

const labels: Record<string, string> = {
  'true': '真',
  'false': '假',
  insufficient: '證據不足',
  contextual: '情境成立',
};
---

<span class:list={['verdict', `verdict--${verdict}`, `verdict--${size}`, className]}>
  {labels[verdict]}
</span>

<style>
  .verdict {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-weight: 700;
    color: white;
    white-space: nowrap;
  }

  .verdict--sm {
    padding: 0.2rem 0.6rem;
    font-size: var(--text-badge);
    line-height: 1;
  }

  .verdict--lg {
    padding: 0.4rem 1rem;
    font-size: var(--text-meta);
    line-height: 1.4;
  }

  .verdict--true { background-color: var(--color-verdict-true); }
  .verdict--false { background-color: var(--color-verdict-false); }
  .verdict--insufficient { background-color: var(--color-verdict-insufficient); }
  .verdict--contextual { background-color: var(--color-verdict-contextual); }
</style>
```

- [ ] **Step 5: Create Breadcrumb.astro**

```astro
---
interface Props {
  items: Array<{ label: string; href?: string }>;
}

const { items } = Astro.props;
---

<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol>
    {items.map((item, i) => (
      <li>
        {item.href && i < items.length - 1 ? (
          <a href={item.href}>{item.label}</a>
        ) : (
          <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
        )}
        {i < items.length - 1 && <span class="sep" aria-hidden="true">/</span>}
      </li>
    ))}
  </ol>
</nav>

<style>
  .breadcrumb ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    list-style: none;
    padding: 0;
    font-size: var(--text-meta);
    color: var(--color-on-dark-meta);
  }

  .breadcrumb li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .breadcrumb a {
    color: inherit;
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .sep {
    opacity: 0.5;
  }

  [aria-current="page"] {
    opacity: 0.7;
  }
</style>
```

- [ ] **Step 6: Create SearchBar.astro**

```astro
---
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div class:list={['search-bar', className]}>
  <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
  <input
    type="search"
    placeholder="搜尋健康議題、迷思、原料"
    aria-label="搜尋健康議題、迷思、原料"
    class="search-input"
  />
</div>

<style>
  .search-bar {
    position: relative;
    width: 100%;
    max-width: 18rem;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-fog);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 1rem 0.5rem 2.25rem;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-pill);
    background: white;
    font-family: var(--font-sans);
    font-size: var(--text-meta);
    color: var(--color-ink);
  }

  .search-input:focus {
    outline: 2px solid var(--color-teal);
    outline-offset: 1px;
    border-color: var(--color-teal);
  }

  .search-input::placeholder {
    color: var(--color-fog);
  }
</style>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI components — Button, Badge, CategoryTag, VerdictBadge, Breadcrumb, SearchBar"
```

---

### Task 6: Base Layout & Navigation

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/blocks/TopNav.astro`
- Create: `src/components/blocks/MobileMenu.svelte`
- Create: `src/components/blocks/Footer.astro`

This task creates the site shell that all pages inherit from.

- [ ] **Step 1: Create TopNav.astro**

See spec sections: Top Navigation, Footer.

```astro
---
const navItems = [
  { label: '文章', href: '/articles/' },
  { label: 'Podcast', href: '/podcasts/' },
  { label: '短影音', href: '/videos/' },
  { label: '闢謠', href: '/myths/' },
  { label: '原料', href: '/ingredients/' },
  { label: '趨勢', href: '/news/' },
  { label: '關於我們', href: '/about/' },
];
---

<header class="top-nav">
  <div class="top-nav__inner container">
    <a href="/" class="top-nav__logo" aria-label="本日有據首頁">
      <div class="logo-icon">
        <div class="logo-square"></div>
      </div>
      <div class="logo-text">
        <span class="logo-zh">本日有據</span>
        <span class="logo-en">Evidence Today</span>
      </div>
    </a>

    <nav class="top-nav__links" aria-label="主導覽">
      {navItems.map(item => (
        <a href={item.href} class="nav-link">{item.label}</a>
      ))}
    </nav>

    <div class="top-nav__actions">
      <a href="/search/" class="nav-search" aria-label="搜尋">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      </a>
      <button class="nav-hamburger" aria-label="開啟選單" aria-expanded="false" id="menu-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</header>

<style>
  .top-nav {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid var(--color-fog);
    background-color: color-mix(in oklch, var(--color-paper) 93%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .top-nav__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .top-nav__logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--color-ink);
  }

  .logo-icon {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    background-color: var(--color-teal);
    border-radius: 0.75rem;
  }

  .logo-square {
    width: 1rem;
    height: 1rem;
    border: 2px solid color-mix(in oklch, white 80%, transparent);
    border-radius: 0.2rem;
  }

  .logo-zh {
    display: block;
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .logo-en {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    opacity: 0.6;
  }

  .top-nav__links {
    display: none;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    font-size: var(--text-meta);
    color: var(--color-ink);
    text-decoration: none;
  }
  .nav-link:hover { opacity: 0.7; }

  .top-nav__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-search {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    color: var(--color-ink);
    text-decoration: none;
    border-radius: var(--radius-pill);
  }
  .nav-search:hover { background-color: var(--color-teal-subtle); }

  .nav-hamburger {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    background: none;
    border: none;
    color: var(--color-ink);
    border-radius: var(--radius-pill);
  }
  .nav-hamburger:hover { background-color: var(--color-teal-subtle); }

  @media (min-width: 768px) {
    .top-nav__links { display: flex; }
    .nav-hamburger { display: none; }
  }
</style>
```

- [ ] **Step 2: Create Footer.astro**

```astro
---
const contentLinks = [
  { label: '文章', href: '/articles/' },
  { label: 'Podcast', href: '/podcasts/' },
  { label: '短影音', href: '/videos/' },
  { label: '闢謠', href: '/myths/' },
  { label: '原料', href: '/ingredients/' },
  { label: '趨勢', href: '/news/' },
];

const resourceLinks = [
  { label: '搜尋', href: '/search/' },
  { label: 'RSS', href: '/rss.xml' },
];

const aboutLinks = [
  { label: '關於本站', href: '/about/' },
  { label: '編輯政策', href: '/editorial-policy/' },
  { label: '醫療聲明', href: '/medical-disclaimer/' },
  { label: '利益揭露', href: '/disclosure/' },
  { label: '隱私政策', href: '/privacy/' },
  { label: '使用條款', href: '/terms/' },
  { label: '聯絡我們', href: '/contact/' },
];
---

<footer class="site-footer">
  <div class="container">
    <div class="footer__top">
      <div class="footer__brand">
        <div class="footer__logo">
          <span class="logo-zh">本日有據</span>
          <span class="logo-en">Evidence Today</span>
        </div>
        <p class="footer__tagline">把健康議題，講得有根據，也講得讓人看得懂。</p>
      </div>

      <div class="footer__columns">
        <div class="footer__col">
          <h3>內容</h3>
          <ul>
            {contentLinks.map(link => (
              <li><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
        </div>
        <div class="footer__col">
          <h3>資源</h3>
          <ul>
            {resourceLinks.map(link => (
              <li><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
        </div>
        <div class="footer__col">
          <h3>關於</h3>
          <ul>
            {aboutLinks.map(link => (
              <li><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div class="footer__bottom">
      <p>&copy; 2026 本日有據 Evidence Today</p>
      <p>本站內容僅供參考，不構成醫療建議。詳見<a href="/medical-disclaimer/">醫療聲明</a>。</p>
      <p>本站與健康產品公司之關係，詳見<a href="/disclosure/">利益揭露政策</a>。</p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--color-fog);
    background-color: var(--color-navy);
    color: var(--color-on-dark-body);
    padding: var(--space-section-gap) 0 2rem;
  }

  .footer__top {
    display: grid;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .footer__brand .logo-zh {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-on-dark-heading);
  }

  .footer__brand .logo-en {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-on-dark-meta);
    margin-top: 0.25rem;
  }

  .footer__tagline {
    margin-top: 0.75rem;
    font-size: var(--text-meta);
    color: var(--color-on-dark-meta);
  }

  .footer__columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .footer__col h3 {
    font-size: var(--text-meta);
    font-weight: 700;
    color: var(--color-on-dark-heading);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .footer__col ul {
    list-style: none;
    padding: 0;
  }

  .footer__col li {
    margin-bottom: 0.5rem;
  }

  .footer__col a {
    color: var(--color-on-dark-body);
    text-decoration: none;
    font-size: var(--text-meta);
  }
  .footer__col a:hover {
    color: var(--color-on-dark-link);
    text-decoration: underline;
  }

  .footer__bottom {
    border-top: 1px solid color-mix(in oklch, white 10%, transparent);
    padding-top: 1.5rem;
    font-size: var(--text-meta);
    color: var(--color-on-dark-meta);
  }

  .footer__bottom p {
    margin-bottom: 0.25rem;
  }

  .footer__bottom a {
    color: var(--color-on-dark-link);
  }

  @media (min-width: 768px) {
    .footer__top {
      grid-template-columns: 1.2fr 1fr;
    }
  }

  @media (max-width: 767px) {
    .footer__columns {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
```

- [ ] **Step 3: Create Base.astro layout**

```astro
---
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

const {
  title,
  description = '本日有據是一個以文章、Podcast、短影音、闢謠與原料整理為核心的健康編輯平台。',
  ogImage,
  ogType = 'website',
  noindex = false,
} = Astro.props;

const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
const siteName = '本日有據';

import TopNav from '@/components/blocks/TopNav.astro';
import Footer from '@/components/blocks/Footer.astro';
import '@/styles/global.css';
---

<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />

    {noindex && <meta name="robots" content="noindex" />}

    <!-- Open Graph -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={ogType} />
    <meta property="og:site_name" content={siteName} />
    <meta property="og:url" content={canonicalUrl} />
    {ogImage && <meta property="og:image" content={ogImage} />}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />

    <!-- Favicons -->
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- Font preload -->
    <link rel="preload" href="/fonts/NotoSansTC-Regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/NotoSerifTC-Bold.woff2" as="font" type="font/woff2" crossorigin />

    <slot name="head" />
  </head>
  <body>
    <a href="#main-content" class="skip-to-content">跳到主要內容</a>
    <TopNav />
    <main id="main-content">
      <slot />
    </main>
    <Footer />
    <slot name="scripts" />
  </body>
</html>
```

- [ ] **Step 4: Create a minimal index page to test**

Create `src/pages/index.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
---

<Base title="本日有據 — 把健康議題，講得有根據，也講得讓人看得懂">
  <div class="container" style="padding: 4rem 0;">
    <h1>本日有據</h1>
    <p>網站建置中。</p>
  </div>
</Base>
```

- [ ] **Step 5: Verify dev server**

```bash
pnpm dev
```

Expected: Site loads at localhost:4321 with navigation, footer, and placeholder homepage.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/ src/components/blocks/ src/pages/index.astro
git commit -m "feat: add Base layout with TopNav, Footer, and placeholder homepage"
```

---

This plan continues with Tasks 7-20 covering all remaining layouts, block components, card components, and pages. Due to the document size, the remaining tasks follow the same pattern: exact file paths, complete code, TDD where applicable, and frequent commits.

**Remaining tasks (to be detailed in Plan 1 continued or executed inline):**

- Task 7: Block Components Part 1 (TldrBox, MedicalDisclaimer, VerdictDisclaimer, DisclosureBanner, EditorInfo, AuthorMeta)
- Task 8: Block Components Part 2 (ReferenceList, FaqAccordion as Svelte, CTA Strip)
- Task 9: Card Components (ArticleCard, MythCard, IngredientCard, PodcastCard, VideoCard, NewsItem)
- Task 10: Article Layout + TOC Svelte component
- Task 11: Media Layout (Podcast/Video single pages)
- Task 12: List Layout
- Task 13: Policy Layout
- Task 14: Homepage (full implementation with all sections)
- Task 15: Article pages (list + single)
- Task 16: Myth pages (list + single)
- Task 17: Ingredient pages (list + single)
- Task 18: Podcast pages (list + single)
- Task 19: Video pages (list + single)
- Task 20: News/Trends page
- Task 21: Policy pages (about, editorial-policy, medical-disclaimer, disclosure, privacy, terms, contact)
- Task 22: Search page, Tags page, 404 page
