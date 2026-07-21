#!/usr/bin/env bash
# sitemap 提交 + 索引覆蓋率監測 cron 包裝（本日有據 evidencetoday.news）
#
# 為何需要：GSC 從未提交過 sitemap → 2026-06-23 實測約 200 頁內容僅 26 頁有曝光，
# 整批 myths/ingredients「URL is unknown to Google」。提交後 Google 會週期性重抓，
# 自動發現新頁。本 cron 每週重 ping 一次並把覆蓋率寫進 log，方便追蹤 26→? 的回補。
#
# 安裝（crontab）：
#   0 1 * * 1 /root/.config/evidencetoday-news/sitemap-submit.sh >> /tmp/evidencetoday-sitemap.log 2>&1
#   （台北週一 09:00 = UTC 週一 01:00；Vixie cron 不支援 CRON_TZ，故時間以 UTC 寫死。）
#
# 前置：gcloud 服務帳號 ga4-insights@yaocare 已 activate；binary 在 /snap/bin。
# 提交 sitemap 需 webmasters 寫入 scope，由 scripts/sitemap-submit.mjs 就地取得（不放寬唯讀流程）。

export PATH="/snap/bin:/usr/local/bin:/usr/bin:/bin"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1

echo "===== sitemap submit $(date -u '+%Y-%m-%dT%H:%M:%SZ') ====="
node scripts/sitemap-submit.mjs

echo "----- index coverage 快照 -----"
node scripts/index-coverage.mjs
