#!/usr/bin/env bash
# GA4+GSC 效能報表分析 cron 包裝（本日有據 evidencetoday.news）
#
# 為何需要：CLAUDE.md § session 啟動行為要求每次開工先跑 `pnpm perf` 抓 GA4+GSC 數據、
# 據此給經營建議。使用者要求把這份「報表分析」自動化為每 3 天一次（不必每次手動開工才有）。
#
# 流程：
#   1) bash 先把 `pnpm perf` + `pnpm insights` 原始輸出存成當日 raw 檔（即使後續 claude 失敗，數字仍留存）。
#   2) headless `claude -p`（sonnet）讀 raw、產出繁中「經營建議」markdown，與前一份報告比趨勢，寫進 reports/。
#   ⚠️ 唯讀：本腳本只做分析報告，**不編輯 repo 內容、不 commit、不 push**（與會自動部署的 news-cron.sh 明確區隔）。
#
# 安裝（crontab；本機 Vixie cron 不支援 CRON_TZ，時間以 UTC 寫死）：
#   30 1 */3 * * /root/.config/evidencetoday-news/perf-report.sh >> /tmp/evidencetoday-perf.log 2>&1
#   （台北 09:30 = UTC 01:30；每 3 天一次，與索引覆蓋率報表 09:00 錯開 30 分。）
#
# 前置（與 news-cron 相同，皆已備妥）：
#   - claude CLI 已登入（/root/.local/bin）
#   - gcloud 服務帳號 ga4-insights@yaocare 已 activate（GA4/GSC；binary 在 /snap/bin）
set -euo pipefail

# cron PATH 精簡：顯式補 claude(/root/.local/bin) 與 gcloud(/snap/bin)，否則 perf/insights 取不到 token
export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
# cron 以 root 執行；IS_SANDBOX=1 是 Claude Code 認可的 root 旁路，讓 headless 得以運行
export IS_SANDBOX=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPORTS_DIR="$CONF_DIR/reports"
LEDGER="$CONF_DIR/optimize-ledger.jsonl"          # optimize-cron 已執行的頁（避免重複建議）
IDX_HISTORY="$CONF_DIR/index-coverage-history.jsonl"  # 索引覆蓋率趨勢
SLACK_NOTIFY="$REPO/ops/slack-notify.sh"
SLACK_CH_OPTIMIZE="C0BCABEBHHD"                   # 優化報報頻道（記憶 slack-channels）
mkdir -p "$REPORTS_DIR"
cd "$REPO"

DATE="$(date '+%Y-%m-%d')"   # TZ=Asia/Taipei → 已是台灣日期，勿再 +8
RAW="$REPORTS_DIR/perf-$DATE.raw.txt"
MD="$REPORTS_DIR/perf-$DATE.md"
SLACK_MD="$REPORTS_DIR/perf-$DATE.slack.txt"     # claude 另寫一份短摘要供發 Slack

echo "===== [perf-report] $(date '+%F %T %Z') 開始 ====="

# 取最新 main，讓 insights 的站內缺口分析反映已部署內容（唯讀，失敗不中止）
: # main 已由 ops/bootstrap.sh 同步

# 1) 抓原始數據（perf 唯讀；insights 吐選題三桶 JSON）。任一失敗都續行，把錯誤一起留在 raw。
{
  echo "##### pnpm perf @ $(date '+%F %T %Z') #####"
  pnpm perf 2>&1 || echo "[perf-report] pnpm perf 失敗（可能無 gcloud token）"
  echo
  echo "##### pnpm insights @ $(date '+%F %T %Z') #####"
  pnpm insights 2>&1 || echo "[perf-report] pnpm insights 失敗"
} > "$RAW"

echo "[perf-report] 原始數據已存：$RAW"

# 2) headless claude 讀 raw → 產出經營建議報告（唯讀，禁 commit/push/改內容）
PROMPT="$(cat <<PROMPTEOF
你是本日有據 evidencetoday.news 的經營分析助手。**這是一份唯讀的數據報表分析任務：禁止編輯任何 repo 內容、禁止 git commit、禁止 git push、禁止改 src/。**

步驟：
1. 用 Read 讀取「$RAW」——裡面是本次 \`pnpm perf\`（近 28 天 GA4+GSC 效能快照）與 \`pnpm insights\`（GA4/GSC 驅動選題三桶 JSON）的原始輸出。
2. 用 \`ls -t $REPORTS_DIR/perf-*.md\` 找上一份報告（若有，排除今天的 $MD），Read 它做 period-over-period 趨勢對比。
3.【避免與自動優化重複】Read「$LEDGER」（每行一筆 JSON，是 optimize-cron 每日已**實際執行**的頁與理由）取近 14 天的 slug＋來源；再 \`ls -t $REPORTS_DIR/optimize-*.md\` 讀最近 1–2 份 optimize run-log 了解它最近做了什麼。**凡是自動優化近期已處理的項目，不要再列為「待辦建議」**，只在「已處理」區帶過。另 Read「$IDX_HISTORY」最後一行取最新索引覆蓋率（indexed/total）。
4. 依 CLAUDE.md § session 啟動行為的聚焦點寫建議：① 排名 5–15 邊緣查詢；② 有曝光牽引力、值得擴寫的主題叢集；③ 流量/曝光趨勢與 AI 導流（referrer）變化；④ 舊→新 slug 改名後索引回補。數據為 0 或極低屬正常（站早期），此時偏「衝索引/權威（站外）」而非站內微調。
5. 用 Write 把完整報告寫成繁體中文（台灣用語，禁中國用語）markdown 到「$MD」，結構固定為：
   ## 數據摘要（關鍵數字＋與前期對比＋最新索引覆蓋率 indexed/total）
   ## 🤖 自動優化已處理（近 14 天 optimize-cron 做了哪些，**不重複建議**）
   ## 🙋 待你決策（自動優化碰不到或需人工判斷的：站外權威累積、改版型、選題方向、要不要擴寫某叢集等，條列＋優先序）
   ## 下次觀察點
   報告開頭標示量測日期 $DATE 與資料區間。
6.【供 Slack — 讀者是「不懂 SEO、不知道 slug、不看英文」的經營者；務必先講人話、術語/英文/分數一律收在破折號或括號後】另用 Write 寫一份精簡摘要到「$SLACK_MD」（純文字、Slack 格式）。**嚴格照以下模板**，每個數字都來自 $RAW 真實數據、找不到就寫「資料不足」、不可編造：

:bar_chart: *站況＋建議　$DATE（星期X）*

*:chart_with_upwards_trend: 這 28 天表現*
（「曝光」＝我們出現在 Google 搜尋結果裡的次數；「索引率」＝Google 願意收進資料庫、之後才搜得到的頁數比例）
• 被看到的次數：N（比前期多/少 X%）
• 實際被點進來：N（跟前期…）
• 在 Google 的平均名次：第 N 名（前期 N，往前/退後了）
• 頁面被 Google 收錄：Y 頁裡收了 X 頁，*Z%*（前次 …，趨勢一句）

*:robot_face: 系統自動做了哪些優化（近 14 天，N 項）*
• 〈中文文章名〉那篇　白話講改了什麼——帶來什麼結果（用數字佐證）

*:raising_hand: 這幾件需要你拍板*（由重要到次要）
1️⃣ 一句白話講要做什麼——為什麼（熱度分數等術語收在破折號後）
2️⃣ …（共 3–5 條）

模板規則（違反等於沒改）：
- 粗體只用單星 \`*\`，**絕不可**用雙星 \`**\`（Slack 不認雙星）。
- slug / 英文檔名一律換成〈中文文章名〉；「自動優化已處理」每條都要「哪篇＋改了什麼＋帶來什麼」三段俱全，禁止只丟一個關鍵字或 slug 就沒頭沒尾。
- 標題那行要帶星期幾（用 \`date '+%u'\` 換算：1=一…7=日）。
- 全程先講人話，SEO 術語/英文/分數收在破折號或括號後，讓不懂的人也讀得懂。
7. 完成後在 stdout 印出三行內重點摘要。

注意：所有結論只能來自 $RAW 與上述檔案的真實數據，不可編造；找不到數字就如實說「資料不足」。全程唯讀，唯一允許的寫入是 Write 到 $MD 與 $SLACK_MD。
PROMPTEOF
)"

"$REPO/ops/claude-run.sh" -p "$PROMPT" \
  --model claude-sonnet-4-6 \
  --dangerously-skip-permissions 2>&1 || echo "[perf-report] claude 分析失敗；原始數據仍保存於 $RAW"

# 把精簡摘要發到「優化報報」頻道（slack-notify.sh 缺 token 自動略過、不中斷）。
if [ -x "$SLACK_NOTIFY" ] && [ -s "$SLACK_MD" ]; then
  "$SLACK_NOTIFY" "$SLACK_CH_OPTIMIZE" "$(cat "$SLACK_MD")" >/dev/null 2>&1 \
    && echo "[perf-report] Slack 站況摘要已送出（優化報報）" \
    || echo "[perf-report] Slack 發送略過/失敗（不影響報告）"
else
  echo "[perf-report] 無 $SLACK_MD（claude 未產摘要？），略過 Slack"
fi

echo "[perf-report] 完整報告：$MD"
echo "===== [perf-report] $(date '+%F %T %Z') 結束 ====="
