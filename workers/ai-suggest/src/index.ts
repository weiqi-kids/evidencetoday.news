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

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  return new Response('not found', { status: 404, headers: cors(env) });
}

export { buildPrompt };
