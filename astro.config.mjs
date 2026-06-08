import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://evidencetoday.news',
  integrations: [
    svelte(),
    // /admin 是隱藏管理頁，不應進 sitemap
    sitemap({ filter: (page) => !page.includes('/admin') }),
    mdx(),
  ],
  output: 'static',
});
