# Editor author page portrait handling

The Luo Yang author page (`src/pages/authors/luo-yang/index.astro`) renders the editor portrait via a `<picture>` element that prefers the real JPG and falls back to the committed text-based SVG:

- `public/images/authors/luo-yang.jpg` — primary photo (loaded via `<source type="image/jpeg">`)
- `public/images/authors/luo-yang-editor-portrait.svg` — `<img>` fallback when the JPG is unavailable

The About page (`src/data/policies/about.md`) uses the same `<picture>` pattern so both surfaces stay consistent.

For both pages, avoid build-time `existsSync` checks for the portrait. Render the image path directly so the static build does not fall back to the placeholder card when the asset lookup behaves differently across environments.

When the hero uses `<picture>`, also set `display: block; width: 100%;` on the picture so it fills its grid column (see `.editor-portrait` in the author page styles). Without this, picture's default inline display collapses the portrait width.

## Content blocks on the author page

The author page mirrors the editor section from `src/data/policies/about.md`. Keep these blocks in sync when one side changes:

- 專業背景與內容理念
- 核心信念
- 內容紅線
- 專業領域

Followed by page-specific sections: Podcast 連結、文章列表（從 `articles` collection 過濾 `author === '羅揚'`）、醫療聲明。

## Asset workflow

When adding or replacing author images through Codex/GitHub UI, prefer text-based SVG assets or use a normal Git workflow for binary image files, because some review interfaces cannot create PRs that include binary image uploads.
