<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe, updateProfile, type AuthUser } from '$lib/api/auth-client';

  let user: AuthUser | null = null;
  let displayName = '';
  let reminderEnabled = true;
  let reminderTime = '09:00';
  let saving = false;
  let status = '';

  function fallbackName(email?: string | null) {
    const local = String(email || '').split('@')[0] || 'Learner';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  $: initials = (displayName || fallbackName(user?.email))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'M';

  async function loadProfile() {
    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }
    user = auth.user;
    displayName = user?.displayName || fallbackName(user?.email);
    reminderEnabled = user?.dailyReminderEnabled ?? true;
    reminderTime = user?.dailyReminderTime || '09:00';
  }

  async function save() {
    saving = true;
    status = '';
    try {
      const result = await updateProfile({
        displayName,
        dailyReminderEnabled: reminderEnabled,
        dailyReminderTime: reminderTime,
      });
      user = result.user;
      status = 'Saved';
    } catch (error) {
      status = error instanceof Error ? error.message : 'Unable to save';
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    void loadProfile();
  });
</script>

<svelte:head>
  <title>Profile - Misneach</title>
</svelte:head>

<div class="page">
  <header class="subhead">
    <a href="/me" class="back" aria-label="Back to Me">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
    </a>
    <div>
      <p class="eyebrow">Profile</p>
      <h1>Your details</h1>
    </div>
  </header>

  <section class="panel hero-panel">
    <div class="avatar">{initials}</div>
    <div>
      <h2>{displayName || fallbackName(user?.email)}</h2>
      <p>{user?.email}</p>
    </div>
  </section>

  <section class="panel form-panel">
    <div class="section-label">Personal details</div>
    <label>
      <span>Name</span>
      <input bind:value={displayName} type="text" autocomplete="name" />
    </label>

    <label>
      <span>Email</span>
      <input value={user?.email || ''} type="email" disabled />
      <small>Used for magic link sign in</small>
    </label>
  </section>

  <section class="panel form-panel">
    <div class="section-label">Notifications</div>
    <div class="reminder-row">
      <div>
        <strong>Daily reminder</strong>
        <small>{reminderTime} every day</small>
      </div>
      <button
        type="button"
        class:off={!reminderEnabled}
        class="toggle"
        role="switch"
        aria-checked={reminderEnabled}
        aria-label="Toggle daily reminder"
        onclick={() => (reminderEnabled = !reminderEnabled)}
      >
        <span></span>
      </button>
    </div>

    <label>
      <span>Reminder time</span>
      <input bind:value={reminderTime} type="time" disabled={!reminderEnabled} />
    </label>
  </section>

  <button class="save" type="button" disabled={saving} onclick={save}>
    {saving ? 'Saving...' : 'Save changes'}
  </button>
  {#if status}
    <p class="status">{status}</p>
  {/if}
</div>

<style>
  .page {
    display: grid;
    gap: 14px;
    max-width: 780px;
  }

  .subhead {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .back {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #e8e0d0;
    color: #1c2b22;
    display: grid;
    place-items: center;
  }

  .eyebrow,
  .section-label {
    margin: 0 0 7px;
    color: #5a7a64;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
    font-family: 'Fraunces', serif;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  h1 {
    font-size: clamp(28px, 4vw, 42px);
  }

  h2 {
    font-size: 26px;
  }

  .panel {
    border: 1px solid #e8e0d0;
    border-radius: 16px;
    background: #fffdf8;
    padding: 18px;
  }

  .hero-panel {
    background: #1c2b22;
    color: #f5f0e8;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .hero-panel h2 {
    color: #f5f0e8;
  }

  .hero-panel p {
    margin: 4px 0 0;
    color: rgba(245, 240, 232, 0.52);
  }

  .avatar {
    width: 74px;
    height: 74px;
    border-radius: 50%;
    background: rgba(126, 201, 154, 0.16);
    border: 2px solid rgba(126, 201, 154, 0.28);
    color: #7ec99a;
    display: grid;
    place-items: center;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 28px;
  }

  .form-panel {
    display: grid;
    gap: 14px;
  }

  label {
    display: grid;
    gap: 5px;
  }

  label span {
    color: #5a7a64;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  input {
    width: 100%;
    border: 1px solid #e8e0d0;
    border-radius: 12px;
    background: #fff;
    color: #1c2b22;
    font: inherit;
    padding: 12px 13px;
  }

  input:disabled {
    color: #8d968f;
    background: #f5f0e8;
  }

  small {
    color: #8d968f;
    font-size: 12px;
  }

  .reminder-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #e8e0d0;
    padding-bottom: 14px;
  }

  .reminder-row strong {
    display: block;
    color: #1c2b22;
    font-size: 14px;
  }

  .toggle {
    width: 48px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: #2d7a50;
    padding: 3px;
    cursor: pointer;
  }

  .toggle span {
    display: block;
    width: 22px;
    height: 22px;
    margin-left: auto;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  }

  .toggle.off {
    background: #d8d1c4;
  }

  .toggle.off span {
    margin-left: 0;
  }

  .save {
    border: 0;
    border-radius: 13px;
    background: #1c2b22;
    color: #f5f0e8;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    padding: 14px 18px;
  }

  .save:disabled {
    opacity: 0.68;
    cursor: progress;
  }

  .status {
    margin: 0;
    color: #5a7a64;
    font-weight: 700;
  }

  @media (max-width: 620px) {
    .hero-panel {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
