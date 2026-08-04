# 打通 GA4 / GSC 資料存取（給非工程背景的逐步操作）

做完這一次，以後每次找 Claude 更新網站，它都能直接看到你的 Google Analytics 與 Search Console 數據，不用你再手動匯出或截圖。

**總共約 10 分鐘，分成四段。**

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

1. 用**記事本**（Windows）或**文字編輯**（Mac）打開第一段下載的那個 `.json` 檔
   - Mac 小技巧：在檔案上按右鍵 → 開啟檔案 → 其他 → 選「文字編輯」
   - 內容長這樣（一大串，開頭是 `{`）：
     ```
     {
       "type": "service_account",
       "project_id": "yaocare",
       "private_key_id": "...",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...",
       "client_email": "ga4-insights@yaocare.iam.gserviceaccount.com",
       ...
     }
     ```
2. **全選**（Ctrl+A / Cmd+A）→ **複製**（Ctrl+C / Cmd+C）
   - 要整份，從最前面的 `{` 到最後面的 `}`
3. 打開 Claude Code on the web 的**環境設定**頁，找到**環境變數**（Environment variables）區塊
   - 說明文件：<https://code.claude.com/docs/en/claude-code-on-the-web>
4. 新增一個變數：

   | 欄位 | 填什麼 |
   |---|---|
   | 名稱（Name / Key） | `GOOGLE_SERVICE_ACCOUNT_KEY` |
   | 值（Value） | 剛剛複製的整份 JSON，直接貼上 |

   名稱要一字不差，全大寫、用底線。
5. 儲存。

✅ 完成。

---

## 怎麼確認成功了？

開一個新的 Claude session，叫它跑：

```
pnpm perf
```

- **成功**：會印出使用者數、工作階段、Top 頁面、搜尋查詢與排名等一堆數字
- **失敗**：會印「GA4 無回應」「GSC 無資料」

失敗的話，照這個順序檢查：

| 症狀 | 多半是哪裡沒做好 |
|---|---|
| GA4 有數字、GSC 沒有 | 第三段沒做，或權限選了「受限」 |
| GSC 有數字、GA4 沒有 | 第二段沒做 |
| 兩邊都沒有 | 第四段的變數名稱打錯，或 JSON 沒貼完整（少了頭尾的大括號） |

把 `pnpm perf` 的輸出貼給 Claude，它能直接判斷是哪一段的問題。

---

## 附註：給工程背景的人

- 變數也接受 base64（`base64 -w0 key.json`）或 `GOOGLE_APPLICATION_CREDENTIALS` 檔案路徑。
- 認證邏輯在 `scripts/lib/insight-fetch.mjs` 的 `getToken()`，優先序為「服務帳號金鑰 → gcloud」，走 JWT-bearer flow（RFC 7523），無新增相依套件。
- 主機 cron 仍走 `gcloud auth print-access-token`，這次改動不影響它。
- 技術細節見 `docs/playbooks/audience-insights.md`。
