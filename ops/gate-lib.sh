#!/usr/bin/env bash
# 半自動發布「✅ 核准閘」共用函式庫（本日有據 evidencetoday.news）
# 由 draft-cron.sh（出草稿）與 publish-approved.sh（讀 reaction 發布）source。
# 不可獨立執行；只定義常數與函式。
#
# 流程總覽：
#   draft-cron.sh <type> → headless claude 比照 news 全管線撰寫，但輸出到「暫存區」而非 commit；
#     wrapper 把每篇新草稿發到對應頻道、把 Slack 訊息 ts 寫回 meta.json。
#   publish-approved.sh → 掃暫存區，讀每篇草稿對應訊息的 reactions：
#     ✅ white_check_mark → copy 進 src/content/<type>/ → 過 build gate → commit+push → 回貼「已發布」
#     ❌ x / no_entry      → 退稿刪草稿 → 回貼「已退稿」
#     逾期（GATE_TTL_DAYS） → 過期刪草稿 → 回貼「逾期過期」
#
# 暫存區在 repo 之外（main 乾淨）：$PENDING_DIR/<type>/<slug>/{content.<ext>,meta.json}
#   meta.json：{type,slug,title,summary,sources_count,gate,created_ts,channel,slack_ts}
#   （created_ts/slack_ts 為 epoch 秒；slack_ts 為 Slack 訊息 ts 字串，發布回貼接 thread 用）

set -uo pipefail

CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PENDING_DIR="$CONF_DIR/pending"
PUBLISHED_LEDGER="$CONF_DIR/published-ledger.jsonl"
GATE_TTL_DAYS="${GATE_TTL_DAYS:-7}"
SLACK_NOTIFY="$REPO/ops/slack-notify.sh"
TOKEN_FILE="$CONF_DIR/slack-bot-token"

# 型別 → 頻道 ID（記憶 slack-channels）
gate_channel() {
  case "$1" in
    articles)    echo "C0BCVEYG5HS" ;;
    ingredients) echo "C0BCRS08DMG" ;;
    myths)       echo "C0BCKFMLS9Z" ;;
    news)        echo "C0BCAC0GKBR" ;;
    *) return 1 ;;
  esac
}

# 型別 → src/content 子目錄
gate_dir()   { echo "$REPO/src/content/$1"; }
# 型別 → 副檔名（articles/ingredients/myths=mdx，news=md）
gate_ext()   { case "$1" in news) echo "md" ;; articles|ingredients|myths) echo "mdx" ;; *) return 1 ;; esac; }
# 型別 → 發布前型別專屬 gate（pnpm script 名，無則空）
gate_typecheck() { case "$1" in myths) echo "check:myths" ;; news) echo "check:news" ;; *) echo "" ;; esac; }
# 型別 → 中文顯示名
gate_label() { case "$1" in articles) echo "文章" ;; ingredients) echo "成分解析" ;; myths) echo "闢謠" ;; news) echo "趨勢" ;; *) echo "$1" ;; esac; }

_gate_token() {
  if [ -n "${SLACK_BOT_TOKEN:-}" ]; then printf '%s' "$SLACK_BOT_TOKEN"; return 0; fi
  [ -r "$TOKEN_FILE" ] && tr -d ' \t\r\n' < "$TOKEN_FILE"
}

# 讀某訊息目前的 reaction 名稱清單（空白分隔）。透過 conversations.history 精準定位（免 reactions:read scope）。
# 用法：gate_read_reactions <channel> <ts>  → stdout 例「white_check_mark eyes」；讀不到則空字串。
gate_read_reactions() {
  local ch="$1" ts="$2" tok resp
  tok="$(_gate_token)" || return 1
  [ -z "$tok" ] && return 1
  resp="$(curl -sS -H "Authorization: Bearer $tok" \
    "https://slack.com/api/conversations.history?channel=${ch}&latest=${ts}&oldest=${ts}&inclusive=true&limit=1" 2>/dev/null)"
  [ "$(printf '%s' "$resp" | jq -r '.ok // false')" = "true" ] || return 1
  printf '%s' "$resp" | jq -r '(.messages[0].reactions // []) | map(.name) | join(" ")'
}

# 判斷 reaction 清單是否含核准/退稿訊號（reaction 備援版；主流程已改用按鈕+Worker 狀態）
gate_is_approved() { case " $1 " in *" white_check_mark "*|*" heavy_check_mark "*|*" +1 "*) return 0 ;; *) return 1 ;; esac; }
gate_is_rejected() { case " $1 " in *" x "*|*" no_entry "*|*" no_entry_sign "*|*" -1 "*) return 0 ;; *) return 1 ;; esac; }

# ── 按鈕核准閘：Worker 端點（slack-gate.ts）──────────────────────────────────────
# 草稿狀態機存在 Cloudflare Worker 的 KV；主機端用 gh push token 認證讀寫。
WORKER_URL="https://evidencetoday-ai-suggest.lightman-chang.workers.dev"
gate_id() { printf '%s::%s' "$1" "$2"; }   # <type> <slug> → id
_gh_token() { gh auth token 2>/dev/null; }

# 發「帶按鈕的草稿訊息」到頻道，回傳訊息 ts（核准錨點）。
# 用法：gate_post_buttons <channel> <id> <label> <title> <summary> <gateline>
gate_post_buttons() {
  local ch="$1" id="$2" label="$3" title="$4" summary="$5" gateline="$6" tok payload resp
  tok="$(_gate_token)" || return 1
  payload="$(jq -nc \
    --arg ch "$ch" --arg id "$id" --arg label "$label" --arg title "$title" \
    --arg summary "$summary" --arg gateline "$gateline" '
    {channel:$ch, unfurl_links:false, text:("📝 "+$label+"草稿待審："+$title),
     blocks:[
       {type:"section", text:{type:"mrkdwn", text:("*:memo: "+$label+"草稿待審*\n*"+$title+"*\n"+$summary)}},
       {type:"context", elements:[{type:"mrkdwn", text:$gateline}]},
       {type:"actions", elements:[
         {type:"button", action_id:"gate_preview", value:$id, text:{type:"plain_text", text:"📄 預覽全文"}},
         {type:"button", action_id:"gate_confirm", value:$id, style:"primary", text:{type:"plain_text", text:"✅ 確認發佈"}},
         {type:"button", action_id:"gate_reject",  value:$id, style:"danger",  text:{type:"plain_text", text:"❌ 退稿"}}
       ]}
     ]}')"
  resp="$(curl -sS -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $tok" -H "Content-Type: application/json; charset=utf-8" --data "$payload")"
  [ "$(printf '%s' "$resp" | jq -r '.ok // false')" = "true" ] || { echo "[gate] 發按鈕訊息失敗：$(printf '%s' "$resp" | jq -r '.error // "?"')" >&2; return 1; }
  printf '%s' "$resp" | jq -r '.ts'
}

# 把草稿存進 Worker KV（供預覽 modal + 狀態機）。<id> <type> <slug> <title> <summary> <channel> <slack_ts> <content_file>
gate_put_draft() {
  local id="$1" type="$2" slug="$3" title="$4" summary="$5" ch="$6" ts="$7" cf="$8" tok resp
  tok="$(_gh_token)"; [ -z "$tok" ] && { echo "[gate] 無 gh token，無法存草稿到 Worker" >&2; return 1; }
  resp="$(jq -nc --arg id "$id" --arg type "$type" --arg slug "$slug" --arg title "$title" \
      --arg summary "$summary" --arg ch "$ch" --arg ts "$ts" --rawfile content "$cf" \
      '{id:$id,type:$type,slug:$slug,title:$title,summary:$summary,channel:$ch,slack_ts:$ts,content:$content}' \
    | curl -sS -X PUT "$WORKER_URL/gate/draft" -H "Authorization: Bearer $tok" -H "Content-Type: application/json" --data @-)"
  [ "$(printf '%s' "$resp" | jq -r '.ok // false')" = "true" ] || { echo "[gate] 存草稿失敗：$resp" >&2; return 1; }
}

# 讀草稿狀態：echo pending|approved|rejected|published|unknown。 <id>
gate_get_state() {
  local id="$1" tok resp
  tok="$(_gh_token)"; [ -z "$tok" ] && { echo "unknown"; return 1; }
  resp="$(curl -sS "$WORKER_URL/gate/state?id=$(jq -rn --arg s "$id" '$s|@uri')" -H "Authorization: Bearer $tok")"
  printf '%s' "$resp" | jq -r '.state // "unknown"'
}

# 收斂狀態（發布後）：<id> <state> [url]
gate_set_state() {
  local id="$1" state="$2" url="${3:-}" tok
  tok="$(_gh_token)"; [ -z "$tok" ] && return 1
  jq -nc --arg id "$id" --arg state "$state" --arg url "$url" \
    '{id:$id,state:$state} + (if $url=="" then {} else {url:$url} end)' \
    | curl -sS -X PUT "$WORKER_URL/gate/state" -H "Authorization: Bearer $tok" -H "Content-Type: application/json" --data @- >/dev/null
}
