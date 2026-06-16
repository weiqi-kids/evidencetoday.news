import { AI_WORKER } from './ai-worker';

/**
 * 合併標籤：保留現有清單與順序，把 suggested 中「尚未存在」的接在後面（去重）。
 * 比對為精確字串比對（去前後空白）。
 */
export function mergeTags(existing: string[], suggested: string[]): string[] {
  const norm = (s: string) => s.trim();
  const seen = new Set(existing.map(norm).filter(Boolean));
  const out = [...existing];
  for (const t of suggested) {
    const v = norm(t);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** 呼叫 worker /tags，請 Claude 依標題+內文推薦繁中標籤。回傳字串陣列。 */
export async function fetchSuggestedTags(args: { title: string; body: string; token: string }): Promise<string[]> {
  const res = await fetch(`${AI_WORKER}/tags`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${args.token}` },
    body: JSON.stringify({ title: args.title, body: args.body }),
  });
  const data = (await res.json()) as { tags?: string[]; error?: string };
  if (!res.ok) throw new Error(data.error || `推薦標籤失敗（${res.status}）`);
  return Array.isArray(data.tags) ? data.tags : [];
}
