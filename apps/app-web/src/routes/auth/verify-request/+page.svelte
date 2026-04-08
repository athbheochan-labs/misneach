<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { saveAuthSession } from '$lib/mobile/session-storage';

  let message = 'Verifying your secure login link...';
  let state: 'loading' | 'error' = 'loading';
  let token = '';
  let email = '';

  async function verify() {
    if (!token || !email) {
      message = 'Invalid verification link';
      state = 'error';
      return;
    }

    const res = await apiFetch('/api/auth/verify-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, email })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      message = data?.error || 'Verification failed';
      state = 'error';
      return;
    }

    // Token bundle is optional for current web flow, but supported for mobile clients.
    if (data?.accessToken && data?.refreshToken) {
      await saveAuthSession({
        accessToken: String(data.accessToken),
        refreshToken: String(data.refreshToken),
        expiresInSec: Number(data.expiresInSec || 0) || undefined,
        issuedAtEpochSec: Math.floor(Date.now() / 1000),
      });
    }

    await goto(data?.next || '/dashboard');
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    token = params.get('token') || '';
    email = params.get('email') || '';
    await verify();
  });
</script>

<svelte:head>
  <title>Misneach - Verifying sign in</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="bg">
  <div class="bg-grain"></div>
  <div class="bg-glow"></div>
</div>

<div class="page">
  <div class="card">
    <a class="brand" href="/">
      <svg class="brand-mark" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M40 6C19 6,8 20,8 36C8 53,19 65,38 66L30 76L50 66C67 63,72 53,72 36C72 20,61 6,40 6Z" fill="rgba(126,201,154,0.12)" stroke="rgba(126,201,154,0.4)" stroke-width="1.5" />
        <path d="M33 48C36 38,44 28,50 22" stroke="#f5f0e8" stroke-width="4" stroke-linecap="round" />
        <circle cx="33.5" cy="47" r="3.5" fill="#7ec99a" />
      </svg>
      <div class="brand-word">Misne<em>ach</em></div>
    </a>

    <div class="heading">
      <div class="h-eyebrow">Magic link</div>
      <div class="h-title">Signing you <em>in.</em></div>
      <div class="h-sub">Please wait while we verify your secure login link.</div>
    </div>

    <div class="status" class:error={state === 'error'}>
      {#if state === 'loading'}
        <span class="spinner" aria-hidden="true"></span>
      {/if}
      <span>{message}</span>
    </div>

    {#if state === 'error'}
      <a href="/auth/login" class="retry">Back to sign in</a>
    {/if}
  </div>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :global(html), :global(body) {
    height: 100%;
    font-family: 'Instrument Sans', sans-serif;
    background: var(--forest);
    color: var(--parchment);
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  :global(:root) {
    --forest: #1c2b22;
    --forest-mid: #243320;
    --green: #2d7a50;
    --sage: #7ec99a;
    --parchment: #f5f0e8;
    --muted: #5a7a64;
    --error: #e07070;
  }

  .bg {
    position: fixed;
    inset: 0;
    background: var(--forest);
    overflow: hidden;
  }

  .bg-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.4;
    pointer-events: none;
  }

  .bg-glow {
    position: absolute;
    bottom: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse at center, rgba(45, 122, 80, 0.18) 0%, transparent 70%);
    pointer-events: none;
  }

  .page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .card {
    width: min(520px, 100%);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(126, 201, 154, 0.16);
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 30px 90px -40px rgba(0, 0, 0, 0.7);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    margin-bottom: 24px;
  }

  .brand-mark { width: 28px; height: 28px; }

  .brand-word {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 20px;
    letter-spacing: -0.03em;
    color: var(--parchment);
  }

  .brand-word em {
    font-style: italic;
    font-weight: 300;
    color: var(--sage);
  }

  .heading { margin-bottom: 16px; }

  .h-eyebrow {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(245, 240, 232, 0.35);
    font-weight: 700;
    margin-bottom: 10px;
  }

  .h-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(30px, 5vw, 40px);
    line-height: 1.02;
    letter-spacing: -0.04em;
    color: var(--parchment);
    margin-bottom: 8px;
  }

  .h-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--sage);
  }

  .h-sub {
    color: rgba(245, 240, 232, 0.45);
    font-size: 14px;
    line-height: 1.65;
  }

  .status {
    margin-top: 18px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 11px;
    border: 1px solid rgba(126, 201, 154, 0.25);
    background: rgba(126, 201, 154, 0.08);
    color: var(--sage);
    font-size: 14px;
    font-weight: 600;
  }

  .status.error {
    border-color: rgba(224, 112, 112, 0.35);
    background: rgba(224, 112, 112, 0.1);
    color: var(--error);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(245, 240, 232, 0.3);
    border-top-color: var(--parchment);
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }

  .retry {
    margin-top: 16px;
    display: inline-block;
    color: var(--parchment);
    text-decoration: underline;
    text-underline-offset: 2px;
    font-size: 14px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
