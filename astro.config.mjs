import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://evidencetoday.news',
  integrations: [svelte(), sitemap(), mdx()],
  output: 'static',
});
