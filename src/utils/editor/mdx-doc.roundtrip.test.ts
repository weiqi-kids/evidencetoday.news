import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, serialize } from './mdx-doc';

describe('真實檔案 round-trip', () => {
  it('parse→serialize→parse 後 frontmatter 與 body 等價', () => {
    const raw = readFileSync('src/content/myths/carrots-improve-vision-myth.mdx', 'utf8');
    const a = parse(raw);
    const b = parse(serialize(a));
    expect(b.frontmatter).toEqual(a.frontmatter);
    expect(b.body).toBe(a.body);
  });
});
