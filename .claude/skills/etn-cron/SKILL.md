---
name: etn-cron
description: 顯示 evidencetoday.news 全部 cron 自動化的現況表（名稱 / 台北時間 / 模型 / 現況）。當使用者問「cron 狀況、排程、自動化跑得如何、有沒有撞限額、哪個任務掛了、冷卻旗標」時用。
---

# /etn-cron — evidencetoday cron 現況

跑 `ops/cron-status.sh`（唯讀、不改狀態）並把它的 markdown 表原樣呈現給使用者。

## 步驟

1. 在 repo 根目錄執行：`bash ops/cron-status.sh`（或 `/root/evidencetoday.news/ops/cron-status.sh`）。
2. 直接把輸出那張表呈現出來——欄位已是「名稱 / 台北時間 / 模型 / 現況」。
3. 視情況補一句白話：
   - 出現 **🧊 冷卻中** 或 **⚠️ 撞限額**：營運帳號 `claude-appi` 撞週限額時，claude 型 job 會被 `bootstrap.sh` 冷卻閘跳過；純資料型（核准→發佈 / sitemap / Google News 監測）照跑；reset 後自動恢復。
   - 某 claude 型 job 顯示 **「尚無 log（遷移後未跑）」** 屬正常（2026-06-30 cron 從 user crontab 搬到 `/etc/cron.d/evidencetoday`，新 `/var/log/evidencetoday/` 尚未累積該 job 的 log），不是故障。

## 背景

帳號分工、排程、冷卻機制詳見 `ops/README.md` 與 `CLAUDE.md`「§ 自動化與帳號」。模型對照（哪個 job 用 Sonnet／無 claude）維護在 `ops/cron-status.sh` 的 `model_of()`。
