import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import sharp from 'sharp';
import { isPublicEntry } from '@/utils/visibility';
import { generateMythSquareCardSvg } from '@/utils/og-template';
import { VERDICT_META, displayVerdict } from '@/utils/myths/schema';

// 闢謠「儲存圖卡」：1080x1080，供讀者在闢謠內頁下載後直接貼到 LINE／群組，
// 圖上帶標題、判讀結論與網址，脫離原始連結轉傳也看得懂重點、找得回來源。
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

  const svg = await generateMythSquareCardSvg({
    title: d.title,
    verdictLabel: displayVerdict(d.verdict),
    verdictTone: meta.tone,
    evidenceLevel: d.evidenceLevel,
    summary: d.cardConclusion || d.verdictSummary,
  });

  const png = await sharp(Buffer.from(svg)).resize(1080, 1080).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
