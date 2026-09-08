# Playbook：選題候選池 Topic Backlog

> 檔案：`data/topic-backlog.json`（公開層，追蹤）＋ `data/topic-backlog.local.json`（本地層，gitignore）
> 目的：讓選題候選跨 session、跨 cron 累積與消耗，並且**記住哪些題目已經寫過**。
> 前置閱讀：[`winning-article-formula.md`](./winning-article-formula.md)（六基因、queryPattern 產出對照）、[`audience-insights.md`](./audience-insights.md)（`pnpm insights` 怎麼來的、撞題比對怎麼運作）

---

## 為什麼要有這個檔（先讀這段再改）

`pnpm insights` 是**即時快照**：跑完就沒了，下次跑又是一批新的候選，沒有記憶。於是同一個題目會被反覆提案，
而站上內容密度高了之後，**撞題是預設狀態，不是意外**。

backlog 補的就是這塊記憶：

- `pnpm insights` 回答「現在有什麼需求訊號」
- topic backlog 回答「這個訊號我們處理過了沒、結論是什麼」

---

## 為什麼拆成兩層（改欄位前先讀）

repo 是 public。原本 backlog 把 GSC 原始查詢字串、曝光數、平均排名、需求分全放在同一個追蹤檔裡——
那跟 `data/audience-insights.json` 是同一類經營內幕，而後者早就被 gitignore 排除了。

但整筆 gitignore 會讓 backlog 失效：**主機上的 cron 是從 clone 出來的 repo 讀檔的**，
檔案不進 repo 就等於防撞題與跨 session 記憶都沒了。所以拆兩層，各自解決一半問題：

| 層 | 檔案 | 進 repo？ | 放什麼 | 判準 |
|---|---|---|---|---|
| 公開層 | `data/topic-backlog.json` | ✅ 追蹤 | 防撞題與工作流所需的一切 | 看得出「這題站上有沒有、誰認領了、寫成哪篇」 |
| 本地層 | `data/topic-backlog.local.json` | ❌ gitignore | GSC 原始查詢與需求數據 | 看不出「哪些查詢有多少曝光、排第幾」 |

兩層以 `id` 對應，`items[]` 順序不必一致。

⚠️ **`rationale`、`suggestedAngle`、`notes`、`topic` 這種自由文字欄位不能只看欄位名判斷。**
公開層裡這幾欄放的是**已洗掉曝光／排名數字的版本**；原句（含數字）留在本地層。
新增或改寫時逐句看過：出現「XX 查詢有 N 曝光、排名 M」這種句子就是寫錯層了。
規格常數（自用限量 12／36 瓶、六基因第 N 條）不是現況數字，可以留。

---

## Schema

### 公開層 `data/topic-backlog.json`

頂層：

| 欄位 | 說明 |
|---|---|
| `schemaVersion` | 目前為 `2`（`1` → `2` 就是這次拆層）。改欄位語意就進版，並在本檔記一行。 |
| `updatedAt` | 最後一次人為／自動更新（台灣時間 UTC+8，ISO 8601 帶 `+08:00`） |
| `layer` | 固定 `"public"`，讀檔時可用來確認拿到的是哪一層 |
| `localLayer` | 本地層路徑，給合併邏輯用 |
| `note` | 一句話說明本檔是哪一層、敏感欄位去哪了 |
| `seededFrom` | 種入來源（哪一次 `insights` 輸出、用什麼方法比對） |
| `items[]` | 候選項目，見下 |

每一筆 `items[]`：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | string | 穩定識別碼，kebab-case。**不要重用、不要改**，狀態變了改狀態不改 id。也是兩層對應的唯一鍵。 |
| `topic` | string | 題目。寫成讀者會打的問句，不要寫成名詞短語（六基因第 1 條）。 |
| `queryPattern` | enum \| null | `taiwan-regulation-market` / `decision-guide` / `ingredient-explainer` / `audience-stage-guide` / `comparison` / `myth-check`。與 `src/content.schemas.ts` 的 enum 一致。 |
| `contentType` | `articles` \| `myths` \| `ingredients` \| `news` \| null | 預定落點。闢謠題一律進 `myths`，不要往 `articles` 放 `myth-check`。 |
| `source` | string | 證據來源。承接 `insights` 的 `source` 值（`search-gap` / `onsite-search` / `trend-radar` / `llm-referral` / `question-faq`），另加 `site-gap`（站內結構缺口）與 `editor`（人工提案）。 |
| `rationale` | string \| null | 為什麼它是候選——**只留結構性理由**（站上有沒有、跟哪些篇相鄰）。整段只有曝光數據的就填 `null`，原句留在本地層。 |
| `suggestedAngle` | string \| null | 建議切入角度，同樣不夾曝光數字。 |
| `collisionCheck` | object | `{ checkedAt, method, matchedSlugs[], verdict }`，`verdict` ∈ `clear` / `collides` / `n/a`。`method` 寫實際跑的指令，讓下一個人能重跑——**指令裡不要塞 GSC 原始查詢字串**，用中文主題詞或英文名即可。 |
| `status` | enum | `candidate` / `claimed` / `written` / `rejected`，見下節。 |
| `claimedBy`, `claimedAt` | string \| null | 誰認領、何時認領。跨 session／跨 cron 的互斥就靠這兩欄。 |
| `slug` | string \| null | 對應頁面，格式 `<collection>/<slug>`。 |
| `publishedAt` | string \| null | 實際發布日（台灣時間）。 |
| `rejectedReason` | string \| null | `status: rejected` 必填。 |
| `notes` | string \| null | 寫作時要守的邊界、內鏈規劃、待驗證事項。 |

`matchedSlugs` 與 `slug` 用 `<collection>/<slug>` 形式，對應 `src/content/<collection>/<slug>.mdx|md`。

### 本地層 `data/topic-backlog.local.json`

頂層同樣有 `schemaVersion` / `updatedAt` / `layer`（`"local"`）/ `publicLayer` / `note`。

每一筆 `items[]`：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | string | 對應公開層同名 `id`。**本地層不得出現公開層沒有的 id。** |
| `targetQuery` | string \| null | 主目標查詢（GSC 原始字串，原樣照抄不要美化）。站內需求來源可為 `null`。 |
| `relatedQueries` | string[] | 同一題目的其他查詢變體。整群同義查詢收在一筆，不要一則查詢開一筆。 |
| `demandScore` | number \| null | 直接沿用 `insights` 的 0–10 需求分。非 GSC 來源填 `null`，**不要自己編一個數字**。 |
| `evidence` | object | `{ impressions, position, aiReferrals, onSiteSearch, observedAt }`。前四欄與 `insights` 的 `evidence` 同名同義，`observedAt` 是那次觀測的時間戳。 |
| `rationale` | string \| null | **原句**，含曝光／排名數字。合併時覆蓋公開層的同名欄位。 |
| `suggestedAngle` | string \| null | 同上。 |

---

## 讀寫怎麼合併（新機器 clone 下來要能跑）

**讀**——以公開層為主，本地層是選配的補充：

```js
import { existsSync, readFileSync } from 'node:fs';

function loadBacklog() {
  const pub = JSON.parse(readFileSync('data/topic-backlog.json', 'utf8'));
  let local = { items: [] };
  if (existsSync(pub.localLayer ?? 'data/topic-backlog.local.json')) {
    try { local = JSON.parse(readFileSync(pub.localLayer, 'utf8')); } catch { /* 壞檔當沒有 */ }
  }
  const byId = new Map(local.items.map((i) => [i.id, i]));
  return {
    ...pub,
    hasLocalLayer: byId.size > 0,
    items: pub.items.map((it) => {
      const l = byId.get(it.id) ?? {};
      return {
        ...it,
        targetQuery: l.targetQuery ?? null,
        relatedQueries: l.relatedQueries ?? [],
        demandScore: l.demandScore ?? null,
        evidence: l.evidence ?? null,
        // 本地層有原句就用原句，沒有就用公開層洗過的版本
        rationale: l.rationale ?? it.rationale,
        suggestedAngle: l.suggestedAngle ?? it.suggestedAngle,
      };
    }),
  };
}
```

**優雅降級**：本地層不存在（新機器剛 clone、或 cron 跑在乾淨 runner 上）時——

- **不要報錯、不要中止。** 缺的是需求數據，不是工作流資料。
- `id` / `topic` / `status` / `claimedBy` / `slug` / `collisionCheck` 全都在，**防撞題與認領互斥照常運作**。
- 少掉的是「按 `demandScore` 排優先序」與「用 `targetQuery` 回頭比對 GSC」。這時優先序改用
  `winning-article-formula.md` 的 queryPattern 順位（`taiwan-regulation-market` 第一、`decision-guide` 第二）。
- 想要需求數據就在有 gcloud token 的機器上跑 `pnpm insights`，把新訊號寫回本地層。

**寫**——一筆的兩半要一起寫，不要只寫一層：

1. 公開層 `items[]` 加／改該 `id` 的工作流欄位。
2. 本地層 `items[]` 加／改同一個 `id` 的查詢與需求欄位（本地層檔案不在就先建，頂層照上表補齊）。
3. 兩層的頂層 `updatedAt` 都更新。
4. 只寫得到公開層（沒有本地層的機器）也可以——本地層那半下次在有數據的機器上補。**公開層不要為了補齊而塞假數字。**

---

## 狀態機（防撞題的核心）

```
                 ┌──────────────┐
   加候選 ──────▶│  candidate   │
                 └──┬────────┬──┘
                    │        │
              認領  │        │  決定不寫
                    ▼        ▼
              ┌──────────┐  ┌──────────┐
              │ claimed  │  │ rejected │
              └────┬─────┘  └──────────┘
                   │  發布
                   ▼
              ┌──────────┐
              │ written  │  ← 也用來記「站上本來就有」
              └──────────┘
```

四個狀態的判準：

- **`candidate`** — 已通過撞題比對（`collisionCheck.verdict = clear`），還沒有人動手。
- **`claimed`** — 有人／有 cron 正在寫。**動筆前先把狀態改成 `claimed` 並填 `claimedBy`**，這是跨 session 與跨 cron 的互斥機制；看到別人的 `claimed` 就換一題。
- **`written`** — 已有對應頁面，`slug` 必填。**兩種情況都用它**：（a）從 backlog 消耗掉、寫成稿了；（b）加候選時發現站上早就有了。後者是這個檔最重要的資產——它把「這題已經寫過」變成可查的紀錄，而不是每次重新 grep 才發現。
- **`rejected`** — 決定不寫，`rejectedReason` 必填。用於：站主明確否決的題目、非真人查詢（帶搜尋運算子的、工具產生的）、叢集已飽和再寫會蠶食既有頁的。

⚠️ **`written` 與 `rejected` 的紀錄不要刪。** 刪掉就等於把記憶清空，下次 `insights` 再吐出同一則查詢時又會從頭評估一次。

---

## 怎麼加一筆（順序不能顛倒）

1. **跑 `pnpm insights`** 取當期 `topicCandidates`（需要 gcloud token 或服務帳號金鑰；取不到就退化成人工提案，`source` 填 `editor` 或 `site-gap`）。
2. **對照既有 `id`**（公開層）**與 `relatedQueries`**（本地層，有的話）：出現過的直接跳過，不要重複建。
3. **grep 站上既有內容**——這一步不能省。至少三種寫法各查一次：
   ```bash
   grep -ril "<英文名>"   src/content/          # 英文成分名／藥名
   grep -ril "<中文名>"   src/content/          # 中文正式名
   grep -ril "<口語說法>" src/content/          # 讀者實際會打的說法
   ```
   命中就建成 `status: written` + `slug`，**不要建成 candidate**。沒命中才進第 4 步。
4. **過六基因**（見 `winning-article-formula.md`）。六條有缺就別建 candidate，或建了在 `notes` 寫明缺哪一條、要怎麼補。
5. **填 `collisionCheck`**：`method` 寫剛才實際跑的指令，`matchedSlugs` 填相鄰但不撞題的頁（寫作時要內鏈的對象）。
6. **兩層一起寫**（見上節「寫」），更新兩層的頂層 `updatedAt`。

## 怎麼消耗一筆

1. 挑 `status: candidate`，優先序照 `winning-article-formula.md`：`taiwan-regulation-market` 第一順位、`decision-guide` 第二順位；`comparison` 要寫就收窄成「選錯有後果的二選一」；闢謠題進 `myths`。有本地層就再用 `demandScore` 排同順位內的先後。
2. **先把狀態改成 `claimed`、填 `claimedBy` / `claimedAt`，再開始寫。**
3. 寫之前重讀 `matchedSlugs` 列的既有頁，列出它們講過什麼，避免疊第二篇同角度的文章（`winning-article-formula.md`「兩個必須守的邊界」）。
4. 發布後回填 `status: written`、`slug`、`publishedAt`（都在公開層）。

## 什麼時候該把一筆改成 rejected

- 站主明確說不寫。
- 查詢帶搜尋運算子（引號、減號）或明顯是工具流量，不是真人需求。
- 同主題叢集已飽和，再寫會蠶食既有頁——這種情況通常應改成「補進既有頁的段落／FAQ」，記進 `notes` 後 reject。

---

## 誰維護

| 角色 | 做什麼 |
|---|---|
| 內容／經營 session（分流 B） | 跑完 `pnpm perf` / `pnpm insights` 後負責把新訊號歸檔進兩層，並在動筆前認領 |
| 寫稿的 agent（含 cron） | 只從 `candidate` 取題；取題即改 `claimed`；發布後回填 `written`。**本地層讀不到就照公開層跑，不要中止。** |
| 站主 | 否決題目（改 `rejected` 並寫 `rejectedReason`） |

**每一筆的異動都伴隨頂層 `updatedAt` 更新。** 有並行 agent 時，同一個 session 只改自己認領的那幾筆，不要整檔重寫。

---

## 與其他機制的關係

| 想知道 | 去哪 |
|---|---|
| 現在有什麼需求訊號（即時） | `pnpm insights` → `data/audience-insights.json`（gitignore） |
| 整站流量／排名表現 | `pnpm perf` |
| 這個題目處理過了沒 | `data/topic-backlog.json`（公開層） |
| 這個題目當初是哪些查詢帶出來的、需求多強 | `data/topic-backlog.local.json`（本地層；沒有就跑 `pnpm insights` 重建） |
| 站上現在各類型各有幾篇、排到哪天 | `pnpm stats`、`pnpm check:schedule` |
| 這個題目能不能贏 | `docs/playbooks/winning-article-formula.md` 六基因 |

backlog **不取代** `insights`，也不快取它的完整輸出：`writingDirectives` 與 `siteOptimizations` 兩桶留在 `insights`，
backlog 只承接 `topicCandidates`。既有頁的排名補強屬於 `siteOptimizations`，不是新題，不要建成 candidate。

---

## 常見陷阱

- **把 GSC 查詢字串或曝光數字寫進公開層**：那是本地層的東西。自由文字欄位（`rationale` / `suggestedAngle` / `notes` / `topic`）要逐句看過，不能只看欄位名。
- **只寫一層就收工**：公開層有 id、本地層沒有 → 需求數據永久遺失；本地層有、公開層沒有 → 那筆等於不存在，別的 agent 會重新提案。
- **本地層讀不到就報錯中止**：本地層是選配的，缺了只是少掉優先序依據，工作流必須照跑。
- **一則查詢開一筆**：同義查詢應收進同一筆的 `relatedQueries`，否則 backlog 會被查詢變體灌爆而失去可讀性。
- **刪掉 `written` / `rejected`**：等於把防撞題記憶清空。
- **沒改 `claimed` 就開寫**：並行 agent 會撞在同一題上。
- **手動編 `demandScore`**：那個分數有定義（`insight-strategies.mjs` 的 `demandScore()`），非 GSC 來源就填 `null`。
- **把統計數字寫進本檔**：候選有幾筆、消耗了幾筆一律用指令查（`node -e` 讀 JSON 即可），不要寫成文字。

## 驗證清單

- [ ] 兩層都 `node -e "JSON.parse(require('fs').readFileSync('<檔名>','utf8'))"` 通過
- [ ] 公開層 `id` 無重複；本地層 `id` 是公開層的子集
- [ ] 公開層 grep 不到曝光／排名字樣：`grep -n "曝光\|排名\|impressions\|position\|demandScore" data/topic-backlog.json`（只該命中頂層 `note`）
- [ ] `data/topic-backlog.local.json` 被 gitignore 蓋到：`git check-ignore -v data/topic-backlog.local.json`
- [ ] 每個 `slug` / `matchedSlugs` 都對應得到 `src/content/<collection>/<slug>.mdx|md`
- [ ] `status: rejected` 的都有 `rejectedReason`；`status: written` 的都有 `slug`（整群成分頁那種一對多例外，記在 `matchedSlugs`）
- [ ] `queryPattern` 值都在 `src/content.schemas.ts` 的 enum 內
- [ ] 把本地層暫時改名再跑一次讀檔流程，確認不會炸
