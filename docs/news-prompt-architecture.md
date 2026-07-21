# 趨勢新聞「寫文 prompt」規劃架構

> 本檔說明 `/news` 自動發文管線**實際餵給 AI 的 prompt 是怎麼規劃的**：它住在哪、由哪些檔案組成、7 階段各做什麼、sub-agent 如何並行、以及目前已知的把關缺口。
> 想改寫流程看這份；想知道單篇文章結構看 [`news_sop.md`](./news_sop.md)；想做選題看 [`playbooks/audience-insights.md`](./playbooks/audience-insights.md)。

---

## 一、prompt 住在哪（三層組合，不是單一檔）

寫文 prompt **不是寫死在一個檔**，而是「進入點 prompt + 兩份 SOP 文件」在執行時組合而成：

| 層 | 檔案 | 角色 |
|---|---|---|
| **進入點 prompt** | `ops/news-cron.sh` 內的 `PROMPT` heredoc | cron 每日餵給 `claude -p` 的那段話；把 7 階段濃縮成可執行指令，並補上環境陷阱（時區、WebSearch 封網域、配圖端點） |
| **流程 SOP** | `AGENTS.md`「撰寫趨勢文章」7 步驟 | prompt 第一句就是「請依本 repo 的 AGENTS.md 與 docs/news_sop.md 執行」，AI 會去讀它 |
| **細節 SOP** | `docs/news_sop.md` | 評分維度、frontmatter 欄位、審核委員會、配圖規範的完整定義 |

> ⚠️ 改寫流程時三層要一起改：只改 `news_sop.md` 不改 `news-cron.sh` 的 heredoc，cron 跑出來的行為不會變。

執行方式（cron）：

```bash
# news-cron.sh 末段
claude -p "$PROMPT" --model claude-sonnet-4-6 --dangerously-skip-permissions
```

- 模型：`claude-sonnet-4-6`
- root cron 旁路：`IS_SANDBOX=1`（否則 `--dangerously-skip-permissions` 被禁）
- PATH 顯式補 `/root/.local/bin`(claude) 與 `/snap/bin`(gcloud)，否則 insights 拿不到 token
- 時區：`TZ=Asia/Taipei`，**系統時鐘已是台灣時間，prompt 明令「勿再自行 +8」**

---

## 二、7 階段管線（prompt 規劃的骨架）

```
Phase 1  搜尋 + 去重      WebSearch 跑 8 組查詢 → 比對 processed-sources.json
Phase 2  數據注入 + 評分  audience-insights 三桶 → 五維度加權 → 分組 → 產 n 份工單
Phase 3  撰文（並行）     每份工單派 1 個 sub-agent，同訊息一次發起全部
Phase 3.5 配圖（並行）    併入撰文 sub-agent：1 封面 + 2 內文圖，圖庫優先
Phase 4  連結驗證         剔除死連結（含圖片 URL 驗 200）
Phase 5/6 審核（並行）    動態委員會多角色 sub-agent → 收齊回饋 → 修稿 → 收斂判定
Phase 7  發布            通過→commit+push main；未收斂→draft:true 開 PR
```

### Phase 1 — 搜尋與去重
- 查詢來源：`data/news-automation-config.json` 的 `queries`（8 組，各有 `allowed_domains`）。
- **WebSearch-only**：遠端沙箱封鎖 WebFetch（PubMed/RSS 403），故用 `site:` 定向搜尋。某組 `allowed_domains` 含被 Anthropic 爬蟲封鎖的網域時，整組回 400 全滅 → 記錄略過，不影響其他組。
- 去重：比對 `data/processed-sources.json`（自動維護），已處理者跳過；素材池空則靜默結束。

### Phase 2 — 數據注入與評分
- 跑 `node scripts/audience-insights.mjs`，吐三桶：
  - **topicCandidates** → 併入素材池，**話題性維度(10%)改用 `demandScore`**（真實搜尋需求/AI 轉介）。
  - **writingDirectives** → 注入 Phase 3 撰文 prompt。
  - **siteOptimizations** → 只寫進 run summary，**不自動改既有文章**。
- 五維度加權（證據 30% / 影響 25% / 新穎 20% / 實用 15% / 話題 10%），閾值 **≥5.0** 進撰文，**≥7.0** 可單獨成篇。
- 產出 **n 份工單**：有多少合格素材就寫多少篇（核心要求：不要只寫一篇）。

### Phase 3 + 3.5 — 撰文與配圖（真並行）
- **每份工單 = 一個 sub-agent**（`Agent` 工具，`subagent_type=general-purpose`，**一律帶 `model='sonnet'`——嚴禁用預設模型，預設會落到 opus、最貴**），**同一則訊息內一次發起全部**達成真並行，每個只寫一篇、回傳該篇 markdown。
- 配圖併入同一 sub-agent：1 封面 + 2 內文情境圖，**先找圖庫（AI worker `/stock`）沒有才生成（`/generate-async`）**；人物一律台灣人；嚴禁本地行內圖 `](images/...)`。細節見 [`playbooks/editor-images.md`](./playbooks/editor-images.md)。

### Phase 5/6 — 審核委員會（多輪、輪內並行）
- 每篇依內容動態組 4–10 位審核角色（臨床/受眾/媒體），**每位角色一個 sub-agent，同訊息一次發起該輪全部**並行；主 agent 收齊回饋後彙整修稿，再進下一輪。
- 收斂判定：追蹤「未解決建議數」與「critical 數」，連續 3 輪未減 → 判未收斂。
- 結果：**零建議 → 自動 commit + push 上線**；未收斂 → `draft:true` 開 PR 等人工。

> 並行紀律：Phase 3 撰文、Phase 5/6 每輪審核都「同訊息一次發起多個 sub-agent」。但**輪與輪之間是串行**（輪1→修稿→輪2），這是品質收斂成本，非缺陷。

---

## 三、輸入 / 設定一覽

| 檔案 | 內容 |
|---|---|
| `data/news-automation-config.json` | `queries`(8 組)、`thresholds`(scoreThreshold/soloArticleMinScore)、`dedup`、`review`(nonConvergenceThreshold)、`audienceInsights` |
| `data/processed-sources.json` | 去重追蹤（自動維護） |
| `src/content.schemas.ts` → `newsSchema` | 單篇 frontmatter 的 Zod 驗證（build gate） |
| `scripts/audience-insights.mjs` | 三桶選題數據（`pnpm insights`） |

---

## 四、把關現況與已知缺口（重要）

news 管線的品質把關現有五道：

| 把關 | 性質 | 能擋什麼 | 擋不到什麼 |
|---|---|---|---|
| **`pnpm check:news`（2026-06-19 新增，已接 deploy.yml）** | ✅ 確定性 | **每篇非 draft 必須有可點來源連結**（references 含 url／sourceUrl／pmid，否則 fail）；references 內非法 url | 來源的**正確性/相關性**（連結存在但內容對不對仍靠審核） |
| `pnpm build`（Zod `newsSchema`） | ✅ 確定性 | 必填欄位缺、型別錯、tags 含 `/` | references / url / sourceUrl 在 schema 仍 `.optional()`（連結強制改由 check:news 把關，非 schema） |
| `check:content`（= `content:audit`，統一引擎 check-content.mjs；已串進 `pnpm build`） | ✅ 兩級判定 | 強 AI 指紋單一命中即擋、軟訊號跨 ≥3 層升級為擋（模板化開頭／AI 句型／模糊引用） | grandfather 只掃變動檔，存量不重掃（提交前 build 擋新文） |
| CI 連結檢查（deploy.yml） | ✅ 確定性 | HTML 裡**已存在**的連結是否死連 | 純文字來源「根本沒連結」→ check:news 已補上這個破口 |
| Phase 5/6 AI 審核委員會 | ❌ 非確定性 | 來源正確性、語氣、內容品質 | 會漏；故以 check:news 兜底 |

> **2026-06-19 補強已實作**：① 新增 `scripts/check-news-quality.mjs` + `pnpm check:news`，接進 `deploy.yml`（build 前）；② prompt（`news-cron.sh` heredoc）、`news_sop.md`、`AGENTS.md` 均加「來源一律寫進結構化 `references`」鐵律；③ 回填當時兩篇缺結構化來源的文章（06-19-06-01／06-04）。以下為當初的缺口分析，保留供脈絡。

### 缺口一：references 連結非強制（schema 層）
- `newsSchema.references` 是 `.optional()`，每筆 `referenceSchema.url` 也是 `.optional()`（`src/content.schemas.ts`）。
- 對比 **articles 的 references 是 `.min(1)`（至少一筆必填）**，news 沒這限制。
- 結果：news「完全沒有 references」或「有 reference 但無 url」都能 build → 上線。

### 缺口二：兩套來源寫法並存、prompt 未指定唯一真實來源
單篇來源可以放在**兩個不同地方**，目前 prompt 沒強制統一：
1. **結構化 `references:` frontmatter** → 前台 footer「參考資料」區塊漂亮渲染（含 type badge、journal、PMID/DOI）。
2. **body 內 markdown「參考資料」清單** → 只是內文一段，footer 區塊看不到。

實例：`radar-2026-06-19-06-01.md`（2026-06-19 旗艦文）內文第 49、102 行**有**可點的 PMC11663920 連結，但 frontmatter 的 `references` **完全空白**，且 `source:"本日有據編輯室"`、無 `sourceUrl`、無 `pmid`。

前台 footer 判斷式（`src/pages/news/[slug].astro`）：
```
hasStructuredReferences = references.length > 0          // → false（frontmatter 空）
hasSimpleSource         = Boolean(pmid || sourceUrl)     // → false（兩者皆無；不看 source 字串）
→ 命中 fallback：<p>原始來源連結尚未補上</p>
```
**所以該文前台的「參考資料」區塊實際顯示「原始來源連結尚未補上」**，即使內文有連結。這就是「參考資料沒有連結卻能發佈」的真正成因。

### 缺口三：Phase 4「剔除死連結」可能製造無連結 reference
prompt 要求「連結驗證剔除死連結」。若某 reference 的 url 驗不到 200，AI 可能拿掉 url、只留 title → 變成合法但無連結的 reference（schema 不擋）。

---

## 五、建議補強方向（尚未實作）

1. **加確定性 gate**：新增 `pnpm check:news`（仿 `check:myths`），規則例如「每篇 news 至少 1 筆含可點 `url` 的結構化 `references`，或具 `sourceUrl`/`pmid`」，否則 fail；接進 deploy.yml。
2. **schema 收緊**：視情況把 `newsSchema.references` 改 `.min(1)`、或要求 `references` 與 `sourceUrl`/`pmid` 至少滿足其一（Zod `.refine()`）。
3. **prompt 統一來源出口**：Phase 3 明令「來源一律寫進結構化 `references:` frontmatter（每筆含 url），不要只放在 body 文字」；Phase 7 發布前自查「結構化 references ≥1 且每筆有 url」。
4. **sourcePending 顯式化**：真的暫無連結時應顯式設 `sourcePending:true` + 理由，而非靜默落入 fallback 字串。

---

## 相關檔案

- 進入點 prompt：`ops/news-cron.sh`（不在 repo，在主機 config）
- 流程：[`AGENTS.md`](../AGENTS.md)、[`news_sop.md`](./news_sop.md)
- 選題：[`playbooks/audience-insights.md`](./playbooks/audience-insights.md)
- 配圖：[`playbooks/editor-images.md`](./playbooks/editor-images.md)
- schema：`src/content.schemas.ts`（`newsSchema` / `referenceSchema`）
- 前台模板：`src/pages/news/[slug].astro`
