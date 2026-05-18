# Editor author page portrait handling

The Luo Yang author page renders the editor portrait directly from the committed text-based SVG asset at:

- `public/images/authors/luo-yang-editor-portrait.svg`

For this page, avoid build-time `existsSync` checks for the portrait. If the page should show the editor image, render the image path directly so the static build does not fall back to the placeholder card when the asset lookup behaves differently across environments.

When adding or replacing author images through Codex/GitHub UI, prefer text-based SVG assets or use a normal Git workflow for binary image files, because some review interfaces cannot create PRs that include binary image uploads.
