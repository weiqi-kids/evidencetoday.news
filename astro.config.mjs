import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import rehypeStockFigure from './src/utils/rehype-stock-figure.mjs';

export default defineConfig({
  site: 'https://evidencetoday.news',
  integrations: [
    svelte(),
    // /admin 是隱藏管理頁，不應進 sitemap
    sitemap({ filter: (page) => !page.includes('/admin') }),
    mdx(),
  ],
  // 內文圖庫圖：把帶真實圖庫攝影連結（img title）的圖轉成 <figure> + 可點署名。
  // mdx() 預設 extendMarkdownConfig，會一併套用到 .mdx 文章。
  markdown: {
    rehypePlugins: [rehypeStockFigure],
  },
  output: 'static',
});
