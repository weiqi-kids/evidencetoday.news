# Playbook：CI/CD 與 deploy.yml 維護

## 何時看這份

任務涉及以下任一情況：

- 修改 `.github/workflows/deploy.yml`
- 升級 GitHub Action 版本（Node 棄用警告、新功能）
- 改 Lighthouse CI 配置（`lighthouserc.json`）
- 改 Pagefind 索引設定
- 改 lychee 連結檢查規則
- 加新 build step、改 deploy 目標、改 GitHub Pages 設定

> CI 失敗會擋住所有部署，**動 deploy.yml 必須先在 branch 測過**才合進 main。

## 鎖定參數（動之前必看）

### 當前 deploy pipeline（build → deploy 兩個 job）

```
build (ubuntu-latest)
├─ checkout
├─ setup pnpm v9
├─ setup Node 20 (cache: pnpm)
├─ pnpm install --frozen-lockfile
├─ pnpm check:news        ← 擋部署 gate
├─ pnpm content:audit     ← 擋部署 gate
├─ pnpm check:myths       ← 擋部署 gate（2026-07-12 新增）
├─ pnpm build
│   ├─ prebuild: pnpm run sync:youtube      ← fail-loud, no fallback
│   ├─ astro build
│   └─ postbuild: pagefind --site dist
├─ lychee internal links check (offline, fail: true)
├─ lychee external links check (fail: false, continue-on-error)
├─ Lighthouse CI (continue-on-error)
└─ upload-pages-artifact@v5

deploy (ubuntu-latest, needs: build)
└─ deploy-pages@v5
```

### Build artifacts produced by sync (不入 repo)

| 檔案 | 產生時機 | 處理 |
|---|---|---|
| `src/data/youtube-shorts.json` | `prebuild` 階段（YouTube Data API） | `.gitignore` 排除；CI 跑時臨時寫入，build 結束丟棄 |

若 prebuild sync 失敗 → `pnpm build` 整個中斷 → 後續 step（lighthouse / upload / deploy）不會跑 → CI 紅燈通知。詳見 [external-apis.md](./external-apis.md) 的 fail-loud 設計。

### 設計規範 gate（2026-07-20 加入，會擋部署）

`pnpm build` 現為 `node scripts/check-design.mjs && astro build`——build 前先跑設計規範守門 v2（五條：禁 px 字級／顏色只准 `src/styles/variables.css`／禁 `!important`（遷移期遞延，見該檔 TODO）／禁外部 CDN／css 白名單 `src/styles/{variables,global}.css`），違規即 build fail、不部署。規則詳見 README「CSS / RWD 通用規範」。

### 失敗告警（notify-failure job，2026-07-20 加入）

`deploy.yml` 末段有 `notify-failure` job（`needs: [build, deploy]`、`if: failure()`）：build 或 deploy 任一 fail 就發 Slack 到站台頻道要求修正，修正 push 後 workflow 自動重跑＝重審。需 repo secrets `SLACK_BOT_TOKEN`、`SLACK_CHANNEL_ID`；**secrets 未設時靜默略過（不影響管線）**。

### 內容把關 gate（deploy.yml build job 內，會擋部署）

`deploy.yml` 的 build job 依序跑三道**會擋部署**的內容 gate（任一失敗 → build 中斷 → 不部署）：
1. `pnpm check:news`：每篇非 draft 的 news 須有可點來源連結。
2. `pnpm content:audit`：擋 `banned-opening`（模板化第一人稱開頭）+ `ai-phrase`（不是…而是／換句話說／我一直覺得…）+ `vague-reference`（研究顯示／文獻回顧…）；`raw-enum` 僅警告。規範見 `CLAUDE.md` 硬規則 7a 與 `docs/content-guide.md`。
3. `pnpm check:myths`（2026-07-12 加入 deploy）：已發佈 myths 篇數須等於 `scripts/check-myth-quality.mjs` 的 `EXPECTED_PUBLISHED_COUNT`、8 個固定 body 區塊齊全、藍/紅 reasoningCards 各 ≥2 點、references URL ≥2、固定醫療提醒句等。**增刪已發佈闢謠時務必同步改該常數**，否則此 gate 會擋部署。

> 注意：另有獨立的 `content-audit.yml` workflow（PR/push 時跑，提供行內 annotation），但**真正擋部署的是 deploy.yml 裡這道 step**——獨立 workflow 紅燈不會阻止 Pages 部署，2026-06-23 已把 `content:audit` 加進 deploy build job 補上這個缺口。

### Action 版本鎖定

| Action | 當前 | 最新（2026-05-15） | 備註 |
|---|---|---|---|
| actions/checkout | v4 | v4 | Node 20，等 2026-06-02 強制 Node 24 |
| pnpm/action-setup | v4 | v4 | 同上 |
| actions/setup-node | v4 | v4 | 同上 |
| actions/upload-pages-artifact | **v5** | v5 | ⚠️ v4 開始 dotfiles 不入 artifact |
| actions/deploy-pages | **v5** | v5 | Node 24，已升 |
| lycheeverse/lychee-action | v2 | v2 | OK |
| treosh/lighthouse-ci-action | v12 | v12 | OK |

### 其他 workflow

| Workflow | 觸發 | 用途 |
|---|---|---|
| `deploy.yml` | push main | 主部署管線（上方詳述） |
| `docs-sync-check.yml` | pull_request | 比對 PR 是否改了 functional code 卻沒同步 docs；沒同步 → fail check → 無法 merge。Escape hatch：PR body 或任一 commit message 含 `[skip docs]`。規則同 README 「修改紀律」 |

### Lighthouse 閾值（lighthouserc.json）

| 指標 | 閾值 | 模式 |
|---|---|---|
| Performance | ≥ 90 | warn（不擋 build） |
| SEO | ≥ 95 | warn |
| Accessibility | ≥ 95 | warn |
| Best Practices | ≥ 90 | warn |

**警告：Lighthouse 在 staticDistDir 模式**（不啟 server，直接 audit dist/），某些 runtime 行為（service worker、fetch）測不到。

### 環境變數 / Secrets

| Secret | 用途 |
|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API 抓 Shorts 列表 |
| `YOUTUBE_CHANNEL_ID` | hardcoded env var: `UCTejYxFd04qma-LY0_Z17NQ` |
| `YOUTUBE_MAX_VIDEOS` | hardcoded env var: 500 |

### GitHub Pages 設定

- Source：GitHub Actions（不是 branch deploy）
- Custom domain：`evidencetoday.news`（CNAME 在 `public/CNAME`）
- HTTPS：強制
- branch protection：main 開啟 require PR review（看 repo settings）

## 修改流程

### 升級 Action 版本

1. **查最新版**：`gh api repos/{owner}/{action}/releases/latest --jq '.tag_name'`
2. **看 release notes 找 breaking changes**：`gh api repos/{owner}/{action}/releases/tags/{tag} --jq '.body'`
3. **若有 breaking change**：對照當前用法確認影響範圍（例如 upload-pages-artifact v4 開始 dotfiles 不入 → 檢查 `dist/` 有沒重要 dotfile）
4. **改 deploy.yml**
5. **建測試 branch**（建議命名 `ci/bump-{action}-{version}`）
6. **push branch + 開 PR**：actions 會在 PR 上跑，看是否通過
7. **PR 通過 → merge main**
8. **觀察 main 上的 workflow run** 確認真的部署成功
9. **檢查上線網站**功能無回歸

### 加新 build step

1. 想清楚 step 的目的（lint? test? generate?）
2. 放在合理位置（generate 早、validate 中、deploy 晚）
3. **設 fail 行為**：阻擋部署用 `fail: true`，僅警告用 `continue-on-error: true`
4. **設 timeout**：避免 hang 死，預設沒 timeout
5. **快取**：用 `actions/cache` 避免重複下載
6. PR 測試 + 觀察

### 改 Lighthouse 閾值

1. 看 `lighthouserc.json` 當前閾值
2. 改前先看「當前實際分數」（過去幾次 run 的 summary）
3. 提高閾值會擋住短期 PR；降低需要授權
4. PR 測試

### 改 Pagefind 索引

- Pagefind 不支援 zh-hant-tw stemming（warning 已知，搜尋仍可用，只是不會跨字根 match）
- 索引在 `pnpm build` 之後 `npx pagefind --site dist` 產生
- 索引輸出進 `dist/pagefind/`，被 upload 進 artifact

## 常見陷阱

- **`actions/upload-pages-artifact@v4+` 不收 dotfiles**：若 dist 有 `.nojekyll` 需要部署會被剔除（本站不需要 .nojekyll，但要記得）
- **升 Action 沒看 breaking change**：build 突然爆 → 一定先看 release notes
- **`fail: true` 用在外部連結檢查**：外部站台暫時 down 就擋部署 → 外部用 `fail: false + continue-on-error`
- **Lighthouse 閾值寫死太高**：每個 PR 因 Network 抖動而 fail → 用 warn 模式（不擋）
- **改 `staticDistDir` 為 `serverBaseUrl`**：CI 沒準備 server → 維持 staticDistDir
- **沒 cache pnpm**：每次 install 5+ 分鐘 → 必須 `cache: pnpm` 在 setup-node
- **secrets 寫在 env 沒走 secrets context**：log 中 leak → 永遠 `${{ secrets.X }}`
- **Node 20 deprecation 警告忽略**：到 2026-09-16 會強制移除 → 在 2026-06-02 GitHub 強制切 Node 24 前就會自動處理，可不動；若提前處理用 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env
- **加 step 沒處理 fail**：失敗訊息不清楚 → step 內加 `echo "::error::..."` 給明確錯誤
- **`concurrency: group: pages, cancel-in-progress: true`**：rapid push 會 cancel 前一個部署 → 故意這樣設，避免舊版本蓋新版本，但快速 push 多次最後一次才會部署

## 驗證清單

改 deploy.yml：

```
- [ ] 在 ci/{topic} branch 測過，PR 上 action 通過
- [ ] merge 後 main 的 deploy 真的成功（gh run watch）
- [ ] 線上網站功能無回歸
- [ ] 沒 leak secrets 到 log
- [ ] 沒新增 Node 20 / 棄用 warning
- [ ] Lighthouse 分數不退步
```

升 Action：

```
- [ ] 看過 release notes，確認 breaking change 影響
- [ ] 改 yml 後 PR test
- [ ] 對應 cache key 沒失效（pnpm / node-modules）
```

## 相關文件

- 部署 deploy.yml：`.github/workflows/deploy.yml`
- Lighthouse 設定：`lighthouserc.json`
- 架構與 CI/CD：[../architecture.md](../architecture.md)
- 外部 API 整合：[external-apis.md](./external-apis.md)
