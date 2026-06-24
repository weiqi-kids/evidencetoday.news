#!/usr/bin/env bash
# 每日優化引擎 cron 包裝（本日有據 evidencetoday.news）
#
# 它是什麼：站內三支既有 cron（news-cron / sitemap-submit / perf-report）之外，唯一會「執行」
#   既有頁面優化的角色。每日讀 GA4/GSC + 近 7 天關鍵字關係 + 索引覆蓋率 → 定今日優化清單 →
#   改既有頁／補競品內容缺口／推索引 → 過 gate → commit + push（自動部署）。
#   方法論權威檔：repo 內 docs/playbooks/daily-optimize.md（本腳本只是它的執行外殼）。
#
# 分工（勿重疊）：
#   - news-cron.sh（06:17）= 產「新」news；不碰既有頁。
#   - sitemap-submit.sh（09:00 每3天）= sitemap + IndexNow + 索引覆蓋率。
#   - perf-report.sh（09:30 每3天）= 唯讀經營分析。
#   - 本檔（10:30 每日）= 執行既有頁優化（吃上面三者當天的新鮮結果）。
#
# 安裝（crontab；本機 Vixie cron 不支援 CRON_TZ，時間以 UTC 寫死）：
#   CRON_TZ=UTC
#   30 2 * * * /root/.config/evidencetoday-news/optimize-cron.sh >> /tmp/evidencetoday-optimize.log 2>&1
#   （台北 10:30 = UTC 02:30；與 06:17/09:00/09:30 錯開，吃當天 news/sitemap/perf 結果。）
#
# 乾跑（不 commit/push，只產 run-log）：
#   DRY_RUN=1 /root/.config/evidencetoday-news/optimize-cron.sh
#
# 前置（與 news-cron 相同，皆已備妥）：
#   - claude CLI 已登入（/root/.local/bin）；gcloud 服務帳號 ga4-insights@yaocare 已 activate（/snap/bin）
#   - gh 已認證且 git push 可用（repo scope）
set -euo pipefail

# cron PATH 精簡：顯式補 claude(/root/.local/bin) 與 gcloud(/snap/bin)，否則 perf/insights 取不到 token
export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
# cron 以 root 執行；IS_SANDBOX=1 是 Claude Code 認可的 root 旁路，讓 headless 得以運行
export IS_SANDBOX=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPORTS_DIR="$CONF_DIR/reports"
LEDGER="$CONF_DIR/optimize-ledger.jsonl"
MAX_CHANGES=5
DRY_RUN="${DRY_RUN:-0}"

# Slack「優化報報」頻道（記憶 slack-channels）；發送由 slack-notify.sh 處理，缺 token 自動略過
SLACK_NOTIFY="$REPO/ops/slack-notify.sh"
SLACK_CH_OPTIMIZE="C0BCABEBHHD"

mkdir -p "$REPORTS_DIR"
touch "$LEDGER"
cd "$REPO"

DATE="$(date '+%Y-%m-%d')"   # TZ=Asia/Taipei → 已是台灣日期，勿再 +8
RAW="$REPORTS_DIR/optimize-$DATE.raw.txt"
RUNLOG="$REPORTS_DIR/optimize-$DATE.md"

echo "===== [optimize] $(date '+%F %T %Z') 開始（DRY_RUN=$DRY_RUN, MAX_CHANGES=$MAX_CHANGES）====="

# 先同步 main（news-cron 06:17 當天可能已推新內容；開發機也可能推功能）
: # main 已由 ops/bootstrap.sh 同步

# 1) 抓原始數據：perf（28天 GA4+GSC）、insights（含 queriesLast7/queriesPrev7 週對週）、index:coverage。
#    任一失敗都續行，錯誤一起留在 raw。
{
  echo "##### pnpm perf @ $(date '+%F %T %Z') #####"
  pnpm perf 2>&1 || echo "[optimize] pnpm perf 失敗（可能無 gcloud token）"
  echo
  echo "##### pnpm insights @ $(date '+%F %T %Z') #####"
  pnpm insights 2>&1 || echo "[optimize] pnpm insights 失敗"
  echo
  echo "##### pnpm index:coverage @ $(date '+%F %T %Z') #####"
  pnpm index:coverage 2>&1 || echo "[optimize] index:coverage 失敗"
} > "$RAW"
echo "[optimize] 原始數據已存：$RAW"

# 2) headless claude 執行 docs/playbooks/daily-optimize.md 的每日 7 步迴圈
PROMPT="$(cat <<PROMPTEOF
你是本日有據 evidencetoday.news 的「每日優化引擎」。請**完整執行 repo 內 docs/playbooks/daily-optimize.md 的每日 7 步迴圈**，並嚴守其鎖定參數與護欄。重點摘要如下（細節以該 playbook 為準）：

【資料】先 Read 原始數據檔「$RAW」（含 pnpm perf 28天 GA4+GSC、pnpm insights 三桶含 queriesLast7/queriesPrev7 週對週、pnpm index:coverage 索引覆蓋率）。再 Read 帳本「$LEDGER」（每行一筆 JSON），取近 14 天動過的 slug 作為**排除清單**。

【選清單】四源打分取 top ≤ $MAX_CHANGES 項（牽引力 × 可改善幅度 × 索引 ROI）：
 (A) 衝索引【主力】：從 index:coverage 的 byCov 找「Discovered/Crawled - not indexed」頁，補 1–2 條語意相關站內連結指向它＋（內容單薄時）補一段有來源的實質內容＋確認進 sitemap。
 (B) 競品補完【起步只補內容，禁加互動功能/禁動 src/】：對近 7 天有牽引力、排名 5–15 的 query，用 WebSearch 跑 SERP→讀前 3 名競品頁→找出具體內容缺口（缺的對照表/FAQ/數據點/未涵蓋子主題）→用自己的話＋自己的來源補進我們對應的既有頁。**不可抄競品文字、不可加計算器/圖表/篩選器**。
 (C) 站內微優化：執行 insights 的 siteOptimizations 桶（rank 5–15 query 的 title/「重點摘要」/FAQ 小修、補結構化資料缺口）。
 (D) 選題/新內容：僅限常青文章（articles/ingredients/myths，**不是 news**，news 歸 news-cron），有明確缺口才做、低頻。

【執行】先讀完整檔再 Edit（硬規則2）。列既有檔用 ls/Glob 勿用 Read 讀目錄。日期一律台灣時間——本機 cron 已 TZ=Asia/Taipei，系統時鐘即台灣時間，**切勿再 +8**。守 YMYL 鐵律：台灣繁體中文禁中國用語、無醫療承諾/具體醫療建議、禁聳動、tags 禁含「/」、**嚴禁本地行內圖 ](images/...)（破壞 build）**、禁 AI 模板開頭（我一直覺得/老實講…）與 AI 句型（不是…而是/換句話說…）。起步階段**不應動到 src/**；萬一動到，必同步 README 或對應 playbook（否則 docs-sync-check fail）。

【過 gate｜硬性，任一不過一律 abort 不 commit】依序：pnpm content:audit（命中必改到 pass）→ 動到 myths 跑 pnpm check:myths、動到 news 跑 pnpm check:news →最後 pnpm build 零錯誤。

【收斂】DRY_RUN=$DRY_RUN。
 - 若 DRY_RUN=1：**只產 run-log、絕不 git add/commit/push**（這是乾跑驗證）。
 - 若 DRY_RUN=0 且全綠且確有改動：git add **只加真正改的內容檔**（嚴禁 add data/audience-insights.json、$RAW、任何 reports 檔）→ commit（訊息格式：第一行 \`optimize(<index|serp-gap|onpage|content>): <一句話>\`，body 逐項列 slug＋來源 A/B/C/D＋理由，結尾一行 \`🤖 daily-optimize 自動優化\`）→ git push origin main。IndexNow 不必手動跑（deploy.yml 會對異動檔自動推）。
 - 若沒有過 gate 的高 ROI 項目：**no-op**，不要空 commit。

【run-log】用 Write 把今日 run-log 寫成繁中 markdown 到「$RUNLOG」（**此路徑在 repo 外，不會進 git**）：## 今日改動（每項：slug／來源 A-D／理由／B源附競品缺口依據／預期效益）／## 索引前後／## 下次觀察點。若 no-op 也要寫一句說明為何今日無高 ROI 項目。

【收尾】把每個「實際 commit 改過」的 slug 以 JSON 形式 append 進 $LEDGER（每行一筆，含 {"date":"$DATE","slug":"...","source":"A|B|C|D","reason":"..."}）；DRY_RUN=1 時不寫 ledger。最後在 stdout 印 3 行內摘要（改了幾項/哪些/有無 push）。
PROMPTEOF
)"

# 記下 claude 動工前的 HEAD，事後比對是否真的 commit + push 了
HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
CLAUDE_OK=1
claude -p "$PROMPT" \
  --model claude-sonnet-4-6 \
  --dangerously-skip-permissions 2>&1 || { CLAUDE_OK=0; echo "[optimize] claude 執行失敗；原始數據仍保存於 $RAW"; }

# 工作樹清理：claude 對「該保留的改動」已自行 commit/push；此刻仍殘留的未提交變更
# 一律是「沒收斂就結束」的痕跡——DRY_RUN 的試改、gate 失敗 abort、或 no-op 前的試改。
# 不清掉會污染隔天 git pull --ff-only（衝突）或被下次 run 誤 commit。故統一清回 HEAD。
# （committed-but-unpushed 的 push 失敗邊例不受影響，因其工作樹已乾淨。）
if [ -n "$(git status --porcelain)" ]; then
  echo "[optimize] 清理未提交的工作樹殘留（DRY_RUN / gate-fail abort / no-op 試改）"
  git stash push --include-untracked --message optimize-cleanup >/dev/null 2>&1 && \
    git stash drop >/dev/null 2>&1 || git checkout -- . 2>/dev/null || true
  echo "[optimize] 清理後狀態：$(git status --porcelain | wc -l) 個未提交變更（應為 0）"
fi

# ── Slack 通報「優化報報」頻道 ─────────────────────────────────────────────
# 依「是否真的多了一個 daily-optimize commit」分流：已部署 / no-op / 失敗。
# DRY_RUN=1 不發（乾跑不該打擾頻道）。slack-notify.sh 缺 token 會自行略過、不中斷。
if [ "$DRY_RUN" = "1" ]; then
  echo "[optimize] DRY_RUN=1，略過 Slack 通報"
elif [ -x "$SLACK_NOTIFY" ]; then
  HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  REPO_URL="https://github.com/weiqi-kids/evidencetoday.news"

  if [ "$CLAUDE_OK" = "0" ]; then
    MSG=":warning: *自動優化 $DATE — 執行失敗*
headless claude 中斷，今日未產出。原始數據：\`$RAW\`
詳見 log：\`/tmp/evidencetoday-optimize.log\`"
  elif [ "$HEAD_AFTER" != "$HEAD_BEFORE" ] && [ "$HEAD_BEFORE" != "unknown" ]; then
    # 有新 commit → 已部署。取 commit 主旨 + 今日 ledger 條目組清單。
    SUBJECT="$(git log -1 --pretty=%s 2>/dev/null)"
    SHORT="$(git rev-parse --short HEAD 2>/dev/null)"
    # 今日 ledger 行（每行一筆 JSON）轉成 bullet
    ITEMS="$(
      grep -F "\"date\":\"$DATE\"" "$LEDGER" 2>/dev/null \
        | jq -r '"• `\(.slug)`（來源 \(.source)）\(.reason)"' 2>/dev/null
    )"
    [ -z "$ITEMS" ] && ITEMS="（ledger 無今日條目，詳見 run-log）"
    MSG=":hammer_and_wrench: *自動優化 $DATE — 已部署*
\`$SUBJECT\`
$ITEMS
:link: $REPO_URL/commit/$SHORT"
  else
    # HEAD 沒變 → no-op。盡量從 run-log 撈一句原因。
    REASON="$(grep -m1 -iE 'no-?op|無高 ?ROI|今日無' "$RUNLOG" 2>/dev/null | sed 's/^[#>*[:space:]-]*//')"
    [ -z "$REASON" ] && REASON="今日無過 gate 的高 ROI 項目，靜默結束（未空 commit）。"
    MSG=":sleeping: *自動優化 $DATE — no-op*
$REASON"
  fi

  printf '%s' "$MSG" | "$SLACK_NOTIFY" "$SLACK_CH_OPTIMIZE" >/dev/null 2>&1 \
    && echo "[optimize] Slack 通報已送出（優化報報）" \
    || echo "[optimize] Slack 通報略過/失敗（缺 token 或 API 錯誤，不影響本次優化）"
else
  echo "[optimize] 找不到 $SLACK_NOTIFY，略過 Slack 通報"
fi

echo "[optimize] run-log：$RUNLOG"
echo "===== [optimize] $(date '+%F %T %Z') 結束 ====="
