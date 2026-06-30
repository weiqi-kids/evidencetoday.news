#!/usr/bin/env bash
# evidencetoday cron 狀態速覽（本日有據 evidencetoday.news）
#
# 印一張「名稱 / 台北時間 / 模型 / 現況」markdown 表。**唯讀、不改任何狀態。**
# 由 `/etn-cron` skill 呼叫，也可直接 `ops/cron-status.sh` 跑。
# 資料來源：
#   - 排程 → /etc/cron.d/evidencetoday（real cron 檔；本機排程以 UTC 解讀，台北＝UTC+8）
#   - 現況 → /var/log/evidencetoday/<job>.log 末狀態
#   - 冷卻 → $CONF_DIR/.rate-limited-until（claude-run.sh 撞限額時寫；bootstrap 冷卻期跳過 claude 型 job）
# 模型對照為靜態（cron.d 不含 model 資訊）；改排程/腳本時一併維護本檔（受 docs-sync 連動 ops/README.md）。
set -uo pipefail

CRON_FILE="${ETN_CRON_FILE:-/etc/cron.d/evidencetoday}"
LOG_DIR="${ETN_LOG_DIR:-/var/log/evidencetoday}"
CONF_DIR="${CONF_DIR:-/root/.config/evidencetoday-news}"
FLAG="$CONF_DIR/.rate-limited-until"

[ -r "$CRON_FILE" ] || { echo "找不到 $CRON_FILE（cron 尚未部署？）"; exit 1; }

dow_name(){ case "$1" in 0|7) echo 日;; 1) echo 一;; 2) echo 二;; 3) echo 三;; 4) echo 四;; 5) echo 五;; 6) echo 六;; *) echo '?';; esac; }

# job(script[ arg]) → 友善名稱
label_of(){ case "$1" in
  "draft-cron.sh news")        echo "趨勢草稿";;
  "draft-cron.sh articles")    echo "常青文章草稿";;
  "draft-cron.sh ingredients") echo "成分解析草稿";;
  "draft-cron.sh myths")       echo "闢謠草稿";;
  "draft-cron.sh podcast")     echo "Podcast 講稿";;
  "draft-cron.sh videos")      echo "短影音腳本";;
  "publish-approved.sh")       echo "核准→發佈";;
  "sitemap-submit.sh")         echo "sitemap+索引率";;
  "perf-report.sh")            echo "經營建議報表";;
  "optimize-cron.sh")          echo "每日自我優化";;
  "googlenews-watch.sh")       echo "Google News 監測";;
  *) echo "$1";; esac; }

# job → 模型（cron.d 不含此資訊，靜態維護）
model_of(){ case "$1" in
  "draft-cron.sh news"|"draft-cron.sh articles"|"draft-cron.sh ingredients"|"draft-cron.sh myths")
                               echo "Sonnet（orchestrator＋子代理）";;
  "draft-cron.sh podcast"|"draft-cron.sh videos")
                               echo "Sonnet（單迴圈）";;
  "perf-report.sh"|"optimize-cron.sh")
                               echo "Sonnet";;
  "publish-approved.sh"|"sitemap-submit.sh"|"googlenews-watch.sh")
                               echo "—（無 claude）";;
  *) echo "?";; esac; }

# 是否 claude 型（受冷卻閘影響）
is_claude(){ case "$1" in draft-cron.sh*|perf-report.sh|optimize-cron.sh|news-cron.sh) return 0;; *) return 1;; esac; }

# 5 個 cron 欄位 → 台北時間描述
taipei_desc(){ # M H DOM MON DOW
  local M="$1" H="$2" DOM="$3" DOW="$5"
  [[ "$M" == */* ]] && { echo "每${M#*/}分"; return; }
  [[ "$H" =~ ^[0-9]+$ && "$M" =~ ^[0-9]+$ ]] || { echo "$M $H * * $DOW"; return; }
  local th=$((10#$H + 8)) shift=0
  [ "$th" -ge 24 ] && { th=$((th-24)); shift=1; }
  local hhmm; hhmm=$(printf '%02d:%02d' "$th" "$((10#$M))")
  [[ "$DOM" == */* ]] && { echo "每${DOM#*/}天 $hhmm"; return; }
  if [[ "$DOW" =~ ^[0-7]$ ]]; then echo "週$(dow_name $(( (10#$DOW + shift) % 7 ))) $hhmm"; return; fi
  echo "每日 $hhmm"
}

# 冷卻旗標
cooldown_until=""
if [ -f "$FLAG" ]; then
  u="$(cat "$FLAG" 2>/dev/null || echo 0)"
  if [[ "$u" =~ ^[0-9]+$ ]] && [ "$u" -gt "$(date +%s)" ]; then
    cooldown_until="$(date -d "@$u" '+%F %H:%M %Z')"
  fi
fi

status_of(){ # job logpath
  local job="$1" lf="$2"
  if [ -n "$cooldown_until" ] && is_claude "$job"; then echo "🧊 冷卻中（跳過至 $cooldown_until）"; return; fi
  [ -n "$lf" ] && [ -f "$lf" ] || { echo "尚無 log（遷移後未跑）"; return; }
  local mt; mt="$(date -d "$(stat -c %y "$lf")" '+%m-%d %H:%M' 2>/dev/null)"
  if tail -40 "$lf" | grep -qiE 'weekly limit|usage limit'; then echo "⚠️ 撞限額（$mt）"; return; fi
  echo "✅ 正常（$mt）"
}

echo "## evidencetoday cron 現況"
echo
if [ -n "$cooldown_until" ]; then echo "> 🧊 **帳號冷卻中**：claude 型 job 跳過至 $cooldown_until。"; else echo "> 帳號未在冷卻。"; fi
echo
echo "| 名稱 | 台北時間 | 模型 | 現況 |"
echo "|---|---|---|---|"

grep -vE '^\s*(#|$|[A-Z_]+=)' "$CRON_FILE" | while IFS= read -r line; do
  read -ra F <<< "$line"
  [ "${#F[@]}" -ge 8 ] || continue
  job=""; logp=""
  for ((i=5; i<${#F[@]}; i++)); do
    case "${F[i]}" in
      *bootstrap.sh)
        s="${F[i+1]:-}"; a="${F[i+2]:-}"
        if [[ "$s" == draft-cron.sh && -n "$a" && "$a" != ">>"* && "$a" != "2>&1" ]]; then job="$s $a"; else job="$s"; fi ;;
      ">>"|">") logp="${F[i+1]:-}";;
    esac
  done
  [ -n "$job" ] || continue
  printf '| %s | %s | %s | %s |\n' \
    "$(label_of "$job")" \
    "$(taipei_desc "${F[0]}" "${F[1]}" "${F[2]}" "${F[3]}" "${F[4]}")" \
    "$(model_of "$job")" \
    "$(status_of "$job" "$logp")"
done

echo
echo "_排程：/etc/cron.d/evidencetoday｜log：$LOG_DIR/｜邏輯：ops/（bootstrap.sh→claude-run.sh）。詳見 ops/README.md。_"
