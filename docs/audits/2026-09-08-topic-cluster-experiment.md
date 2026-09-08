# 主題叢集實驗 — 投藥前基線與對照組污染紀錄

> 這是**實驗記錄檔**，不是指令層文件。這裡的數字是「某個時間點量到的讀數」，
> 本來就該是快照、本來就會過期——那正是它存在的目的。
> 每一筆都標了量測日與量測指令，複查時重跑同一道指令再比。

## 實驗要回答什麼

1. 在同一主題上反覆用力（叢集），能不能提高收錄率與排名？
2. 舊文到底該不該重寫？——若對照 hub **完全沒被修改**卻也跟著上升，代表舊文不必重寫，缺的是周邊。

## 設計

- **投藥組**：7 篇新稿，publishDate 2026-09-10 ～ 09-16，每天一篇。
  `creatine-creatinine-kidney-checkup-red-flag`、`krill-oil-anticoagulant-can-i-take-it`、
  `nattokinase-anticoagulant-two-opposite-risks`、`colostrum-supplement-kids-immunity-worth-it`、
  `taurine-energy-drinks-how-much-is-too-much`、`oral-glutathione-whitening-does-it-work`、
  `rhodiola-altitude-sickness-and-fatigue-evidence`
- **對照 hub**：`import-melatonin-taiwan-customs`、`black-fungus-anticoagulant-bleeding-risk`

## ⚠️ 對照組已污染（2026-09-08）

**站主於 2026-09-08 決定為 `black-fungus-anticoagulant-bleeding-risk` 補 `relatedIngredients` 內鏈**，
推翻先前「兩個 hub 一個字都不要改」的設計。

原因：該頁填了 `relatedArticles` 卻把 `relatedIngredients` 留空，而 `[slug].astro` 的邏輯是
「只要任一 related 欄位有值就整組關掉自動推薦」——所以它的「相關成分」區是**必定空白**的
（見 [`2026-09-08-ingredients-crosscheck.md`](./2026-09-08-ingredients-crosscheck.md) 發現 3）。

**讀數據時務必據此調整解釋**：

- `black-fungus` 此後的變化＝**叢集效果 ＋ 內鏈效果**，兩者無法分離。它不再能回答「舊文該不該重寫」。
- `import-melatonin-taiwan-customs` **仍是乾淨的對照組**（2026-09-08 的錨點 CTR 調查結論是「內容不要改」，
  見 [`2026-09-08-melatonin-anchor-ctr.md`](./2026-09-08-melatonin-anchor-ctr.md)），
  問題 2 改由它單獨承擔。
- 若複查時 `black-fungus` 明顯上升而 `import-melatonin` 沒有，**不可直接歸因於叢集**——
  先排除內鏈這個混淆變項。

## 投藥前基線（量測日 2026-09-08）

投藥組 7 篇當日**一篇都尚未上線**（最早 09-10），因此收錄率無從量測。
這不是壞消息，是時間還沒到——複查時要把「還沒上線」與「上線了沒收錄」分清楚。

以下為 `pnpm perf` 的 GSC 近 28 天讀數（視窗 2026-08-08 ～ 09-05）：

| 對照指標 | 曝光 | 排名 | CTR |
|---|---|---|---|
| 查詢「吃抗凝血劑可吃黑木耳嗎」 | 154 | 8.7 | 0.6% |
| hub `black-fungus-anticoagulant-bleeding-risk` | 378 | 6.8 | 1.3% |
| hub `import-melatonin-taiwan-customs` | 4,324 | 4.3 | 7.3% |

前一組基線（交接文件記載，量測日較早）：該查詢 136 曝光／排名 8.8／CTR 0.7%。
曝光小漲、排名幾乎沒動，屬正常漂移。

> ⚠️ `import-melatonin-taiwan-customs` 的 GSC page 維度另有四筆 `#` 錨點列。
> 那是「跳至章節」sitelinks，**曝光與母頁重複計算、CTR 不可判讀**，複查時不要拿它們做判斷。

## 複查怎麼做（約 2026-10-07 之後，7 篇全上線滿三週再跑）

1. `pnpm index:coverage` — 看那 7 篇的收錄率。**要看依發布月份的分佈，不要只看總數**；
   最近一兩個月偏低是正常的。
2. `pnpm perf` — 比上表三個指標。
3. 判讀：
   - 問題 1（叢集有沒有用）：看 7 篇自己的收錄率與曝光。
   - 問題 2（舊文該不該重寫）：**只看 `import-melatonin-taiwan-customs`**，
     它是唯一沒被修改過的 hub。它若在完全沒動的情況下跟著上升 → 舊文不必重寫，缺的是周邊。
   - `black-fungus` 的變化只能當輔助佐證，不能單獨當結論。
4. 教訓提醒：**剛上線的稿不能當「表現差」的證據**（曾用發布只有幾天的稿判定某題型無效，
   十天後數字翻了兩倍多）。
