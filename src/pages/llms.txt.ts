import type { APIRoute } from 'astro';

const body = `# Evidence Today 本日有據
> 健康議題編輯平台

## 內容類型
- 文章 /articles/
- 闢謠 /myths/
- 原料 /ingredients/
- Podcast /podcasts/
- 短影音 /videos/
- 趨勢 /news/

## 純文字版
每篇內容提供 .txt 純文字版，路徑為 /[type]/[slug].txt

## 編輯政策
/editorial-policy/
`;

export const GET: APIRoute = () => {
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
