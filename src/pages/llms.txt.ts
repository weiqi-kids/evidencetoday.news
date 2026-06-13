import type { APIRoute } from 'astro';

const body = `# Evidence Today 本日有據
> 以證據、公共資訊與主編判讀為基礎的中文健康知識與健康議題整理平台

## 重要頁面
- 編輯原則：https://evidencetoday.news/editorial-policy/
- 利益揭露：https://evidencetoday.news/disclosure/
- 作者：https://evidencetoday.news/authors/luo-yang/
- Sitemap：https://evidencetoday.news/sitemap-index.xml

## 內容類型
- 文章：https://evidencetoday.news/articles/
- 闢謠：https://evidencetoday.news/myths/
- 成分解析：https://evidencetoday.news/ingredients/
- Podcast：https://evidencetoday.news/podcasts/
- 短影音：https://evidencetoday.news/videos/
- 趨勢新聞：https://evidencetoday.news/news/

## 純文字版
每篇內容提供 .txt 純文字版，路徑為 /[type]/[slug].txt

## 完整內容索引
https://evidencetoday.news/llms-full.txt
`;

export const GET: APIRoute = () => {
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
