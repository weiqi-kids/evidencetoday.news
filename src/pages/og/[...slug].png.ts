import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import { generateOgSvg } from '@/utils/og-template';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos'] as const;

function stripExt(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { slug: string }; props: { title: string; collection: string } }[] = [];

  for (const collection of COLLECTIONS) {
    const entries = await getCollection(collection, ({ data }) => !data.draft);
    for (const entry of entries) {
      paths.push({
        params: { slug: `${collection}/${stripExt(entry.id)}` },
        props: { title: entry.data.title, collection },
      });
    }
  }

  paths.push({
    params: { slug: 'index' },
    props: { title: '本日有據 Evidence Today', collection: 'website' },
  });

  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { title, collection } = props as { title: string; collection: string };
  const svg = await generateOgSvg(title, collection);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
