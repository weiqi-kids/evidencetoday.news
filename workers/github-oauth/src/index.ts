export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
  OAUTH_SCOPE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
};

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/auth') {
    const state = url.searchParams.get('state') ?? '';
    const redirectUri = `${url.origin}/callback`;
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('scope', env.OAUTH_SCOPE);
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('redirect_uri', redirectUri);
    return new Response(null, { status: 302, headers: { location: authorize.toString() } });
  }

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = (await tokenRes.json()) as { access_token?: string };
    if (!data.access_token) {
      return new Response('token exchange failed', { status: 502 });
    }
    const back = `${env.ALLOWED_ORIGIN}/admin#token=${data.access_token}&state=${state}`;
    return new Response(null, { status: 302, headers: { location: back } });
  }

  return new Response('not found', { status: 404 });
}
