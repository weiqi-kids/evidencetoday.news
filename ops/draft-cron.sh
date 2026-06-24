#!/usr/bin/env bash
# 半自動發布「✅ 核准閘」出草稿端（本日有據 evidencetoday.news）
#   draft-cron.sh <articles|ingredients|myths|news>
#
# 比照 news 全管線撰寫，但**不發布**：在 src/content/<type>/ 原地撰寫並跑真 gate（沿用既有 gate），
# 過了再由 wrapper 搬進暫存區 $PENDING_DIR/<type>/<slug>/、把摘要＋全文發到對應 Slack 頻道、
# 記下「摘要訊息」的 ts 作為核准錨點，最後 git 清回乾淨（main 不留草稿）。
# 之後 publish-approved.sh 讀到 ✅ 才真正發布。
#
# 安裝（crontab；UTC 寫死，與既有 cron 錯開。範例：四型分日/分時，避免同時佔資源）：
#   CRON_TZ=UTC
#   17 22 * * * .../draft-cron.sh news        >> /tmp/evidencetoday-draft-news.log 2>&1   # 台北每日 06:17
#   30 3  * * 1 .../draft-cron.sh articles    >> /tmp/evidencetoday-draft-art.log  2>&1   # 台北週一 11:30
#   30 3  * * 3 .../draft-cron.sh ingredients >> /tmp/evidencetoday-draft-ing.log  2>&1   # 台北週三 11:30
#   30 3  * * 5 .../draft-cron.sh myths       >> /tmp/evidencetoday-draft-myth.log 2>&1   # 台北週五 11:30
#
# 除錯（跳過 claude，直接拿一個既有檔當「假草稿」驗證 搬移+發 Slack+meta 全流程）：
#   DRAFT_TEST_FILE=src/content/articles/xxx.mdx .../draft-cron.sh articles
set -uo pipefail

export PATH="/root/.local/bin:/snap/bin:/usr/local/bin:/usr/bin:/bin"
export TZ="Asia/Taipei"
export IS_SANDBOX=1

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gate-lib.sh
source "$SELF_DIR/gate-lib.sh"

TYPE="${1:-}"
CH="$(gate_channel "$TYPE" 2>/dev/null)" || true
EXT="$(gate_ext "$TYPE" 2>/dev/null)" || true
if [ -z "$TYPE" ] || [ -z "$CH" ] || [ -z "$EXT" ]; then
  echo "[draft] 用法：draft-cron.sh <articles|ingredients|myths|news>"; exit 2
fi
LABEL="$(gate_label "$TYPE")"
CONTENT_SUBDIR="src/content/$TYPE"
DRAFT_TEST_FILE="${DRAFT_TEST_FILE:-}"
cd "$REPO"

echo "===== [draft:$TYPE] $(date '+%F %T %Z') 開始 ====="
: # main 已由 ops/bootstrap.sh 同步（repo 內腳本勿自我 pull）

# ── 把一個「已過 gate 的 src 檔」搬進暫存區 + 發按鈕訊息 + 存 Worker + 寫 meta ─────
# 預覽走 modal（草稿全文存 Worker KV），不再貼 thread；核准/退稿走按鈕。
stage_and_notify() {  # <src_content_file>
  local src="$1" slug stagedir id title desc nsrc gateline ts
  slug="$(basename "$src" ".$EXT")"
  stagedir="$PENDING_DIR/$TYPE/$slug"
  mkdir -p "$stagedir"
  cp "$src" "$stagedir/content.$EXT"
  id="$(gate_id "$TYPE" "$slug")"
  title="$(grep -m1 -E '^title:' "$src" | sed -E 's/^title:[[:space:]]*//; s/^["'\'']//; s/["'\'']$//')"
  [ -z "$title" ] && title="$slug"
  desc="$(grep -m1 -E '^(description|excerpt|summary):' "$src" | sed -E 's/^[a-z]+:[[:space:]]*//; s/^["'\'']//; s/["'\'']$//' | cut -c1-200)"
  nsrc="$(grep -cE 'https?://' "$src")"
  gateline="來源約 ${nsrc} 處連結　•　已過 gate：content:audit + build$( [ -n "$(gate_typecheck "$TYPE")" ] && echo " + $(gate_typecheck "$TYPE")" )　•　$(date '+%Y-%m-%d')"

  ts="$(gate_post_buttons "$CH" "$id" "$LABEL" "$title" "$desc" "$gateline")" || ts=""
  if [ -n "$ts" ]; then
    gate_put_draft "$id" "$TYPE" "$slug" "$title" "$desc" "$CH" "$ts" "$stagedir/content.$EXT" \
      || echo "[draft] ⚠️ $slug 存 Worker 失敗（預覽會顯示草稿不存在；核准仍可運作）"
  else
    echo "[draft] ⚠️ $slug 發按鈕訊息失敗；草稿留在 $stagedir（meta 無 slack_ts，publish 會略過直到補上）"
  fi
  jq -nc \
    --arg id "$id" --arg type "$TYPE" --arg slug "$slug" --arg title "$title" \
    --arg summary "$desc" --arg ch "$CH" --arg ts "${ts:-}" \
    --argjson created "$(date '+%s')" \
    '{id:$id,type:$type,slug:$slug,title:$title,summary:$summary,gate:"audit+build+typecheck",created_ts:$created,channel:$ch,slack_ts:$ts}' \
    > "$stagedir/meta.json"
  echo "[draft] ✅ 已暫存並發按鈕：$LABEL/$slug（ts=${ts:-none}）"
}

# ── 除錯捷徑：拿既有檔當假草稿，驗證 搬移+Slack+meta+（後續 publish）全流程 ──────────
if [ -n "$DRAFT_TEST_FILE" ]; then
  echo "[draft] DRAFT_TEST_FILE 模式：以 $DRAFT_TEST_FILE 當假草稿（不跑 claude）"
  [ -f "$DRAFT_TEST_FILE" ] || { echo "[draft] 找不到 $DRAFT_TEST_FILE"; exit 1; }
  stage_and_notify "$DRAFT_TEST_FILE"
  echo "===== [draft:$TYPE] 結束（測試模式）====="
  exit 0
fi

# ── 撰寫 prompt（型別專屬選題 + 共用撰寫/配圖/審核/gate + 「存檔不發布」結尾）───────────
COMMON_RULES="$(cat <<'RULES'
【撰寫品質｜比照 news 全管線】每篇：①平行撰寫（多篇時各派一個 Agent 同訊息並行）；②配圖每篇 1 封面+2 內文圖，先圖庫後生成、人物一律台灣人，封面寫 frontmatter heroImage/coverAlt/coverImageCredit、內文 2 張嚴格用 `![<credit>](<full> "<creditUrl>")`（unsplash/pexels 開頭），URL 先 curl -sI 驗 200，**嚴禁本地行內圖 `](images/...)`**（細節見 docs/playbooks/editor-images.md）；③來源鐵律：引用一律寫進 frontmatter 結構化 references（每筆 {title,type,url}，type 用 schema 列舉值，url 為可點 http(s)），至少 1 筆含 url；④動態審核委員會多輪修稿（每角色派 Agent 並行），連續 3 輪未收斂才停。
【YMYL 鐵則】台灣繁體中文、禁中國用語、無醫療承諾/具體醫療建議、禁聳動；tags 禁含「/」；**禁 AI 模板開頭**（我一直覺得/我最近/老實講/朋友最常問我/我發現/我觀察）與 AI 句型（不是…而是/不只是…更是/換句話說/真正的問題是）——開頭第一句直接給具體價值。
【日期】本機已 TZ=Asia/Taipei，系統時鐘即台灣時間，直接 `date '+%Y-%m-%d'`，**切勿再 +8**。
RULES
)"

STAGE_ENDING="$(cat <<ENDING
【過 gate｜硬性，未過該篇不得留下】依序在 src/content/$TYPE/ 原地跑：pnpm content:audit（命中必改到 pass）$( [ -n "$(gate_typecheck "$TYPE")" ] && echo " → pnpm $(gate_typecheck "$TYPE")" ) → pnpm build 零錯誤。某篇任一 gate 過不了就把該篇從 src 移除、不要留。
【**重要：只存檔、絕不發布**】通過 gate 的文章就**留在 src/content/$TYPE/<slug>.$EXT**（檔名 slug 用該類型慣例），**不要 git add／commit／push**。發 Slack、搬暫存區、清工作樹都由外層 wrapper 處理，你只要把「過 gate 的成品」留在 src 對應目錄即可。$( [ "$TYPE" = "news" ] && echo "processed-sources.json 照常更新（避免重複選題）；wrapper 會單獨提交它。" )
【收尾】stdout 印出本次留在 src/content/$TYPE/ 的新檔清單（每行一個檔名）與一句摘要。沒有可發的就什麼都別留、印「無新草稿」。
ENDING
)"

case "$TYPE" in
  news)
    SELECT_BLOCK="撰寫趨勢文章。請依本 repo 的 AGENTS.md「撰寫趨勢文章」與 docs/news_sop.md 執行完整管線：Phase 1 用 WebSearch 跑 data/news-automation-config.json 的查詢建素材池（某組 allowed_domains 被封鎖回 400 整組全滅就記錄略過）；去重比對 data/processed-sources.json（已處理跳過，素材池空則靜默結束，印「無新草稿」）；列既有檔用 ls/Glob 勿 Read 目錄；Phase 2 執行 node scripts/audience-insights.mjs 讀三桶（topicCandidates 併素材池標 internal-demand、writingDirectives 注入撰文、siteOptimizations 收進 run summary 不自動改既有頁）；五維度加權 >=5.0 選題、同主題分組、高分(>=7.0)可單獨成篇，產 n 份工單。" ;;
  articles|ingredients|myths)
    SELECT_BLOCK="撰寫常青${LABEL}內容（collection=$TYPE）。請依 docs/content-guide.md（與 $( [ "$TYPE" = myths ] && echo 'docs/playbooks/news-article.md 之外的 myths 簡化版型規範、發布前 pnpm check:myths' || echo "$TYPE 既有篇章慣例" )）撰寫。選題來源：①先 node scripts/audience-insights.mjs 讀三桶，取 topicCandidates 中與 $TYPE 相關、demandScore 高者；②對近 7 天排名 5–15 且有曝光的 query，用 WebSearch 看前 3 名競品頁找「該談而我們還沒有」的常青主題缺口；③站內既有頁的延伸/補完。**只做常青內容，不要寫成新聞稿**；列既有檔用 ls/Glob 勿 Read 目錄、避免與既有 slug 重複。本輪挑 1–2 個最高 ROI 主題成篇（寧少勿濫，YMYL）。" ;;
esac

PROMPT="你是本日有據 evidencetoday.news 的「${LABEL}半自動撰寫引擎」。本次只負責**出草稿**，不負責發布。

${SELECT_BLOCK}

${COMMON_RULES}

${STAGE_ENDING}"

claude -p "$PROMPT" --model claude-sonnet-4-6 --dangerously-skip-permissions 2>&1 \
  || echo "[draft] claude 執行失敗（仍續行處理已產出的草稿，如有）"

# ── wrapper 後處理：把 src 新檔搬進暫存區 + 發 Slack ──────────────────────────────
mapfile -t NEW_FILES < <(git status --porcelain -- "$CONTENT_SUBDIR" | awk '/^\?\?/{print $2}')
if [ ${#NEW_FILES[@]} -eq 0 ]; then
  echo "[draft] 本次無新草稿（src/content/$TYPE/ 無未追蹤新檔）"
else
  echo "[draft] 偵測到 ${#NEW_FILES[@]} 篇新草稿，逐一暫存+通知"
  for f in "${NEW_FILES[@]}"; do stage_and_notify "$f"; done
fi

# news：保留 processed-sources.json 更新（避免重複選題），單獨提交
if [ "$TYPE" = "news" ] && ! git diff --quiet -- data/processed-sources.json 2>/dev/null; then
  git add data/processed-sources.json
  git commit -q -m "chore(news): 標記來源已處理（草稿暫存，待核准發布）" && git push origin main \
    && echo "[draft] processed-sources.json 已提交" || echo "[draft] processed-sources.json 提交/push 失敗"
fi

# 清工作樹：只還原本腳本會動到的 src/content/（草稿已搬暫存區）與 data/processed-sources.json；
# 不碰 ops/ workers/ docs/ 等其他未提交變更（避免無差別 stash 吃掉不相關的編輯）。
if [ -n "$(git status --porcelain -- src/content data/processed-sources.json)" ]; then
  echo "[draft] 清理 src/content 殘留（草稿已搬暫存區；不動其他未提交變更）"
  git checkout -- src/content data/processed-sources.json 2>/dev/null || true
  git clean -fdq -- src/content 2>/dev/null || true
fi

echo "===== [draft:$TYPE] $(date '+%F %T %Z') 結束 ====="
