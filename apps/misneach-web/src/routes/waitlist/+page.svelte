<script lang="ts">
  import { page } from '$app/state';
  import { MisButton, MisInput } from '@decyphr/misneach-ui';

  type Interest = 'business_pack' | 'individual_course_access';

  let name = '';
  let email = '';
  let loading = false;
  let success = false;
  let alreadyJoined = false;
  let error = '';

  const defaultInterest = page.url.searchParams.get('interest');
  let interest: Interest =
    defaultInterest === 'business_pack' ? 'business_pack' : 'individual_course_access';

  async function submit() {
    error = '';
    success = false;
    loading = true;

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          interest,
          source: `${page.url.pathname}${page.url.search}`,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to join waitlist');
      }

      success = true;
      alreadyJoined = Boolean(payload?.alreadyJoined);
      email = '';
      name = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to join waitlist';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Join the waitlist — Misneach</title>
</svelte:head>

<section class="waitlist-shell">
  <div class="waitlist-card">
    <a class="back-link" href="/">← Back to Misneach</a>
    <h1>Join the waitlist</h1>
    <p class="sub">Tell us whether you're waiting for business pack access or individual course access.</p>

    <div class="interest-row">
      <button
        class:active={interest === 'individual_course_access'}
        type="button"
        on:click={() => (interest = 'individual_course_access')}
      >
        Individual course access
      </button>
      <button
        class:active={interest === 'business_pack'}
        type="button"
        on:click={() => (interest = 'business_pack')}
      >
        Business pack
      </button>
    </div>

    <form
      on:submit|preventDefault={submit}
      class="form"
    >
      <label>
        Name (optional)
        <MisInput bind:value={name} type="text" placeholder="Jane Murphy" />
      </label>
      <label>
        Email
        <MisInput bind:value={email} type="email" placeholder="jane@example.com" required />
      </label>

      <MisButton type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Joining...' : 'Join waitlist'}
      </MisButton>
    </form>

    {#if success}
      <p class="ok">{alreadyJoined ? 'You are already on this waitlist.' : 'You are on the waitlist.'}</p>
    {/if}
    {#if error}
      <p class="err">{error}</p>
    {/if}
  </div>
</section>

<style>
  .waitlist-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 10% 10%, #f5f0e8, #e8dfcf 60%, #ddd2be 100%);
    padding: 24px;
  }

  .waitlist-card {
    width: min(640px, 100%);
    background: #fff;
    border: 1px solid #e5dccb;
    border-radius: 18px;
    box-shadow: 0 24px 80px rgba(28, 43, 34, 0.08);
    padding: 28px;
  }

  h1 {
    margin: 6px 0 8px;
    font-size: 34px;
    line-height: 1.05;
  }

  .sub {
    color: #5b5b5b;
    margin: 0 0 20px;
  }

  .interest-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }

  .interest-row button {
    border: 1px solid #d7cebc;
    border-radius: 10px;
    padding: 10px 12px;
    background: #f6f1e8;
    cursor: pointer;
    font-weight: 600;
  }

  .interest-row button.active {
    background: #1c2b22;
    color: #f5f0e8;
    border-color: #1c2b22;
  }

  .form {
    display: grid;
    gap: 12px;
  }

  label {
    display: grid;
    gap: 6px;
    font-size: 14px;
    color: #424242;
  }

  .submit-btn {
    margin-top: 8px;
    width: 100%;
  }

  .ok {
    color: #136d3f;
    margin: 12px 0 0;
  }

  .err {
    color: #b42318;
    margin: 12px 0 0;
  }

  .back-link {
    color: #4b5a50;
    text-decoration: none;
    font-size: 14px;
  }
</style>
