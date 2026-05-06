<script lang="ts">
  import { requestMagicLink } from '$lib/api/auth-client';

  type ViewState = 'unsent' | 'success' | 'error';

  let email = '';
  let sentEmail = '';
  let state: ViewState = 'unsent';
  let loading = false;
  let emailError = '';
  let errorDetail =
    "We weren't able to reach the sign-in service. This is usually temporary. Please try again.";

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
      emailError = 'Enter a valid email address.';
      return;
    }

    loading = true;
    try {
      const res = await requestMagicLink(nextEmail);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorDetail = data?.error || 'The sign-in link did not go out. Please try again.';
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

  function tryAgain() {
    state = 'unsent';
    emailError = '';
  }
</script>

<svelte:head>
  <title>Misneach - Sign in</title>
  <meta name="description" content="Sign in to Misneach with a secure magic link." />
</svelte:head>

<div class="shell">
  <div class="card">
    <a class="brand" href="/">
      <span class="mark" aria-hidden="true"></span>
      <span>Misne<em>ach</em></span>
    </a>

    {#if state === 'unsent'}
      <p class="eyebrow">Welcome back</p>
      <h1>Sign in to <em>Misneach.</em></h1>
      <p class="lede">
        Enter your email address and we'll send you a secure sign-in link.
      </p>

      <form on:submit={sendLink} class="form">
        <label for="email">Email address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
          on:input={clearError}
          aria-invalid={Boolean(emailError)}
        />
        {#if emailError}
          <p class="error">{emailError}</p>
        {/if}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending link...' : 'Send magic link'}
        </button>
      </form>
    {:else if state === 'success'}
      <p class="eyebrow">Check your inbox</p>
      <h1>Magic link <em>sent.</em></h1>
      <p class="lede">We sent a sign-in link to <strong>{sentEmail}</strong>.</p>
      <p class="detail">
        Open the email on this device to continue. The link expires after 15 minutes.
      </p>
      <button type="button" class="secondary" on:click={tryAgain}>Use a different email</button>
    {:else}
      <p class="eyebrow">Something went wrong</p>
      <h1>Could not send the <em>link.</em></h1>
      <p class="detail">{errorDetail}</p>
      <button type="button" on:click={tryAgain}>Try again</button>
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

  .lede,
  .detail {
    margin: 0 0 20px;
    line-height: 1.65;
    color: rgba(245, 240, 232, 0.84);
  }

  .form {
    display: grid;
    gap: 12px;
  }

  label {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(245, 240, 232, 0.86);
  }

  input {
    width: 100%;
    border: 1px solid rgba(126, 201, 154, 0.22);
    background: rgba(245, 240, 232, 0.06);
    color: #f5f0e8;
    border-radius: 14px;
    padding: 14px 16px;
    font: inherit;
  }

  input:focus {
    outline: 2px solid rgba(126, 201, 154, 0.45);
    outline-offset: 2px;
  }

  button {
    margin-top: 6px;
    border: 0;
    border-radius: 999px;
    padding: 14px 18px;
    font: inherit;
    font-weight: 700;
    background: #7ec99a;
    color: #162219;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.7;
    cursor: progress;
  }

  .secondary {
    background: transparent;
    color: #f5f0e8;
    border: 1px solid rgba(126, 201, 154, 0.25);
  }

  .error {
    margin: 0;
    color: #ffb1ab;
    font-size: 0.92rem;
  }
</style>
