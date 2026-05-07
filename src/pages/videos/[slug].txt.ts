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
  const body = entry.body ?? '';

  const header = [
    `Title: ${d.title}`,
    `Date: ${d.publishDate.toISOString().split('T')[0]}`,
    d.duration ? `Duration: ${d.duration}` : null,
    `Tags: ${d.tags.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return new Response(`${header}\n---\n${body}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
