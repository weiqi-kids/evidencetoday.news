import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import sharp from 'sharp';
import { isPublicEntry } from '@/utils/visibility';
import { generateMythOgSvg } from '@/utils/og-template';
import { VERDICT_META, displayVerdict } from '@/utils/myths/schema';

// 闢謠單篇專屬 OG 圖：build 時逐篇生成 1200x630 png，取代原本全站共用一張 /og-static/myths.png。
// 目的：分享到 LINE／社群時，卡片能直接顯示這一篇的判讀結果與證據強度，而不是統一的分類圖。
export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('myths', ({ data }) => isPublicEntry(data));
  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\.[^.]+$/, '') },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: CollectionEntry<'myths'> };
  const d = entry.data;
  const meta = VERDICT_META[d.verdict];

  const svg = await generateMythOgSvg({
    title: d.title,
    verdictLabel: displayVerdict(d.verdict),
    verdictTone: meta.tone,
    evidenceLevel: d.evidenceLevel,
  });

  const png = await sharp(Buffer.from(svg)).resize(1200, 630).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
