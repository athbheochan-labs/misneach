<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { exchangeMagicLink } from '$lib/api/auth-client';
  import { saveAuthSession } from '$lib/mobile/session-storage';

  let message = 'Verifying your sign-in link...';
  let state: 'loading' | 'error' = 'loading';
  let lastQuery = '';
  let lastAttemptKey = '';

  async function verifyFromUrl(url: URL) {
    const token = (url.searchParams.get('token') || '')
      .trim()
      .replace(/[^a-f0-9]/gi, '')
      .toLowerCase();
    const email = (url.searchParams.get('email') || '')
      .trim()
      .replace(/^mailto:/i, '')
      .toLowerCase();
    const attemptKey = `${email}|${token}`;

    if (!token || !email) {
      state = 'error';
      message = 'Invalid verification link.';
      return;
    }

    if (attemptKey === lastAttemptKey) return;
    lastAttemptKey = attemptKey;
    state = 'loading';
    message = 'Verifying your sign-in link...';

    const res = await exchangeMagicLink(email, token);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      state = 'error';
      message = data?.error || 'Verification failed.';
      return;
    }

    if (!data?.accessToken || !data?.refreshToken) {
      state = 'error';
      message = 'Verification succeeded but the session token bundle was missing.';
      return;
    }

    await saveAuthSession({
      accessToken: String(data.accessToken),
      refreshToken: String(data.refreshToken),
      expiresInSec: Number(data.expiresInSec || 0) || undefined,
      issuedAtEpochSec: Math.floor(Date.now() / 1000),
    });

    await goto('/business');
  }

  onMount(() => {
    const unsubscribe = page.subscribe(($page) => {
      if ($page.url.pathname !== '/auth/verify-request') return;
      const query = $page.url.search;
      if (query === lastQuery) return;
      lastQuery = query;
      void verifyFromUrl($page.url);
    });

    return () => unsubscribe();
  });
</script>

<svelte:head>
  <title>Misneach - Verifying sign in</title>
</svelte:head>

<div class="shell">
  <div class="card">
    <a class="brand" href="/">
      <span class="mark" aria-hidden="true"></span>
      <span>Misne<em>ach</em></span>
    </a>

    <p class="eyebrow">Magic link</p>
    <h1>Signing you <em>in.</em></h1>
    <p class="detail">{message}</p>

    {#if state === 'loading'}
      <div class="spinner" aria-hidden="true"></div>
    {:else}
      <a class="retry" href="/auth/login">Back to sign in</a>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top, rgba(126, 201, 154, 0.18), transparent 32%),
      linear-gradient(180deg, #18261e 0%, #0f1712 100%);
    color: #f5f0e8;
    font-family: 'Instrument Sans', system-ui, sans-serif;
  }

  .shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .card {
    width: min(100%, 480px);
    background: rgba(18, 29, 22, 0.88);
    border: 1px solid rgba(126, 201, 154, 0.2);
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #f5f0e8;
    text-decoration: none;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 900;
    font-size: 1.2rem;
    margin-bottom: 28px;
  }

  .brand em,
  h1 em {
    color: #7ec99a;
    font-style: italic;
    font-weight: 400;
  }

  .mark {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #7ec99a;
    box-shadow: 18px -6px 0 -4px rgba(245, 240, 232, 0.95);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.75rem;
    color: rgba(245, 240, 232, 0.56);
    margin: 0 0 12px;
  }

  h1 {
    margin: 0 0 12px;
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .detail {
    margin: 0 0 20px;
    line-height: 1.65;
    color: rgba(245, 240, 232, 0.84);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 3px solid rgba(245, 240, 232, 0.18);
    border-top-color: #7ec99a;
    animation: spin 0.9s linear infinite;
  }

  .retry {
    color: #7ec99a;
    text-decoration: none;
    font-weight: 600;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
