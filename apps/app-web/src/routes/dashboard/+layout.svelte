<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate, goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { clearAuthSession } from '$lib/mobile/session-storage';
  import { getAuthMe, requestLogout } from '$lib/api/auth-client';

  let { data, children } = $props();

  const navItems = [
    { href: '/dashboard/flashcards', label: 'Flashcards' },
    { href: '/dashboard/practice', label: 'Practice' },
    { href: '/dashboard/lexicon', label: 'Lexicon' },
  ];

  function routeSlideX(pathname: string) {
    if (pathname.includes('/phrasebook')) return 18;
    if (pathname.includes('/lexicon')) return -18;
    return 10;
  }

  function isActive(href: string) {
    const pathname = page.url.pathname;
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function avatarInitials() {
    const email = String(data?.auth?.email || '').trim();
    if (!email) return 'SB';
    const local = email.split('@')[0] || '';
    const compact = local.replace(/[^a-zA-Z]/g, '');
    if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
    if (compact.length === 1) return `${compact.toUpperCase()}X`;
    return 'SB';
  }

  function isImmersiveLessonRoute(pathname: string) {
    return /^\/dashboard\/courses\/[^/]+\/[^/]+$/.test(pathname);
  }

  const immersiveLessonRoute = $derived(isImmersiveLessonRoute(page.url.pathname));

  function initIcons() {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  }

  onMount(async () => {
    initIcons();
    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }
    if (auth.user?.role !== 'admin' && auth.user?.signupComplete === false) {
      await goto('/auth/signup');
    }
  });
  afterNavigate(initIcons);

  async function logout() {
    await requestLogout();
    await clearAuthSession();
    await goto('/auth/login');
  }
</script>

<div class="dash-app">
  {#if !immersiveLessonRoute}
    <nav class="dash-nav">
      <a href="/dashboard" class="nav-brand">
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#1c2b22"></path>
            <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none"></path>
            <circle cx="33.5" cy="45" r="3" fill="#7ec99a"></circle>
          </svg>
          <span class="nav-name">Misne<em>ach</em></span>
      </a>

      <div class="nav-right">
        <nav aria-label="Dashboard" class="dash-links">
          {#each navItems as item}
            <a href={item.href} class:active={isActive(item.href)}>{item.label}</a>
          {/each}
        </nav>

        <details class="nav-profile" role="group">
          <summary class="nav-avatar nav-avatar-btn" title="Account">
            {avatarInitials()}
          </summary>
          <div class="profile-dropdown" role="menu">
            <button type="button" class="profile-item danger" role="menuitem" onclick={logout}>
              Log out
            </button>
          </div>
        </details>
      </div>
    </nav>
  {/if}

  <main class="dash-main" class:dash-main--immersive={immersiveLessonRoute}>
    {#if immersiveLessonRoute}
      {@render children()}
    {:else}
      {#key page.url.pathname}
        <div in:fly={{ x: routeSlideX(page.url.pathname), duration: 220, opacity: 0.2 }} out:fade={{ duration: 120 }}>
          {@render children()}
        </div>
      {/key}
    {/if}
  </main>
</div>

<style>
  .dash-app {
    min-height: 100vh;
    background: var(--mis-bg);
  }

  .dash-nav {
    position: sticky;
    top: 0;
    z-index: 30;
    background: rgba(245, 240, 232, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--mis-border);
    padding: 0 40px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }

  .nav-name {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: var(--mis-forest);
  }

  .nav-name em {
    font-style: italic;
    font-weight: 300;
    color: var(--mis-green);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .dash-links {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .dash-links a {
    font-size: 13px;
    font-weight: 500;
    color: var(--mis-muted);
    text-decoration: none;
    transition: color 0.12s;
  }

  .dash-links a:hover {
    color: var(--mis-forest);
  }

  .dash-links a.active {
    color: var(--mis-forest);
    font-weight: 700;
  }

  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--mis-forest);
    border: 2px solid var(--mis-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 13px;
    color: var(--mis-parchment);
  }

  .nav-profile {
    position: relative;
    list-style: none;
  }

  .nav-profile > summary {
    list-style: none;
  }

  .nav-profile > summary::-webkit-details-marker {
    display: none;
  }

  .nav-avatar-btn {
    border: none;
    padding: 0;
    cursor: pointer;
    user-select: none;
  }

  .nav-avatar-btn:hover {
    opacity: 0.92;
  }

  .nav-profile[open] .nav-avatar-btn {
    box-shadow: 0 0 0 2px rgba(45, 122, 80, 0.22);
  }

  .profile-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 160px;
    border-radius: 12px;
    border: 1px solid var(--mis-border);
    background: #fff;
    box-shadow: 0 16px 36px rgba(19, 31, 24, 0.16);
    overflow: hidden;
    z-index: 20;
  }

  .profile-item {
    display: block;
    width: 100%;
    border: none;
    background: transparent;
    padding: 10px 12px;
    text-align: left;
    font-size: 13px;
    color: var(--text-1);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .profile-item:hover {
    background: var(--mis-parchment);
    color: var(--mis-forest);
  }

  .profile-item.danger {
    color: #9a2424;
  }

  .dash-main {
    padding: 0;
  }

  .dash-main--immersive {
    min-height: 100vh;
  }

  @media (max-width: 860px) {
    .dash-nav {
      padding: 0 20px;
    }

    .dash-links {
      gap: 14px;
    }
  }
</style>
