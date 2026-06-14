# 闢謠頁 ClaimReview JSON-LD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為每篇闢謠（myths）頁面輸出 schema.org `ClaimReview` 結構化資料，讓 AI 搜尋與 Google 在使用者問「X 是真的嗎」時更容易引用本站判讀。

**Architecture:** 把「verdict 中文判定 → 數值評級」對映放進既有 `src/utils/myths/schema.ts`；新增一個純函式 builder `src/utils/schema-org.ts` 把 myths 資料組成 ClaimReview 物件（可單元測試）；`src/pages/myths/[slug].astro` 改為以 builder 產出的物件陣列餵給既有 `JsonLd.astro`（與既有 `Article` 並存）。不新增任何前台可見區塊（遵守 myths 版型刻意簡化的硬規則）。

**Tech Stack:** Astro 5、TypeScript、vitest、既有 `@/components/seo/JsonLd.astro`。

**Scope note:** 本 plan 只做 myths 的 ClaimReview。spec 中其餘站內項目（articles `MedicalWebPage` / `FAQPage` / 作者 `Person` / `Organization` Schema、`.txt` 答案化、llms.txt 方法論段、referrer 監測、寫作 SOP）為後續獨立 plan。

---

## File Structure

- **Modify** `src/utils/myths/schema.ts` — 新增 `VERDICT_RATING` 對映（verdict → 1–5 數值評級）。
- **Create** `src/utils/schema-org.ts` — 純函式 `buildClaimReview()`，輸入 myths 欄位 + canonical URL，回傳 ClaimReview plain object。無 Astro 相依，可單測。
- **Create** `src/utils/schema-org.test.ts` — vitest 單元測試。
- **Modify** `src/pages/myths/[slug].astro` — 匯入 builder，將 line 56 單一 `Article` 物件改為 `[Article, ClaimReview]` 陣列餵給 `JsonLd`。

---

## Task 1: verdict → 數值評級對映

ClaimReview 的 `reviewRating.ratingValue` 需要 1–5 數值（1=錯誤，5=正確）。myths 的 `verdict` 是中文 enum，需建立對映。放在既有 `src/utils/myths/schema.ts`，與 `VERDICT_META` 為鄰。

**Files:**
- Modify: `src/utils/myths/schema.ts`
- Test: `src/utils/schema-org.test.ts`（Task 2 建立；本 Task 的測試先寫在這裡的同一檔，Task 2 再補 builder 測試）

- [ ] **Step 1: 先寫失敗測試**

建立 `src/utils/schema-org.test.ts`，內容：

```ts
import { describe, it, expect } from 'vitest';
import { VERDICT_RATING, MYTH_VERDICTS } from '@/utils/myths/schema';

describe('VERDICT_RATING', () => {
  it('六種 verdict 都有對映', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeTypeOf('number');
    }
  });

  it('正確端與錯誤端落在 1–5 兩極', () => {
    expect(VERDICT_RATING['大致正確']).toBe(5);
    expect(VERDICT_RATING['大致錯誤']).toBe(1);
  });

  it('所有數值介於 1 到 5', () => {
    for (const v of MYTH_VERDICTS) {
      expect(VERDICT_RATING[v]).toBeGreaterThanOrEqual(1);
      expect(VERDICT_RATING[v]).toBeLessThanOrEqual(5);
    }
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- src/utils/schema-org.test.ts`
Expected: FAIL — `VERDICT_RATING` 未從 schema.ts 匯出（import 解析錯誤或 undefined）。

- [ ] **Step 3: 實作對映**

在 `src/utils/myths/schema.ts` 檔尾（`VERDICT_META` 之後）新增：

```ts
// ClaimReview.reviewRating.ratingValue 用：1=與證據不符，5=與證據一致。
export const VERDICT_RATING: Record<MythVerdict, number> = {
  大致正確: 5,
  情境成立: 4,
  過度簡化: 3,
  證據不足: 2,
  需謹慎: 2,
  大致錯誤: 1,
};
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- src/utils/schema-org.test.ts`
Expected: PASS（3 個 VERDICT_RATING 測試綠燈）。

- [ ] **Step 5: commit**

```bash
git add src/utils/myths/schema.ts src/utils/schema-org.test.ts
git commit -m "feat(schema): 新增 myths verdict→ratingValue 對映

ClaimReview.reviewRating 需要 1–5 數值評級，建立 verdict 中文 enum 對映。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: buildClaimReview 純函式 builder

把 myths 資料組成 schema.org ClaimReview 物件。純函式、無 Astro 相依，所有 URL/日期由呼叫端傳入。

**Files:**
- Create: `src/utils/schema-org.ts`
- Test: `src/utils/schema-org.test.ts`（Task 1 已建立，本 Task 追加 describe 區塊）

- [ ] **Step 1: 追加失敗測試**

在 `src/utils/schema-org.test.ts` 檔尾追加：

```ts
import { buildClaimReview } from '@/utils/schema-org';

const sample = {
  mythClaim: '檸檬水可以鹼化體質、預防癌症',
  verdict: '大致錯誤' as const,
  verdictSummary: '人體酸鹼由生理機制嚴格調控，飲食無法改變血液 pH。',
  author: '羅楊',
  publishDate: new Date('2026-05-01T00:00:00+08:00'),
  updatedDate: new Date('2026-05-20T00:00:00+08:00'),
  url: 'https://evidencetoday.news/myths/lemon-water/',
};

describe('buildClaimReview', () => {
  it('@type 與 @context 正確', () => {
    const r = buildClaimReview(sample);
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@type']).toBe('ClaimReview');
  });

  it('claimReviewed 帶被檢驗說法', () => {
    expect(buildClaimReview(sample).claimReviewed).toBe(sample.mythClaim);
  });

  it('reviewRating 反映 verdict 數值與中文標籤', () => {
    const r = buildClaimReview(sample);
    expect(r.reviewRating['@type']).toBe('Rating');
    expect(r.reviewRating.ratingValue).toBe(1); // 大致錯誤
    expect(r.reviewRating.bestRating).toBe(5);
    expect(r.reviewRating.worstRating).toBe(1);
    expect(r.reviewRating.alternateName).toBe('大致錯誤');
  });

  it('itemReviewed 為 Claim、author/publisher 為本站 Organization', () => {
    const r = buildClaimReview(sample);
    expect(r.itemReviewed['@type']).toBe('Claim');
    expect(r.author['@type']).toBe('Organization');
    expect(r.author.name).toBe('本日有據');
  });

  it('url 與日期帶入（ISO 格式）', () => {
    const r = buildClaimReview(sample);
    expect(r.url).toBe(sample.url);
    expect(r.datePublished).toBe('2026-05-01T00:00:00.000Z');
    expect(r.dateModified).toBe('2026-05-20T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- src/utils/schema-org.test.ts`
Expected: FAIL — `@/utils/schema-org` 不存在（無法解析模組）。

- [ ] **Step 3: 實作 builder**

建立 `src/utils/schema-org.ts`：

```ts
import { VERDICT_RATING, type MythVerdict } from '@/utils/myths/schema';

const ORG = {
  '@type': 'Organization',
  name: '本日有據',
  url: 'https://evidencetoday.news/',
} as const;

export interface ClaimReviewInput {
  mythClaim: string;
  verdict: MythVerdict;
  verdictSummary: string;
  author: string;
  publishDate: Date;
  updatedDate: Date;
  url: string;
}

export function buildClaimReview(input: ClaimReviewInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: input.url,
    datePublished: input.publishDate.toISOString(),
    dateModified: input.updatedDate.toISOString(),
    claimReviewed: input.mythClaim,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: VERDICT_RATING[input.verdict],
      bestRating: 5,
      worstRating: 1,
      alternateName: input.verdict,
    },
    itemReviewed: {
      '@type': 'Claim',
      name: input.mythClaim,
      appearance: { '@type': 'CreativeWork', name: '網路流傳說法' },
    },
    reviewBody: input.verdictSummary,
    author: ORG,
    publisher: ORG,
  };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- src/utils/schema-org.test.ts`
Expected: PASS（Task 1 + Task 2 全部綠燈）。

- [ ] **Step 5: commit**

```bash
git add src/utils/schema-org.ts src/utils/schema-org.test.ts
git commit -m "feat(schema): 新增 buildClaimReview 純函式 builder

將 myths 欄位組成 schema.org ClaimReview 物件，可單元測試。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 在闢謠頁輸出 ClaimReview

把 builder 接到 `src/pages/myths/[slug].astro`，與既有 `Article` JSON-LD 並存。`JsonLd.astro` 的 `data` prop 已支援陣列（`Record<string, unknown>[]`），故傳陣列即可。

**Files:**
- Modify: `src/pages/myths/[slug].astro`（import 區 + line 56 的 `JsonLd`）

- [ ] **Step 1: 匯入 builder**

在 `src/pages/myths/[slug].astro` 頂部 import 區（`import JsonLd ...` 那行附近）加入：

```ts
import { buildClaimReview } from '@/utils/schema-org';
```

- [ ] **Step 2: 組裝 ClaimReview 物件**

在 frontmatter 內（`const shareSummary = ...` 之後、模板開始前）加入。`canonical`、`d`、`social` 在現有 frontmatter 已定義，沿用：

```ts
const claimReview = buildClaimReview({
  mythClaim: d.mythClaim,
  verdict: d.verdict,
  verdictSummary: d.verdictSummary,
  author: d.author,
  publishDate: d.publishDate,
  updatedDate: d.updatedDate,
  url: canonical,
});
```

- [ ] **Step 3: 將 JsonLd 改為陣列**

把現有 line 56 的單一物件改為與 `claimReview` 並存的陣列。原本：

```astro
<JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: social.title, description: social.description, image: [social.image], datePublished: d.publishDate.toISOString(), dateModified: d.updatedDate.toISOString(), author: { '@type': 'Person', name: d.author }, publisher: { '@type': 'Organization', name: '本日有據' }, mainEntityOfPage: canonical }} />
```

改為：

```astro
<JsonLd data={[{ '@context': 'https://schema.org', '@type': 'Article', headline: social.title, description: social.description, image: [social.image], datePublished: d.publishDate.toISOString(), dateModified: d.updatedDate.toISOString(), author: { '@type': 'Person', name: d.author }, publisher: { '@type': 'Organization', name: '本日有據' }, mainEntityOfPage: canonical }, claimReview]} />
```

- [ ] **Step 4: build 並驗證 ClaimReview 進入產出 HTML**

Run:
```bash
pnpm build
node -e "const fs=require('fs');const g=require('child_process').execSync('ls dist/myths').toString().trim().split('\n').filter(d=>fs.existsSync('dist/myths/'+d+'/index.html'));const f='dist/myths/'+g[0]+'/index.html';const html=fs.readFileSync(f,'utf8');const m=[...html.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));const arr=m.flat();const cr=arr.find(o=>o['@type']==='ClaimReview');if(!cr)throw new Error('找不到 ClaimReview JSON-LD');if(!cr.claimReviewed||!cr.reviewRating?.ratingValue)throw new Error('ClaimReview 欄位不完整');console.log('OK:',f,'→ ratingValue',cr.reviewRating.ratingValue,'/ claim:',cr.claimReviewed.slice(0,20))"
```
Expected: 印出 `OK: dist/myths/.../index.html → ratingValue N / claim: ...`，`pnpm build` 零錯誤。

- [ ] **Step 5: commit**

```bash
git add src/pages/myths/\[slug\].astro
git commit -m "feat(schema): 闢謠頁輸出 ClaimReview JSON-LD

每篇 myths 在既有 Article 之外並存 ClaimReview，提升 AI/Google 引用機率。
不新增前台可見區塊，遵守 myths 版型簡化規則。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 驗證清單（全部 Task 完成後）

- [ ] `pnpm test` 全綠（含新 `schema-org.test.ts`）。
- [ ] `pnpm build` 零錯誤。
- [ ] Task 3 Step 4 的 node 驗證腳本印出 OK。
- [ ] 隨機開一篇 `dist/myths/*/index.html`，確認沒有新增任何前台可見區塊（只多了 `<script type="application/ld+json">`）。
- [ ] （上線後）以 Google Rich Results Test 驗一篇闢謠 URL，ClaimReview 無錯誤。

## docs-sync 注意

本 plan 動到 `src/pages/myths/[slug].astro`、`src/utils/**`，PR 需同時帶 `docs/` 變動（本 plan 檔本身即在 `docs/`，同 PR 即可滿足 `docs-sync-check`）。實作完成後建議在 `docs/architecture.md` 的「已實作 SEO/AEO」表補一列 ClaimReview。
