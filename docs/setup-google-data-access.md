# 打通 GA4 / GSC 資料存取（給非工程背景的逐步操作）

做完這一次，以後每次找 Claude 更新網站，它都能直接看到你的 Google Analytics 與 Search Console 數據，不用你再手動匯出或截圖。

**總共約 10 分鐘，分成四段。**

> **先選路線**：本文主體（第一～四段）假設你**進得去 GCP 專案 `yaocare`**，能幫既有的服務帳戶 `ga4-insights@yaocare` 產新金鑰。
> 若你**進不去 yaocare**（例如你是新接手的人、或想用自己的 Google 帳號自建），跳到文末的
> [附錄：完全自建路線](#附錄完全自建路線不使用-yaocare-服務帳戶)。自建**不需要改任何程式碼**。

---

## 先搞懂：為什麼要跑三個網站？

這是最容易卡住的地方，先講清楚：

| 網站 | 在這裡做什麼 | 比喻 |
|---|---|---|
| **Google Cloud Console** | 拿「金鑰檔」 | 打一把鑰匙 |
| **Google Analytics (GA4)** | 讓這把鑰匙能進 GA4 | 告訴 A 大樓警衛「這把鑰匙可以進」 |
| **Search Console (GSC)** | 讓這把鑰匙能進 GSC | 告訴 B 大樓警衛「這把鑰匙可以進」 |
| Claude Code 設定 | 把鑰匙交給 Claude | 把鑰匙給管家 |

**金鑰不在 GA4 或 GSC 裡面**，那兩個地方只負責「開權限」。這就是為什麼你在 GA/GSC 介面裡怎麼找都找不到金鑰。

我們要用的這把鑰匙叫做「服務帳戶」，它的名字是：

```
ga4-insights@yaocare.iam.gserviceaccount.com
```

這個帳戶**已經存在**（之前設定過），所以你只是要**幫它產一把新鑰匙**，不用從頭建立。

---

## 第一段：拿金鑰檔（Google Cloud Console）

1. 打開 <https://console.cloud.google.com/>
2. 看畫面**最上方**，有一個專案名稱的下拉選單（可能顯示別的專案名）。點它，選 **yaocare**。
   - 找不到 yaocare？點下拉選單後選「全部」分頁，用搜尋框打 `yaocare`。
3. 左上角點 **☰**（三條線）→ 找到 **IAM 與管理** → 點 **服務帳戶**
   - 英文介面是 *IAM & Admin* → *Service Accounts*
   - 或者直接開這個網址：<https://console.cloud.google.com/iam-admin/serviceaccounts>
4. 清單中找到 **ga4-insights@yaocare.iam.gserviceaccount.com**，**點它**（點 email 本身）
5. 進去後，上方有幾個分頁：詳細資料／權限／**金鑰**／指標／記錄。點 **金鑰**（英文 *KEYS*）
6. 點 **新增金鑰** → **建立新的金鑰**
   - 英文：*ADD KEY* → *Create new key*
7. 跳出視窗問格式，選 **JSON**（預設就是），點 **建立**
8. 瀏覽器會**自動下載一個 .json 檔**，檔名長得像 `yaocare-a1b2c3d4e5f6.json`

✅ 這個檔案就是鑰匙。**先放著別關**，等一下要用。

> ⚠️ 這個檔案等同密碼。不要傳到 LINE／email／聊天視窗，也不要放進網站的程式碼裡（我們的 repo 是公開的）。等一下只會貼到 Claude 的設定頁。萬一外流，回到同一個「金鑰」分頁把它刪掉就失效了。

---

## 第二段：讓鑰匙能進 GA4

1. 打開 <https://analytics.google.com/>
2. 左下角點 **齒輪圖示 ⚙️**（管理 / *Admin*）
3. 畫面會分成幾欄。找到**「資源」**那一區（英文 *Property*），點 **資源存取管理**
   - 英文：*Property access management*
4. 右上角點藍色的 **＋** → 選 **新增使用者**
5. Email 欄位貼上：
   ```
   ga4-insights@yaocare.iam.gserviceaccount.com
   ```
6. **把「通知新使用者」的勾勾取消**（那是機器帳號，寄信沒意義）
7. 角色選 **檢視者**（*Viewer*）就夠了
8. 右上角點 **新增**

✅ GA4 完成。

---

## 第三段：讓鑰匙能進 Search Console

1. 打開 <https://search.google.com/search-console>
2. 左上角資源選單，選 **evidencetoday.news**
3. 左側選單最下面點 **設定**（*Settings*）
4. 點 **使用者和權限**（*Users and permissions*）
5. 右上角點 **新增使用者**
6. Email 欄位貼上同一個：
   ```
   ga4-insights@yaocare.iam.gserviceaccount.com
   ```
7. 權限選 **完整**（*Full*）
   - 為什麼不是「受限」？因為除了讀數據，還要能自動提交 sitemap，那需要寫入權限。
8. 點 **新增**

✅ GSC 完成。

---

## 第四段：把鑰匙交給 Claude

### 4-1. 先把 JSON 轉成單行（base64）

環境變數欄位是 **`.env` 格式**（一行一個 `KEY=value`），而下載的 JSON 是**多行**的，直接貼會壞掉。所以要先轉成單行的 base64。

**Mac**：打開「終端機」，貼這一行（檔名換成你的），按 Enter：
```
base64 -i ~/Downloads/你的檔名.json | pbcopy
```

**Windows**：打開 PowerShell，貼這一行（檔名換成你的），按 Enter：
```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\你的檔名.json")) | Set-Clipboard
```

跑完**結果已經在剪貼簿裡**，畫面不會顯示東西，這是正常的。

### 4-2. 貼進環境變數

⚠️ 官方文件明講這個設定**沒有直接網址**（*There's no settings page or direct URL for the selector*），只能用點的：

1. 開 <https://claude.ai/code>
2. 看**訊息輸入框正上方那一排**，有一個**雲朵圖示**，上面寫著環境名稱（通常是 **Default**）。**點它。**
3. 選單跳出後，在 **Cloud** 區塊找到你的環境那一列，**滑鼠移上去**，右邊會出現**齒輪圖示 ⚙️**，點它。
4. 找到 **Environment variables** 那個框，打上這一行（`=` 後面貼剛剛複製的 base64）：
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY=貼上base64
   ```
   變數名要一字不差，全大寫、用底線。
5. 儲存。

### 4-3. 開新 session（最容易漏的一步）

存檔後**必須開一個新的 session**。環境變數只在容器啟動時讀一次，**你目前開著的對話讀不到新設定**。

✅ 完成。

---

## ⚠️ 「不要貼在這裡」到底是指哪裡？

這是最容易誤解的一點，說清楚：

| 地方 | 能不能貼金鑰 | 原因 |
|---|---|---|
| **和 Claude 對話的視窗** | ❌ 絕對不要 | 對話內容可能被寫進 commit 或 log，而本 repo 是公開的 |
| **環境變數設定頁**（第四段講的那個） | ✅ 就是要貼這裡 | 不進 repo、不進對話，是這個平台唯一該放憑證的位置 |

兩者是**不同的畫面**。判斷法：**「你打字給 Claude 看」的地方不要貼；「設定頁的欄位」就是該貼的地方。**

### 但要知道它的安全等級

環境變數欄位**不是加密保管庫**。官方文件明講：*"Anyone who uses the environment can read the values, and cloud environments have no dedicated secrets store"*——**任何能使用這個環境的人都讀得到值**。

對本站的實務結論：

- 這把鑰匙只是唯讀分析數據，帳號只有你在用，風險可接受。
- 想再收斂範圍，就把 GSC 權限從「完整」降成「**受限**」（唯讀）。代價是 `pnpm sitemap:submit` 不能自動提交 sitemap，其餘 `perf` / `insights` / `index:coverage` 全部照常。
- 金鑰隨時可在 GCP Console 撤銷、重發，發現不對就換一把。

---

## 怎麼確認成功了？

設定完環境變數後，**開一個新的 session**（環境變數在容器啟動時注入，舊 session 讀不到），叫它跑：

```
pnpm check:google
```

這支診斷指令會逐項檢查金鑰、token、GA4、GSC，並把每個失敗**直接對應回是哪一段沒做好**，不用你自己猜。全部 ✅ 就代表打通了。

也可以直接跑 `pnpm perf` 看實際數據：

- **成功**：會印出使用者數、工作階段、Top 頁面、搜尋查詢與排名等一堆數字
- **失敗**：會印「GA4 無回應」「GSC 無資料」

失敗的話，照這個順序檢查：

| 症狀 | 多半是哪裡沒做好 |
|---|---|
| GA4 有數字、GSC 沒有 | 第三段沒做，或權限選了「受限」 |
| GSC 有數字、GA4 沒有 | 第二段沒做 |
| 兩邊都沒有 | 第四段的變數名稱打錯、base64 沒貼完整，或存檔後沒開新 session |

把 `pnpm perf` 的輸出貼給 Claude，它能直接判斷是哪一段的問題。

---

## 附註：給工程背景的人

- 變數接受 base64（`base64 -w0 key.json`）、原始 JSON、或 `GOOGLE_APPLICATION_CREDENTIALS` 檔案路徑。在 Claude Code on the web 的設定欄位**只能用 base64**——該欄位是 `.env` 格式，多行 JSON 會被截斷；在 CI secret 或本機 shell 這類支援多行的地方，原始 JSON 可直接用。
- 認證邏輯在 `scripts/lib/insight-fetch.mjs` 的 `getToken()`，優先序為「服務帳號金鑰 → gcloud」，走 JWT-bearer flow（RFC 7523），無新增相依套件。
- 主機 cron 仍走 `gcloud auth print-access-token`，這次改動不影響它。
- 技術細節見 `docs/playbooks/audience-insights.md`。

---

# 附錄：完全自建路線（不使用 yaocare 服務帳戶）

適用於**進不去 GCP 專案 `yaocare`**、想用自己的 Google 帳號從頭建一把鑰匙的人。

## 為什麼不必改程式碼

`getToken()` 走金鑰那條路時，只讀 JSON 裡的 `client_email` 與 `private_key`
（`scripts/lib/insight-fetch.mjs`）；`insight-constants.mjs` 的 `SERVICE_ACCOUNT` 常數**只在
gcloud 後備路徑**當 `--account` 參數用。**因此任何 GCP 專案的服務帳戶都能直接使用**，
只要它在 GA4／GSC 被授權即可。

真正寫死、必須對得上的是這兩個識別碼（`insight-constants.mjs`）：

| 常數 | 值 | 什麼情況才需要改 |
|---|---|---|
| `GA4_PROPERTY` | `properties/541692554` | 只有在你**新建 GA4 資源**時（連帶 `src/data/analytics.ts` 的 `MEASUREMENT_ID`） |
| `GSC_SITE` | `sc-domain:evidencetoday.news` | 只要 GSC 資源類型選「網域」就永遠對得上，不必改 |

## 甲、建立你自己的服務帳戶（Google Cloud Console）

1. 打開 <https://console.cloud.google.com/>，用你要長期使用的 Google 帳號登入
2. 最上方專案下拉選單 → **新增專案** → 名稱隨意（建議 `evidencetoday`）→ 建立
3. **啟用兩個 API**（漏掉這步是最常見的失敗原因——金鑰有了但呼叫 API 會被拒）：
   - <https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com> → **啟用**
   - <https://console.cloud.google.com/apis/library/searchconsole.googleapis.com> → **啟用**
   - 兩個都要確認頁面上方顯示的是你剛建的專案
4. ☰ → **IAM 與管理** → **服務帳戶** → **建立服務帳戶**
   - 名稱填 `etn-insights`，按「建立並繼續」
   - **「授予這個服務帳戶專案存取權」那一步直接跳過**（按「繼續」）——權限是在 GA4／GSC 裡給的，不是在 GCP 裡給
   - 按「完成」
5. 記下它的 email，格式是 `etn-insights@<你的專案ID>.iam.gserviceaccount.com`，**後面兩段都要貼它**
6. 點進該服務帳戶 → **金鑰** 分頁 → **新增金鑰** → **建立新的金鑰** → **JSON** → 建立
   → 瀏覽器自動下載 `.json` 檔

> ⚠️ 這個 `.json` 等同密碼。不要傳到聊天視窗、不要 commit（本 repo 為 public）。
> 外流時回到同一個「金鑰」分頁刪掉即失效。

## 乙、拿下 Search Console 擁有者權限（靠 DNS，不需要任何人同意）

本站的 GSC 資源是**網域層級**（`sc-domain:`），驗證方式是 DNS TXT。
**只要你能改 `evidencetoday.news` 的 DNS，你就能自己成為擁有者**，
而且看得到 Google 保留的全部歷史資料（約 16 個月）——不是從零開始。

1. 打開 <https://search.google.com/search-console>
2. 左上角資源選單 → **新增資源**
3. ⚠️ **關鍵**：選**左邊那欄「網域」**，不是右邊的「網址前置字元」。
   選錯會產生 `https://evidencetoday.news/` 這種資源，識別碼與程式裡的 `sc-domain:` 對不上，腳本會抓不到資料。
4. 輸入 `evidencetoday.news`（不要加 `https://`、不要加 `www.`）→ 繼續
5. 畫面給你一段 TXT 紀錄，長得像 `google-site-verification=xxxxxxxx`，複製它
6. 到你的網域註冊商後台，新增一筆 DNS 紀錄：

   | 欄位 | 填什麼 |
   |---|---|
   | 類型 | `TXT` |
   | 名稱／主機 | `@`（代表根網域；有些後台要留空或填 `evidencetoday.news`） |
   | 值 | 剛複製的 `google-site-verification=...` 整串 |
   | TTL | 預設即可 |

   ⚠️ 這是**新增**，不要覆蓋既有的 TXT（SPF、DMARC 等），同一個網域可以有多筆 TXT。
7. 回 Search Console 按 **驗證**。DNS 生效通常幾分鐘，偶爾要等數小時；失敗就等一下再按一次。
8. 驗證成功後：左側 **設定** → **使用者和權限** → **新增使用者**
   → 貼上甲-5 記下的服務帳戶 email → 權限選 **完整**（Full）→ 新增
   - 為什麼是「完整」不是「受限」：`pnpm sitemap:submit` 需要寫入權限。

> 若這個網域資源**早就存在**（別人建的），你的 DNS 驗證會讓你成為**另一位擁有者**，
> 看到的是同一份資料，不會產生重複資源，也不會影響原本的人。這正是我們要的結果。

## 丙、GA4（唯一沒有替代方案的一環）

GA4 **沒有** DNS 這種後門。資源 `properties/541692554` 只能由現任**管理員**把人加進去。兩條路：

| 做法 | 代價 | 建議 |
|---|---|---|
| **請現任管理員把你加成「管理員」**，你再自己把服務帳戶加成「檢視者」 | 無 | ✅ 推薦。歷史數據完整保留，程式碼零改動 |
| 自己新建一個 GA4 資源 | **歷史數據歸零**，且要改 `src/data/analytics.ts` 的 `MEASUREMENT_ID` 與 `insight-constants.mjs` 的 `GA4_PROPERTY`，重新部署後才開始累積 | ⚠️ 只有在真的聯絡不到原管理員時才做 |

注意「檢視者」不能再加人——若對方只把你加成檢視者，你仍無法把服務帳戶加進去。
**要請對方明確給「管理員」**。

拿到管理員權限後：GA4 → 左下角 **⚙️ 管理** → 「資源」欄的 **資源存取管理**
→ 右上角藍色 **＋** → **新增使用者** → 貼服務帳戶 email → **取消「通知新使用者」勾選**
→ 角色選 **檢視者** → 新增。

## 丁、把金鑰交給 Claude

與主文第四段完全相同：把甲-6 下載的 `.json` 用記事本打開、全選複製，
貼進 Claude Code on the web 環境設定的環境變數 `GOOGLE_SERVICE_ACCOUNT_KEY`（值就是整份 JSON）。

## 驗證

新開一個 session 跑 `pnpm perf`：

| 結果 | 代表 |
|---|---|
| 兩邊都有數字 | 全部完成 |
| GA4 有、GSC 沒有 | 乙段沒做完，或資源類型選成「網址前置字元」（第 3 步） |
| GSC 有、GA4 沒有 | 丙段還沒完成——多半是還沒拿到管理員權限 |
| 兩邊都沒有 | 甲-3 的兩個 API 沒啟用，或 `GOOGLE_SERVICE_ACCOUNT_KEY` 名稱打錯／JSON 沒貼完整 |

**只完成乙段就已經有價值**：`pnpm perf` 會印出 GSC 那半（曝光、點擊、排名、Top 查詢），
足以做選題與 SEO 決策；GA4 那半可以之後再補。
