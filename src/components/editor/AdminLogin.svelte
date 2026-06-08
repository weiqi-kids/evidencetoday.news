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
  <p>已登入。全站文章現在會出現「編輯」按鈕。</p>
  <button onclick={logout}>登出</button>
{:else}
  <button onclick={login}>用 GitHub 登入</button>
{/if}
