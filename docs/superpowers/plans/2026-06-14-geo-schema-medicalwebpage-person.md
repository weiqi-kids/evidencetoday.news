# Schema 升級：MedicalWebPage + 作者 Person credential + sameAs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 強化站內結構化資料的權威訊號——文章與成分解析頁升級為 `MedicalWebPage`、作者改為帶 credential 與 `sameAs` 的 `Person`、機構 `Organization` 補 `sameAs`，讓 AI 搜尋更容易判斷來源可信度並引用本站。

**Architecture:** 新增 `src/data/authors.ts`（作者資料 registry，目前一位主編羅揚），在既有 `src/utils/schema-org.ts` 加純函式 `buildPerson()` 與共用常數 `SITE_SAMEAS`，並為共用 `ORG` 補 `sameAs`。各頁面（首頁 Organization、作者頁、文章頁、成分頁）改用這些 builder/常數輸出升級後的 JSON-LD。純資料/builder 走 TDD 單元測試；.astro 頁面以 `pnpm build` + 產出 HTML 結構檢查驗證。不新增任何前台可見區塊。

**Tech Stack:** Astro 5、TypeScript、vitest、既有 `@/components/seo/JsonLd.astro`、既有 `src/utils/schema-org.ts`。

**已確認的設計決定（使用者拍板）：**
- MedicalWebPage 套用：**文章 + 成分解析**（myths 已有 ClaimReview，不在此列）。
- `sameAs` 外部身分：Firstory Podcast《喜聞樂健》+ YouTube 頻道。
- FAQPage：文章已實作，**本 plan 不處理**；成分目前 20 篇皆無 FAQ 內容，亦不處理。

**常數（整個 plan 共用，請逐字使用）：**
- Firstory：`https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes`
- YouTube：`https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ`
- 作者頁 URL：`https://evidencetoday.news/authors/luo-yang/`
- 內容中作者字串一律為 `羅揚`（揚，非楊）；articles 的 `reviewer`/`editor` 亦為 `羅揚`。

---

## File Structure

- **Create** `src/data/authors.ts` — 作者 registry（`AuthorInfo` 型別 + `AUTHORS` map）。純資料。
- **Modify** `src/utils/schema-org.ts` — 加 `SITE_SAMEAS` 常數、為 `ORG` 補 `sameAs`、加純函式 `buildPerson()`。
- **Modify** `src/utils/schema-org.test.ts` — 追加 `buildPerson` 與 `ORG.sameAs` 測試。
- **Modify** `src/pages/index.astro` — 首頁 canonical Organization 補 `sameAs`。
- **Modify** `src/pages/authors/luo-yang/index.astro` — 輸出 `Person` JSON-LD。
- **Modify** `src/pages/articles/[slug].astro` — `articleSchema` 升級為 `['Article','MedicalWebPage']` + `buildPerson` author/reviewedBy + 醫療屬性。
- **Modify** `src/pages/ingredients/[slug].astro` — `ingredientArticleSchema` 升級為 `['Article','MedicalWebPage']` + 醫療屬性（author 維持 Organization）。
- **Modify** `docs/architecture.md` — 同步 SEO/AEO 表（docs-sync）。

---

## Task 1: 作者 registry + buildPerson + sameAs 常數

**Files:**
- Create: `src/data/authors.ts`
- Modify: `src/utils/schema-org.ts`
- Test: `src/utils/schema-org.test.ts`

- [ ] **Step 1: 先寫失敗測試** — 在 `src/utils/schema-org.test.ts` 末尾追加（檔案頂部已 `import { describe, it, expect } from 'vitest'`）：

```ts
import { buildPerson, SITE_SAMEAS } from '@/utils/schema-org';

describe('SITE_SAMEAS', () => {
  it('含 Firstory 與 YouTube 兩個外部身分', () => {
    expect(SITE_SAMEAS).toContain('https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes');
    expect(SITE_SAMEAS).toContain('https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ');
  });
});

describe('buildPerson', () => {
  it('已知作者（羅揚）回傳含 credential 與 sameAs 的 Person', () => {
    const p = buildPerson('羅揚');
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('羅揚');
    expect(p.url).toBe('https://evidencetoday.news/authors/luo-yang/');
    expect(p.jobTitle).toBe('本日有據主編');
    expect(Array.isArray(p.knowsAbout)).toBe(true);
    expect(p.knowsAbout!.length).toBeGreaterThan(0);
    expect(p.sameAs).toEqual(SITE_SAMEAS);
    expect(p['@id']).toBe('https://evidencetoday.news/authors/luo-yang/#person');
  });

  it('未知作者回傳僅含 name 的 Person（fallback）', () => {
    const p = buildPerson('某匿名作者');
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('某匿名作者');
    expect(p.url).toBeUndefined();
    expect(p.jobTitle).toBeUndefined();
    expect(p.sameAs).toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗** — Run: `pnpm test -- src/utils/schema-org.test.ts` — Expected: FAIL（`buildPerson` / `SITE_SAMEAS` 未匯出）。

- [ ] **Step 3a: 建立 `src/data/authors.ts`** — 內容：

```ts
export interface AuthorInfo {
  name: string;
  url: string;
  jobTitle: string;
  knowsAbout: string[];
  sameAs: string[];
}

// 作者資料 registry。key 為內容 frontmatter 的 author 字串。
export const AUTHORS: Record<string, AuthorInfo> = {
  羅揚: {
    name: '羅揚',
    url: 'https://evidencetoday.news/authors/luo-yang/',
    jobTitle: '本日有據主編',
    knowsAbout: ['健康識讀', '營養科學', '預防醫學', '公共衛生', '熟齡健康溝通', '保健食品觀念'],
    sameAs: [
      'https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes',
      'https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ',
    ],
  },
};
```

- [ ] **Step 3b: 改 `src/utils/schema-org.ts`** — 在檔案頂部 import 區加 `import { AUTHORS } from '@/data/authors';`。在 `ORG` 常數「之前」加 `SITE_SAMEAS`，並把 `ORG` 補上 `sameAs`：

把現有：
```ts
const ORG = {
  '@type': 'Organization',
  name: '本日有據',
  url: 'https://evidencetoday.news/',
} as const;
```
改為：
```ts
export const SITE_SAMEAS = [
  'https://open.firstory.me/user/cm54wunhn07kb01151eda467n/episodes',
  'https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ',
];

const ORG = {
  '@type': 'Organization',
  name: '本日有據',
  url: 'https://evidencetoday.news/',
  sameAs: SITE_SAMEAS,
} as const;
```

並在檔案末尾加 `buildPerson`：
```ts
export function buildPerson(authorName: string) {
  const info = AUTHORS[authorName];
  if (!info) {
    return { '@type': 'Person', name: authorName } as {
      '@type': 'Person';
      name: string;
      '@id'?: string;
      url?: string;
      jobTitle?: string;
      knowsAbout?: string[];
      sameAs?: string[];
    };
  }
  return {
    '@type': 'Person',
    '@id': `${info.url}#person`,
    name: info.name,
    url: info.url,
    jobTitle: info.jobTitle,
    knowsAbout: info.knowsAbout,
    sameAs: info.sameAs,
  };
}
```

- [ ] **Step 4: 跑測試確認通過** — Run: `pnpm test -- src/utils/schema-org.test.ts` — Expected: PASS（既有 ClaimReview 測試 + 新增 buildPerson/SITE_SAMEAS 測試全綠）。

- [ ] **Step 5: commit**

```bash
git add src/data/authors.ts src/utils/schema-org.ts src/utils/schema-org.test.ts
git commit -m "feat(schema): 作者 registry + buildPerson + SITE_SAMEAS

新增結構化作者資料與 Person builder（含 credential/sameAs），ORG 補 sameAs。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 首頁 Organization 補 sameAs

**Files:** Modify `src/pages/index.astro`（現有 Organization JSON-LD 在 `<Fragment slot="head">` 內）。

- [ ] **Step 1: 匯入常數** — 在 `src/pages/index.astro` frontmatter import 區加：
```ts
import { SITE_SAMEAS } from '@/utils/schema-org';
```

- [ ] **Step 2: 補 sameAs** — 找到現有 Organization JSON-LD：
```astro
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '本日有據',
      alternateName: 'Evidence Today',
      url: 'https://evidencetoday.news',
      publishingPrinciples: 'https://evidencetoday.news/editorial-policy/',
    }} />
```
在 `publishingPrinciples` 之後加一行 `sameAs: SITE_SAMEAS,`：
```astro
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '本日有據',
      alternateName: 'Evidence Today',
      url: 'https://evidencetoday.news',
      publishingPrinciples: 'https://evidencetoday.news/editorial-policy/',
      sameAs: SITE_SAMEAS,
    }} />
```

- [ ] **Step 3: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');const html=fs.readFileSync('dist/index.html','utf8');const arr=[...html.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flat();const org=arr.find(o=>o['@type']==='Organization');if(!org)throw new Error('缺 Organization');if(!org.sameAs||!org.sameAs.includes('https://www.youtube.com/channel/UCTejYxFd04qma-LY0_Z17NQ'))throw new Error('Organization 缺 sameAs');console.log('OK Organization.sameAs:',org.sameAs.join(' , '))"
```
Expected: 印出 `OK Organization.sameAs: ...`，build 零錯誤。

- [ ] **Step 4: commit**
```bash
git add src/pages/index.astro
git commit -m "feat(schema): 首頁 Organization 補 sameAs（Firstory/YouTube）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 作者頁輸出 Person JSON-LD

**Files:** Modify `src/pages/authors/luo-yang/index.astro`（使用 `Base` layout；`Base` 支援 `<Fragment slot="head">`，如首頁用法）。

- [ ] **Step 1: 匯入 builder** — 在該檔 frontmatter import 區加：
```ts
import JsonLd from '@/components/seo/JsonLd.astro';
import { buildPerson } from '@/utils/schema-org';
```

- [ ] **Step 2: 組裝 Person schema** — 在 frontmatter（`---` 內、變數宣告區）加：
```ts
const personSchema = { '@context': 'https://schema.org', ...buildPerson('羅揚') };
```

- [ ] **Step 3: 在 head slot 輸出** — 在 `<Base ...>` 開標籤之後、`<main ...>` 之前，加入一個 head slot fragment（與首頁同模式）。找到：
```astro
<Base title={STATIC_SOCIAL['author-luo-yang'].title} description={STATIC_SOCIAL['author-luo-yang'].description} ogTitle={STATIC_SOCIAL['author-luo-yang'].title} ogDescription={STATIC_SOCIAL['author-luo-yang'].description} ogImage={STATIC_SOCIAL['author-luo-yang'].ogPath}>
  <main class="container editor-page">
```
改為（在 `<main>` 前插入 head fragment，不動 `<main>` 內任何內容）：
```astro
<Base title={STATIC_SOCIAL['author-luo-yang'].title} description={STATIC_SOCIAL['author-luo-yang'].description} ogTitle={STATIC_SOCIAL['author-luo-yang'].title} ogDescription={STATIC_SOCIAL['author-luo-yang'].description} ogImage={STATIC_SOCIAL['author-luo-yang'].ogPath}>
  <Fragment slot="head">
    <JsonLd data={personSchema} />
  </Fragment>
  <main class="container editor-page">
```

- [ ] **Step 4: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');const html=fs.readFileSync('dist/authors/luo-yang/index.html','utf8');const arr=[...html.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flat();const p=arr.find(o=>o['@type']==='Person');if(!p)throw new Error('缺 Person');if(!p.jobTitle||!p.sameAs)throw new Error('Person 欄位不完整');console.log('OK Person:',p.name,'| jobTitle:',p.jobTitle,'| sameAs:',p.sameAs.length,'個')"
```
Expected: 印出 `OK Person: 羅揚 | jobTitle: 本日有據主編 | sameAs: 2 個`，build 零錯誤。

- [ ] **Step 5: commit**
```bash
git add src/pages/authors/luo-yang/index.astro
git commit -m "feat(schema): 作者頁輸出 Person JSON-LD（credential + sameAs）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 文章頁升級 MedicalWebPage + Person author/reviewedBy

**Files:** Modify `src/pages/articles/[slug].astro`（`articleSchema` 目前在 line 62-76）。

- [ ] **Step 1: 匯入 buildPerson** — 在該檔 frontmatter import 區（`import JsonLd ...` 附近）加：
```ts
import { buildPerson } from '@/utils/schema-org';
```

- [ ] **Step 2: 升級 articleSchema** — 把現有：
```ts
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: data.title,
  description: data.description,
  author: { '@type': 'Person', name: data.author },
  datePublished: data.publishDate.toISOString(),
  dateModified: data.updatedDate.toISOString(),
  publisher: {
    '@type': 'Organization',
    name: '本日有據',
    url: 'https://evidencetoday.news',
  },
  keywords: [...(data.tags ?? []), ...(queryPatternLabel ? [queryPatternLabel] : [])],
};
```
改為：
```ts
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': ['Article', 'MedicalWebPage'],
  headline: data.title,
  description: data.description,
  author: buildPerson(data.author),
  ...(data.reviewer ? { reviewedBy: buildPerson(data.reviewer) } : {}),
  lastReviewed: data.updatedDate.toISOString(),
  medicalAudience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
  datePublished: data.publishDate.toISOString(),
  dateModified: data.updatedDate.toISOString(),
  publisher: {
    '@type': 'Organization',
    name: '本日有據',
    url: 'https://evidencetoday.news',
  },
  keywords: [...(data.tags ?? []), ...(queryPatternLabel ? [queryPatternLabel] : [])],
};
```

- [ ] **Step 3: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');const g=require('child_process').execSync('ls dist/articles').toString().trim().split('\n').filter(d=>fs.existsSync('dist/articles/'+d+'/index.html'));const f='dist/articles/'+g[0]+'/index.html';const arr=[...fs.readFileSync(f,'utf8').matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flat();const a=arr.find(o=>Array.isArray(o['@type'])&&o['@type'].includes('MedicalWebPage'));if(!a)throw new Error('缺 MedicalWebPage 文章節點');if(a.author['@type']!=='Person'||!a.author.sameAs)throw new Error('author 非含 sameAs 的 Person');if(!a.lastReviewed)throw new Error('缺 lastReviewed');console.log('OK',f,'→ author',a.author.name,'| reviewedBy',a.reviewedBy?.name,'| medicalAudience',a.medicalAudience.audienceType)"
```
Expected: 印出 `OK dist/articles/... → author 羅揚 | reviewedBy 羅揚 | medicalAudience Patient`，build 零錯誤。

- [ ] **Step 4: commit**
```bash
git add src/pages/articles/\[slug\].astro
git commit -m "feat(schema): 文章頁升級 Article+MedicalWebPage，author 用 buildPerson

加 reviewedBy/lastReviewed/medicalAudience，作者帶 credential 與 sameAs。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 成分頁升級 MedicalWebPage

**Files:** Modify `src/pages/ingredients/[slug].astro`（`ingredientArticleSchema` 目前在 line 49-70；成分內容由機構撰寫，author 維持 Organization）。

- [ ] **Step 1: 升級 ingredientArticleSchema** — 把現有：
```ts
const ingredientArticleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: data.title,
  description: data.description,
  datePublished: data.publishDate.toISOString(),
  dateModified: data.updatedDate.toISOString(),
  author: {
    '@type': 'Organization',
    name: '本日有據',
  },
  publisher: {
    '@type': 'Organization',
    name: '本日有據',
  },
  about: {
    '@type': 'Thing',
    name: data.title,
  },
  articleSection: '成分解析',
  mainEntityOfPage: `https://evidencetoday.news/ingredients/${slug}/`,
};
```
改為（加 `MedicalWebPage` 類型與醫療屬性；author/publisher 維持 Organization；新增 `reviewedBy` 為機構）：
```ts
const ingredientArticleSchema = {
  '@context': 'https://schema.org',
  '@type': ['Article', 'MedicalWebPage'],
  headline: data.title,
  description: data.description,
  datePublished: data.publishDate.toISOString(),
  dateModified: data.updatedDate.toISOString(),
  lastReviewed: data.updatedDate.toISOString(),
  medicalAudience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
  author: {
    '@type': 'Organization',
    name: '本日有據',
  },
  reviewedBy: {
    '@type': 'Organization',
    name: '本日有據',
    url: 'https://evidencetoday.news/',
  },
  publisher: {
    '@type': 'Organization',
    name: '本日有據',
  },
  about: {
    '@type': 'Thing',
    name: data.title,
  },
  articleSection: '成分解析',
  mainEntityOfPage: `https://evidencetoday.news/ingredients/${slug}/`,
};
```

- [ ] **Step 2: build 驗證** — Run:
```bash
pnpm build
node -e "const fs=require('fs');const g=require('child_process').execSync('ls dist/ingredients').toString().trim().split('\n').filter(d=>fs.existsSync('dist/ingredients/'+d+'/index.html'));const f='dist/ingredients/'+g[0]+'/index.html';const arr=[...fs.readFileSync(f,'utf8').matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flat();const a=arr.find(o=>Array.isArray(o['@type'])&&o['@type'].includes('MedicalWebPage'));if(!a)throw new Error('缺 MedicalWebPage 成分節點');if(!a.lastReviewed||!a.medicalAudience)throw new Error('缺醫療屬性');console.log('OK',f,'→ lastReviewed',a.lastReviewed.slice(0,10),'| medicalAudience',a.medicalAudience.audienceType)"
```
Expected: 印出 `OK dist/ingredients/... → lastReviewed YYYY-MM-DD | medicalAudience Patient`，build 零錯誤。

- [ ] **Step 3: commit**
```bash
git add src/pages/ingredients/\[slug\].astro
git commit -m "feat(schema): 成分頁升級 Article+MedicalWebPage（醫療屬性）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: docs 同步

**Files:** Modify `docs/architecture.md`（SEO/AEO 表 line 21 附近）。

- [ ] **Step 1: 更新 architecture.md** — 找到 Schema.org JSON-LD 那列（提到 myths ClaimReview 的句子），在句尾補上：
```
；文章與成分頁為 Article+MedicalWebPage（reviewedBy/lastReviewed/medicalAudience），作者用 buildPerson（Person + credential + sameAs），Organization/Person 帶 sameAs（Firstory/YouTube）
```
（直接接在現有 cell 文字後，不另起表格列。）

- [ ] **Step 2: commit**
```bash
git add docs/architecture.md
git commit -m "docs: 同步 MedicalWebPage/Person/sameAs Schema 升級

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 驗證清單（全部 Task 完成後）

- [ ] `pnpm test` 全綠（含新 buildPerson/SITE_SAMEAS 測試）。
- [ ] `pnpm build` 零錯誤。
- [ ] Task 2–5 的 node 驗證腳本皆印出 OK。
- [ ] 隨機開 articles/ingredients/authors 各一篇產出 HTML，確認**無新增任何前台可見區塊**（只多/改 `<script type="application/ld+json">`）。
- [ ] （上線後）以 Google Rich Results Test 驗一篇文章 + 作者頁，無 error（MedicalWebPage 可能無 rich result 但不應報錯）。

## 注意事項

- `@type: ['Article','MedicalWebPage']` 為多型節點：`headline`/`author`/`datePublished` 屬 Article、`reviewedBy`/`lastReviewed`/`medicalAudience` 屬 MedicalWebPage，多型下皆合法。主要服務 AI 取用與健康內容權威訊號。
- 不得新增前台可見區塊（articles/ingredients 版型不在此 plan 變動範圍）。
- `buildPerson` 對未知作者 fallback 為 `{ '@type':'Person', name }`，故新作者未進 registry 也不會壞 build（只是少 credential）。
- 本 plan 不動 FAQPage（articles 已有）、不動 myths（已有 ClaimReview）。
