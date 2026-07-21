// Slack ✅ 核准閘——互動端點（按鈕：預覽 / 確認發佈 / 退稿）
//
// 流程：draft-cron 出草稿 → PUT /gate/draft 存草稿到 KV（state=pending）+ 發帶按鈕訊息到頻道。
//   使用者點按鈕 → Slack POST /slack/interact（本模組）：
//     gate_preview → views.open 跳視窗顯示全文（從 KV 讀 content）
//     gate_confirm → KV state=approved + chat.update 訊息為「已核准，發佈中…」
//     gate_reject  → KV state=rejected + chat.update 訊息為「已退稿」
//   主機 publish-approved 輪詢 GET /gate/state?id= → approved 才發布 → 發布後 PUT state=published。
//
// KV：沿用 GEN_JOBS namespace，key 前綴 gate:，TTL 8 天。
// 需要的 secret：SLACK_SIGNING_SECRET（驗簽）、SLACK_BOT_TOKEN（呼叫 Slack API）。

import type { Env, KvLike, CtxLike } from './index';

export interface GateRecord {
  id: string; // `${type}::${slug}`
  type: string;
  slug: string;
  title: string;
  summary?: string;
  content: string; // 草稿全文（給預覽 modal）
  channel: string;
  slack_ts: string; // 草稿摘要訊息 ts（按鈕所在那則）
  state: 'pending' | 'approved' | 'rejected' | 'published';
  by?: string; // 核准/退稿者
  url?: string; // 發布後上線網址
  updated: number;
}

const GATE_TTL = 8 * 86400;
const gateKey = (id: string) => `gate:${id}`;

function kv(env: Env): KvLike | undefined {
  return env.GEN_JOBS;
}

export async function getGate(env: Env, id: string): Promise<GateRecord | null> {
  const raw = await kv(env)?.get(gateKey(id));
  return raw ? (JSON.parse(raw) as GateRecord) : null;
}
export async function putGate(env: Env, rec: GateRecord): Promise<void> {
  rec.updated = Math.floor(Date.now() / 1000);
  await kv(env)?.put(gateKey(rec.id), JSON.stringify(rec), { expirationTtl: GATE_TTL });
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 驗證 Slack 請求簽章（HMAC-SHA256，basestring=v0:ts:body）。通過回 true。 */
export async function verifySlackSignature(rawBody: string, ts: string | null, sig: string | null, secret: string): Promise<boolean> {
  if (!ts || !sig || !secret) return false;
  // 防重放：時間戳超過 5 分鐘即拒
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`v0:${ts}:${rawBody}`));
  const expected = `v0=${hex(mac)}`;
  // 等長才比，避免 timing 差異洩漏（簡化版固定長度比對）
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

async function slackCall(env: Env, method: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return (await r.json()) as { ok: boolean; error?: string };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 從 frontmatter 的 references: 區塊抽出 {title,url}。 */
function extractRefs(content: string): { title: string; url: string }[] {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const m = fm[1].match(/\nreferences:\s*\n([\s\S]*?)(?=\n[A-Za-z][\w]*:|$)/);
  if (!m) return [];
  const refs: { title: string; url: string }[] = [];
  // 前置 \n 讓「區塊開頭即 `- `」的第一筆也被切到（否則 slice(1) 會吃掉第一筆）
  for (const e of ('\n' + m[1]).split(/\n\s*-\s+/).slice(1)) {
    const t = e.match(/title:\s*["']?(.+?)["']?\s*(?:\n|$)/);
    const u = e.match(/url:\s*["']?(\S+?)["']?\s*(?:\n|$)/);
    if (t) refs.push({ title: t[1].trim(), url: u ? u[1].trim() : '' });
  }
  return refs;
}

/** 極簡 Markdown → HTML（標題/粗體/斜體/行內碼/連結/圖片/清單/引言/分隔線/段落），剝 frontmatter。 */
function mdToHtml(md: string): string {
  md = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const inline = (t: string): string =>
    escapeHtml(t)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, a, u) => `<img src="${u}" alt="${a}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, x, u) => `<a href="${u}" target="_blank" rel="noopener">${x}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  let html = '';
  let inList = false;
  let para: string[] = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); closeList(); const n = h[1].length; html += `<h${n}>${inline(h[2])}</h${n}>`; continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flush(); closeList(); html += '<hr>'; continue; }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { flush(); if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) { flush(); closeList(); html += `<blockquote>${inline(bq[1])}</blockquote>`; continue; }
    if (line.trim() === '') { flush(); closeList(); continue; }
    para.push(line);
  }
  flush(); closeList();
  return html;
}

/** 草稿全文 → 完整 HTML 預覽頁（外部瀏覽器開，不塞進 Slack）。 */
export function renderPreviewHtml(rec: GateRecord): string {
  const refs = extractRefs(rec.content);
  const refsHtml = refs.length
    ? `<h2>📚 引用來源</h2><ul>${refs.map((r) => `<li>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>` : escapeHtml(r.title)}</li>`).join('')}</ul>`
    : '';
  const label = rec.type === 'news' ? '趨勢' : rec.type === 'myths' ? '闢謠' : rec.type === 'ingredients' ? '成分解析' : '文章';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>草稿預覽：${escapeHtml(rec.title)}</title>
<style>
:root{color-scheme:light dark}
body{max-width:740px;margin:0 auto;padding:2rem 1.2rem 4rem;font-family:-apple-system,"Noto Sans TC","PingFang TC",sans-serif;line-height:1.8;color:#1a1a1a;background:#fff}
.banner{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:.6rem .9rem;border-radius:8px;font-size:.9rem;margin-bottom:1.5rem}
h1{font-size:1.7rem;line-height:1.35;margin:.2rem 0 1rem}
h2{font-size:1.25rem;margin:2rem 0 .6rem;padding-top:.4rem;border-top:1px solid #eee}
img{max-width:100%;height:auto;border-radius:10px;margin:1rem 0}
a{color:#2563eb}
blockquote{margin:1.2rem 0;padding:.6rem 1rem;border-left:4px solid #cbd5e1;background:#f8fafc;color:#475569}
code{background:#f1f5f9;padding:.1em .35em;border-radius:4px;font-size:.9em}
hr{border:none;border-top:1px solid #e5e7eb;margin:2rem 0}
ul{padding-left:1.3rem}
@media(prefers-color-scheme:dark){body{color:#e5e7eb;background:#0b0f17}.banner{background:#3a2a10;border-color:#7c4a12;color:#fcd9b6}blockquote{background:#111827;color:#cbd5e1}code{background:#1f2937}h2{border-color:#1f2937}}
</style></head><body>
<div class="banner">📝 ${label}草稿預覽（未發佈）— 審核後請回 Slack 點「✅ 確認發佈」或「❌ 退稿」</div>
<h1>${escapeHtml(rec.title)}</h1>
${mdToHtml(rec.content)}
${refsHtml}
</body></html>`;
}

/** 已決議（核准/退稿/已發布）後，把原訊息改成無按鈕的狀態列。 */
function decidedBlocks(rec: GateRecord, statusLine: string): unknown[] {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${rec.title}*` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: statusLine }] },
  ];
}

export async function handleSlackInteract(request: Request, env: Env, ctx?: CtxLike): Promise<Response> {
  const rawBody = await request.text();
  const ok = await verifySlackSignature(
    rawBody,
    request.headers.get('x-slack-request-timestamp'),
    request.headers.get('x-slack-signature'),
    env.SLACK_SIGNING_SECRET || '',
  );
  if (!ok) return new Response('bad signature', { status: 401 });

  // Slack 送 application/x-www-form-urlencoded，payload=<urlencoded JSON>
  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get('payload') || '{}');
  if (payload.type !== 'block_actions') return new Response('', { status: 200 });

  const action = payload.actions?.[0] || {};
  const actionId: string = action.action_id || '';
  const id: string = action.value || '';
  const user: string = payload.user?.username || payload.user?.name || payload.user?.id || '某人';
  const channel: string = payload.channel?.id || payload.container?.channel_id || '';
  const msgTs: string = payload.container?.message_ts || payload.message?.ts || '';
  const triggerId: string = payload.trigger_id || '';

  // 📄 預覽全文已改為「連結按鈕」（直接開 /gate/preview 網頁），不再走互動；故只處理核准/退稿。
  const rec = await getGate(env, id);
  if (!rec) return new Response('', { status: 200 });

  if (actionId === 'gate_confirm') {
    rec.state = 'approved';
    rec.by = user;
    await putGate(env, rec);
    const p = slackCall(env, 'chat.update', {
      channel: channel || rec.channel,
      ts: msgTs || rec.slack_ts,
      text: `已核准，發佈中…（${user}）`,
      blocks: decidedBlocks(rec, `:white_check_mark: *已核准*（${user}）— 發佈中，連結生效後回貼這裡。`),
    });
    if (ctx) ctx.waitUntil(p); else await p;
    return new Response('', { status: 200 });
  }

  if (actionId === 'gate_reject') {
    rec.state = 'rejected';
    rec.by = user;
    await putGate(env, rec);
    const p = slackCall(env, 'chat.update', {
      channel: channel || rec.channel,
      ts: msgTs || rec.slack_ts,
      text: `已退稿（${user}）`,
      blocks: decidedBlocks(rec, `:x: *已退稿*（${user}）— 草稿將被清除，不發佈。`),
    });
    if (ctx) ctx.waitUntil(p); else await p;
    return new Response('', { status: 200 });
  }

  return new Response('', { status: 200 });
}
