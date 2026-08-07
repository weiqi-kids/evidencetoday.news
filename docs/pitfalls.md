# 踩過的坑

每一條都是**實際壞過一次**才寫下來的。動手前先掃自己那一類。

> 本檔只記「機制」與「怎麼避免」，不記當時的數字或當下狀態。要看現況請跑指令（`pnpm stats` / `check:schedule` / `perf` / `index:coverage`）。

---

## 內容撰寫

- **tags 含 `/`** → build 失敗。分類名有斜線（例如某些疾病縮寫）要改寫成不含 `/` 的形式。
- **插入不存在的行內圖 `![...](images/...)`** → Rollup 解析失敗，全站部署連續 fail。本站慣例不用行內本地圖；配圖走 frontmatter 封面與圖庫外連（見 `playbooks/editor-images.md`）。
- **myths 單篇版型是刻意簡化**：不要加「更新與更正紀錄」這類與閱讀動線無關的區塊。（「延伸閱讀」已於 2026-08-07 依實測數據解禁——闢謠曾是全站唯一零站內出鏈的頁型。）playbook 把關，`check-myth-quality` 掃不到模板層。
  範圍在 2026-08-06 釐清：這條擋的是導覽區塊，**不是**該篇自己的內容。當天新增了「那，實際上該怎麼做？」（`safeActions`／`avoidActions`／`whenToSeekProfessionalAdvice`），因為那三欄從建站起就逐篇寫在 frontmatter、前兩者還是 required，卻從來沒有任何模板讀過——74 篇的「該做／別做／何時就醫」讀者一個字都看不到。要再加區塊仍請先確認屬於哪一類。
  - **例外：FAQ 是刻意保留的固定區塊**。曾因 `mythsSchema` 漏宣告 `faq` 欄，Zod 靜默剝除 → FAQ 從未顯示、FAQPage JSON-LD 也輸不出來。補欄位後生效，勿再移除。
- **掛 `reviewer` 會引爆既有內文的 AI 味守門**：`check-content.mjs` 對「被碰到的檔案」重掃全文，既有內文原本只因不在 diff 裡而被 grandfather。掛署名前先跑 `node scripts/check-content.mjs <檔案>`，ERROR 同一個 commit 修掉。

## 排程與可見性

- **排程稿可見性只有 HTML 路由套 `isPublicEntry`**：`.txt`／RSS／`llms-full.txt`／tags 頁曾只濾 `!data.draft` → 未來日期排程稿提前洩全文。新增前台讀 collection 的路由**一律用 `isPublicEntry(data)`**；`src/utils/visibility.test.ts` 有防回歸測試會擋。
- **news 排程不可被「拉開節奏」波及**：radar 稿的**檔名與標題都自帶日期**（`radar-YYYY-MM-DD-…`／「健康雷達 YYYY-MM-DD」）。曾在調整全站發文頻率時把 news 一起拉開 → 標題寫某日的稿被排到一個多月後才發，等於發一批一上線就過期的新聞。**重排全站排程時 news 必須排除在外，一律回到檔名的名目日期**（見 `playbooks/news-article.md`）。要調整發文量請動 evergreen（articles/ingredients/myths）。
- **排程破洞沒有任何自動檢查看得到**（少發一天不會讓 build 紅），只能靠 `pnpm check:schedule`。動完排程一定要跑。
- **Astro 5 content-layer 快取**：改 `content.schemas.ts` 欄位後，本機 `pnpm build` 可能沿用 `.astro/data-store.json` 舊解析結果（新欄位仍被剝除、前台看不到）。驗證 schema 改動請先 `rm -rf .astro dist` 再 build。CI 每次全新 checkout 無此問題。

## 版面與樣式

- **Article.astro `cards` variant 曾遺漏 `max-width: none`** → blocks 被限制在 68ch。改 variant 記得兩件事都設：透明背景 + 解除寬度上限。
- **Podcast 連結 slug 一律用 `stripPodcastSlug()`**，不可用 `stripExt()`，否則單集頁連結壞掉。
- **不要用 `:global()` 覆蓋 layout 的 class**，改用 variant prop；layout 管骨架、page 管皮膚。
- **`!important` 存量遷移中**：`check-design.mjs` 的禁 `!important` 規則尚未啟用（存量在 `global.css`）。清零進度與清單見 `scripts/check-design.mjs` 檔頭 TODO，不要寫進文件。

## 資料與判讀

- **跨 collection 比 CTR 會得到相反結論**：各 collection 的平均排名差距很大，直接比原始 CTR 會把「排名差異」誤讀成「標題爛」，曾據此誤判某些分類該全面改寫標題。**談 CTR 一律先做位置校正**（算法見 `playbooks/audience-insights.md`）。
- **剛上線的稿不能當「表現差」的證據**：未滿一週、Google 還沒爬完的稿，曝光與索引率本來就低。評估成效時只計已上線一段時間的稿，否則新稿必然拉低平均，會做出錯誤的減量決定。
- **評估發文頻率不要看單期數字，要看方向**：全站曝光仍在成長時優先「別亂動結構」。流程見 `playbooks/news-cadence-review.md`。

## 自動化與 token

- **headless 派子代理不帶 model ＝ 默默用 opus、燒爆額度**：cron orchestrator 雖然自己跑 sonnet，但它派出的撰寫／審核 `Agent` 不帶 model 會落到帳號預設（opus）。撰寫委員會一律顯式 `model='sonnet'`（見 `AGENTS.md` 並行紀律、`ops/README.md`）。談「cron 燒 token」先查子代理 model。
- **營運帳號與 appi.news 共用同一個週限額**：撞限額時本站的 cron 會一起空跑。`claude-run.sh` 撞限額會寫冷卻旗標，冷卻期內 `bootstrap.sh` 只跳過 claude 型 job、純資料型照跑。現況看 `/etn-cron`。
- **遠端 CCR 環境 WebFetch 被沙箱封鎖**（PubMed/RSS 403），新聞管線為 WebSearch-only，用 `site:` 定向搜尋。


- **列表頁未被索引 ≠ 站上有缺陷（2026-08-06 查證，不要再查一次）**：曾發現 `/articles/`、`/ingredients/`、`/news/`、`/videos/` 未索引，而 `/myths/`、`/topics/`、`/podcasts/` 已索引，直覺會去找 noindex／canonical／內鏈的差異。**七頁逐項比對後完全相同**：canonical 皆正確自指、無 noindex、都在 sitemap、導覽列在 1,233 頁裡都是真 `<a href>`（不是 script 內字串）。唯一差別是 URL Inspection 的 `lastCrawlTime`——已索引的三頁被爬過，未索引的四頁**從未被爬**，`pageFetchState`／`robotsTxtState` 全為 `UNSPECIFIED`（代表「還沒檢查」而非「檢查不過」）。`referringUrls: 0` 同理是未處理的結果，不是原因。
  推論時要避開的錯：**別用「列表頁沒索引」解釋該分類索引率低**。實測 `/articles/` 一樣沒被爬，底下卻有 77% 已索引；`/ingredients/` 也沒被爬，底下只有 58%。兩者不連動。
  對症的動作只有一個：`URL is unknown to Google` 的頁可靠 `pnpm sitemap:submit` 讓 Google 發現；已經是 `Discovered - currently not indexed` 的，Google 早就知道了，重送無效，只能等爬取排程。

## 資料結構（查過一次，不用再查）

- **闢謠每篇有「兩份平行版本」，這是設計不是 bug**：`check-myth-quality.mjs` 強制 MDX **body** 必須含 8 個 section（30 秒快速結論／坊間怎麼流傳／科學證據怎麼看／白話辯證／哪些人要特別小心／FAQ／References／健康資訊提醒），但 `myths/[slug].astro` **完全不渲染 body**（沒有 `<Content />`），前台看到的是從 **frontmatter** 渲染的同名區塊。body 只流向 `.txt` 端點（AI／GEO 用）。
  2026-08-06 量測：body 段落出現在 HTML 的比例中位數 62%，18/58 篇低於一半——乍看像「大量內容被藏起來」。但改用**具名來源密度**（食藥署／WHO／FDA／Cochrane／查核中心等）比對，58 篇裡只有 3 篇的 body 比頁面多，且差距是 15:11、8:7、1:0。**結論：落差主要在敘事散文，不是證據流失，前台版本沒有比較差。** 不要為了「露出 body」去加 `<Content />`，那會讓每頁出現兩份近似內容。
- **`check-myth-quality.mjs` 的 `FORBIDDEN_BODY_SECTION_TITLES` 禁止 body 寫「正確做法」「一般人最安全做法」「什麼時候該尋求專業意見」**，因為那些內容的正本在 frontmatter（`safeActions` / `avoidActions` / `whenToSeekProfessionalAdvice`），2026-08-06 起由前台「那，實際上該怎麼做？」區塊渲染。要改這類內容改 frontmatter，不要往 body 加 section，gate 會擋。
- **schema 死欄位盤點（2026-08-06）**：宣告了但沒有任何程式讀取的欄位——`articles`：`evidenceBasis`、`targetAudience`（0/129 從沒人填，純殘留）；`ingredients`：`mechanism`(8 篇有值)、`pathwaySteps`(1 篇)；`news`：`editorPick`(103 篇有值)；`videos`：`evidenceBasis`、`targetAudience`(5/5)；`myths`：另有 10 個 metadata 欄（`spreadLevel` 全站只有 2 種值、`disclosureStatus` 只有 1 種，屬樣板，露出反而是重複內容）。
  查法：把 `content.schemas.ts` 的欄位名對整個 repo（排除 `src/content/`）做全字比對。**加欄位前先想清楚誰會讀它**——`medicalDisclaimer` 與 `safeActions` 就是「required 欄位寫了兩年沒人渲染」的前例。
## 資產產出

- **OG 圖字型「Bold」曾其實是細體**：`*-Bold-static.ttf` 原檔是可變字型直接複製、沒有真的 instance 成 `wght=700`，satori 渲染時字重等於 Regular。要更新這類靜態字型，須用 `fonttools varLib.instancer NotoSansTC-Regular.ttf wght=400/700 -o ...` 產生真正定死權重的實例，不能只是複製可變字型或改檔名。驗證：渲染一段 `fontWeight:700` 文字，比對是否真的比 400 粗。
- **字型子集化的權重要兩邊同步**：`Base.astro` 的 import 與 `subset-fonts.mjs` 的 `WEIGHTS` 不一致時，該權重不會被切塊（fallback 到整包或缺字）。見 `playbooks/ci-cd.md`。
