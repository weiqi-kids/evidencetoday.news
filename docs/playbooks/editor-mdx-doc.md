# Editor `mdx-doc` module + vitest infra

The inline MDX editor's foundation lives in `src/utils/editor/mdx-doc.ts`. It is a pure-logic
module (no DOM, no Astro) that converts between raw MDX strings and a `{ frontmatter, body }`
shape. Every other editor piece (lint engine, form spine, SSR preview) depends on it, so its
round-trip fidelity must never regress.

## Unit test infra (vitest)

This module also introduced the project's first test framework.

- Runner: `vitest` (dev dependency). Config: `vitest.config.ts` — `include: ['src/**/*.test.ts']`,
  `environment: 'node'`.
- Scripts in `package.json`:
  - `pnpm test` → `vitest run` (one-shot, used by humans and any future CI gate)
  - `pnpm test:watch` → `vitest` (watch mode)
- Co-locate tests next to source as `*.test.ts` under `src/`.

## API

```ts
type EditDocCore = { frontmatter: Record<string, unknown>; body: string };
parse(rawMdx: string): EditDocCore;
serialize(doc: EditDocCore): string;
```

- `parse` splits frontmatter from body with a regex (`FRONTMATTER_RE`) and parses the YAML block
  with `js-yaml` (`yaml.load`).
- `serialize` uses `js-yaml` (`yaml.dump`) for the frontmatter block, then emits
  `` `---\n${fm}---\n\n${body}` ``.

> ⚠️ **瀏覽器安全（load-bearing）**：本模組在**瀏覽器**執行（編輯器 island），只能用純 JS 相依。
> 早期 `parse` 用 `gray-matter`（依賴 Node `Buffer`）→ 瀏覽器丟 `Buffer is not defined`；
> Node 環境的 vitest 有 `Buffer`，故單元測試全綠卻沒擋下此 bug（2026-06-08 才在瀏覽器爆出）。
> 已改用 `js-yaml`。**editor utils 不得引入依賴 `Buffer`/`fs`/Node-only API 的套件。**

## Round-trip strategy (load-bearing — read before changing parse/serialize)

`parse → serialize → parse` must be a fixed point for both frontmatter and body. Two subtleties:

1. **Body newlines.** `serialize` joins frontmatter and body with `---\n\n${body}` (a blank
   separator line). `FRONTMATTER_RE` consumes the closing `---` plus one trailing `\n`; `parse`
   then strips one more leading `\n` from the remaining body. Net effect: serialize adds two `\n`,
   the regex eats one, parse eats the other — body returns unchanged. Do not change one side
   without the other.

2. **Dates.** Unquoted frontmatter values like `publishedAt: 2026-05-25` are parsed as JS `Date`
   objects by `js-yaml`. js-yaml re-emits them in the same canonical YAML date form, so
   re-parsing yields an equal `Date` (vitest `toEqual` compares time values). Quoted dates
   (`'2026-06-01'`) stay strings. No special handling is needed in `parse`/`serialize` for this —
   but if you add post-processing, re-run the real-file round-trip test below.

## Tests

- `src/utils/editor/mdx-doc.test.ts` — parse/serialize unit + synthetic round-trip, including
  explicit regression cases for the two load-bearing subtleties above: Date frontmatter fields
  (parsed as `Date`, round-trip stable) and bodies that themselves begin with a blank line.
- `src/utils/editor/mdx-doc.roundtrip.test.ts` — round-trips the real file
  `src/content/myths/carrots-improve-vision-myth.mdx` (dates, nested objects, empty strings,
  Markdown-in-frontmatter). This is the regression guard: the editor must never corrupt real
  content on save. Keep it green.

Run all: `pnpm test`.
