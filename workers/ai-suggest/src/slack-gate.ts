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

/** 把長文切成 ≤2900 字的 section block（Slack modal 單 block 上限 3000；最多 ~18 塊）。 */
function contentBlocks(content: string): unknown[] {
  const blocks: unknown[] = [];
  let cur = '';
  for (const line of content.split('\n')) {
    if (cur.length + line.length + 1 > 2900) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: cur || ' ' } });
      cur = line;
    } else {
      cur += (cur ? '\n' : '') + line;
    }
    if (blocks.length >= 18) break;
  }
  if (cur && blocks.length < 19) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: cur } });
  if (!blocks.length) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '（草稿內容讀取失敗）' } });
  return blocks;
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

  const rec = await getGate(env, id);

  // 預覽：開 modal（不改狀態）。必須 3 秒內回應，故把 views.open 丟背景、立刻回 200。
  if (actionId === 'gate_preview') {
    const view = {
      type: 'modal',
      title: { type: 'plain_text', text: (rec?.title || '草稿預覽').slice(0, 24) },
      close: { type: 'plain_text', text: '關閉' },
      blocks: rec ? contentBlocks(rec.content) : [{ type: 'section', text: { type: 'mrkdwn', text: '草稿已不存在（可能已發布或過期）。' } }],
    };
    const p = slackCall(env, 'views.open', { trigger_id: triggerId, view });
    if (ctx) ctx.waitUntil(p); else await p;
    return new Response('', { status: 200 });
  }

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
