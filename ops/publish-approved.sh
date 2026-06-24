#!/usr/bin/env bash
# 半自動發布「✅ 核准閘」發布端（本日有據 evidencetoday.news）— 按鈕版
#
# 掃暫存區 $PENDING_DIR/<type>/<slug>/，向 Worker 查每篇草稿狀態（按鈕寫入 KV）：
#   approved  → copy 進 src/content/<type>/ → 過 build/型別 gate → commit → 全部完成後 push
#               → 寫 awaiting-live 標記（等連結生效）
#   rejected  → 刪草稿（訊息已由 Worker 改為「已退稿」）
#   逾期(>TTL) → 刪草稿 + thread 回貼「逾期過期」
#   pending   → 留到下輪
# 另：每輪先掃 awaiting-live 標記，已 push 的文章一旦線上網址回 200，就回貼「已上線+連結」到該頻道。
#
# 安裝（crontab；UTC 寫死，與既有 cron 錯開）：
#   */10 * * * * /root/.config/evidencetoday-news/publish-approved.sh >> /tmp/evidencetoday-publish.log 2>&1
#
# 乾跑（查狀態、印判定，但不 copy/commit/push、不刪草稿、不發 Slack/改 Worker）：
#   DRY_RUN=1 /root/.config/evidencetoday-news/publish-approved.sh
set -uo pipefail

export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
export IS_SANDBOX=1

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gate-lib.sh
source "$SELF_DIR/gate-lib.sh"

DRY_RUN="${DRY_RUN:-0}"
SITE="https://evidencetoday.news"
AWAIT_DIR="$CONF_DIR/awaiting-live"
LIVE_GIVEUP_MIN=40   # 超過這麼久仍未 200 就提醒一次、停止重貼
cd "$REPO"

LOCK="$CONF_DIR/.publish.lock"
exec 9>"$LOCK"
if ! flock -n 9; then echo "[publish] 上一輪仍在執行，跳過本次"; exit 0; fi

mkdir -p "$PENDING_DIR" "$AWAIT_DIR"; touch "$PUBLISHED_LEDGER"
shopt -s nullglob
NOW="$(date '+%s')"

reply_thread() {  # <channel> <slack_ts> <text>
  [ "$DRY_RUN" = "1" ] && { echo "[publish][DRY] thread→$1: $3"; return 0; }
  printf '%s' "$3" | "$SLACK_NOTIFY" "$1" --thread "$2" >/dev/null 2>&1 || echo "[publish] thread 回貼失敗（$1）"
}

# ── 階段 A：已發佈、等連結生效 → 一旦 200 就回貼上線連結 ─────────────────────────
AWAIT_MARKERS=( "$AWAIT_DIR"/*.json )
for M in "${AWAIT_MARKERS[@]}"; do
  ID="$(jq -r '.id' "$M")"; CH="$(jq -r '.channel' "$M")"; STS="$(jq -r '.slack_ts' "$M")"
  URL="$(jq -r '.url' "$M")"; TITLE="$(jq -r '.title' "$M")"; PUSHED="$(jq -r '.pushed_ts' "$M")"
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -I --max-time 15 "$URL" 2>/dev/null || echo 000)"
  if [ "$CODE" = "200" ]; then
    echo "[publish] 連結已生效：$URL"
    if [ "$DRY_RUN" != "1" ]; then
      reply_thread "$CH" "$STS" ":white_check_mark: *已上線*：$TITLE
:link: $URL"
      gate_set_state "$ID" "published" "$URL"
      rm -f "$M"
    fi
  else
    AGE_MIN=$(( (NOW - PUSHED) / 60 ))
    if [ "$AGE_MIN" -ge "$LIVE_GIVEUP_MIN" ]; then
      echo "[publish] $URL 逾 $AGE_MIN 分仍 $CODE，提醒後停止重貼"
      if [ "$DRY_RUN" != "1" ]; then
        reply_thread "$CH" "$STS" ":warning: 已發佈但連結逾 $AGE_MIN 分仍未生效（HTTP $CODE）。請查 GitHub Pages 部署：$URL"
        gate_set_state "$ID" "published" "$URL"
        rm -f "$M"
      fi
    else
      echo "[publish] 等連結生效中：$URL（HTTP $CODE，已 $AGE_MIN 分）"
    fi
  fi
done

# ── 階段 B：處理待審草稿 ─────────────────────────────────────────────────────────
PENDING_METAS=( "$PENDING_DIR"/*/*/meta.json )
if [ ${#PENDING_METAS[@]} -eq 0 ]; then echo "[publish] $(date '+%F %T %Z') 無待審草稿"; exit 0; fi

echo "===== [publish] $(date '+%F %T %Z') 待審 ${#PENDING_METAS[@]} 篇（DRY_RUN=$DRY_RUN）====="
if [ "$DRY_RUN" != "1" ]; then
  : # main 已由 ops/bootstrap.sh 同步
fi

PUSHED_ANY=0
declare -a NEW_AWAIT=()   # "id|channel|slack_ts|url|title"

discard() {  # <dir> <msg> <channel> <slack_ts> <label> <slug>
  reply_thread "$3" "$4" "$2"
  [ "$DRY_RUN" != "1" ] && rm -rf "$1"
  echo "[publish] $5/$6 → $2"
}

for META in "${PENDING_METAS[@]}"; do
  DIR="$(dirname "$META")"
  TYPE="$(jq -r '.type // empty' "$META")"; SLUG="$(jq -r '.slug // empty' "$META")"
  CH="$(jq -r '.channel // empty' "$META")"; STS="$(jq -r '.slack_ts // empty' "$META")"
  ID="$(jq -r '.id // empty' "$META")"; CREATED="$(jq -r '.created_ts // 0' "$META")"
  TITLE="$(jq -r '.title // .slug // ""' "$META")"; LABEL="$(gate_label "$TYPE")"

  [ -z "$TYPE" ] || [ -z "$SLUG" ] || [ -z "$CH" ] && { echo "[publish] ⚠️ meta 不完整：$META"; continue; }
  EXT="$(gate_ext "$TYPE")" || { echo "[publish] ⚠️ 未知型別 $TYPE"; continue; }
  CONTENT="$DIR/content.$EXT"
  [ -f "$CONTENT" ] || { echo "[publish] ⚠️ 缺 content.$EXT：$DIR"; continue; }
  [ -z "$STS" ] && { echo "[publish] $LABEL/$SLUG 無 slack_ts（未通知成功），留待下輪"; continue; }
  [ -z "$ID" ] && ID="$(gate_id "$TYPE" "$SLUG")"

  STATE="$(gate_get_state "$ID")"
  echo "[publish] $LABEL/$SLUG state=$STATE"

  case "$STATE" in
    rejected)
      discard "$DIR" ":x: *已退稿* — 草稿已刪除。" "$CH" "$STS" "$LABEL" "$SLUG" ;;
    published)
      [ "$DRY_RUN" != "1" ] && rm -rf "$DIR"; echo "[publish] $LABEL/$SLUG 已是 published，清暫存" ;;
    approved)
      DEST="$(gate_dir "$TYPE")/$SLUG.$EXT"
      if [ "$DRY_RUN" = "1" ]; then echo "[publish][DRY] 核准 → 會發布到 $DEST"; continue; fi
      cp "$CONTENT" "$DEST"
      GATE_FAIL=""
      pnpm content:audit >/tmp/pub-audit.log 2>&1 || GATE_FAIL="content:audit"
      TYPECHK="$(gate_typecheck "$TYPE")"
      [ -z "$GATE_FAIL" ] && [ -n "$TYPECHK" ] && { pnpm "$TYPECHK" >/tmp/pub-typecheck.log 2>&1 || GATE_FAIL="$TYPECHK"; }
      [ -z "$GATE_FAIL" ] && { pnpm build >/tmp/pub-build.log 2>&1 || GATE_FAIL="build"; }
      if [ -n "$GATE_FAIL" ]; then
        git checkout -- "$DEST" 2>/dev/null || rm -f "$DEST"
        reply_thread "$CH" "$STS" ":warning: *發布前 gate 失敗：\`$GATE_FAIL\`* — 暫不發布，草稿保留待修。log：/tmp/pub-${GATE_FAIL%%:*}.log"
        mv "$META" "$META.gatefail" 2>/dev/null || true
        echo "[publish] $LABEL/$SLUG gate 失敗（$GATE_FAIL），已還原+標記"
        continue
      fi
      git add "$DEST"
      if git commit -q -m "$(printf '%s(%s): 核准發布 %s\n\n經 Slack ✅ 核准閘人工核可後發布。\n🤖 半自動撰寫（%s）' "$TYPE" "$SLUG" "$TITLE" "$LABEL")"; then
        PUSHED_ANY=1
        NEW_AWAIT+=( "$ID|$CH|$STS|$SITE/$TYPE/$SLUG/|$TITLE" )
        printf '{"date":"%s","type":"%s","slug":"%s","url":"%s"}\n' "$(date '+%Y-%m-%d')" "$TYPE" "$SLUG" "$SITE/$TYPE/$SLUG/" >> "$PUBLISHED_LEDGER"
        rm -rf "$DIR"
        echo "[publish] $LABEL/$SLUG 已 commit"
      else
        echo "[publish] $LABEL/$SLUG commit 失敗（可能無實質變更）"; git checkout -- "$DEST" 2>/dev/null || true
      fi ;;
    *)  # pending / unknown → 看本地逾期
      AGE_DAYS=$(( (NOW - CREATED) / 86400 ))
      if [ "$CREATED" -gt 0 ] && [ "$AGE_DAYS" -ge "$GATE_TTL_DAYS" ]; then
        discard "$DIR" ":hourglass: *逾期未審（>$GATE_TTL_DAYS 天）* — 草稿已過期刪除。" "$CH" "$STS" "$LABEL" "$SLUG"
      else
        echo "[publish] $LABEL/$SLUG 待審中（已 $AGE_DAYS 天，state=$STATE）"
      fi ;;
  esac
done

# 全部 commit 後一次 push；成功才把 awaiting-live 標記落地（下輪等連結 200 回貼）
if [ "$PUSHED_ANY" = "1" ] && [ "$DRY_RUN" != "1" ]; then
  if git push origin main; then
    echo "[publish] 已 push，觸發部署"
    for a in "${NEW_AWAIT[@]}"; do
      IFS='|' read -r id ch ts url title <<< "$a"
      jq -nc --arg id "$id" --arg ch "$ch" --arg ts "$ts" --arg url "$url" --arg title "$title" --argjson pushed "$NOW" \
        '{id:$id,channel:$ch,slack_ts:$ts,url:$url,title:$title,pushed_ts:$pushed}' \
        > "$AWAIT_DIR/$(echo "$id" | tr '/:' '__').json"
    done
  else
    echo "[publish] ⚠️ push 失敗；已 commit 未上線，下輪 git pull 後重試"
  fi
fi

if [ -n "$(git status --porcelain)" ] && [ "$DRY_RUN" != "1" ]; then
  echo "[publish] 清理未提交殘留"
  git stash push --include-untracked --message publish-cleanup >/dev/null 2>&1 && git stash drop >/dev/null 2>&1 || git checkout -- . 2>/dev/null || true
fi

echo "===== [publish] $(date '+%F %T %Z') 結束 ====="
