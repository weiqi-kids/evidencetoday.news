#!/usr/bin/env node
/**
 * pnpm check:google — GA4 / GSC 資料存取自我診斷。
 *
 * 逐項檢查並把每個失敗對應回 docs/setup-google-data-access.md 的哪一段沒做好，
 * 讓設定過程不必來回猜。唯讀：不寫檔、不提交、不印出任何搜尋查詢內容。
 */
import { readServiceAccountKey, getToken } from './lib/insight-fetch.mjs';
import { GA4_URL, GSC_URL, GA4_PROPERTY, GSC_SITE, SCOPES } from './lib/insight-constants.mjs';

const ok = (m) => console.log(`  ✅ ${m}`);
const no = (m, fix) => { console.log(`  ❌ ${m}`); if (fix) console.log(`     → ${fix}`); };
const info = (m) => console.log(`     ${m}`);

console.log('\n===== GA4 / GSC 存取診斷 =====\n');

/* 1. 金鑰有沒有進到環境裡 */
console.log('【1】服務帳戶金鑰');
const key = readServiceAccountKey();
if (!key) {
  const rawSet = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
  if (rawSet) {
    no('環境變數有值，但解析不出金鑰',
       '值必須是完整的 JSON（從 { 到 }）或該 JSON 的 base64。常見原因：貼上時被截斷。');
  } else {
    no('找不到 GOOGLE_SERVICE_ACCOUNT_KEY',
       '這是設定文件的「丁段」。若你剛存好，請開一個新的 session——環境變數在容器啟動時才注入。');
  }
  console.log('\n設定說明：docs/setup-google-data-access.md\n');
  process.exit(1);
}
if (!key.client_email || !key.private_key) {
  no('金鑰缺少 client_email 或 private_key 欄位', 'JSON 可能沒貼完整，請重新全選複製一次。');
  process.exit(1);
}
ok(`讀到金鑰：${key.client_email}`);
info(`GCP 專案：${key.project_id ?? '(未標示)'}`);

/* 2. 能不能換到 access token */
console.log('\n【2】用金鑰換 access token');
const token = await getToken();
if (!token) {
  no('換不到 token',
     '多半是「甲段第 3 步」的兩個 API 沒啟用，或金鑰已在 GCP 被刪除。');
  info('要啟用：Google Analytics Data API、Google Search Console API');
  process.exit(1);
}
ok('取得 access token');

/* 3. GA4 讀得到嗎 */
console.log('\n【3】GA4 讀取測試');
console.log(`     資源：${GA4_PROPERTY}`);
let ga4Rows = null;
try {
  const r = await fetch(GA4_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [], metrics: [{ name: 'sessions' }], limit: 1,
    }),
  });
  if (r.ok) {
    const j = await r.json();
    ga4Rows = Number(j?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    ok(`讀取成功，近 28 天工作階段：${ga4Rows.toLocaleString()}`);
    if (ga4Rows === 0) info('數字為 0 屬正常（站台早期或該期間確實無流量），權限本身是通的。');
  } else if (r.status === 403) {
    no('GA4 回 403（沒有權限）',
       '「丙段」沒做完：要把這個服務帳戶加進 GA4「資源存取管理」，角色至少「檢視者」。');
    info(`要加的 email：${key.client_email}`);
  } else if (r.status === 404) {
    no(`GA4 回 404（找不到資源 ${GA4_PROPERTY}）`,
       '若你新建了 GA4 資源，需更新 scripts/lib/insight-constants.mjs 的 GA4_PROPERTY 與 src/data/analytics.ts 的評估 ID。');
  } else {
    no(`GA4 回 HTTP ${r.status}`, (await r.text()).slice(0, 200));
  }
} catch (e) {
  no('GA4 連線失敗', String(e).slice(0, 160));
}

/* 4. GSC 讀得到嗎 */
console.log('\n【4】GSC 讀取測試');
console.log(`     資源：${GSC_SITE}`);
const end = new Date(); end.setDate(end.getDate() - 3);
const start = new Date(end); start.setDate(start.getDate() - 28);
const d = (x) => x.toISOString().slice(0, 10);
try {
  const r = await fetch(GSC_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: d(start), endDate: d(end), dimensions: [], rowLimit: 1 }),
  });
  if (r.ok) {
    const j = await r.json();
    const row = j?.rows?.[0];
    ok('讀取成功');
    if (row) {
      info(`近 28 天：點擊 ${row.clicks ?? 0}、曝光 ${row.impressions ?? 0}、平均排名 ${Number(row.position ?? 0).toFixed(1)}`);
    } else {
      info('該期間無資料列。權限是通的，可能是資料尚未累積。');
    }
  } else if (r.status === 403) {
    no('GSC 回 403（沒有權限）',
       '「乙段」的最後一步沒做：把服務帳戶加進 GSC「使用者和權限」，權限選「完整」。');
    info(`要加的 email：${key.client_email}`);
  } else if (r.status === 404) {
    no(`GSC 回 404（找不到資源 ${GSC_SITE}）`,
       '多半是 GSC 資源類型建成了「網址前置字元」。本站需要的是「網域」類型（sc-domain:）。');
  } else {
    no(`GSC 回 HTTP ${r.status}`, (await r.text()).slice(0, 200));
  }
} catch (e) {
  no('GSC 連線失敗', String(e).slice(0, 160));
}

console.log('\n全部 ✅ 就代表打通了，之後直接跑 pnpm perf / pnpm insights / pnpm index:coverage。');
console.log('設定說明：docs/setup-google-data-access.md\n');
