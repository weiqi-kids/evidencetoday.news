import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('videos', ({ data }) => !data.draft);
  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\.[^.]+$/, '') },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection>>[number] };
  const d = entry.data;

  const header = [
    `Title: ${d.title}`,
    `Date: ${d.publishDate.toISOString().split('T')[0]}`,
    d.youtubeId ? `YouTube: https://www.youtube.com/watch?v=${d.youtubeId}` : null,
    d.tags?.length ? `Tags: ${d.tags.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const summary = `重點摘要：${d.tldr}`;
  // 短影音的主要文字資產是逐字稿，務必納入純文字版供 LLM 擷取。
  const transcript = d.transcript ? `\n---\n逐字稿：\n${d.transcript}` : '';
  return new Response(`${header}\n---\n${summary}${transcript}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
