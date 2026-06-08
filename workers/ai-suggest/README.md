# evidencetoday AI 建議 Worker

## 設定
`cd workers/ai-suggest && npx wrangler secret put ANTHROPIC_API_KEY`
（wrangler.toml 已含 ANTHROPIC_MODEL、ALLOWED_ORIGIN、GITHUB_OWNER/REPO）

## 部署
`cd workers/ai-suggest && npx wrangler deploy`

## 安全
- 端點呼叫前以呼叫者的 GitHub token 驗證對 repo 有 push 權，無權回 403，避免付費 API 被濫用。
- CORS 僅允許 ALLOWED_ORIGIN。
