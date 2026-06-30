#!/usr/bin/env bash
# 統一 headless claude 呼叫包裝（本日有據 evidencetoday.news）
#
# 為何需要：所有 cron 的 headless 撰寫/分析都走營運帳號 claude-appi。該帳號額度若撞上
# weekly/usage limit，原本各 cron 仍照常觸發 → 每趟空跑、噪音、浪費排程。本包裝：
#   1) 跑 claude-appi（即時輸出，行為與直接呼叫一致）；
#   2) 偵測輸出含「weekly/usage limit」→ 解析 reset 時間（失敗則保守冷卻 6h），
#      寫進冷卻旗標 $CONF_DIR/.rate-limited-until（epoch 秒）；
#   3) bootstrap.sh 在冷卻期內會直接跳過 claude 型 cron（止血、省 token）。
#
# 用法（取代各腳本內的 `claude-appi`）：
#   "$REPO/ops/claude-run.sh" -p "$PROMPT" --model claude-sonnet-4-6 --dangerously-skip-permissions
set -uo pipefail

CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
FLAG="$CONF_DIR/.rate-limited-until"
mkdir -p "$CONF_DIR"

TMP="$(mktemp "${TMPDIR:-/tmp}/etn-claude-run.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

# 即時輸出給 cron log，同時留一份供偵測
claude-appi "$@" 2>&1 | tee "$TMP"
rc=${PIPESTATUS[0]}

if grep -qiE "hit your (weekly|usage) limit|weekly limit|usage limit" "$TMP"; then
  reset_str="$(grep -ioE "resets [A-Za-z]+ [0-9]+,? [0-9]+(am|pm)" "$TMP" | head -1 | sed -E 's/^resets //I; s/,//')"
  until_ts=""
  [ -n "$reset_str" ] && until_ts="$(date -d "$reset_str" +%s 2>/dev/null || true)"
  # 解析失敗、或解析值不在合理範圍（過去 / 超過 8 天），一律退回保守 6h
  now="$(date +%s)"
  if ! [[ "$until_ts" =~ ^[0-9]+$ ]] || [ "$until_ts" -le "$now" ] || [ "$until_ts" -gt $((now + 8*86400)) ]; then
    until_ts="$(date -d '+6 hours' +%s)"
  fi
  echo "$until_ts" > "$FLAG"
  echo "[claude-run] 偵測到帳號用量上限 → 冷卻至 $(date -d @"$until_ts" '+%F %T %Z')（旗標 $FLAG）；bootstrap 將跳過 claude 型 cron 直到此時。"
fi

exit "$rc"
