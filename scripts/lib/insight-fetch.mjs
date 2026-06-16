import { execFileSync } from 'node:child_process';
import { GA4_URL, GSC_URL, SERVICE_ACCOUNT, SCOPES } from './insight-constants.mjs';

/** 不純：spawn gcloud 取 access token。失敗回 null（不丟，讓組裝層退化）。 */
export function getToken() {
  try {
    return execFileSync('gcloud', [
      'auth', 'print-access-token', '--account', SERVICE_ACCOUNT, '--scopes', SCOPES,
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
