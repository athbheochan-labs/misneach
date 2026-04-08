<script lang="ts">
  import { MisButton, MisInput } from '@decyphr/misneach-ui';
  import { requestMagicLink } from '$lib/api/auth-client';

  type ViewState = 'unsent' | 'success' | 'error';

  let email = '';
  let sentEmail = '';
  let state: ViewState = 'unsent';
  let loading = false;
  let emailError = '';
  let errorDetail = "We weren't able to reach our email service. This is usually temporary — please try again in a moment.";

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function clearError() {
    emailError = '';
  }

  async function sendLink(event?: SubmitEvent) {
    event?.preventDefault();
    clearError();

    const nextEmail = email.trim();
    if (!isValidEmail(nextEmail)) {
      emailError = 'Please enter a valid email address.';
      return;
    }

    loading = true;
    try {
      const res = await requestMagicLink(nextEmail);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorDetail = data?.error || 'The link did not go out. Please try again.';
        state = 'error';
        return;
      }

      sentEmail = nextEmail;
      state = 'success';
    } catch {
      errorDetail = "We couldn't reach the auth service. Please try again in a moment.";
      state = 'error';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    state = 'unsent';
    emailError = '';
  }
</script>

<svelte:head>
  <title>Misneach — Sign in</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="bg">
  <div class="bg-grain"></div>
  <div class="bg-glow"></div>
  <svg class="bg-mark" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M100 10C47 10,15 42,15 80C15 120,47 150,95 152L80 190L122 152C160 148,185 120,185 80C185 42,153 10,100 10Z" fill="white" />
    <path d="M82 118C88 95,105 75,118 62" stroke="#1c2b22" stroke-width="10" stroke-linecap="round" />
    <circle cx="82" cy="116" r="8" fill="#7ec99a" />
  </svg>
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

    <div class="state" class:active={state === 'unsent'}>
      <div class="heading">
        <div class="h-eyebrow">Welcome back</div>
        <div class="h-title">Sign <em>in.</em></div>
        <div class="h-sub">Enter your email and we'll send you a link. No password needed.</div>
      </div>

      <form class="field" on:submit={sendLink}>
        <label for="email-input">Email address</label>
        <div class="input-wrap">
          <MisInput
            type="email"
            id="email-input"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
            inputmode="email"
            invalid={Boolean(emailError)}
            className="auth-input"
            oninput={clearError}
          />
        </div>
        <div class="field-error" class:visible={Boolean(emailError)}>{emailError}</div>

        <MisButton className={`btn-submit ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
          <div class="spinner"></div>
          <span class="btn-text">{loading ? 'Sending...' : 'Send magic link'}</span>
        </MisButton>
      </form>

      <div class="note">
        Don't have an account? <a href="https://misneach.site/pricing">Start for free</a> — no card required.
      </div>
    </div>

    <div class="state" class:active={state === 'success'}>
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>

      <div class="heading">
        <div class="h-eyebrow">Check your inbox</div>
        <div class="h-title">Link <em>sent.</em></div>
        <div class="h-sub">We've sent a sign-in link to:</div>
      </div>

      <div class="email-pill">
        <div class="email-pill-dot"></div>
        <div class="email-pill-text">{sentEmail}</div>
      </div>

      <div class="h-sub success-note">
        Click the link in that email to sign in. It expires after 15 minutes. If you don't see it, check spam.
      </div>

      <div class="resend-row">
        Wrong address, or nothing arrived?
        <MisButton variant="unstyled" size="none" className="resend-btn" type="button" onclick={goBack}>Try again</MisButton>
      </div>
    </div>

    <div class="state" class:active={state === 'error'}>
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div class="heading">
        <div class="h-eyebrow">Something went wrong</div>
        <div class="h-title">Couldn't <em>send.</em></div>
        <div class="h-sub">The link didn't go out. This is on us, not you.</div>
      </div>

      <div class="error-detail">{errorDetail}</div>
      <MisButton className="btn-retry" type="button" onclick={goBack}>← Try again</MisButton>

      <div class="note">
        If this keeps happening, <a href="mailto:hello@misneach.ie">get in touch</a> and we'll sort it out.
      </div>
    </div>
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
    --parch-dark: #e8e0d0;
    --muted: #5a7a64;
    --ink: #1a1a18;
    --error: #c0392b;
    --error-bg: rgba(192, 57, 43, 0.1);
    --error-border: rgba(192, 57, 43, 0.3);
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

  .bg-mark {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 340px;
    height: 340px;
    opacity: 0.035;
  }

  .page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }

  .card {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 0;
    animation: fadeUp 0.5s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 40px;
    text-decoration: none;
  }

  .brand-mark { width: 34px; height: 34px; }

  .brand-word {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: var(--parchment);
    line-height: 1;
  }

  .brand-word em { font-style: italic; font-weight: 300; color: var(--sage); }

  .state { display: none; flex-direction: column; gap: 24px; }
  .state.active { display: flex; }

  .heading { display: flex; flex-direction: column; gap: 8px; }

  .h-eyebrow {
    font-size: 9.5px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted);
  }

  .h-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 32px;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--parchment);
  }

  .h-title em { font-style: italic; font-weight: 300; color: var(--sage); }

  .h-sub {
    font-size: 14px;
    line-height: 1.65;
    color: var(--muted);
    margin-top: 2px;
  }

  .field { display: flex; flex-direction: column; gap: 8px; }

  .field label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted);
  }

  .input-wrap { position: relative; }

  .input-wrap :global(.auth-input) {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 14px 18px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: var(--parchment);
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    -webkit-appearance: none;
  }

  .input-wrap :global(.auth-input)::placeholder { color: rgba(90, 122, 100, 0.5); }
  .input-wrap :global(.auth-input):focus { border-color: var(--sage); background: rgba(255, 255, 255, 0.07); }
  .input-wrap :global(.auth-input.is-invalid) { border-color: var(--error-border); background: var(--error-bg); }

  :global(.btn-submit) {
    width: 100%;
    background: var(--sage);
    color: var(--forest);
    border: none;
    border-radius: 12px;
    padding: 15px 24px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  :global(.btn-submit):hover {
    background: #8fd4a8;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(45, 122, 80, 0.3);
  }

  :global(.btn-submit):active { transform: translateY(0); }

  :global(.btn-submit):disabled {
    background: rgba(126, 201, 154, 0.25);
    color: rgba(28, 43, 34, 0.4);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  :global(.btn-submit) .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(28, 43, 34, 0.3);
    border-top-color: var(--forest);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: none;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  :global(.btn-submit.loading) .btn-text { opacity: 0.5; }
  :global(.btn-submit.loading) .spinner { display: block; }

  .field-error {
    font-size: 12px;
    color: #e88;
    display: none;
    animation: fadeIn 0.2s ease;
  }

  .field-error.visible { display: block; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

  .note {
    font-size: 12px;
    color: var(--muted);
    text-align: center;
    line-height: 1.6;
  }

  .note a {
    color: var(--sage);
    text-decoration: none;
    border-bottom: 1px solid rgba(126, 201, 154, 0.3);
    transition: border-color 0.15s;
  }

  .note a:hover { border-bottom-color: var(--sage); }

  .success-icon {
    width: 64px;
    height: 64px;
    background: rgba(45, 122, 80, 0.15);
    border: 1.5px solid rgba(45, 122, 80, 0.3);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes popIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
  .success-icon svg { width: 28px; height: 28px; color: var(--sage); }

  .email-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(126, 201, 154, 0.1);
    border: 1px solid rgba(126, 201, 154, 0.2);
    border-radius: 100px;
    padding: 6px 14px 6px 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--sage);
    max-width: 100%;
    overflow: hidden;
  }

  .email-pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sage);
    flex-shrink: 0;
    animation: pulse 2s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .email-pill-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .success-note { font-size: 13px; }

  .resend-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    flex-wrap: wrap;
  }

  :global(.resend-btn) {
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 15px;
    color: var(--sage);
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: opacity 0.15s;
  }

  :global(.resend-btn):hover { opacity: 0.75; }

  .error-icon {
    width: 64px;
    height: 64px;
    background: var(--error-bg);
    border: 1.5px solid var(--error-border);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: shake 0.4s ease both;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  .error-icon svg { width: 26px; height: 26px; color: #e88; }

  .error-detail {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.6;
    color: #e8a0a0;
  }

  :global(.btn-retry) {
    width: 100%;
    background: rgba(255, 255, 255, 0.06);
    color: var(--parchment);
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 14px 24px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.btn-retry):hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.22);
  }
</style>
