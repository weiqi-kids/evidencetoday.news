// 查 GitHub Actions 上 deploy.yml 在 main 的最新一次執行狀態。
// 用於存檔後輪詢「部署是否完成」。公開 repo 的 Actions 一般可讀；
// 若 token 權限不足或出錯，回 null（呼叫端據此放棄輪詢、退回時間提示）。
const OWNER = 'weiqi-kids';
const REPO = 'evidencetoday.news';

export type DeployRun = { id: number; status: string; conclusion: string | null };

export async function latestDeployRun(token: string): Promise<DeployRun | null> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/deploy.yml/runs?branch=main&per_page=1`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    workflow_runs?: { id: number; status: string; conclusion: string | null }[];
  };
  const run = data.workflow_runs?.[0];
  if (!run) return null;
  return { id: run.id, status: run.status, conclusion: run.conclusion };
}
