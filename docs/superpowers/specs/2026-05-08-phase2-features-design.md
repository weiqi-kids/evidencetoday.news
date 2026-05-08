# Evidence Today — Phase 2 功能完善設計規格

> 版本：v1.2
> 日期：2026-05-08
> 狀態：待審查
> 前置規格：`2026-05-07-evidencetoday-design.md` v1.3

### 變更紀錄

| 版本 | 變更 |
|------|------|
| v1.0 | 初版 |
| v1.1 | 第一輪審查修正 17 項：draft 過濾、tag URL 編碼、SVG 渲染明確化、Lighthouse configPath 修正、Lighthouse 改用 staticDistDir 測本地 dist、sharp 明確依賴、首頁 OG 處理、hex 值標註需驗證、字體格式改 .ttf、OG 路徑計算位置修正、PathwayDiagram 改純 SVG+Svelte 不用 d3、@types/d3-force 補充、字體 build-time fetch 避免大檔進 git、news OG 排除說明 |
| v1.2 | 第二輪審查修正 4 項：§4.6 Base.astro 修改描述矛盾修正、ingredients/[slug].astro 清單合併、tag 計算邏輯提取為 utility、字體改為手動下載為主方案 |

---

## 範圍

本規格涵蓋原設計規格中標註為 Phase 2 或待完善的 4 項功能：

| # | 功能 | 原始狀態 | 目標 |
|---|------|---------|------|
| 1 | 趨勢頁 d3 熱詞圖表 | placeholder「即將推出」 | d3 Bubble Chart 互動圖表 |
| 2 | 原料頁代謝路徑圖 | mechanism 純文字 | SVG Node-Link Pathway Diagram |
| 3 | Lighthouse CI | deploy.yml 已註解 | 啟用並設定閾值 |
| 4 | OG Image 自動生成 | 靜態 /og-default.jpg | satori build-time 自動產出 PNG |

**不在範圍內**：HTTPS enforce（已由 GitHub Pages + CNAME + site URL 自動完成）。

---

## 1. 趨勢熱詞 Bubble Chart

### 1.1 設計決策

原規格（v1.3 第 671 行）定義為水平長條圖。經評估後改為 **Bubble Chart**，理由：

- 與首頁 HeroParticles 的粒子風格視覺一致
- d3-force 佈局提供更佳的互動體驗（hover、click）
- 空間效率更好：多標籤時不會因列表過長而截斷
- 適合「探索式」瀏覽，使用者會自然被大氣泡吸引

### 1.2 元件規格

**檔案**：`src/components/charts/TrendBubbles.svelte`

**資料結構**（props）：

```typescript
interface TagBubble {
  tag: string;      // 標籤名稱
  count: number;    // 出現次數
}

// props
tags: TagBubble[]
```

**資料來源**：build time 從所有 6 個 collection 的 `tags[]` 欄位統計出現頻率（過濾 `draft: true`），取前 20 個。資料在 `.astro` 頁面中計算，以 props 傳入 Svelte 元件。

**渲染方式**：**SVG**（非 Canvas）。需要 DOM 事件處理（hover tooltip、click 導航），SVG 比 Canvas 更適合。

**視覺設計**：

- 容器：圓角卡片（`--radius-card`），白底，1px `--color-fog` 邊框
- 氣泡：SVG `<circle>`，大小由 `d3-scale` 的 `scaleSqrt` 映射（`count` → 半徑 20-60px）
- 色彩：使用 `--color-teal` 為主色，透過 `color-mix()` 產生 3 級深淺（count 高→深，count 低→淺）
- 佈局：`d3-force` forceSimulation，含 forceCollide（防重疊）+ forceCenter（置中）+ forceX/forceY（輕微重力）
- 文字：SVG `<text>` 在氣泡內顯示標籤名（半徑小於 30px 時隱藏文字，僅 hover 時在 tooltip 顯示）
- 最小高度：280px（與現有 placeholder 一致）

**互動**：

- **hover**：氣泡放大 1.1x（SVG transform）+ HTML tooltip（標籤名 + 出現次數）
- **click**：不設連結（目前專案無 `/tags/[tag]/` 頁面路由，待未來新增 tag 頁面後再啟用）
- **noscript**：顯示純文字列表「熱門標籤：維他命C（5 次）、…」

**載入策略**：`client:visible`

**使用位置**：

1. **首頁** `src/pages/index.astro`：替換 `.trends-placeholder` 區塊
2. **新聞頁** `src/pages/news/index.astro`：替換 placeholder 區塊

### 1.3 需要新增的依賴

```
dependencies:
  d3-force

devDependencies:
  @types/d3-force
```

### 1.4 資料計算邏輯

提取為共用工具函數，避免在 `index.astro` 和 `news/index.astro` 中重複：

**檔案**：`src/utils/tag-stats.ts`

```typescript
import { getCollection } from 'astro:content';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'] as const;

export async function getTopTags(limit = 20) {
  const allEntries = (
    await Promise.all(COLLECTIONS.map((c) => getCollection(c)))
  )
    .flat()
    .filter((e) => !e.data.draft);

  const tagCounts = new Map<string, number>();
  for (const entry of allEntries) {
    for (const tag of entry.data.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
```

在 `.astro` 頁面中使用（專案使用 `@/` alias 指向 `src/`）：

```astro
import { getTopTags } from '@/utils/tag-stats';
const topTags = await getTopTags();
```

---

## 2. 原料頁代謝路徑圖

### 2.1 設計決策

原規格（v1.3 第 596 行）定義為「Phase 2 實作 d3.js 互動視覺化」。採用 **水平節點連線圖（Node-Link Diagram）**，理由：

- 生化代謝是線性步驟流程，水平佈局最直覺
- 比 Sankey diagram 簡單，適合科普場景
- 節點數少（通常 3-6 步），不需要力導向佈局

**技術選擇：純 SVG + Svelte 反應性**（不使用 d3）。理由：
- 佈局是固定線性排列，不需要 d3-force 物理模擬
- 節點位置可由 Svelte 直接計算（等距排列）
- 減少不必要的依賴
- 互動（hover、tooltip）用 Svelte 事件處理即可

### 2.2 Schema 變更

在 `src/content.config.ts` 的 ingredients schema 中新增 `pathwaySteps` 欄位（放在 `mechanism` 之後）：

```typescript
pathwaySteps: z
  .array(
    z.object({
      name: z.string(),           // 步驟名稱，如「抗壞血酸」
      description: z.string(),    // 步驟說明
      enzyme: z.string().optional(), // 催化酵素名稱（選填）
    }),
  )
  .optional(),
```

**Fallback 策略**：若 `pathwaySteps` 未填寫，顯示原有 `mechanism` 純文字。兩者都沒有則不顯示此區塊。

### 2.3 元件規格

**檔案**：`src/components/charts/PathwayDiagram.svelte`

**Props**：

```typescript
steps: { name: string; description: string; enzyme?: string }[]
```

**視覺設計**：

- 容器：圓角卡片（`--radius-card`），白底，1px `--color-fog` 邊框，padding 1.5rem，與 EvidenceScale 視覺風格一致
- 標題：「機制與代謝路徑」（`--text-h3`，`--color-ink`）
- 節點：圓角矩形（`--radius-sm`），白底 + 2px `--color-teal` 邊框，內含步驟名稱（`--text-meta`）
- 連線：SVG `<line>` + `<marker>` 箭頭，色彩 `--color-fog`
- 酵素標籤：箭頭上方小字（`--text-badge`），色彩 `--color-cat-ingredient`
- 桌面佈局（>= 640px）：SVG 水平排列，節點等距分佈，viewBox 依節點數自動計算
- 手機佈局（< 640px）：CSS media query 切換為垂直排列

**互動**：

- **hover**：節點邊框變 `--color-coral`，顯示 HTML tooltip（description 文字）
- **noscript**：顯示有序列表（1. 抗壞血酸 → 2. 電子供體 → …）

**載入策略**：`client:visible`

**使用位置**：`src/pages/ingredients/[slug].astro`，在 EvidenceScale 上方、原 mechanism 文字區塊位置。若有 `pathwaySteps` 顯示圖表，否則顯示 `mechanism` 文字。

### 2.4 維他命 C 示範資料

```yaml
pathwaySteps:
  - name: "抗壞血酸"
    description: "維他命 C 的活性形式，作為電子供體參與反應"
  - name: "電子轉移"
    description: "捐出一個電子，形成抗壞血酸自由基（半穩定態）"
    enzyme: "抗壞血酸氧化酶"
  - name: "脯胺酸羥化"
    description: "羥化脯胺酸殘基，為膠原蛋白三螺旋結構所必需"
    enzyme: "脯胺酸羥化酶"
  - name: "膠原蛋白合成"
    description: "穩定的三螺旋膠原蛋白分子組裝完成"
  - name: "去氫抗壞血酸"
    description: "氧化態，可被還原酶或穀胱甘肽還原回活性形式"
    enzyme: "去氫抗壞血酸還原酶"
```

---

## 3. Lighthouse CI

### 3.1 設計決策

- 初期設為 **warning 模式**（不擋部署），穩定後切換為 hard fail
- 使用 `staticDistDir` 測試本地 dist/ 目錄（不依賴線上 URL，避免測到舊版本）
- 測試 3 個代表頁面，涵蓋主要 layout
- 使用 `treosh/lighthouse-ci-action@v12`（已在 deploy.yml 中）
- 不安裝 `@lhci/cli` 為專案依賴（CI action 自帶）

### 3.2 閾值

| 指標 | 閾值（warning） | 備註 |
|------|----------------|------|
| Performance | >= 90 | 靜態站應可輕易達標 |
| SEO | >= 95 | Schema JSON-LD + meta 完備 |
| Accessibility | >= 95 | oklch 高對比 + 語意 HTML |
| Best Practices | >= 90 | HTTPS + 安全標頭 |

### 3.3 測試頁面

使用 `staticDistDir` 時，URL 為相對路徑：

```yaml
urls:
  - http://localhost/
  - http://localhost/articles/omega-3-guide/
  - http://localhost/ingredients/vitamin-c/
```

Lighthouse CI action 會自動在 dist/ 上啟動本地 server。

### 3.4 deploy.yml 修改

取消註解第 57-62 行，改為（放在 Pagefind build 之後、Upload artifact 之前）：

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    configPath: ./lighthouserc.json
    uploadArtifacts: true
    staticDistDir: ./dist
  continue-on-error: true
```

注意：
- 使用 `configPath`（非 `budgetPath`）指向 lighthouserc.json
- `staticDistDir` 讓 action 在本地 dist/ 目錄上啟動 server，測試當前 build 而非線上舊版本
- `continue-on-error: true` 確保初期不擋部署

### 3.5 lighthouserc.json

新增專案根目錄 `lighthouserc.json`：

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost/",
        "http://localhost/articles/omega-3-guide/",
        "http://localhost/ingredients/vitamin-c/"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.95 }],
        "categories:accessibility": ["warn", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## 4. OG Image 自動生成

### 4.1 設計決策

- 使用 `satori`（Vercel 出品，JSX → SVG）+ `sharp`（SVG → PNG）
- **Build time 生成**：Astro static endpoint 在 build 時產出 PNG
- 模板統一，5 種內容類型用分類色區分（排除 news，因為 news 是外部來源引用，不需要獨立 OG 圖）
- 產出尺寸：1200 x 630 px（Open Graph 標準）

### 4.2 依賴

新增至 `package.json`：

```json
"dependencies": {
  "satori": "^0.12.0"
},
"devDependencies": {
  "sharp": "^0.33.0"
}
```

- `satori`：JSX → SVG 轉換（runtime dependency，build time 使用）
- `sharp`：SVG → PNG 轉換。Astro 內部依賴 sharp 做圖片最佳化，但不保證 export 可用，需明確安裝

### 4.3 字體處理

satori 需要本地字體 ArrayBuffer。

**主方案：手動下載 .ttf 檔案，commit 進 repo**

1. 從 Google Fonts 下載 Noto Sans TC Regular (400) 和 Bold (700) 的 `.ttf` 檔案
2. 存放於 `src/assets/fonts/NotoSansTC-Regular.ttf` 和 `src/assets/fonts/NotoSansTC-Bold.ttf`
3. 這些字體檔只在 build time 被 satori 讀取，不進 `public/`，不影響前端
4. 每個 .ttf 約 8MB，總共約 16MB。雖然偏大但不會變動，commit 一次後不再更新

```typescript
// src/utils/og-fonts.ts
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FONT_DIR = new URL('../assets/fonts/', import.meta.url);

export async function loadFonts() {
  const [regular, bold] = await Promise.all([
    readFile(fileURLToPath(new URL('NotoSansTC-Regular.ttf', FONT_DIR))),
    readFile(fileURLToPath(new URL('NotoSansTC-Bold.ttf', FONT_DIR))),
  ]);
  return { regular: regular.buffer, bold: bold.buffer };
}
```

**備選方案**：若不想 commit 大檔案，可在 CI 的 build step 前加一步 `curl` 下載字體，但增加了 CI 對外部服務的依賴。

### 4.4 Endpoint 結構

**檔案**：`src/pages/og/[...slug].png.ts`

這是 Astro static endpoint，為每個內容頁面產出一張 OG 圖片。

```typescript
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

// 涵蓋 5 種 collection（不含 news）
const COLLECTIONS = ['articles', 'myths', 'ingredients', 'podcasts', 'videos'] as const;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = [];

  for (const collection of COLLECTIONS) {
    const entries = await getCollection(collection);
    for (const entry of entries.filter(e => !e.data.draft)) {
      paths.push({
        params: { slug: `${collection}/${entry.slug}` },
        props: {
          title: entry.data.title,
          collection,
        },
      });
    }
  }

  // 首頁
  paths.push({
    params: { slug: 'index' },
    props: {
      title: '本日有據 Evidence Today',
      collection: 'website',
    },
  });

  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  // 1. loadFonts()
  // 2. satori() 渲染 JSX → SVG
  // 3. sharp(svgBuffer).png() 轉換
  // 4. return new Response(pngBuffer, { headers: { 'Content-Type': 'image/png' } })
};
```

**路由範例**：
- `/og/articles/omega-3-guide.png`
- `/og/ingredients/vitamin-c.png`
- `/og/myths/vitamin-c-cold.png`
- `/og/index.png`（首頁）

### 4.5 模板設計

```
+--------------------------------------------------+
|                                                  |
|  [分類標籤]  ← 分類色背景 pill                     |
|                                                  |
|  文章標題最多兩行                                  |
|  第二行繼續                                       |
|                                                  |
|  ──────────────────                              |
|  本日有據 Evidence Today                          |
|                                                  |
+--------------------------------------------------+
```

- 背景：teal 純色
- 分類標籤：pill 形狀，背景為對應分類色，白色文字
- 標題：白色，Noto Sans TC Bold，48px，最多 2 行（超出截斷加 …）
- 品牌名：白色，Noto Sans TC Regular，24px，底部
- 分隔線：白色 40% 透明度

**oklch → hex 色值對照**：satori 不支援 oklch，需使用 hex 近似值。以下值需在實作時用 CSS `oklch()` → hex 工具精確轉換，此處為參考估值：

| Token | oklch | Hex 估值（需驗證） |
|-------|-------|-------------------|
| teal | oklch(0.38 0.08 200) | ~#1a6b6e |
| cat-article | oklch(0.45 0.09 195) | ~#2d8185 |
| cat-myth | oklch(0.48 0.14 30) | ~#b85a3a |
| cat-ingredient | oklch(0.48 0.10 140) | ~#3a8a4a |
| cat-podcast | oklch(0.45 0.10 280) | ~#6a5aad |
| cat-video | oklch(0.45 0.12 65) | ~#8a7030 |

分類名稱對照（用於 pill 文字）：

| Collection | 中文標籤 |
|------------|---------|
| articles | 深度文章 |
| myths | 迷思查核 |
| ingredients | 原料檢視 |
| podcasts | Podcast |
| videos | 影片 |
| website | 首頁（不顯示 pill） |

### 4.6 Layout 整合

**Base.astro 僅修改預設值**（`/og-default.jpg` → `/og/index.png`），不加入路徑計算邏輯。各 `[slug].astro` 頁面負責計算 OG 路徑後傳入：

```astro
<!-- 範例：src/pages/articles/[slug].astro -->
const ogImage = data.coverImage || `/og/articles/${entry.slug}.png`;
<!-- 傳入 Base layout -->
<Base title={data.title} ogImage={ogImage}>
```

需修改的 5 個 `[slug].astro` 頁面：
- `src/pages/articles/[slug].astro`
- `src/pages/myths/[slug].astro`
- `src/pages/ingredients/[slug].astro`
- `src/pages/videos/[slug].astro`
- `src/pages/podcasts/[slug].astro`

`Base.astro` 的 `ogImage` 預設值改為 `/og/index.png`（取代不存在的 `/og-default.jpg`）。

---

## 檔案變更清單

### 新增檔案

| 檔案 | 用途 |
|------|------|
| `src/components/charts/TrendBubbles.svelte` | 熱詞 Bubble Chart（d3-force + SVG） |
| `src/components/charts/PathwayDiagram.svelte` | 代謝路徑圖（純 SVG + Svelte） |
| `src/utils/tag-stats.ts` | 跨 collection 標籤統計工具 |
| `src/pages/og/[...slug].png.ts` | OG Image static endpoint |
| `src/utils/og-fonts.ts` | 字體載入工具（readFile from src/assets/fonts/） |
| `src/utils/og-template.ts` | OG 圖片 JSX 模板 |
| `src/assets/fonts/NotoSansTC-Regular.ttf` | satori 用字體（build only） |
| `src/assets/fonts/NotoSansTC-Bold.ttf` | satori 用字體（build only） |
| `lighthouserc.json` | Lighthouse CI 閾值設定 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/content.config.ts` | ingredients schema 新增 `pathwaySteps` 欄位 |
| `src/content/ingredients/vitamin-c.mdx` | 新增 `pathwaySteps` 示範資料 |
| `src/pages/index.astro` | 替換 `.trends-placeholder` → `<TrendBubbles>` + 資料計算 |
| `src/pages/news/index.astro` | 替換 placeholder → `<TrendBubbles>` + 資料計算 |
| `src/pages/ingredients/[slug].astro` | 新增 `<PathwayDiagram>` + fallback 邏輯 + ogImage auto fallback |
| `src/layouts/Base.astro` | ogImage 預設值改為 `/og/index.png` |
| `src/pages/articles/[slug].astro` | ogImage fallback 改為 `/og/articles/${slug}.png` |
| `src/pages/myths/[slug].astro` | ogImage fallback 改為 `/og/myths/${slug}.png` |
| `src/pages/videos/[slug].astro` | ogImage fallback 改為 `/og/videos/${slug}.png` |
| `src/pages/podcasts/[slug].astro` | ogImage fallback 改為 `/og/podcasts/${slug}.png` |
| `.github/workflows/deploy.yml` | 啟用 Lighthouse CI step（staticDistDir） |
| `package.json` | 新增 d3-force, @types/d3-force, satori, sharp |

### 不變更

- `src/styles/tokens.css`（色彩系統不變）
- `astro.config.mjs`（不需要新 integration）
- `public/CNAME`（HTTPS 已就緒）

---

## 實作順序建議

1. **Lighthouse CI**（最簡單，先建立品質基線）
2. **TrendBubbles**（替換現有 placeholder，用戶可見改善最大）
3. **PathwayDiagram**（需改 schema + 新組件 + 示範資料）
4. **OG Image**（需字體處理 + 新 endpoint + 修改多個 layout，複雜度最高）

---

## 風險與注意事項

1. **satori 不支援 oklch**：OG 模板中必須用 hex 近似值，這是本專案唯一允許使用 hex 的場景。實作時需用工具精確轉換，規格中的 hex 值為估值。
2. **Lighthouse 本地測試限制**：`staticDistDir` 測試的是靜態產出，部分指標（如 HTTPS）可能與線上結果不同。上線穩定後可考慮改為測試線上 URL。
3. **d3-force bundle size**：d3-force 壓縮後約 12KB，透過 Svelte `client:visible` lazy load，影響可控。
4. **字體檔大小**：Noto Sans TC .ttf 約 8MB/個，共 16MB 進 git。一次性成本，後續不會變動。若 repo 大小敏感，可改用 CI prebuild step 下載。
5. **News 不生成 OG**：news 是外部來源引用，連結指向外部 sourceUrl，不需要自己的 OG 圖片。
6. **Tag 頁面不存在**：TrendBubbles 暫時只做 hover 顯示資訊，不做 click 導航。待未來新增 `/tags/[tag]/` 頁面路由後再啟用。
7. **PathwayDiagram 不用 d3**：原規格寫 d3.js 互動視覺化，但因佈局為固定線性排列，純 SVG + Svelte 更簡潔。這是合理簡化，不違反設計意圖。
