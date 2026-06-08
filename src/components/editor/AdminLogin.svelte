<script>
  import { onMount } from 'svelte';
  import { getToken, setToken, clearToken } from '@/utils/editor/token';

  // 實際 Worker 網域（workers.dev 子網域 lightman-chang）
  const WORKER = 'https://evidencetoday-github-oauth.lightman-chang.workers.dev';
  let loggedIn = $state(false);

  onMount(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('token');
    const state = hash.get('state');
    const expected = sessionStorage.getItem('et_oauth_state');
    if (token && state && state === expected) {
      setToken(token);
      sessionStorage.removeItem('et_oauth_state');
      history.replaceState(null, '', location.pathname); // 清掉 fragment
    }
    loggedIn = !!getToken();
  });

  function login() {
    const state = Math.random().toString(36).slice(2); // 僅作 CSRF 對照，非密鑰
    sessionStorage.setItem('et_oauth_state', state);
    location.href = `${WORKER}/auth?state=${state}`;
  }
  function logout() {
    clearToken();
    loggedIn = false;
  }
</script>

{#if loggedIn}
  <p class="et-status">✓ 已登入。請從下方「怎麼編輯文章？」前往文章頁，右下角會浮出「編輯」鈕。</p>
  <button class="et-btn" onclick={logout}>登出</button>
{:else}
  <button class="et-btn et-btn--primary" onclick={login}>用 GitHub 登入</button>
{/if}

<style>
  .et-status {
    color: var(--color-ink);
    margin-bottom: 0.5rem;
  }
  .et-btn {
    min-height: 44px;
    padding: 0.6rem 1.25rem;
    border: 1px solid var(--color-fog);
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: var(--text-meta);
    font-weight: 600;
    color: var(--color-ink);
    background: color-mix(in oklch, var(--color-paper) 40%, white);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .et-btn:hover { background: var(--color-teal-subtle); }
  .et-btn:focus-visible { outline: 2px solid var(--color-teal); outline-offset: 2px; }
  .et-btn--primary { background: var(--color-teal); border-color: var(--color-teal); color: white; }
  .et-btn--primary:hover { background: var(--color-teal-hover); border-color: var(--color-teal-hover); }
</style>
