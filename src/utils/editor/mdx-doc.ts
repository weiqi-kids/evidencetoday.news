import yaml from 'js-yaml';

export type EditDocCore = {
  frontmatter: Record<string, unknown>;
  body: string;
};

// 抓取開頭的 frontmatter 區塊：`---\n<yaml>\n---\n`（含結尾 `---` 後的單一換行）。
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/;

/**
 * 解析 raw MDX 為 { frontmatter, body }。
 *
 * **瀏覽器安全**：只用 js-yaml（純 JS），不用 gray-matter——後者依賴 Node 的
 * `Buffer`，在瀏覽器會丟 `Buffer is not defined`（編輯器在瀏覽器執行）。
 *
 * body 還原策略與 `serialize` 互為逆運算：serialize 用 `---\n\n${body}` 串接；
 * 本函式以 regex 吃掉結尾 `---` 後的第一個 `\n`，再剝掉 body 開頭殘留的一個 `\n`
 * （即分隔空行），正好還原 body，確保 parse → serialize → parse 一致
 * （見 *.roundtrip.test.ts）。沒有 frontmatter 時回 `{}` 與原文。
 */
export function parse(rawMdx: string): EditDocCore {
  const m = rawMdx.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: {}, body: rawMdx };
  const data = yaml.load(m[1]) as Record<string, unknown> | null | undefined;
  let body = rawMdx.slice(m[0].length);
  if (body.startsWith('\n')) body = body.slice(1);
  return { frontmatter: data ?? {}, body };
}

/**
 * 將 { frontmatter, body } 組回 MDX 字串。
 *
 * 使用 js-yaml 的 block style 輸出：lineWidth:-1 不折行、forceQuotes:false
 * 讓中文字串不被加多餘引號、indent:2 讓 block list 以 2 空格縮排。
 * 輸出格式固定為 `---\n${fm}---\n\n${body}`，與 parse 互為逆運算。
 */
export function serialize(doc: EditDocCore): string {
  const fm = yaml.dump(doc.frontmatter, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    indent: 2,
  });
  return `---\n${fm}---\n\n${doc.body}`;
}
