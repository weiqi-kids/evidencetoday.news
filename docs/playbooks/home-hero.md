# Playbook：首頁 / Hero 修改

## 何時看這份

任務涉及以下任一情況：

- 修改 `src/pages/index.astro`
- 改 Hero 區（含 HeroParticles canvas、catch phrase、CTA buttons）
- 改首頁的內容區塊順序、分類卡、TrendBubbles、Podcast 區、短影音區、政策連結
- 改首頁 JSON-LD（structured data for SEO）

> 首頁是 SEO 與品牌印象核心，**SEO 結構化資料、Hero copy 和分類卡都是 SEO/AEO 高權重元素**，動之前確認用戶授權。

## 鎖定參數（動之前必看）

### 結構區塊（從上到下）

1. **Hero**：HeroParticles canvas + catch phrase + CTA buttons
2. **熱門分類**：6 個分類卡（最新文章、迷思破解、認識主編 等）
3. **熱門趨勢**：TrendBubbles d3-force 視覺化 + 最新文章列表
4. **最新文章**：3-6 篇 ArticleCard
5. **熱門闢謠**：MythCard
6. **熱門原料**：IngredientCard
7. **Podcast 精選**：PodcastCard
8. **短影音**：iframe 嵌入或自製 player
9. **CtaStrip**：訂閱 / 追蹤呼籲

### Hero 細節

### Hero 右側焦點卡（首頁編輯層級）

- `featuredItems[0]`：主焦點卡（本週焦點）
- `featuredItems.slice(1, 3)`：次焦點卡（最多 2 張）
- 資料不足時要安全降級：
  - 0 筆：不渲染右側焦點區
  - 1 筆：只渲染主焦點
  - 2 筆：1 主 + 1 次
  - 3 筆以上：1 主 + 2 次
- 主焦點可顯示補充 meta（例如 myth verdict、podcast 集數/時長、article 主編把關）但不可改動資料來源邏輯。

- **catch phrase**：「把健康議題，講得有根據，也講得讓人看得懂。」（品牌語，動之前確認）
- **HeroParticles**：canvas 全幅，desktop only（mobile 不渲染以省電）
- **CTA buttons**：「最新文章」「迷思破解」「認識主編」
- **JSON-LD**：`@type: "WebSite"` + `Organization` 結構化資料，用於 Google Knowledge Graph

### SEO / AEO

- 首頁 meta description 影響全站 SEO 描述（fallback）
- OG image：`og:type="website"`，靜態 PNG，不走 satori 動態（首頁 OG 是品牌入口）
- `<h1>` 必須在 hero 區，**只能有一個 h1**

## 修改流程

1. **明確改動目標**：是 Hero copy、分類卡內容、新區塊、還是順序？
2. **改 Hero copy 前**：確認新文案不破壞 brand voice（看 `docs/superpowers/specs/2026-05-07-evidencetoday-design.md`）
3. **改 JSON-LD 前**：用 Google Rich Results Test 驗證 schema
4. **加新區塊**：放在 hero 之後、CtaStrip 之前，按「主題優先」排序（人們最常找的內容放上面）
5. **改順序**：注意分類卡和熱門內容區之間的視覺節奏，相同色系卡不要連續
6. **dev 預覽**：`pnpm dev`，hero 在 mobile / desktop 都看（HeroParticles 只 desktop 出現）
7. **Lighthouse**：首頁是 Lighthouse 主要評測頁，Perf ≥ 90 / SEO ≥ 95 / A11y ≥ 95
8. **build + commit**

## 常見陷阱

- **HeroParticles 高度傳遞鏈斷裂**：canvas 用 `getBoundingClientRect()` 動態量，父層必須有明確高度 → 看 [d3-charts.md](./d3-charts.md)
- **多個 h1**：每頁只能有一個 h1，hero 已是 h1，內容區的標題用 h2
- **改了 catch phrase 沒同步 meta description**：兩個地方文案不一致 → 同步更新 frontmatter `description`
- **加新內容區塊用了 `<section>` 沒加 `aria-labelledby`**：a11y 扣分 → 每個 section 要有可程式化標題
- **CTA buttons 多於 3 個**：研究顯示 3 個是注意力上限，加更多會降低 click-through
- **改 JSON-LD schema 但忘了測**：JSON-LD 錯誤不會 break build，但 Google 不收錄 → 一定用 Rich Results Test
- **改 OG image 用了動態 satori**：首頁 OG 應該是靜態品牌圖，不是動態 article cover

## 驗證清單

```
- [ ] @375 / @768 / @1280 hero 都正常（particles 只 desktop 出現）
- [ ] 只有一個 <h1>
- [ ] meta description 與 catch phrase 一致
- [ ] JSON-LD 通過 Google Rich Results Test
- [ ] Lighthouse CI: Perf≥90 / SEO≥95 / A11y≥95 / BP≥90
- [ ] OG image 顯示正確（fb sharing debugger 或 twitter card validator）
- [ ] HeroParticles 在 desktop 流暢、mobile 隱藏（不浪費 CPU）
- [ ] pnpm build 零錯誤
```

## 相關文件

- d3 圖表（HeroParticles 等）：[d3-charts.md](./d3-charts.md)
- design tokens：[design-tokens.md](./design-tokens.md)
- 架構與 SEO：[../architecture.md](../architecture.md)
- 設計 spec：`docs/superpowers/specs/2026-05-07-evidencetoday-design.md`
