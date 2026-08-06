<script lang="ts">
  import { page } from '$app/state';

  let { children } = $props();

  const navItems = [
    { href: '/me', label: 'Me' },
    { href: '/me/profile', label: 'Profile' },
    { href: '/me/subscription', label: 'Subscription' },
    { href: '/me/course-progress', label: 'Course' },
  ];

  const pathname = $derived(page.url.pathname);
</script>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="me-shell">
  <header class="topbar">
    <a class="brand" href="/">
      <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="M40 7 C19 7, 9 19, 9 34 C9 50, 19 61, 37 62 L30 73 L47 62 C63 60, 71 50, 71 34 C71 19, 61 7, 40 7Z" fill="#1c2b22"></path>
        <path d="M33 46 C35.5 37, 42 30, 47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none"></path>
        <circle cx="33.5" cy="45" r="3" fill="#7ec99a"></circle>
      </svg>
      <span>Misne<em>ach</em></span>
    </a>

    <nav class="top-links" aria-label="Account">
      <a class:active={pathname === '/me'} href="/me">Me</a>
      <details class="account-menu">
        <summary class="account-summary">Account</summary>
        <div class="account-menu-panel">
          {#each navItems.slice(1) as item}
            <a class:active={pathname === item.href} href={item.href}>{item.label}</a>
          {/each}
        </div>
      </details>
    </nav>
  </header>

  <main class="me-main">
    <aside class="side-nav" aria-label="Me section">
      <div class="side-title">Account</div>
      {#each navItems as item}
        <a class:active={pathname === item.href} href={item.href}>{item.label}</a>
      {/each}
    </aside>

    <section class="content">
      {@render children()}
    </section>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #f5f0e8;
    color: #1c2b22;
    font-family: 'Instrument Sans', system-ui, sans-serif;
  }

  .me-shell {
    --forest: #1c2b22;
    --moss: #2d7a50;
    --sage: #7ec99a;
    --muted: #5a7a64;
    --parchment: #f5f0e8;
    --parchment-dark: #e8e0d0;
    min-height: 100vh;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 62px;
    padding: 0 clamp(18px, 4vw, 44px);
    background: rgba(245, 240, 232, 0.92);
    border-bottom: 1px solid rgba(28, 43, 34, 0.1);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--forest);
    text-decoration: none;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 19px;
    letter-spacing: -0.03em;
    white-space: nowrap;
  }

  .brand em {
    color: var(--moss);
    font-style: italic;
    font-weight: 300;
  }

  .top-links {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .top-links a,
  .side-nav a,
  .account-summary {
    color: rgba(28, 43, 34, 0.68);
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }

  .top-links > a,
  .account-summary {
    border-radius: 999px;
    padding: 8px 11px;
  }

  .top-links > a.active,
  .top-links > a:hover,
  .account-summary:hover {
    background: rgba(45, 122, 80, 0.1);
    color: var(--forest);
  }

  .account-menu {
    position: relative;
  }

  .account-summary {
    list-style: none;
    cursor: pointer;
  }

  .account-summary::-webkit-details-marker {
    display: none;
  }

  .account-menu-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 180px;
    border: 1px solid rgba(28, 43, 34, 0.12);
    border-radius: 12px;
    background: #fffdf8;
    box-shadow: 0 18px 34px -18px rgba(28, 43, 34, 0.45);
    padding: 6px;
    display: none;
  }

  .account-menu[open] .account-menu-panel {
    display: grid;
    gap: 2px;
  }

  .account-menu-panel a {
    border-radius: 9px;
    padding: 10px;
  }

  .account-menu-panel a.active,
  .account-menu-panel a:hover {
    background: rgba(45, 122, 80, 0.1);
    color: var(--forest);
  }

  .me-main {
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: 32px clamp(16px, 4vw, 40px) 72px;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 28px;
  }

  .side-nav {
    position: sticky;
    top: 86px;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .side-title {
    margin: 0 0 8px 12px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .side-nav a {
    border-radius: 12px;
    padding: 12px;
  }

  .side-nav a.active,
  .side-nav a:hover {
    background: #fffdf8;
    color: var(--forest);
    box-shadow: inset 0 0 0 1px rgba(28, 43, 34, 0.08);
  }

  .content {
    min-width: 0;
  }

  @media (max-width: 760px) {
    .topbar {
      height: 56px;
      padding: 0 16px;
    }

    .top-links {
      overflow-x: auto;
      scrollbar-width: none;
    }

    .top-links::-webkit-scrollbar {
      display: none;
    }

    .top-links > a,
    .account-summary {
      padding: 7px 9px;
      white-space: nowrap;
    }

    .me-main {
      display: block;
      padding: 18px 16px 48px;
    }

    .side-nav {
      display: none;
    }
  }
</style>
