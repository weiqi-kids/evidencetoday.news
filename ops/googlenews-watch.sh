#!/usr/bin/env bash
# Google News 曝光每週監測 cron 包裝（本日有據 evidencetoday.news）
#
# 每週打 GSC API 查 googleNews/news/discover 曝光，偵測「從 0 變正」里程碑與週對週變化。
# 純資料查詢，不需 headless claude。報告存 reports/，歷史寫 googlenews-watch-history.jsonl。
# **每週都發 Slack 週報**（趨勢分析＋線性推估）到優化報報 C0BCABEBHHD，里程碑與否皆發。
# 偵測到里程碑（script exit 10）時，額外寫 GOOGLENEWS-MILESTONE.md 旗標檔（不會漏看）。
#
# 安裝（crontab；Vixie 不支援 CRON_TZ，時間以 UTC 寫死）：
#   CRON_TZ=UTC
#   45 1 * * 1 /root/.config/evidencetoday-news/googlenews-watch.sh >> /tmp/evidencetoday-gnews.log 2>&1
#   （台北每週一 09:45 = UTC 週一 01:45；與 sitemap 09:00 / perf 09:30 錯開。）
#
# 前置：gcloud 服務帳號 ga4-insights@yaocare 已 activate（GSC；binary 在 /snap/bin）。
set -euo pipefail

export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPORTS_DIR="$CONF_DIR/reports"
export GNEWS_HISTORY="$CONF_DIR/googlenews-watch-history.jsonl"
mkdir -p "$REPORTS_DIR"
cd "$REPO"

DATE="$(date '+%Y-%m-%d')"
REPORT="$REPORTS_DIR/gnews-$DATE.md"
GNEWS_CHANNEL="C0BCABEBHHD"          # 優化報報（與 perf-report / optimize 同一報表頻道）
SLACK_OUT_FILE="$(mktemp)"
export GNEWS_SLACK_OUT="$SLACK_OUT_FILE"
trap 'rm -f "$SLACK_OUT_FILE"' EXIT

echo "===== [gnews-watch] $(date '+%F %T %Z') 開始 ====="

# 取最新 script（唯讀監測，git pull 失敗不中止）
: # main 已由 ops/bootstrap.sh 同步

set +e
OUT="$(pnpm gnews:watch 2>&1)"
CODE=$?
set -e

echo "$OUT"
{ echo "# Google News 曝光監測 — $DATE"; echo; echo '```'; echo "$OUT"; echo '```'; } > "$REPORT"
echo "[gnews-watch] 報告：$REPORT"

# 每週都發 Slack 摘要（含趨勢分析＋推估）到優化報報，里程碑與否皆發。
if [ -s "$SLACK_OUT_FILE" ]; then
  if "$REPO/ops/slack-notify.sh" "$GNEWS_CHANNEL" < "$SLACK_OUT_FILE" >/dev/null; then
    echo "[gnews-watch] 已發 Slack 週報（優化報報 $GNEWS_CHANNEL）"
  else
    echo "[gnews-watch] ⚠️ Slack 週報發送失敗（不中止）"
  fi
else
  echo "[gnews-watch] ⚠️ 無 Slack 摘要可發（GNEWS_SLACK_OUT 空；gnews:watch 可能查詢失敗）"
fi

if [ "$CODE" -eq 10 ]; then
  FLAG="$REPORTS_DIR/GOOGLENEWS-MILESTONE.md"
  { echo "# 🎉 里程碑：$DATE Google News 開始收錄"; echo; echo "$OUT"; } > "$FLAG"
  echo "[gnews-watch] ⚠️ 里程碑！已寫旗標：$FLAG"
fi

echo "===== [gnews-watch] $(date '+%F %T %Z') 結束 ====="
