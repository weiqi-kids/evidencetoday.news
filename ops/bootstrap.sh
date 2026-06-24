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
# crontab 用法：/root/evidencetoday.news/ops/bootstrap.sh <script.sh> [args...]
set -euo pipefail

export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
export IS_SANDBOX=1
export CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; export REPO
cd "$REPO"

git pull --ff-only origin main 2>&1 || echo "[bootstrap] git pull 失敗（沿用現有工作樹續行）"

[ $# -ge 1 ] || { echo "[bootstrap] 用法：bootstrap.sh <script.sh> [args...]"; exit 2; }
script="$1"; shift
target="$REPO/ops/$script"
[ -x "$target" ] || { echo "[bootstrap] 找不到可執行腳本：$target"; exit 2; }
exec "$target" "$@"
