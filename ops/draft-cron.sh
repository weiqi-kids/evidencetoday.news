#!/usr/bin/env bash
# 半自動發布「✅ 核准閘」出草稿端（本日有據 evidencetoday.news）
#   draft-cron.sh <articles|ingredients|myths|news|podcast|videos>
#
# 兩類草稿（型別→分流見 gate-lib.sh gate_is_script）：
#   ▸ 頁面型 news/articles/ingredients/myths：比照全管線在 src/content/<type>/ 原地撰寫並跑真 gate
#     （content:audit / 型別 gate / build），過了搬進暫存區 $PENDING_DIR/<type>/<slug>/、發按鈕、清工作樹；
#     核准後 publish-approved.sh 才 cp 進 src→build→commit→push 真正發布上站。
#   ▸ 稿件型 podcast/videos：產「給真人錄/拍的稿子」，**不進 repo、不建站內頁、不跑 build**。
#     claude 寫到 repo 外 scratch → wrapper 搬暫存區、發按鈕；核准後 publish 只回「已採用，請錄/拍」不發布。
#
# 比照 news 全管線但**不發布**：claude 只把成品留在指定位置，搬暫存／發 Slack／清理都由 wrapper 處理。
# 之後 publish-approved.sh 讀到 ✅ 才依型別處置（頁面型發布上站／稿件型回採用）。
#
# 安裝（crontab；UTC 寫死，與既有 cron 錯開。一律經 ops/bootstrap.sh 啟動）：
#   17 22 * * * .../draft-cron.sh news        # 台北每日 06:17（門檻制，不夠不發）
#   30 3  * * 1 .../draft-cron.sh articles    # 台北週一 11:30
#   30 3  * * 2 .../draft-cron.sh podcast     # 台北週二 11:30（1 份講稿）
#   30 3  * * 3 .../draft-cron.sh ingredients # 台北週三 11:30
#   30 3  * * 4 .../draft-cron.sh videos      # 台北週四 11:30（3 份短影音腳本）
#   30 3  * * 5 .../draft-cron.sh myths       # 台北週五 11:30
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
  echo "[draft] 用法：draft-cron.sh <articles|ingredients|myths|news|podcast|videos>"; exit 2
fi
LABEL="$(gate_label "$TYPE")"
CONTENT_SUBDIR="src/content/$TYPE"
DRAFT_TEST_FILE="${DRAFT_TEST_FILE:-}"
IS_SCRIPT=0; gate_is_script "$TYPE" && IS_SCRIPT=1
# 稿件型專屬：repo 外 scratch（claude 寫稿處）＋近期主題去重 ledger（主機，不進 repo）
SCRATCH=""; USED_TOPICS_FILE="$CONF_DIR/used-topics-$TYPE.txt"
cd "$REPO"

echo "===== [draft:$TYPE] $(date '+%F %T %Z') 開始 ====="
: # main 已由 ops/bootstrap.sh 同步（repo 內腳本勿自我 pull）

# ── 把一個「成品檔」搬進暫存區 + 發按鈕訊息 + 存 Worker + 寫 meta ────────────────────
# 頁面型 src 為已過 gate 的 src/content 檔；稿件型 src 為 scratch 內的稿子。
# 預覽走 /gate/preview（草稿全文存 Worker KV）；核准/退稿走按鈕。
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

# ── 稿件型（podcast/videos）：把一份稿直接發到頻道當通知（無核准閘、不進 repo、不存 Worker）──
post_script_file() {  # <md_file>
  local f="$1" title body
  title="$(grep -m1 -E '^title:' "$f" | sed -E 's/^title:[[:space:]]*//; s/^["'\'']//; s/["'\'']$//')"
  [ -z "$title" ] && title="$(basename "$f" .md)"
  # 去掉 frontmatter（第 2 個 --- 之後為正文）
  body="$(awk '/^---[[:space:]]*$/{c++; next} c>=2{print}' "$f")"
  if printf '📝 *%s新稿*：%s\n\n%s' "$LABEL" "$title" "$body" | "$REPO/ops/slack-notify.sh" "$CH" >/dev/null; then
    printf '%s\t%s\n' "$(date '+%Y-%m-%d')" "$title" >> "$USED_TOPICS_FILE"
    echo "[draft] ✅ 已發 $LABEL 頻道：$title"
  else
    echo "[draft] ⚠️ 發送失敗：$title（未記 used-topics，下次可能重複）"
  fi
}

# ── 除錯捷徑：拿既有檔當假草稿，驗證 搬移+Slack+meta+（後續 publish）全流程 ──────────
if [ -n "$DRAFT_TEST_FILE" ]; then
  echo "[draft] DRAFT_TEST_FILE 模式：以 $DRAFT_TEST_FILE 當假草稿（不跑 claude）"
  [ -f "$DRAFT_TEST_FILE" ] || { echo "[draft] 找不到 $DRAFT_TEST_FILE"; exit 1; }
  if [ "$IS_SCRIPT" = "1" ]; then post_script_file "$DRAFT_TEST_FILE"; else stage_and_notify "$DRAFT_TEST_FILE"; fi
  echo "===== [draft:$TYPE] 結束（測試模式）====="
  exit 0
fi

# ── 撰寫 prompt（型別專屬選題 + 共用撰寫/gate + 「存檔不發布」結尾）─────────────────────
# 共用語感／YMYL 鐵則（頁面型與稿件型皆適用）
COMMON_YMYL="$(cat <<'YMYL'
【YMYL 鐵則】台灣繁體中文、禁中國用語、無醫療承諾/具體醫療建議、禁聳動；tags 禁含「/」；**禁 AI 模板開頭**（我一直覺得/我最近/老實講/朋友最常問我/我發現/我觀察）與 AI 句型（不是…而是/不只是…更是/換句話說/真正的問題是）——開頭第一句直接給具體價值。
【日期】本機已 TZ=Asia/Taipei，系統時鐘即台灣時間，直接 `date '+%Y-%m-%d'`，**切勿再 +8**。
YMYL
)"

# 頁面型專屬撰寫品質（配圖／結構化來源／審核委員會）
COMMON_RULES_PAGE="$(cat <<RULES
【撰寫品質｜比照 news 全管線】每篇：①平行撰寫（多篇時各派一個 Agent 同訊息並行）；②配圖每篇 1 封面+2 內文圖，先圖庫後生成、人物一律台灣人，封面寫 frontmatter heroImage/coverAlt/coverImageCredit、內文 2 張嚴格用 \`![<credit>](<full> "<creditUrl>")\`（unsplash/pexels 開頭），URL 先 curl -sI 驗 200，**嚴禁本地行內圖 \`](images/...)\`**（細節見 docs/playbooks/editor-images.md）；③來源鐵律：引用一律寫進 frontmatter 結構化 references（每筆 {title,type,url}，type 用 schema 列舉值，url 為可點 http(s)），至少 1 筆含 url；④動態審核委員會多輪修稿（每角色派 Agent 並行），連續 3 輪未收斂才停。
$COMMON_YMYL
RULES
)"

# 稿件型專屬撰寫品質（無配圖、無 frontmatter schema；稿末附來源）
COMMON_RULES_SCRIPT="$(cat <<RULES
【撰寫品質】口語、可直接念；把根據講清楚但不掉書袋；不需要配圖、不需要 schema frontmatter。稿末必附「參考來源」清單：每筆「標題 — 可點 http(s) 連結」。
$COMMON_YMYL
RULES
)"

# 頁面型收尾：原地過 gate + 只存不發布
STAGE_ENDING_PAGE="$(cat <<ENDING
【過 gate｜硬性，未過該篇不得留下】依序在 src/content/$TYPE/ 原地跑：pnpm content:audit（命中必改到 pass）$( [ -n "$(gate_typecheck "$TYPE")" ] && echo " → pnpm $(gate_typecheck "$TYPE")" ) → pnpm build 零錯誤。某篇任一 gate 過不了就把該篇從 src 移除、不要留。
【**重要：只存檔、絕不發布**】通過 gate 的文章就**留在 src/content/$TYPE/<slug>.$EXT**（檔名 slug 用該類型慣例），**不要 git add／commit／push**。發 Slack、搬暫存區、清工作樹都由外層 wrapper 處理，你只要把「過 gate 的成品」留在 src 對應目錄即可。$( [ "$TYPE" = "news" ] && echo "processed-sources.json 照常更新（避免重複選題）；wrapper 會單獨提交它。" )
【收尾】stdout 印出本次留在 src/content/$TYPE/ 的新檔清單（每行一個檔名）與一句摘要。沒有可發的就什麼都別留、印「無新草稿」。
ENDING
)"

# （稿件型收尾 STAGE_ENDING_SCRIPT 在 SCRATCH 建好後才定義，見下方組裝 prompt 區）

# 近期已做主題（稿件型去重，避免每週重複）
RECENT_TOPICS=""
if [ "$IS_SCRIPT" = "1" ] && [ -s "$USED_TOPICS_FILE" ]; then
  RECENT_TOPICS="【近期已做主題（勿重複，請另選）】$(tail -n 30 "$USED_TOPICS_FILE" | paste -sd '；' -)"
fi

case "$TYPE" in
  news)
    SELECT_BLOCK="撰寫趨勢文章。請依本 repo 的 AGENTS.md「撰寫趨勢文章」與 docs/news_sop.md 執行完整管線：Phase 1 用 WebSearch 跑 data/news-automation-config.json 的查詢建素材池（某組 allowed_domains 被封鎖回 400 整組全滅就記錄略過）；去重比對 data/processed-sources.json（已處理跳過，素材池空則靜默結束，印「無新草稿」）；列既有檔用 ls/Glob 勿 Read 目錄；Phase 2 執行 node scripts/audience-insights.mjs 讀三桶（topicCandidates 併素材池標 internal-demand、writingDirectives 注入撰文、siteOptimizations 收進 run summary 不自動改既有頁）；五維度加權選題。**門檻制（重要）：只有加權分數 ≥6.0 的高把握選題才成篇；當天沒有夠強的選題就什麼都別留、印「無新草稿」靜默結束（站索引率偏低，寧可零產出也不為發而發、避免稀釋網域權重）。** 同主題分組、最高分者優先，本輪至多 1 份高把握工單。" ;;
  articles)
    SELECT_BLOCK="撰寫常青文章內容（collection=articles）。請依 docs/content-guide.md 與既有篇章慣例撰寫。**選題第一順位＝擴寫已有牽引力的主題叢集**：先 node scripts/audience-insights.mjs 讀三桶、並對照已有曝光/排名的主題（如 melatonin 等目前流量引擎），把單點頁擴成「主題叢集」（補相鄰子題、強化彼此內鏈），把既有牽引力放大；新題只在沒有可擴的叢集時為輔。輔助訊號：對近 7 天排名 5–15 且有曝光的 query 看前 3 名競品找缺口。**只做常青內容、不要寫成新聞稿**；列既有檔用 ls/Glob 勿 Read 目錄、避免與既有 slug 重複。本輪挑 1–2 個最高 ROI 主題成篇（寧少勿濫，YMYL）。" ;;
  ingredients)
    SELECT_BLOCK="撰寫常青成分解析內容（collection=ingredients）。請依 docs/content-guide.md 與既有篇章慣例撰寫。**選題第一順位＝站內連結缺口**：掃站內既有文章/闢謠/趨勢中**反覆被提到、卻還沒有專屬成分頁**的成分（用 ls/Glob 列既有 ingredients、用 grep 找站內提及），優先補這些成分頁，讓站內互連更密、強化主題權威。輔助訊號：audience-insights demandScore 高、排名 5–15 競品成分頁缺口。**只做常青內容、不要寫成新聞稿**；避免與既有 slug 重複。本輪挑 1–2 個最高 ROI 成分成篇（寧少勿濫，YMYL）。" ;;
  myths)
    SELECT_BLOCK="撰寫常青闢謠內容（collection=myths，發布前過 pnpm check:myths；版型刻意簡化，照 docs/content-guide.md 與 myths 慣例，勿加延伸閱讀/更正紀錄等區塊）。**選題第一順位＝當下正在流傳的謠言**：用 WebSearch 找此刻在社群/搜尋上熱傳的健康/營養謠言或誤解（時效性高、易被搜尋與分享者），優先闢這些。輔助訊號：audience-insights demandScore、可與當天 news 爭議點互導。**只做常青內容、不要寫成新聞稿**；列既有檔用 ls/Glob 勿 Read 目錄、避免與既有 slug 重複。本輪挑 1–2 則最高 ROI 謠言成篇（寧少勿濫，YMYL）。" ;;
  podcast)
    SELECT_BLOCK="你是『喜聞樂健』Podcast 的選題＋寫手。喜聞樂健是**單人主講**的健康科普聊天節目（每集約 15 分鐘）。本次產 **1 份逐字講稿**。
【選題】用 WebSearch 找近期值得聊的熱門健康/營養話題（**健康為主、可踩社會熱點**，像泛科學那樣把硬知識講成能聊的故事）；優先能呼應站內既有深文、可在節目尾自然導流者；可參考 node scripts/audience-insights.mjs 高需求桶。
【講稿格式】單人逐字稿、可直接念。結構：開場鉤子（第一句直接拋出聽眾切身的問題或反常識點，**禁 AI 模板開頭**）→ 3–4 段主軸（每段一個小標＋口語段落，把根據講清楚）→ 收尾（一句可帶走的重點＋導流站內，如「完整整理放在本日有據的某篇」）。約 2000–2500 字。" ;;
  videos)
    SELECT_BLOCK="你是『本日有據影音』短影音的選題＋腳本寫手。題型：**以料理/食材營養小技巧為主軸，可穿插 30 秒拆解健康謠言**。本次產 **3 份各自獨立主題的短影音腳本**。
【選題】每支聚焦一個具體、可操作、可視覺化的點（某個廚房/食材動作＋為什麼，或某個正流傳的謠言＋一句到位的拆解）；避開站內既有 5 支既有主題；可參考 audience-insights 高需求桶與 myths 既有題。三支主題互不重複。
【腳本格式（每支）】時長 30–60 秒。欄位：【鉤子】（前 3 秒一句抓住）→【步驟/重點】（2–3 個短句，口語可邊做邊講）→【收尾口訣】（一句好記＋『訂閱本頻道』）→【口播逐字稿】（可直接念，約 120–180 字）→（稿末附參考來源）。" ;;
esac

# 組裝 prompt（依頁面型/稿件型挑共用規則與收尾）
if [ "$IS_SCRIPT" = "1" ]; then
  SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/etn-gen-$TYPE.XXXXXX")"
  STAGE_ENDING_SCRIPT="$(cat <<ENDING
【產出位置】把每份稿寫成獨立檔 $SCRATCH/<slug>.md，frontmatter 只放 title 與 description（一句主題說明），正文為講稿/腳本全文。slug 用英文 kebab-case、能識別主題、勿與既有重複。
【**重要：不發布、不碰 repo**】只把檔留在 $SCRATCH/，**絕不要碰 src/、不要 git add／commit／push**。發 Slack、搬暫存區都由外層 wrapper 處理。
【收尾】stdout 印出本次寫入的檔（每行一個 $SCRATCH/<slug>.md）與一句摘要。沒有可出的就什麼都別寫、印「無新草稿」。
ENDING
)"
  RULES_BLOCK="$COMMON_RULES_SCRIPT"
  ENDING_BLOCK="$STAGE_ENDING_SCRIPT"
else
  RULES_BLOCK="$COMMON_RULES_PAGE"
  ENDING_BLOCK="$STAGE_ENDING_PAGE"
fi

PROMPT="你是本日有據 evidencetoday.news 的「${LABEL}半自動撰寫引擎」。本次只負責**出草稿**，不負責發布。

${SELECT_BLOCK}

${RECENT_TOPICS}

${RULES_BLOCK}

${ENDING_BLOCK}"

claude-appi -p "$PROMPT" --model claude-sonnet-4-6 --dangerously-skip-permissions 2>&1 \
  || echo "[draft] claude 執行失敗（仍續行處理已產出的草稿，如有）"

# ── wrapper 後處理：把成品搬進暫存區 + 發 Slack ──────────────────────────────────
if [ "$IS_SCRIPT" = "1" ]; then
  # 稿件型：成品在 repo 外 scratch，不碰 git；直接發頻道當通知（無核准閘）
  mapfile -t NEW_FILES < <(find "$SCRATCH" -maxdepth 1 -type f -name '*.md' 2>/dev/null | sort)
  if [ ${#NEW_FILES[@]} -eq 0 ]; then
    echo "[draft] 本次無新稿（$SCRATCH 無 .md）"
  else
    echo "[draft] 產出 ${#NEW_FILES[@]} 份稿，逐一發到 $LABEL 頻道"
    for f in "${NEW_FILES[@]}"; do post_script_file "$f"; done
  fi
  rm -rf "$SCRATCH"
  echo "===== [draft:$TYPE] $(date '+%F %T %Z') 結束 ====="
  exit 0
fi

# 頁面型：成品在 src/content，git-detect 未追蹤新檔
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
