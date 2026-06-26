#!/usr/bin/env bash
# /news 趨勢新聞管線 cron 包裝（本日有據 evidencetoday.news）
# 由 server crontab 呼叫 headless `claude -p` 跑完整 7 階段管線（含 audience-insights 注入）。
#
# 安裝（台灣時區，使用者選定每日 1 次 06:17）：
#   crontab -e 後加入：
#     CRON_TZ=Asia/Taipei
#     17 6 * * * /root/.config/evidencetoday-news/news-cron.sh >> /tmp/evidencetoday-news-cron.log 2>&1
#   （config schedule.cron 仍寫 4 次為設計預設；實際排程以此 crontab 為準。）
#
# 前置條件（皆已於 2026-06-16 備妥）：
#   - claude CLI 已登入（headless 可用）
#   - gcloud 服務帳號 ga4-insights@yaocare 已 activate（GA4/GSC insights）；binary 在 /snap/bin
#   - gh 已認證且 git push 可用（LightChang，repo scope）
set -euo pipefail

# cron 的 PATH 很精簡：顯式補上 claude(/root/.local/bin) 與 gcloud(/snap/bin)，否則 insights 取不到 token
export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"

# cron 以 root 執行，Claude Code 預設禁止 root 使用 --dangerously-skip-permissions。
# IS_SANDBOX=1 為其認可的 root 旁路開關，讓 headless 管線得以在 root cron 下運行。
export IS_SANDBOX=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

echo "===== [news-cron] $(date '+%F %T %Z') 開始 ====="

# 先同步 main（開發機可能推了新功能）
: # main 已由 ops/bootstrap.sh 同步

PROMPT="$(cat <<'PROMPTEOF'
撰寫趨勢文章。請依本 repo 的 AGENTS.md「撰寫趨勢文章」與 docs/news_sop.md 執行完整 7 階段管線：
Phase 1 用 WebSearch 跑 data/news-automation-config.json 的 8 組查詢建素材池（注意：若某組 allowed_domains 有網域被 Anthropic 爬蟲封鎖，WebSearch 會回 400 整組全滅，遇到就記錄略過，不影響其他組）；
去重比對 data/processed-sources.json（已處理者跳過，素材池為空則靜默結束）；列出既有 src/content/news/ 檔名請用 `ls` 或 Glob，勿用 Read 讀目錄（會 EISDIR）；
Phase 2 執行 `node scripts/audience-insights.mjs` 讀三桶——topicCandidates 併入素材池（來源標 internal-demand，話題性維度改用候選 demandScore）、writingDirectives 注入撰文 prompt、siteOptimizations 收進結尾 run summary（不自動編輯既有文章）；
五維度加權 >=5.0 選題、同主題分組、高分(>=7.0)可單獨成篇，產出 n 份工單；
Phase 3【務必真並行】每份工單派一個 sub-agent（Agent 工具，subagent_type=general-purpose）撰文，**在同一則訊息內一次發起全部 Agent 達成真正並行**，不要逐一發起等前一個結束；每個 sub-agent 只負責一篇、回傳該篇 markdown，所有數字與連結只能來自素材原始來源，禁止編造；
Phase 3.5【配圖，每篇都要，併入該篇撰文 sub-agent 一起做】每篇要有 1 張封面 + 2 張內文情境圖，全部優先用圖庫（先找圖庫、沒有才生成）：
  (a) 取圖庫圖：`TOKEN=$(gh auth token)`，POST 到 `https://evidencetoday-ai-suggest.lightman-chang.workers.dev/stock`，body `{"keywords":"<英文關鍵字>"}`，回 photos[]：{id,provider,thumb,full,credit,creditUrl}。
  (b)【人物用台灣人】圖庫圖**優先選食物/食材/物件/情境，避免明顯人臉（尤忌明顯非亞洲臉）**；若主題非有真人不可且圖庫無合適亞洲人物圖，才改用生成：POST `/generate-async` 拿 jobId，每 3s 輪詢 `/generate-status`（生圖端點已內建「畫面有人物一律台灣人」鐵律）。
  (c) 封面寫進 frontmatter：`heroImage`(=full 網址)、`coverAlt`(8-20 字繁中描述)、`coverImageCredit`(=credit)。
  (d) 內文 2 張插進 markdown body 不同小節、各自獨立成段（前後空行、該行只有圖），格式嚴格 `![<credit>](<full> "<creditUrl>")`（alt=攝影師名、title=creditUrl，須 unsplash.com/pexels.com 開頭，build 時 rehype 轉署名 figure）。
  (e) 每個 URL 先 `curl -sI` 確認回 200；避開站上已用過的圖（grep src/content/ 既有 unsplash/pexels 網址去重）。**嚴禁本地行內圖 `](images/...)`（會破壞 build）**。詳見 docs/playbooks/editor-images.md 第三、六節。
每篇撰文時【來源鐵律】所有引用來源一律寫進 frontmatter 結構化 `references`（每筆 `{title, type, url}`，`type` 用 referenceSchema 列舉值如 meta-analysis/systematic-review/rct/cohort/observational/review/guideline/official-agency/expert-review/other，`url` 為可點 http(s) 原始連結），**不可只把連結放在 body 文字而 references 留空**（前台 footer 會顯示「原始來源連結尚未補上」）；每篇至少 1 筆含 url，真的暫無來源才設 sourcePending:true + sourcePendingReason。
Phase 4 連結驗證剔除死連結（含上面圖片 URL 一併驗 200）；**若移除某 reference 的死 url，須連該筆 reference 一起拿掉或換可用來源，不可留無 url 的孤兒 reference**；
Phase 5/6 動態審核委員會：每篇文章的每位審核角色都派一個 sub-agent（Agent 工具），**同一則訊息內一次發起該輪全部審核 Agent 並行**，收齊回饋後由主 agent 彙整修稿再進下一輪；連續 3 輪未收斂才判草稿；審核必查「references 至少 1 筆含可點 url」；
Phase 7 發布前先跑 `pnpm check:news` 與 `pnpm content:audit` 預檢（兩者皆須 pass）。content:audit 會擋下模板化開頭、AI 感句型（不是…而是／換句話說／我一直覺得／老實講…）與模糊引用（研究顯示／文獻回顧…）——命中就改到 pass：開頭第一句直接給具體價值、對比用「是Y，而非X」、引用要嘛具名歸因要嘛軟化為主編判讀（禁編造來源）。全部通過者更新 processed-sources.json 後 commit + push main；未收斂者設 draft:true 開 PR 等人工。（content:audit 現已是 deploy 的硬性 gate，未過會擋部署。）
日期與檔名小時一律台灣時間（UTC+8）。【重要】本機 cron 已設定 TZ=Asia/Taipei，系統時鐘「已經是台灣時間」，請直接用 `date '+%Y-%m-%d %H'` 取值，**切勿再自行 +8**（否則檔名/標題小時會多 8 小時，如把 06 寫成 14）。tags 禁含「/」。data/audience-insights.json 絕不可 commit。每篇務必有封面+2 內文圖且圖 URL 皆 200。最後印出 run summary（含三桶運用情形、siteOptimizations 建議、每篇配圖來源圖庫/生成與張數）。
PROMPTEOF
)"

# headless 自動化：管線需 WebSearch/WebFetch/Bash(git)/Write/Agent/gcloud，故跳過互動式權限詢問
claude-appi -p "$PROMPT" \
  --model claude-sonnet-4-6 \
  --dangerously-skip-permissions 2>&1

echo "===== [news-cron] $(date '+%F %T %Z') 結束 ====="
