#!/usr/bin/env bash
# 通用 Slack 通報小工具（本日有據 evidencetoday.news）
#
# 用途：給站內各 cron / headless 流程在「半自動撰寫」「自動優化」完成後發 Slack 訊息。
#   單一 Bot Token 即可發到全部 7 個頻道（用 channel ID 指定）。
#
# 用法：
#   slack-notify.sh <CHANNEL_ID> "訊息文字（mrkdwn）"
#   echo "多行訊息" | slack-notify.sh <CHANNEL_ID>
#   slack-notify.sh <CHANNEL_ID> "主訊息" --thread <PARENT_TS>   # 回在某 thread 下
#
# 頻道對照（記憶 slack-channels）：
#   文章 C0BCVEYG5HS｜Podcast C0BCPPE14T0｜短影音 C0BDL4TMTKJ｜闢謠 C0BCKFMLS9Z
#   成分解析 C0BCRS08DMG｜趨勢 C0BCAC0GKBR｜優化報報 C0BCABEBHHD
#
# Token 來源（擇一，優先序由上而下）：
#   1. 環境變數 SLACK_BOT_TOKEN
#   2. 檔案 /root/.config/evidencetoday-news/slack-bot-token（chmod 600，內容單行 xoxb-...）
#   Bot 需 chat:write scope，且已被邀入目標頻道（/invite @bot）。
#
# 設計原則：缺 token / 發送失敗都「不中斷呼叫端」——印警告、回非零，呼叫端應以 `|| true` 包住。
set -uo pipefail

CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
TOKEN_FILE="$CONF_DIR/slack-bot-token"

CHANNEL="${1:-}"
if [ -z "$CHANNEL" ]; then
  echo "[slack-notify] 用法：slack-notify.sh <CHANNEL_ID> \"訊息\"（或 stdin 餵訊息）" >&2
  exit 2
fi
shift

# 解析 --thread
THREAD_TS=""
TEXT_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --thread) THREAD_TS="${2:-}"; shift 2 ;;
    *) TEXT_ARGS+=("$1"); shift ;;
  esac
done

# 取訊息：有位置參數用之，否則讀 stdin
if [ ${#TEXT_ARGS[@]} -gt 0 ]; then
  TEXT="${TEXT_ARGS[*]}"
else
  TEXT="$(cat)"
fi
if [ -z "${TEXT//[$'\t\r\n ']/}" ]; then
  echo "[slack-notify] 訊息為空，略過" >&2
  exit 2
fi

# 取 token
TOKEN="${SLACK_BOT_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -r "$TOKEN_FILE" ]; then
  TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
fi
if [ -z "$TOKEN" ]; then
  echo "[slack-notify] ⚠️ 找不到 SLACK_BOT_TOKEN（env 或 $TOKEN_FILE）；略過發送" >&2
  exit 1
fi

# 組 JSON（jq -Rs 安全編碼多行文字）
PAYLOAD="$(
  jq -nc \
    --arg ch "$CHANNEL" \
    --arg text "$TEXT" \
    --arg thread "$THREAD_TS" \
    '{channel:$ch, text:$text, unfurl_links:false, unfurl_media:false}
     + (if $thread == "" then {} else {thread_ts:$thread} end)'
)"

RESP="$(
  curl -sS -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data "$PAYLOAD"
)"

if [ "$(printf '%s' "$RESP" | jq -r '.ok // false')" = "true" ]; then
  TS="$(printf '%s' "$RESP" | jq -r '.ts')"
  echo "[slack-notify] ✅ 已發送到 $CHANNEL（ts=$TS）"
  # 把 ts 印到 stdout 末行，方便呼叫端接 thread
  printf '%s\n' "$TS"
  exit 0
else
  ERR="$(printf '%s' "$RESP" | jq -r '.error // "unknown"')"
  echo "[slack-notify] ❌ 發送失敗：$ERR（channel=$CHANNEL）" >&2
  exit 1
fi
