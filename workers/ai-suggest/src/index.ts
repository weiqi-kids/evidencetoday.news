import { buildPrompt } from './prompt';

export interface Env {
  ANTHROPIC_API_KEY: string; // wrangler secret
  ANTHROPIC_MODEL: string;
  ALLOWED_ORIGIN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

export default { async fetch(req: Request, env: Env) { return handle(req, env); } };

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

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/suggest') {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: '缺少授權' }, 401, env);

    // 驗證 token 對 repo 有 push 權
    const repoRes = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'et-ai-suggest' },
    });
    const repo = (await repoRes.json()) as { permissions?: { push?: boolean } };
    if (!repo.permissions?.push) return json({ error: '無 repo 寫入權' }, 403, env);

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

  return new Response('not found', { status: 404, headers: cors(env) });
}

export { buildPrompt };
