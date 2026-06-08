# Editor `lint` engine

The inline MDX editor's warnings panel is driven by a pure-function lint engine under
`src/utils/editor/lint/`. Given already-parsed inputs `{ collection, frontmatter, body }` it
returns `LintResult[]`. It does **not** depend on `mdx-doc`'s implementation — callers parse the
document first (via `mdx-doc.parse`) and pass the resulting pieces in. This keeps every rule a
trivially testable pure function.

## Shape

```ts
type LintLevel = 'error' | 'warn' | 'info';
type LintResult = { level: LintLevel; field?: string; message: string; fix?: string };
type LintInput = { collection: string; frontmatter: Record<string, unknown>; body: string };
type LintRule = (input: LintInput) => LintResult[];
```

- `level` drives the panel's severity styling. `error` is for problems that break the build or
  hard-fail content requirements; `warn` is advisory; `info` is informational.
- `field` (optional) names the offending frontmatter key so the UI can anchor the warning.
- `fix` (optional) is a short human hint on how to resolve it.

## Aggregator

`src/utils/editor/lint/index.ts` holds the rule registry and the `lint()` entry point:

```ts
const RULES: LintRule[] = [descriptionLengthRule, phantomImageRule, mythReferencesRule];
export function lint(input: LintInput): LintResult[] {
  return RULES.flatMap((rule) => rule(input));
}
```

`lint` simply `flatMap`s every registered rule, so the result order follows registration order.

## Rules

Each rule is one file under `src/utils/editor/lint/rules/`, co-located with its `*.test.ts`.

- **`description-length`** — `error` if `description` is missing/empty; `warn` if `< 50` or
  `> 160` characters (SEO snippet length). Applies to all collections.
- **`phantom-image`** — `error` for inline images whose path matches `images/...`, `./images/...`,
  or `../images/...` (a relative reference into the repo that does not exist). These break the
  Astro/Rollup build entirely; one result is emitted per match. Absolute URLs (`https://…`) and
  root-absolute served paths (`/images/…`) are ignored. (Guards against the 2026-06-08
  build-failure incident.)
- **`myth-references`** — `myths` collection only: `error` if `frontmatter.references` has fewer
  than 2 entries. Every myth must cite at least 2 credible sources. No-op for other collections.

## Adding a rule

1. Write `src/utils/editor/lint/rules/<name>.test.ts` first (TDD), covering the trigger and the
   no-warning case. Confirm it FAILS.
2. Implement `src/utils/editor/lint/rules/<name>.ts` exporting a `LintRule`. Return `[]` when the
   rule does not apply (e.g. wrong collection) so it composes cleanly in the aggregator.
3. Register it in the `RULES` array in `index.ts`.
4. `pnpm test src/utils/editor/lint/` → green. Then `pnpm test` for the full suite.

Keep rules pure and side-effect free; they receive parsed inputs and must not read the filesystem
or touch the DOM.
