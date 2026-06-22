import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import rehypeStockFigure from './src/utils/rehype-stock-figure.mjs';
import { buildLastmodMap } from './scripts/lib/content-dates.mjs';

// 每篇公開內容的 lastmod（updatedDate ?? publishDate），給 sitemap serialize 逐頁標註，
// 讓搜尋引擎/AI 知道內容新鮮度。掃 frontmatter 一次，build 期間建好。
const lastmodMap = buildLastmodMap();

export default defineConfig({
  site: 'https://evidencetoday.news',
  // 舊遷移網址（appi-news-* / lodes-*）→ 語意化 slug 的 301 轉址，保留既有連結與索引權重。
  // 新增文章一律用語意化 slug，不再產生此類數字 slug；若再有改名，於此處補一條。
  redirects: {
    '/articles/appi-news-63': '/articles/menstrual-pain-primary-vs-secondary/',
    '/articles/appi-news-64': '/articles/sedentary-office-worker-health-risks/',
    '/articles/appi-news-65': '/articles/male-pattern-baldness-dht-treatment/',
    '/articles/appi-news-70': '/articles/childhood-allergy-prevention-early-introduction/',
    '/articles/appi-news-71': '/articles/menopause-symptoms-beyond-hot-flashes/',
    '/articles/appi-news-74': '/articles/prediabetes-reversal-fasting-glucose/',
    '/articles/appi-news-81': '/articles/tcm-medication-safety-elderly/',
    '/articles/appi-news-99': '/articles/supplement-fraud-exaggerated-claims-guide/',
    '/articles/appi-news-120': '/articles/dysphagia-elderly-food-texture-nutrition/',
    '/articles/appi-news-121': '/articles/cholesterol-report-ldl-hdl-triglycerides/',
    '/articles/appi-news-122': '/articles/vitamin-d-beyond-bone-immune-mood-heart/',
    '/articles/appi-news-123': '/articles/zinc-deficiency-signs-effects/',
    '/articles/appi-news-124': '/articles/gout-hyperuricemia-causes-diet/',
    '/articles/appi-news-125': '/articles/eating-out-nutrition-bento-buffet-convenience/',
    '/articles/appi-news-126': '/articles/onion-phytochemicals-quercetin-heart/',
    '/articles/appi-news-132': '/articles/sweeteners-types-safety-labeling-guide/',
    '/articles/appi-news-133': '/articles/pesticide-residue-produce-6-facts/',
    '/articles/appi-news-134': '/articles/normal-fasting-glucose-blood-sugar-myth/',
    '/articles/appi-news-135': '/articles/health-checkup-abnormal-values-meaning/',
    '/articles/appi-news-136': '/articles/knee-osteoarthritis-nonsurgical-options/',
    '/articles/appi-news-137': '/articles/gerd-atypical-symptoms-esophageal-cancer-risk/',
    '/articles/appi-news-138': '/articles/metabolic-syndrome-diet-five-markers/',
    '/articles/appi-news-139': '/articles/benign-prostatic-hyperplasia-psa-treatment/',
    '/articles/appi-news-140': '/articles/thyroid-tsh-high-low-guide/',
    '/articles/lodes-4': '/articles/holiday-home-food-safety-management/',
    '/articles/lodes-5': '/articles/diet-for-oral-dental-health-after-60/',
    '/articles/lodes-7': '/articles/nmn-anti-aging-expectations-reality/',
    '/articles/lodes-22': '/articles/gaba-sleep-stress-evidence/',
    '/articles/lodes-23': '/articles/menopause-supplements-what-works/',
    '/articles/lodes-24': '/articles/coq10-beyond-heart-disease-after-40/',
    '/articles/lodes-25': '/articles/curcumin-anticancer-claims-myth/',
    '/articles/lodes-27': '/articles/supplement-felt-effect-vs-efficacy/',
    '/articles/lodes-28': '/articles/stem-cell-supplements-pseudoscience/',
    '/articles/lodes-29': '/articles/maca-libido-myth-vs-evidence/',
    '/articles/lodes-30': '/articles/coffee-healthy-or-not-wrong-question/',
    '/articles/lodes-31': '/articles/dose-makes-the-poison-nutrient-amount/',
    '/articles/lodes-32': '/articles/resveratrol-anti-aging-myth-reality/',
    '/articles/lodes-33': '/articles/krill-oil-vs-fish-oil-comparison/',
    '/articles/lodes-34': '/articles/astaxanthin-antioxidant-hype-vs-evidence/',
    '/articles/lodes-50': '/articles/berberine-natural-ozempic-myth/',
    '/articles/lodes-51': '/articles/supplement-gummies-dosage-accuracy/',
    '/articles/lodes-52': '/articles/sleep-supplements-find-root-cause/',
    '/articles/lodes-53': '/articles/creatine-after-40-not-just-for-gym/',
    '/articles/lodes-54': '/articles/sialic-acid-brain-health-bird-nest-marketing/',
    '/articles/lodes-55': '/articles/inositol-pcos-anxiety-insomnia/',
    '/articles/lodes-78': '/articles/aging-starts-when-you-stop-chewing/',
  },
  integrations: [
    svelte(),
    // /admin 是隱藏管理頁；/tags/* 是 thin 自動分類頁（noindex,follow），皆不應進 sitemap
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/tags/'),
      // 對每篇內容頁輸出 lastmod（updatedDate ?? publishDate）。靜態頁（首頁/分類/政策頁）
      // 不在內容 frontmatter 中，無對應日期時不強加 lastmod。
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = lastmodMap.get(path) ?? lastmodMap.get(path.endsWith('/') ? path : `${path}/`);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
    mdx(),
  ],
  // 內文圖庫圖：把帶真實圖庫攝影連結（img title）的圖轉成 <figure> + 可點署名。
  // mdx() 預設 extendMarkdownConfig，會一併套用到 .mdx 文章。
  markdown: {
    rehypePlugins: [rehypeStockFigure],
  },
  output: 'static',
});
