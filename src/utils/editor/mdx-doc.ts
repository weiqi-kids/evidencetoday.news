import matter from 'gray-matter';

export type EditDocCore = {
  frontmatter: Record<string, unknown>;
  body: string;
};

/**
 * 解析 raw MDX 為 { frontmatter, body }。
 *
 * body 還原策略：gray-matter 的 `content` 會在結尾 frontmatter 的 `---` 之後
 * 保留一個換行（它只吃掉緊接 `---` 的單一 `\n`）。我們再剝掉這一個換行，
 * 讓 body 不帶 frontmatter 與正文之間的分隔空行。
 *
 * 這個策略與 `serialize` 互為逆運算：serialize 用 `---\n\n${body}` 串接，
 * gray-matter 吃掉第一個 `\n`、parse 再剝掉第二個 `\n`，正好還原 body，
 * 確保 parse → serialize → parse 的 round-trip 一致（見 *.roundtrip.test.ts）。
 */
export function parse(rawMdx: string): EditDocCore {
  const { data, content } = matter(rawMdx);
  const body = content.startsWith('\n') ? content.slice(1) : content;
  return { frontmatter: data ?? {}, body };
}
