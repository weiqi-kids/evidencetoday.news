#!/usr/bin/env node
/**
 * pnpm check:spec — 內容規格守門（「七月標準」）。
 *
 * 這支 gate 存在的理由，是一次可以複製的實測結果，不是誰的偏好：
 *
 *   2026-08-11 用 GSC 逐頁曝光對上發布月份，發現 2026-07 那批 63 篇的曝光中位數是 14、
 *   只有 3 篇零曝光；2026-03 至 06 共 215 篇的中位數是 0、約六成從未取得任何曝光。
 *   差別不是「七月運氣好」——七月前三名只佔該月曝光的 20%，扣掉前三名後剩下的 60 篇
 *   仍有 30.5 曝光/篇，而六月扣掉前三名後的 58 篇只有 2.0。差在分佈的身體，不在尾巴。
 *
 *   同一批資料用三個等長觀測窗回看（6/11-7/08、7/09-8/05、7/14-8/08），每一個發布月份的
 *   曝光都是持平或上升，**沒有任何一批下降**。所以舊內容不是「衰退」，是從一開始就沒活過；
 *   等時間不會讓它們變好。
 *
 * 逐檔比對七月與之前的規格差異後，可量化的差別集中在兩項：**結構化來源數**與**正文長度**。
 * （站內連結只有 articles 有差別：七月中位數 2，其餘月份 0；myths/ingredients/news 各月都是 0，
 * 因此不對那三類設此門檻——照抄會設出一個沒有依據的規則。）
 *
 * 門檻取自七月同類型的 P25（該批 75% 的稿子都達到的水準），再向下取整。
 *
 * 分級刻意不對稱：
 *   - **新增檔** → ERROR（擋 build）。新內容沒有理由低於已知有效的規格。
 *   - **既有檔的修改** → WARN。不要讓「改個錯字」被迫連帶重寫整篇。
 *   - 抓不到 git base（CI 淺 checkout）→ 掃 0 檔、exit 0，永不誤擋。
 *
 * 2026-08-23 加入封面圖檢查。起因：業主發現趨勢新聞與幾篇文章沒有圖片。追出來是三批
 * 「補排程」的手動批次稿（08-04 成分解析 9 篇、08-05 文章 6 篇、08-17 趨勢新聞 10 篇）
 * 跳過了配圖那一步——cron 產線的 prompt 有配圖鐵則（ops/draft-cron.sh 的 COMMON_RULES_PAGE ②），
 * 但手動批次不走那條路，而**當時沒有任何 gate 檢查封面圖**，於是一路過 build、過 CI、上線。
 *
 * 為什麼這次可以放心把「必須有封面圖」做成硬性規則：`docs/reminders.md` 記著 2026-08-07
 * 的教訓「必填但不檢查正確性，比沒有要求更糟」（74 篇填了不相干的圖）。那個逃生口現在
 * 已經被 check-boilerplate 堵住了——coverImage/heroImage 不在它的 FIELD_ALLOW 裡，
 * 同一張圖被 ≥5 篇共用會被抓出來。有了那道，這道才不會逼出「隨便填一張過關」。
 *
 * `--all` ＝全站盤點（永遠 exit 0，人工普查用）。
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import yaml from "js-yaml";

const args = process.argv.slice(2);
const ALL = args.includes("--all");

/** 門檻：七月同類型 P25 向下取整。改動門檻請連同上面的推導一起更新，不要只改數字。
 *
 * `cover` ＝該類型的封面圖欄位名；null 代表「這個類型刻意沒有封面圖」。
 * myths 是 null：2026-08-07 查出 74/76 篇的 coverImage/heroImage 指向同兩張 radar SVG，
 * 當時整批移除，版型也刻意簡化。它沒有封面是設計，不是缺漏，不要「順手補回去」。
 */
const SPEC = {
  articles:    { refs: 6,  words: 2900, inlinks: 2, cover: 'coverImage' },
  myths:       { refs: 10, words: 3500, cover: null },
  ingredients: { refs: 7,  words: 5000, cover: 'coverImage' },
  news:        { refs: 3,  words: 800,  cover: 'heroImage' },
};

const run = (cmd) => {
  try { return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
};

function collectionOf(file) {
  const m = file.match(/^src\/content\/([a-z]+)\//);
  return m && SPEC[m[1]] ? m[1] : null;
}

/**
 * frontmatter 語法本身是否有效。
 *
 * 為什麼這一項要單獨檢查：本檔與 check-content、check-boilerplate 都是用 regex 讀
 * frontmatter，YAML 壞掉時它們照樣「通過」——2026-08-26 就是這樣，三道 gate 全綠，
 * 只有 astro build 的嚴格 parser 擋下來（`draft: false` 後面被插進 references 項目）。
 * gate 說通過卻在 build 才炸，比沒有 gate 更誤導人，所以在這裡先驗一次。
 */
function frontmatterError(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return raw.startsWith("---") ? "frontmatter 分隔線格式不正確（需為單獨一行的 --- 並以換行結尾）" : null;
  try {
    yaml.load(m[1]);
    return null;
  } catch (e) {
    return `frontmatter YAML 無法解析：${String(e.message).split("\n")[0]}`;
  }
}

function measure(file) {
  const raw = readFileSync(file, "utf8");
  const parts = raw.split(/^---\s*$/m);
  if (parts.length < 3) return null;
  const fm = parts[1];
  const body = parts.slice(2).join("---");
  // 封面圖：http(s) 直接算有；本地路徑要真的存在（Article.astro 對不存在的本地路徑
  // 會靜默不渲染——frontmatter 看起來有圖、前台是空的，這種最難發現）。
  const coverOf = (field) => {
    const m = fm.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)`, 'm'));
    const v = m?.[1]?.trim();
    if (!v) return null;
    if (/^https?:\/\//.test(v)) return v;
    if (v.startsWith('/')) return existsSync(`public${v}`) ? v : null;
    return null;
  };
  return {
    cover: coverOf('coverImage') || coverOf('heroImage') || coverOf('thumbnail'),
    // 結構化 references 的可點來源數：frontmatter 裡的 url: http(s)
    refs: (fm.match(/^\s+url:\s*["']?https?:\/\//gm) || []).length,
    // 正文站內連結（不含 frontmatter 的 relatedArticles——那是版型自動出的，不是作者的交棒）
    inlinks: (body.match(/\]\(\/(?:articles|myths|ingredients|news|topics)\//g) || []).length,
    words: body.replace(/\s/g, "").length,
  };
}

/** 回傳 [{file, added}]；抓不到 base 回 null。 */
function targetFiles() {
  if (ALL) {
    const out = run("git ls-files 'src/content/**/*.mdx' 'src/content/**/*.md'");
    return out ? out.split("\n").map((f) => ({ file: f, added: false })) : [];
  }
  const base = run("git merge-base origin/main HEAD");
  if (!base) { console.log("規格守門：抓不到 git base（origin/main），跳過。"); return null; }

  const seen = new Map();
  // 已提交的變動（含新增）
  for (const line of run(`git diff --name-status ${base}...HEAD -- src/content`).split("\n")) {
    const [st, f] = line.split(/\t/);
    if (f) seen.set(f, st?.startsWith("A"));
  }
  // 工作區未提交的變動
  for (const line of run(`git diff --name-status -- src/content`).split("\n")) {
    const [st, f] = line.split(/\t/);
    if (f && !seen.has(f)) seen.set(f, st?.startsWith("A"));
  }
  // 未追蹤＝新增
  for (const f of run("git ls-files --others --exclude-standard -- src/content").split("\n")) {
    if (f) seen.set(f, true);
  }
  return [...seen].map(([file, added]) => ({ file, added: !!added }));
}

const targets = targetFiles();
if (targets === null) process.exit(0);

const files = targets.filter((t) => /\.mdx?$/.test(t.file) && collectionOf(t.file) && existsSync(t.file));
if (!files.length) { console.log("規格守門：無變動的內容檔。"); process.exit(0); }

const errors = [], warns = [];
for (const { file, added } of files) {
  const col = collectionOf(file);
  const spec = SPEC[col];
  const m = measure(file);
  if (!m) continue;

  const miss = [];
  // YAML 壞掉是語法錯誤不是規格不足，無論新增或既有都必須擋——它會讓 build 失敗。
  const fmErr = frontmatterError(readFileSync(file, "utf8"));
  if (fmErr) {
    errors.push({ file, col, miss: [fmErr] });
    continue;
  }
  if (m.refs < spec.refs) miss.push(`可點來源 ${m.refs} 筆（下限 ${spec.refs}）`);
  if (m.words < spec.words) miss.push(`正文 ${m.words} 字（下限 ${spec.words}）`);
  if (spec.inlinks != null && m.inlinks < spec.inlinks)
    miss.push(`正文站內連結 ${m.inlinks} 條（下限 ${spec.inlinks}）`);
  if (spec.cover && !m.cover) miss.push(`沒有封面圖（需要 ${spec.cover}）`);
  if (!miss.length) continue;

  (added && !ALL ? errors : warns).push({ file, col, miss });
}

if (warns.length) {
  console.error(`規格守門 WARN（既有檔未達七月標準 ${warns.length} 檔，不擋）：`);
  for (const w of warns) console.error(`  · ${w.file}：${w.miss.join("；")}`);
}
if (errors.length) {
  console.error(`\n新增內容未達七月標準 ${errors.length} 檔（擋 build）：`);
  for (const e of errors) console.error(`  ✗ ${e.file}：${e.miss.join("；")}`);
  console.error(`\n門檻的由來與豁免方式見 scripts/check-spec.mjs 檔頭與 docs/playbooks/winning-article-formula.md。`);
  console.error(`補來源不是湊數：每一筆都要是這篇真的引用到、可點的一級或同儕審查來源。`);
  process.exit(1);
}
console.log(`規格守門通過：掃 ${files.length} 檔${warns.length ? `（${warns.length} 則 WARN 見上）` : ""}。`);
