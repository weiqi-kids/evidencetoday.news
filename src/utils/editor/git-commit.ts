// 用 Git Data API 把「多個檔案（圖片 + 文章 .mdx）」打包成單一 commit。
// 取代逐檔 Contents API PUT（原本生成/上傳圖各一 commit + 存檔一 commit）。
// 流程：取 ref → 取 base tree → 建各 blob → 建 tree(base_tree) → 建 commit → 更新 ref。
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

export interface CommitFile {
  path: string; // repo 內路徑，如 public/covers/x.webp 或 src/content/articles/y.mdx
  content: string; // utf-8 文字內容，或 base64（依 encoding）
  encoding?: 'utf-8' | 'base64';
}

export type CommitResult = { ok: true; sha: string } | { ok: false; status: number };

export async function commitFiles(args: {
  files: CommitFile[];
  message: string;
  token: string;
  branch?: string;
}): Promise<CommitResult> {
  const { files, message, token, branch = 'main' } = args;
  const base = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'content-type': 'application/json',
  };

  // 1) 取分支 ref → 最新 commit sha
  const refRes = await fetch(`${base}/git/ref/heads/${branch}`, { headers });
  if (!refRes.ok) return { ok: false, status: refRes.status };
  const baseCommitSha = ((await refRes.json()) as { object?: { sha?: string } }).object?.sha;
  if (!baseCommitSha) return { ok: false, status: 500 };

  // 2) 取該 commit → base tree sha
  const commitRes = await fetch(`${base}/git/commits/${baseCommitSha}`, { headers });
  if (!commitRes.ok) return { ok: false, status: commitRes.status };
  const baseTreeSha = ((await commitRes.json()) as { tree?: { sha?: string } }).tree?.sha;
  if (!baseTreeSha) return { ok: false, status: 500 };

  // 3) 每個檔案建 blob
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  for (const f of files) {
    const blobRes = await fetch(`${base}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: f.content, encoding: f.encoding ?? 'utf-8' }),
    });
    if (!blobRes.ok) return { ok: false, status: blobRes.status };
    const sha = ((await blobRes.json()) as { sha?: string }).sha;
    if (!sha) return { ok: false, status: 500 };
    treeItems.push({ path: f.path, mode: '100644', type: 'blob', sha });
  }

  // 4) 建 tree（接在 base tree 上）
  const treeRes = await fetch(`${base}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });
  if (!treeRes.ok) return { ok: false, status: treeRes.status };
  const newTreeSha = ((await treeRes.json()) as { sha?: string }).sha;
  if (!newTreeSha) return { ok: false, status: 500 };

  // 5) 建 commit
  const newCommitRes = await fetch(`${base}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, tree: newTreeSha, parents: [baseCommitSha] }),
  });
  if (!newCommitRes.ok) return { ok: false, status: newCommitRes.status };
  const newCommitSha = ((await newCommitRes.json()) as { sha?: string }).sha;
  if (!newCommitSha) return { ok: false, status: 500 };

  // 6) 更新 ref（非 fast-forward → 422，視為衝突）
  const updateRes = await fetch(`${base}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: newCommitSha, force: false }),
  });
  if (!updateRes.ok) return { ok: false, status: updateRes.status };
  return { ok: true, sha: newCommitSha };
}
