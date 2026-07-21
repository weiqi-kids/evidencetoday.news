import { buildPrompt } from './prompt';
import { handleSlackInteract, getGate, putGate, renderPreviewHtml, type GateRecord } from './slack-gate';

// 最小結構型別（避免相依 @cloudflare/workers-types，vitest/node 也能編譯；
// runtime 的真實 KVNamespace / ExecutionContext 結構相容）。
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
export interface CtxLike {
  waitUntil(p: Promise<unknown>): void;
}
export interface QueueLike {
  send(body: unknown): Promise<void>;
}
export interface GenMessage {
  jobId: string;
  prompt: string;
  model?: string;
  size: GenSize;
}

export interface Env {
  ANTHROPIC_API_KEY: string; // wrangler secret
  ANTHROPIC_MODEL: string;
  ALLOWED_ORIGIN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  // 生圖 secrets（wrangler secret put）；缺 FAL_KEY 時 Flux 端點回 502，OpenAI 不受影響。
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string; // 'gpt-image-1'（需組織驗證）或 'dall-e-3'（免驗證）；預設 gpt-image-1
  OPENAI_IMAGE_QUALITY?: string; // gpt-image-* 畫質 low|medium|high|auto；預設 low（壓低延遲避免逾時）
  FAL_KEY?: string;
  // 圖庫 secrets
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
  // 非同步生圖工單暫存 + 工作佇列
  GEN_JOBS?: KvLike;
  GEN_QUEUE?: QueueLike;
  // Slack ✅ 核准閘（按鈕互動）：驗簽 + 呼叫 Slack API。皆為 wrangler secret。
  SLACK_SIGNING_SECRET?: string;
  SLACK_BOT_TOKEN?: string;
}

export default {
  async fetch(req: Request, env: Env, ctx: CtxLike) { return handle(req, env, ctx); },
  // Queue consumer：背景生圖（不受 request/waitUntil 時限）。被中止則不 ack → 自動重試。
  async queue(batch: { messages: { body: GenMessage; ack(): void; retry(): void }[] }, env: Env) {
    for (const msg of batch.messages) {
      const m = msg.body;
      await runGen(env, m.jobId, m.prompt, m.model, m.size);
      msg.ack();
    }
  },
};

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(obj: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });
}

/** 驗證 Bearer GitHub token 對 repo 有 push 權；通過回 null，否則回對應錯誤 Response。 */
async function requirePush(request: Request, env: Env): Promise<Response | null> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: '缺少授權' }, 401, env);
  const repoRes = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'et-ai-suggest' },
  });
  const repo = (await repoRes.json()) as { permissions?: { push?: boolean } };
  if (!repo.permissions?.push) return json({ error: '無 repo 寫入權' }, 403, env);
  return null;
}

export type GenSize = 'landscape' | 'square' | 'portrait';
export type GenResult = { b64: string; mime: string };

/** Uint8Array → base64（worker/瀏覽器皆可，無 Node Buffer 相依） */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** OpenAI gpt-image-1：同步回 b64_json。 */
async function genOpenAI(env: Env, prompt: string, size: GenSize): Promise<GenResult> {
  if (!env.OPENAI_API_KEY) throw new Error('未設定 OPENAI_API_KEY');
  const model = env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  // gpt-image-1 與 dall-e-3 的尺寸與回傳格式不同：dall-e-3 橫式為 1792x1024 且取 b64；
  // gpt-image-1 橫式 1536x1024 且一律回 b64_json（不接受 response_format 參數）。
  const dalle = model === 'dall-e-3';
  const size3: Record<GenSize, string> = dalle
    ? { landscape: '1792x1024', square: '1024x1024', portrait: '1024x1792' }
    : { landscape: '1536x1024', square: '1024x1024', portrait: '1024x1536' };
  // 不送 response_format（dall-e-3 新版 API 不接受）；b64_json / url 兩種回應都接。
  // quality 壓低延遲（gpt-image 預設較慢易逾時）：env OPENAI_IMAGE_QUALITY，預設 low；dall-e-3 不送。
  const body: Record<string, unknown> = { model, prompt, n: 1, size: size3[size] };
  if (!dalle) body.quality = env.OPENAI_IMAGE_QUALITY || 'low';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI 生圖失敗（${res.status}）：${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return { b64: item.b64_json, mime: 'image/png' };
  if (item?.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new Error(`OpenAI 取圖失敗（${img.status}）`);
    const mime = img.headers.get('content-type') || 'image/png';
    return { b64: bytesToBase64(new Uint8Array(await img.arrayBuffer())), mime };
  }
  throw new Error('OpenAI 未回傳圖片');
}

/** Flux（經 fal 同步端點 fal.run）：回圖片 URL，worker 抓回轉 b64。 */
async function genFlux(env: Env, prompt: string, size: GenSize): Promise<GenResult> {
  if (!env.FAL_KEY) throw new Error('未設定 FAL_KEY，Flux 暫不可用');
  const sizeMap: Record<GenSize, string> = { landscape: 'landscape_4_3', square: 'square_hd', portrait: 'portrait_4_3' };
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${env.FAL_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: sizeMap[size], num_images: 1 }),
  });
  if (!res.ok) throw new Error(`Flux 生圖失敗（${res.status}）：${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { images?: { url?: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error('Flux 未回傳圖片');
  const img = await fetch(url);
  if (!img.ok) throw new Error(`Flux 取圖失敗（${img.status}）`);
  const mime = img.headers.get('content-type') || 'image/jpeg';
  return { b64: bytesToBase64(new Uint8Array(await img.arrayBuffer())), mime };
}

// ── Flux 走 fal 原生佇列（fal 自己撐生圖，worker 只「提交 + 轉發狀態」，不需 Cloudflare Queue）──
const FAL_MODEL_PATH = 'fal-ai/flux/schnell';
const FAL_SIZE: Record<GenSize, string> = { landscape: 'landscape_4_3', square: 'square_hd', portrait: 'portrait_4_3' };

/** 送 fal 佇列，回 request_id（jobId 用）。 */
async function falSubmit(env: Env, prompt: string, size: GenSize): Promise<string> {
  if (!env.FAL_KEY) throw new Error('未設定 FAL_KEY，Flux 暫不可用');
  const res = await fetch(`https://queue.fal.run/${FAL_MODEL_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Key ${env.FAL_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: FAL_SIZE[size], num_images: 1 }),
  });
  if (!res.ok) throw new Error(`Flux 送出失敗（${res.status}）：${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { request_id?: string };
  if (!data.request_id) throw new Error('Flux 未回傳 request_id');
  return data.request_id;
}

export type StatusResult =
  | { status: 'pending' }
  | { status: 'done'; b64: string; mime: string }
  | { status: 'error'; error: string };

/** 查 fal 佇列狀態；完成則取圖轉 b64。 */
async function falStatus(env: Env, requestId: string): Promise<StatusResult> {
  if (!env.FAL_KEY) return { status: 'error', error: '未設定 FAL_KEY' };
  const base = `https://queue.fal.run/${FAL_MODEL_PATH}/requests/${requestId}`;
  const stRes = await fetch(`${base}/status`, { headers: { Authorization: `Key ${env.FAL_KEY}` } });
  if (!stRes.ok) return { status: 'error', error: `Flux 狀態查詢失敗（${stRes.status}）` };
  const st = (await stRes.json()) as { status?: string };
  if (st.status !== 'COMPLETED') return { status: 'pending' }; // IN_QUEUE / IN_PROGRESS
  const rRes = await fetch(base, { headers: { Authorization: `Key ${env.FAL_KEY}` } });
  if (!rRes.ok) return { status: 'error', error: `Flux 取結果失敗（${rRes.status}）` };
  const data = (await rRes.json()) as { images?: { url?: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) return { status: 'error', error: 'Flux 未回傳圖片' };
  const img = await fetch(url);
  if (!img.ok) return { status: 'error', error: `Flux 取圖失敗（${img.status}）` };
  const mime = img.headers.get('content-type') || 'image/jpeg';
  return { status: 'done', b64: bytesToBase64(new Uint8Array(await img.arrayBuffer())), mime };
}

/** 從 Claude 回應文字抽出標籤陣列：容忍 ```json 包裹或前後雜訊，取第一個 [...]。 */
export function parseTagArray(text: string): string[] {
  const m = text.match(/\[[\s\S]*?\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean).slice(0, 8);
  } catch {
    return [];
  }
}

export interface StockPhoto {
  id: string; // 去重識別：'unsplash:<seg>' / 'pexels:<id>'
  provider: 'unsplash' | 'pexels';
  thumb: string;
  full: string;
  credit: string; // 攝影師
  creditUrl: string;
}

/**
 * 從圖庫圖 URL 取穩定識別（給去重用）。
 * unsplash: images.unsplash.com/photo-<seg> → 'unsplash:<seg>'
 * pexels:   images.pexels.com/photos/<id>/ → 'pexels:<id>'
 */
export function stockImageId(url: string): string | null {
  const u = url || '';
  const un = u.match(/images\.unsplash\.com\/photo-([\w-]+)/);
  if (un) return `unsplash:${un[1]}`;
  const px = u.match(/images\.pexels\.com\/photos\/(\d+)/);
  if (px) return `pexels:${px[1]}`;
  return null;
}

async function searchUnsplash(env: Env, query: string): Promise<StockPhoto[]> {
  if (!env.UNSPLASH_ACCESS_KEY) return [];
  const res = await fetch(`https://api.unsplash.com/search/photos?per_page=20&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: { urls?: { regular?: string; small?: string }; user?: { name?: string; links?: { html?: string } } }[] };
  return (data.results ?? []).flatMap((r) => {
    const full = r.urls?.regular ?? '';
    const id = stockImageId(full);
    if (!id) return [];
    return [{ id, provider: 'unsplash' as const, thumb: r.urls?.small ?? full, full, credit: r.user?.name ?? '', creditUrl: r.user?.links?.html ?? '' }];
  });
}

async function searchPexels(env: Env, query: string): Promise<StockPhoto[]> {
  if (!env.PEXELS_API_KEY) return [];
  const res = await fetch(`https://api.pexels.com/v1/search?per_page=20&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: env.PEXELS_API_KEY },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { photos?: { src?: { large?: string; medium?: string }; photographer?: string; photographer_url?: string }[] };
  return (data.photos ?? []).flatMap((p) => {
    const full = p.src?.large ?? '';
    const id = stockImageId(full);
    if (!id) return [];
    return [{ id, provider: 'pexels' as const, thumb: p.src?.medium ?? full, full, credit: p.photographer ?? '', creditUrl: p.photographer_url ?? '' }];
  });
}

// 生圖鐵律：畫面中若出現人物，一律鎖定台灣人。server 端強制附加於所有生圖 prompt，
// 不管 OpenAI/Flux、封面/內文，或使用者怎麼改 prompt 都會套用（只在真的有人物時生效）。
export function applyPeopleDirective(prompt: string): string {
  return `${prompt}\n\nImportant: if any people appear in the image, they must be Taiwanese (East Asian, natural Han Taiwanese appearance). Do not depict people of other ethnicities.`;
}

// 背景生圖 → 結果寫進 KV 工單（瀏覽器另以 /generate-status 輪詢取件）
async function runGen(env: Env, jobId: string, prompt: string, model: string | undefined, size: GenSize): Promise<void> {
  try {
    const out = model === 'flux' ? await genFlux(env, prompt, size) : await genOpenAI(env, prompt, size);
    await env.GEN_JOBS?.put(jobId, JSON.stringify({ status: 'done', ...out }), { expirationTtl: 900 });
  } catch (e) {
    await env.GEN_JOBS?.put(jobId, JSON.stringify({ status: 'error', error: e instanceof Error ? e.message : String(e) }), { expirationTtl: 900 });
  }
}

export async function handle(request: Request, env: Env, ctx?: CtxLike): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/config') {
    return json({
      openaiImageModel: env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      hasOpenAI: !!env.OPENAI_API_KEY,
      hasFal: !!env.FAL_KEY,
    }, 200, env);
  }

  // 非同步生圖：立刻回 jobId，背景生圖；瀏覽器以 /generate-status?id= 輪詢取件（不會 Failed to fetch）
  if (request.method === 'POST' && url.pathname === '/generate-async') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { prompt, model, size } = (await request.json()) as { prompt?: string; model?: string; size?: GenSize };
    if (!prompt || !prompt.trim()) return json({ error: '缺少 prompt' }, 400, env);
    const sz: GenSize = size === 'square' || size === 'portrait' ? size : 'landscape';
    const finalPrompt = applyPeopleDirective(prompt);

    // Flux：走 fal 原生佇列。jobId=`fal:<request_id>`，狀態直接查 fal，不動 Cloudflare Queue/KV。
    if (model === 'flux') {
      try {
        const reqId = await falSubmit(env, finalPrompt, sz);
        return json({ jobId: `fal:${reqId}` }, 200, env);
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : String(e) }, 502, env);
      }
    }

    // OpenAI：同步 API，無法查狀態 → 用 Cloudflare Queue consumer 扛 + KV 工單。
    if (!env.GEN_JOBS || !env.GEN_QUEUE) return json({ error: '未設定工單儲存/佇列' }, 500, env);
    const jobId = crypto.randomUUID();
    await env.GEN_JOBS.put(jobId, JSON.stringify({ status: 'pending' }), { expirationTtl: 900 });
    await env.GEN_QUEUE.send({ jobId, prompt: finalPrompt, model, size: sz } satisfies GenMessage);
    return json({ jobId }, 200, env);
  }

  // 輪詢工單狀態。jobId 不可猜（UUID / fal request_id）→ 不另做權限檢查，避免每次輪詢都打 GitHub。
  if (request.method === 'GET' && url.pathname === '/generate-status') {
    const id = url.searchParams.get('id');
    if (!id) return json({ error: '缺少 id' }, 400, env);
    // Flux：直接查 fal 佇列狀態
    if (id.startsWith('fal:')) {
      return json(await falStatus(env, id.slice(4)), 200, env);
    }
    // OpenAI：查 KV 工單
    const raw = await env.GEN_JOBS?.get(id);
    if (!raw) return json({ status: 'unknown' }, 200, env);
    return new Response(raw, { status: 200, headers: { 'content-type': 'application/json', ...cors(env) } });
  }

  // 同步生圖（舊版，保留相容；新前端走 /generate-async）
  if (request.method === 'POST' && url.pathname === '/generate') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { prompt, model, size } = (await request.json()) as { prompt?: string; model?: string; size?: GenSize };
    if (!prompt || !prompt.trim()) return json({ error: '缺少 prompt' }, 400, env);
    const sz: GenSize = size === 'square' || size === 'portrait' ? size : 'landscape';
    const finalPrompt = applyPeopleDirective(prompt);
    try {
      const out = model === 'flux' ? await genFlux(env, finalPrompt, sz) : await genOpenAI(env, finalPrompt, sz);
      return json(out, 200, env);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 502, env);
    }
  }

  if (request.method === 'POST' && url.pathname === '/tags') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { title, body } = (await request.json()) as { title?: string; body?: string };
    const prompt = `你是繁體中文健康內容編輯。根據以下文章標題與內文，提供 5-8 個精簡、具體的繁體中文主題標籤（每個 2-6 字，名詞或主題詞，不要井字號）。只輸出一個 JSON 字串陣列，例如 ["維他命D","骨質疏鬆"]，不要任何其他文字或說明。\n\n標題：${title ?? ''}\n\n內文：\n${(body ?? '').slice(0, 4000)}`;
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 256, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiRes.ok) return json({ error: `推薦標籤失敗（${aiRes.status}）` }, 502, env);
    const ai = (await aiRes.json()) as { content?: { type: string; text: string }[] };
    const text = ai.content?.find((c) => c.type === 'text')?.text ?? '';
    return json({ tags: parseTagArray(text) }, 200, env);
  }

  if (request.method === 'POST' && url.pathname === '/keywords') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { title, body } = (await request.json()) as { title?: string; body?: string };
    const prompt = `Based on this article title and excerpt, output 3-5 concise ENGLISH stock-photo search keywords (space-separated, no punctuation, no quotes) that match the topic visually. Output only the keywords.\n\nTitle: ${title ?? ''}\n\nExcerpt: ${(body ?? '').slice(0, 1500)}`;
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 64, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiRes.ok) return json({ error: `關鍵字產生失敗（${aiRes.status}）` }, 502, env);
    const ai = (await aiRes.json()) as { content?: { type: string; text: string }[] };
    const keywords = (ai.content?.find((c) => c.type === 'text')?.text ?? '').trim().replace(/["\n]+/g, ' ').trim();
    return json({ keywords }, 200, env);
  }

  if (request.method === 'POST' && url.pathname === '/stock') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { keywords, exclude } = (await request.json()) as { keywords?: string; exclude?: string[] };
    if (!keywords || !keywords.trim()) return json({ error: '缺少關鍵字' }, 400, env);
    const ex = new Set(exclude ?? []);
    const [u, p] = await Promise.all([searchUnsplash(env, keywords), searchPexels(env, keywords)]);
    // 交錯合併兩家結果，濾掉已用過的圖
    const merged: StockPhoto[] = [];
    for (let i = 0; i < Math.max(u.length, p.length); i++) {
      if (u[i]) merged.push(u[i]);
      if (p[i]) merged.push(p[i]);
    }
    return json({ photos: merged.filter((ph) => !ex.has(ph.id)) }, 200, env);
  }

  if (request.method === 'POST' && url.pathname === '/alt') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { title, hint } = (await request.json()) as { title?: string; hint?: string };
    const prompt = `為一篇標題為「${title ?? ''}」的健康文章封面圖，寫一句精簡的繁體中文替代文字（alt，描述畫面內容，15-30 字，不要加引號或「圖片：」前綴）。${hint ? `畫面線索：${hint}` : ''}`;
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 128, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiRes.ok) return json({ error: `alt 產生失敗（${aiRes.status}）` }, 502, env);
    const ai = (await aiRes.json()) as { content?: { type: string; text: string }[] };
    const alt = (ai.content?.find((c) => c.type === 'text')?.text ?? '').trim().replace(/^["「]+|["」]+$/g, '');
    return json({ alt }, 200, env);
  }

  if (request.method === 'POST' && url.pathname === '/suggest') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { task, context, selection } = (await request.json()) as { task: string; context: Record<string, unknown>; selection: string };
    const prompt = buildPrompt(task, context, selection);
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    const ai = (await aiRes.json()) as { content?: { type: string; text: string }[] };
    const suggestion = ai.content?.find((c) => c.type === 'text')?.text ?? '';
    return json({ suggestion }, 200, env);
  }

  // ── Slack ✅ 核准閘 ───────────────────────────────────────────────────────
  // Slack 按鈕互動回呼（驗簽在 handler 內，不走 requirePush/CORS）。
  if (request.method === 'POST' && url.pathname === '/slack/interact') {
    return handleSlackInteract(request, env, ctx);
  }

  // 草稿預覽網頁（從 Slack 的「📄 預覽全文」連結按鈕在瀏覽器開啟）。公開、noindex，不需認證。
  if (request.method === 'GET' && url.pathname === '/gate/preview') {
    const id = url.searchParams.get('id') || '';
    const rec = await getGate(env, id);
    const html = rec
      ? renderPreviewHtml(rec)
      : '<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem"><h1>草稿不存在</h1><p>這份草稿可能已發佈、已退稿，或已過期。</p></body>';
    return new Response(html, { status: rec ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  // draft-cron 出草稿後存進 KV（供預覽網頁 + 狀態機）。以 GitHub push token 認證。
  if (request.method === 'PUT' && url.pathname === '/gate/draft') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const b = (await request.json()) as Partial<GateRecord>;
    if (!b.id || !b.channel || !b.slack_ts) return json({ error: '缺少 id/channel/slack_ts' }, 400, env);
    const rec: GateRecord = {
      id: b.id, type: b.type || '', slug: b.slug || '', title: b.title || b.slug || '',
      summary: b.summary || '', content: b.content || '', channel: b.channel, slack_ts: b.slack_ts,
      state: 'pending', updated: 0,
    };
    await putGate(env, rec);
    return json({ ok: true }, 200, env);
  }

  // 主機 publish-approved 輪詢草稿狀態。以 GitHub push token 認證。
  if (request.method === 'GET' && url.pathname === '/gate/state') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const id = url.searchParams.get('id');
    if (!id) return json({ error: '缺少 id' }, 400, env);
    const rec = await getGate(env, id);
    if (!rec) return json({ state: 'unknown' }, 200, env);
    return json({ state: rec.state, by: rec.by ?? null, title: rec.title }, 200, env);
  }

  // 主機發布完成後把狀態收斂為 published（含上線網址）；或退稿/過期清除後設 terminal。
  if (request.method === 'PUT' && url.pathname === '/gate/state') {
    const denied = await requirePush(request, env);
    if (denied) return denied;
    const { id, state, url: liveUrl } = (await request.json()) as { id?: string; state?: GateRecord['state']; url?: string };
    if (!id || !state) return json({ error: '缺少 id/state' }, 400, env);
    const rec = await getGate(env, id);
    if (!rec) return json({ ok: true, note: 'gone' }, 200, env);
    rec.state = state;
    if (liveUrl) rec.url = liveUrl;
    await putGate(env, rec);
    return json({ ok: true }, 200, env);
  }

  return new Response('not found', { status: 404, headers: cors(env) });
}

export { buildPrompt };
