#!/usr/bin/env bash
# evidencetoday 所有 cron 的統一啟動點：設環境 → 同步 main → exec 指定 ops 腳本。
#
# 為何要這層：repo 內的腳本若自己 `git pull`，會在執行中覆寫自身（self-modify）導致錯亂。
# 故由 bootstrap **先 pull、再 exec** pull 後的新版腳本——被 exec 的腳本是最新版且單次執行、不自改。
# 因此 ops/ 內各腳本一律「不自我 git pull」（已移除），改由本檔統一處理。
#
# 機密與執行期狀態不在 repo：由 $CONF_DIR（預設 /root/.config/evidencetoday-news）持有
#   slack-bot-token、pending/、awaiting-live/、reports/、*-ledger.jsonl、*-history.jsonl。
# 搬機器：clone 本 repo（邏輯全帶走）+ 在新主機重建 $CONF_DIR（機密+狀態）即可。
#
# crontab 用法：/mnt/customers/evidencetoday.news/ops/bootstrap.sh <script.sh> [args...]
set -euo pipefail

export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
export IS_SANDBOX=1
export CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; export REPO
cd "$REPO"

# 同 repo 多支 cron 同一分鐘啟動時，各自 git pull 會互撞（FETCH_HEAD 被別人改寫 →
# 「fatal: Cannot fast-forward to multiple branches」）。用專用鎖把 pull 串起來；
# 等 120 秒仍拿不到鎖就不 pull，沿用現有工作樹續行（與 pull 失敗時同一行為）。
# 鎖用子 shell 的 fd，pull 完即釋放，不會被 exec 出去的腳本繼承。
PULL_LOCK="${BOOTSTRAP_PULL_LOCK:-/tmp/evidencetoday-bootstrap-pull.lock}"
PULL_WAIT="${BOOTSTRAP_PULL_WAIT:-120}"
(
  flock -w "$PULL_WAIT" 7 || { echo "[bootstrap] 等 pull 鎖逾時（${PULL_WAIT}s），不 pull（沿用現有工作樹續行）"; exit 0; }
  git pull --ff-only origin main 2>&1 || echo "[bootstrap] git pull 失敗（沿用現有工作樹續行）"
) 7>"$PULL_LOCK" || echo "[bootstrap] 無法開 pull 鎖檔 $PULL_LOCK（沿用現有工作樹續行）"

[ $# -ge 1 ] || { echo "[bootstrap] 用法：bootstrap.sh <script.sh> [args...]"; exit 2; }
script="$1"; shift
target="$REPO/ops/$script"
[ -x "$target" ] || { echo "[bootstrap] 找不到可執行腳本：$target"; exit 2; }

# 額度冷卻閘：claude 型 cron 若帳號撞用量上限（由 ops/claude-run.sh 寫旗標），冷卻期內直接跳過，
# 省 token、止血、不再每趟空跑。純資料型（publish/sitemap/gnews）不用 claude，不受影響、照常跑。
CLAUDE_SCRIPTS=" draft-cron.sh news-cron.sh optimize-cron.sh perf-report.sh "
FLAG="$CONF_DIR/.rate-limited-until"
if [[ "$CLAUDE_SCRIPTS" == *" $script "* ]] && [ -f "$FLAG" ]; then
  until_ts="$(cat "$FLAG" 2>/dev/null || echo 0)"; now="$(date +%s)"
  if [[ "$until_ts" =~ ^[0-9]+$ ]] && [ "$until_ts" -gt "$now" ]; then
    echo "[bootstrap] 帳號用量上限冷卻中（至 $(date -d @"$until_ts" '+%F %T %Z')）→ 跳過 $script，省 token。"
    exit 0
  fi
  rm -f "$FLAG"  # 已過期，清旗標、恢復正常
fi

exec "$target" "$@"
