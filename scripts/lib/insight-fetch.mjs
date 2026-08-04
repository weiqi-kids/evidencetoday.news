import { execFileSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { GA4_URL, GSC_URL, SERVICE_ACCOUNT, SCOPES } from './insight-constants.mjs';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** 純：constants 的 scope 是逗號分隔（gcloud 格式），OAuth 要空白分隔。 */
export function scopeList(scopes) {
  return scopes.split(',').map((s) => s.trim()).filter(Boolean).join(' ');
}

/**
 * 純：取出服務帳號金鑰物件。依序支援
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY —— 原始 JSON 或 base64（推薦；env var 放 base64 才不會被換行破壞）
 *   2. GOOGLE_APPLICATION_CREDENTIALS —— 金鑰檔路徑（Google 官方慣例）
 * 都沒有就回 null，讓 getToken() 退回 gcloud。
 */
export function readServiceAccountKey(env = process.env) {
  const raw = (env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
  if (raw) {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    try { return JSON.parse(text); } catch { return null; }
  }
  const path = (env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (path) {
    try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
  }
  return null;
}

/** 純：組出 JWT-bearer 用的待簽字串（header.claims）。抽出來是為了可單元測試。 */
export function buildAssertionInput(key, scopes, now = Math.floor(Date.now() / 1000)) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: scopeList(scopes),
    aud: OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })}`;
}

/** 不純：用服務帳號金鑰走 JWT-bearer flow（RFC 7523）換 access token。失敗回 null。 */
async function tokenFromServiceAccount(key, scopes) {
  try {
    const unsigned = buildAssertionInput(key, scopes);
    const sig = createSign('RSA-SHA256').update(unsigned).end()
      .sign(key.private_key).toString('base64url');
    const r = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${sig}`,
      }),
    });
    if (!r.ok) return null;
    return (await r.json()).access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * 不純：取 access token。**async**（呼叫端需 await）。
 *
 * 優先序：服務帳號金鑰 → gcloud。這樣同一份程式碼在兩種環境都能跑：
 *   - 遠端／CI／CCR：沒有 gcloud，靠 GOOGLE_SERVICE_ACCOUNT_KEY 環境變數
 *   - 主機 cron：維持原本的 gcloud 行為，完全不受影響
 * 失敗一律回 null（不丟），讓各腳本的組裝層自行退化成空輸出。
 */
export async function getToken(scopes = SCOPES) {
  const key = readServiceAccountKey();
  if (key?.client_email && key?.private_key) {
    const token = await tokenFromServiceAccount(key, scopes);
    if (token) return token;
  }
  try {
    return execFileSync('gcloud', [
      'auth', 'print-access-token', '--account', SERVICE_ACCOUNT, '--scopes', scopes,
    ], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** 純：把 GA4 runReport 回應正規化成 [{dim..,metric..}]。 */
export function normalizeGa4Rows(apiJson, dimensions, metrics) {
  const rows = (apiJson && apiJson.rows) || [];
  return rows.map((row) => {
    const obj = {};
    (row.dimensionValues || []).forEach((d, i) => { obj[dimensions[i]] = d.value; });
    (row.metricValues || []).forEach((m, i) => { obj[metrics[i]] = Number(m.value); });
    return obj;
  });
}

/** 純：把 GSC 回應正規化成 [{dim.., clicks, impressions, ctr, position}]。 */
export function normalizeGscRows(apiJson, dimensions) {
  const rows = (apiJson && apiJson.rows) || [];
  return rows.map((row) => {
    const obj = {};
    (row.keys || []).forEach((k, i) => { obj[dimensions[i]] = k; });
    obj.clicks = Number(row.clicks ?? 0);
    obj.impressions = Number(row.impressions ?? 0);
    obj.ctr = Number(row.ctr ?? 0);
    obj.position = Number(row.position ?? 0);
    return obj;
  });
}

/** 不純：打 GA4 runReport，回正規化列；任何錯誤回 []。 */
export async function ga4Report(token, { dimensions, metrics, eventName, limit = 50, orderMetric, days }) {
  const body = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit,
    keepEmptyRows: false,
  };
  if (eventName) {
    body.dimensionFilter = { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventName } } };
  }
  if (orderMetric) body.orderBys = [{ metric: { metricName: orderMetric }, desc: true }];
  try {
    const r = await fetch(GA4_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) });
    if (!r.ok) return [];
    return normalizeGa4Rows(await r.json(), dimensions, metrics);
  } catch { return []; }
}

/** 不純：打 GSC searchAnalytics，回正規化列；任何錯誤回 []。 */
export async function gscQuery(token, { dimensions, startDate, endDate, rowLimit = 100 }) {
  const body = { startDate, endDate, dimensions, rowLimit };
  try {
    const r = await fetch(GSC_URL, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) });
    if (!r.ok) return [];
    return normalizeGscRows(await r.json(), dimensions);
  } catch { return []; }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
