import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import rehypeStockFigure from './src/utils/rehype-stock-figure.mjs';
import rehypeUnpublishedLinks from './src/utils/rehype-unpublished-links.mjs';
import { buildLastmodMap, buildEntryMeta } from './scripts/lib/content-dates.mjs';
import { TOPICS, matchesTopic } from './src/data/topics.ts';
import { createPageGitDate } from './scripts/lib/page-git-date.mjs';

// 每篇公開內容的 lastmod（updatedDate ?? publishDate），給 sitemap serialize 逐頁標註，
// 讓搜尋引擎/AI 知道內容新鮮度。掃 frontmatter 一次，build 期間建好。
const lastmodMap = buildLastmodMap();
// 靜態頁沒有 frontmatter 日期，改取該頁 .astro 的 git commit 日期（2026-08-22）。
const pageGitDate = createPageGitDate(import.meta.url);

// 主題頁（/topics/<slug>/）是**彙整頁**：由所有「title + tags 命中該主題 matchKeywords」的
// 內容聚合而成，沒有自己的原始檔，所以既拿不到 frontmatter 日期也拿不到 .astro 的 git 日期
// ——2026-08-22 的機制稽核就是這 16 頁在缺 lastmod。
// 正解是取「它實際收錄的內容裡最新的那一筆」。
// 🔴 歸屬判準直接用 src/data/topics.ts 的 matchesTopic，不在別處重寫一份：
//    那份判準改了而這裡沒跟，不會報錯，只會讓主題頁的 lastmod 悄悄對不上它收錄的內容。
const topicLastmod = new Map();
{
  const entries = buildEntryMeta();
  for (const topic of TOPICS) {
    let newest = '';
    for (const e of entries) {
      if (matchesTopic(topic, { title: e.title, tags: e.tags }) && e.lastmod > newest) newest = e.lastmod;
    }
    // 保險：即使上游漏掉未來日期，也不讓未來時間進 sitemap（Google 會整個不信這個欄位）。
    const now = new Date().toISOString();
    if (newest > now) newest = now;
    {
    }
    if (newest) topicLastmod.set(`/topics/${topic.slug}/`, newest);
  }
}

export default defineConfig({
  site: 'https://evidencetoday.news',
  // 舊遷移網址（appi-news-* / lodes-*）→ 語意化 slug 的 301 轉址，保留既有連結與索引權重。
  // 新增文章一律用語意化 slug，不再產生此類數字 slug；若再有改名，於此處補一條。
  // 註：下方 appi-news-* / lodes-* 的目標網址已隨 2026-07-28 的去重複改名同步更新。
  redirects: {
    '/articles/appi-news-63': '/articles/menstrual-pain-painkillers-losing-effect-endometriosis/',
    '/articles/appi-news-64': '/articles/sitting-9-hours-can-exercise-offset-it/',
    '/articles/appi-news-65': '/articles/hair-loss-rule-out-before-treating-aga/',
    '/articles/appi-news-70': '/articles/baby-solids-egg-peanut-when-to-introduce/',
    '/articles/appi-news-71': '/articles/perimenopause-or-something-else-in-your-40s/',
    '/articles/appi-news-74': '/articles/prediabetes-105-next-three-months-plan/',
    '/articles/appi-news-81': '/articles/elderly-tcm-western-drug-combos-that-matter/',
    '/articles/appi-news-99': '/articles/supplement-fraud-exaggerated-claims-guide/',
    '/articles/appi-news-120': '/articles/dysphagia-elderly-food-texture-nutrition/',
    '/articles/appi-news-121': '/articles/cholesterol-report-ldl-hdl-triglycerides/',
    '/articles/appi-news-122': '/articles/vitamin-d-beyond-bone-immune-mood-heart/',
    '/articles/appi-news-123': '/articles/zinc-deficiency-signs-effects/',
    '/articles/appi-news-124': '/articles/gout-hyperuricemia-causes-diet/',
    '/articles/appi-news-125': '/articles/eating-out-nutrition-bento-buffet-convenience/',
    '/articles/appi-news-126': '/articles/onion-phytochemicals-quercetin-heart/',
    '/articles/appi-news-132': '/articles/sugar-free-label-identify-sweeteners-taiwan/',
    '/articles/appi-news-133': '/articles/wash-vegetables-salt-baking-soda-vs-running-water/',
    '/articles/appi-news-134': '/articles/fasting-glucose-only-add-hba1c-decision/',
    '/articles/appi-news-135': '/articles/health-checkup-red-flag-triage/',
    '/articles/appi-news-136': '/articles/knee-osteoarthritis-nonsurgical-options/',
    '/articles/appi-news-137': '/articles/chronic-cough-throat-globus-when-to-suspect-gerd/',
    '/articles/appi-news-138': '/articles/metabolic-syndrome-which-marker-to-fix-first/',
    '/articles/appi-news-139': '/articles/psa-4-to-10-gray-zone-biopsy-decision/',
    '/articles/appi-news-140': '/articles/subclinical-hypothyroidism-treat-or-monitor/',
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
    // 2026-07-28 去重複內容改寫：15 篇與 appi.news 重複的文章重新定位並改用新 slug，
    // 舊網址一律 301 至新網址，保留既有連結與索引權重。
    '/articles/benign-prostatic-hyperplasia-psa-treatment': '/articles/psa-4-to-10-gray-zone-biopsy-decision/',
    '/articles/normal-fasting-glucose-blood-sugar-myth': '/articles/fasting-glucose-only-add-hba1c-decision/',
    '/articles/pesticide-residue-produce-6-facts': '/articles/wash-vegetables-salt-baking-soda-vs-running-water/',
    '/articles/health-checkup-abnormal-values-meaning': '/articles/health-checkup-red-flag-triage/',
    '/articles/childhood-allergy-prevention-early-introduction': '/articles/baby-solids-egg-peanut-when-to-introduce/',
    '/articles/thyroid-tsh-high-low-guide': '/articles/subclinical-hypothyroidism-treat-or-monitor/',
    '/articles/male-pattern-baldness-dht-treatment': '/articles/hair-loss-rule-out-before-treating-aga/',
    '/articles/gerd-atypical-symptoms-esophageal-cancer-risk': '/articles/chronic-cough-throat-globus-when-to-suspect-gerd/',
    '/articles/sweeteners-types-safety-labeling-guide': '/articles/sugar-free-label-identify-sweeteners-taiwan/',
    '/articles/metabolic-syndrome-diet-five-markers': '/articles/metabolic-syndrome-which-marker-to-fix-first/',
    '/articles/menopause-symptoms-beyond-hot-flashes': '/articles/perimenopause-or-something-else-in-your-40s/',
    '/articles/tcm-medication-safety-elderly': '/articles/elderly-tcm-western-drug-combos-that-matter/',
    '/articles/menstrual-pain-primary-vs-secondary': '/articles/menstrual-pain-painkillers-losing-effect-endometriosis/',
    '/articles/prediabetes-reversal-fasting-glucose': '/articles/prediabetes-105-next-three-months-plan/',
    '/articles/sedentary-office-worker-health-risks': '/articles/sitting-9-hours-can-exercise-offset-it/',
  },
  integrations: [
    svelte(),
    // /admin 是隱藏管理頁；/tags/* 是 thin 自動分類頁（noindex,follow），皆不應進 sitemap。
    // /podcasts/ep01-supplements 是已下線的示範頁（自身掛 noindex,nofollow + meta refresh）——
    // 它是手寫路由不是 collection 項目，所以逃過既有的 isPublicEntry 過濾，一路留在 sitemap 裡。
    // 「送出去的」和「讓收錄的」不一致，GSC 會一直回報「已提交但被 noindex 排除」。
    // 2026-08-07 由 pnpm check:site 的規則 5 抓到；該規則會持續守住這個不變式。
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/tags/') &&
        !page.includes('/search') &&
        !page.includes('/404') &&
        !page.includes('/podcasts/ep01-supplements'),
      // 內容頁用 frontmatter 的 updatedDate ?? publishDate；靜態頁（首頁／分類／政策頁）
      // 不在 frontmatter 裡，改取該頁 .astro 原始檔的 git commit 日期。
      // 兩者都對不到才留白——**絕不退回 build 時間**，那會讓每次部署都宣稱全站更新。
      // （2026-08-22：此前靜態頁一律留白，408 個網址有 33 個沒有 lastmod，
      //   而首頁與分類頁往往是最重要的頁，完全沒有新鮮度訊號等於白放棄。）
      serialize(item) {
        const path = new URL(item.url).pathname;
        const withSlash = path.endsWith('/') ? path : `${path}/`;
        const lastmod = lastmodMap.get(path)
          ?? lastmodMap.get(withSlash)
          ?? topicLastmod.get(withSlash)
          ?? pageGitDate(path);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
    mdx(),
  ],
  // 內文圖庫圖：把帶真實圖庫攝影連結（img title）的圖轉成 <figure> + 可點署名。
  // mdx() 預設 extendMarkdownConfig，會一併套用到 .mdx 文章。
  markdown: {
    // rehypeUnpublishedLinks 必須留著：排程稿互相連結時，來源先上線、目標還沒上線
    // 會在 dist 產生死連結，CI 連結檢查會擋掉全站部署（見 docs/pitfalls.md）。
    // 這個外掛在建置時把那種連結降級成純文字，目標一上線、下次建置就自動變回連結。
    rehypePlugins: [rehypeStockFigure, rehypeUnpublishedLinks],
  },
  output: 'static',
});
