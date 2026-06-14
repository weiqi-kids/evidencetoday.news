import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderSources } from '@/utils/txt-endpoint';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('podcasts', ({ data }) => !data.draft);
  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\.[^.]+$/, '') },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection>>[number] };
  const d = entry.data;
  const body = entry.body ?? '';

  const header = [
    `Title: ${d.title}`,
    `Date: ${d.publishDate.toISOString().split('T')[0]}`,
    `Duration: ${d.duration}`,
    `Tags: ${d.tags.join(', ')}`,
  ].join('\n');

  const summary = `重點摘要：${d.description}`;
  const sources = renderSources(d.references);
  return new Response(`${header}\n---\n${summary}\n---\n${body}${sources}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
