const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

// UTF-8 安全的 base64（瀏覽器與 node 皆可）
function encodeBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getFile(path: string, token: string): Promise<{ content: string; sha: string }> {
  const res = await fetch(`${API}/${path}?ref=main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`getFile ${res.status}`);
  const data = (await res.json()) as { content: string; sha: string };
  return { content: decodeBase64(data.content), sha: data.sha };
}

export async function putFile(args: {
  path: string; content: string; sha: string | null; message: string; token: string;
}): Promise<number> {
  const body: Record<string, unknown> = {
    message: args.message,
    content: encodeBase64(args.content),
    branch: 'main',
  };
  if (args.sha) body.sha = args.sha;
  const res = await fetch(`${API}/${args.path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${args.token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}
