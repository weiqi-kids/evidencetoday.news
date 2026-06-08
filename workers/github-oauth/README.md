# evidencetoday GitHub OAuth Worker

## 一次性設定
1. GitHub → Settings → Developer settings → OAuth Apps → New：
   - Homepage URL: https://evidencetoday.news
   - Authorization callback URL: https://<worker-網域>/callback
2. 取得 Client ID，填入 wrangler.toml 的 GITHUB_CLIENT_ID。
3. 設定 secret：`cd workers/github-oauth && npx wrangler secret put GITHUB_CLIENT_SECRET`

## 部署
`cd workers/github-oauth && npx wrangler deploy`

## 驗證
瀏覽 https://<worker-網域>/auth?state=test → 應導向 GitHub 授權頁。
