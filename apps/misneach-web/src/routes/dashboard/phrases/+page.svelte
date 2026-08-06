<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe, requestLogout, type AuthUser } from '$lib/api/auth-client';
  import {
    getCoursePhrasebook,
    type PhrasebookPage,
    type PhrasebookPhrase,
  } from '$lib/api/phrasebook-client';

  let user: AuthUser | null = null;
  let phrases: PhrasebookPhrase[] = [];
  let summary: PhrasebookPage['summary'] = { total: 0, inPractice: 0, inFlashcards: 0, own: 0 };
  let search = '';
  let sort: 'newest' | 'oldest' | 'alphabetical' = 'newest';
  let page = 1;
  let pageSize = 24;
  let total = 0;
  let totalPages = 1;
  let loading = true;
  let error = '';
  let profileMenuOpen = false;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  function fallbackName(email?: string | null) {
    const local = String(email || '').split('@')[0] || 'Learner';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  $: displayName = user?.displayName || fallbackName(user?.email);
  $: initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'M';
  $: pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  $: pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  async function loadPhrases(nextPage = page) {
    loading = true;
    error = '';
    try {
      const payload = await getCoursePhrasebook({
        search,
        sort,
        page: nextPage,
        pageSize,
      });
      phrases = payload.items || [];
      summary = payload.summary || summary;
      page = payload.page || nextPage;
      pageSize = payload.pageSize || pageSize;
      total = payload.total || 0;
      totalPages = payload.totalPages || 1;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load course phrases';
      phrases = [];
      total = 0;
      totalPages = 1;
    } finally {
      loading = false;
    }
  }

  function scheduleSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadPhrases(1);
    }, 250);
  }

  function changeSort(next: typeof sort) {
    if (sort === next) return;
    sort = next;
    void loadPhrases(1);
  }

  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page || loading) return;
    void loadPhrases(next);
  }

  async function logout() {
    await requestLogout();
    await goto('/auth/login');
  }

  onMount(async () => {
    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }
    user = auth.user;
    await loadPhrases(1);
  });
</script>

<svelte:head>
  <title>Course Phrases - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav class="dash-nav">
  <a href="/dashboard" class="nav-brand">
    <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M40 7C19 7,9 19,9 34C9 50,19 61,37 62L30 73L47 62C63 60,71 50,71 34C71 19,61 7,40 7Z" fill="#1c2b22" />
      <path d="M33 46C35.5 37,42 30,47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none" />
      <circle cx="33.5" cy="45" r="3" fill="#7ec99a" />
    </svg>
    <span class="nav-wordmark">Misne<em>ach</em></span>
  </a>
  <div class="nav-links">
    <a href="/dashboard" class="nav-link">Learn</a>
    <a href="/dashboard/review" class="nav-link">Review</a>
    <a href="/dashboard/phrases" class="nav-link active">Phrases</a>
  </div>
  <div class="nav-right">
    <div class="nav-avatar-wrap">
      <button class="nav-avatar" type="button" on:click={() => (profileMenuOpen = !profileMenuOpen)}>{initials}</button>
      <div class:open={profileMenuOpen} class="profile-menu">
        <a href="/me/profile" class="pm-item">Profile</a>
        <a href="/me/course-progress" class="pm-item">Course</a>
        <a href="/me/subscription" class="pm-item">Subscription</a>
        <div class="pm-divider"></div>
        <button class="pm-item danger" type="button" on:click={logout}>Sign out</button>
      </div>
    </div>
  </div>
</nav>

<main class="phrasebook-shell">
  <section class="hero">
    <div>
      <div class="eyebrow">Course phrasebook</div>
      <h1>Lesson phrases, <em>kept together.</em></h1>
      <p>These are the phrases Misneach has added from the course material you have encountered.</p>
    </div>
    <a class="review-cta" href="/dashboard/review">Review due phrases</a>
  </section>

  <section class="stats-grid">
    <div class="stat-card">
      <div class="stat-num">{summary.total || total}</div>
      <div class="stat-label">course phrases</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">{summary.inFlashcards}</div>
      <div class="stat-label">in review</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">{summary.inPractice}</div>
      <div class="stat-label">tracked</div>
    </div>
  </section>

  <section class="toolbar">
    <label class="search-wrap" for="phrase-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id="phrase-search"
        bind:value={search}
        on:input={scheduleSearch}
        placeholder="Search Irish, English, or notes"
      />
    </label>
    <div class="sort-group" aria-label="Sort phrases">
      <button class:active={sort === 'newest'} type="button" on:click={() => changeSort('newest')}>Newest</button>
      <button class:active={sort === 'alphabetical'} type="button" on:click={() => changeSort('alphabetical')}>A-Z</button>
      <button class:active={sort === 'oldest'} type="button" on:click={() => changeSort('oldest')}>Oldest</button>
    </div>
  </section>

  {#if error}
    <div class="empty-state">{error}</div>
  {:else if loading}
    <div class="empty-state">Loading course phrases...</div>
  {:else if phrases.length === 0}
    <div class="empty-state">
      Open a lesson first. Course phrases are added as you encounter the material.
    </div>
  {:else}
    <section class="phrase-grid">
      {#each phrases as phrase}
        <article class="phrase-card">
          <div class="phrase-top">
            <span class="source-pill">Course</span>
            {#if phrase.inFlashcards}
              <span class="review-pill">Review</span>
            {/if}
          </div>
          <h2>{phrase.text}</h2>
          {#if phrase.pronunciation}
            <div class="pron">{phrase.pronunciation}</div>
          {/if}
          {#if phrase.translation}
            <div class="translation">{phrase.translation}</div>
          {/if}
          {#if phrase.notes}
            <p>{phrase.notes}</p>
          {/if}
        </article>
      {/each}
    </section>

    <div class="pager">
      <span>{pageStart}-{pageEnd} of {total}</span>
      <div>
        <button type="button" disabled={page <= 1 || loading} on:click={() => goToPage(page - 1)}>Previous</button>
        <button type="button" disabled={page >= totalPages || loading} on:click={() => goToPage(page + 1)}>Next</button>
      </div>
    </div>
  {/if}
</main>

<nav class="mobile-nav">
  <a class="mnav-item" href="/dashboard">
    <span class="mnav-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    </span>
    <span class="mnav-lbl">Learn</span>
  </a>
  <a class="mnav-item" href="/dashboard/review">
    <span class="mnav-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    </span>
    <span class="mnav-lbl">Review</span>
  </a>
  <a class="mnav-item active" href="/dashboard/phrases">
    <span class="mnav-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </span>
    <span class="mnav-lbl">Phrases</span>
  </a>
  <a class="mnav-item" href="/me">
    <span class="mnav-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </span>
    <span class="mnav-lbl">Me</span>
  </a>
</nav>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Instrument Sans', sans-serif;
    background: #f5f0e8;
    color: #1a1a18;
  }

  .dash-nav {
    background: rgba(245, 240, 232, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e8e0d0;
    padding: 0 40px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-brand,
  .nav-links,
  .nav-right {
    display: flex;
    align-items: center;
  }

  .nav-brand {
    gap: 10px;
    text-decoration: none;
  }

  .nav-wordmark,
  h1,
  .stat-num,
  .phrase-card h2 {
    font-family: 'Fraunces', serif;
  }

  .nav-wordmark {
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }

  .nav-links {
    gap: 6px;
  }

  .nav-link {
    font-size: 13px;
    font-weight: 500;
    color: #5a7a64;
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 8px;
  }

  .nav-link:hover {
    background: #e8e0d0;
    color: #1c2b22;
  }

  .nav-link.active {
    color: #1c2b22;
    font-weight: 700;
  }

  .nav-avatar-wrap {
    position: relative;
  }

  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #e8e0d0;
    background: #1c2b22;
    color: #f5f0e8;
    font: 700 12px 'Fraunces', serif;
    cursor: pointer;
  }

  .profile-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 180px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e8e0d0;
    box-shadow: 0 16px 32px rgba(28, 43, 34, 0.14);
    overflow: hidden;
    display: none;
  }

  .profile-menu.open {
    display: block;
  }

  .pm-item {
    display: block;
    width: 100%;
    padding: 10px 14px;
    border: 0;
    background: none;
    text-align: left;
    font: 500 13px 'Instrument Sans', sans-serif;
    color: #3a3a36;
    text-decoration: none;
    cursor: pointer;
  }

  .pm-item:hover {
    background: #f5f0e8;
  }

  .pm-item.danger {
    color: #9a2424;
  }

  .pm-divider {
    height: 1px;
    background: #e8e0d0;
    margin: 4px 0;
  }

  .phrasebook-shell {
    max-width: 1080px;
    margin: 0 auto;
    padding: 44px 40px 90px;
  }

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 28px;
    border-bottom: 1px solid #e8e0d0;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 8px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  .hero p {
    margin: 0;
    max-width: 560px;
    color: #5a7a64;
    font-size: 14px;
    line-height: 1.55;
  }

  .review-cta {
    background: #1c2b22;
    color: #f5f0e8;
    text-decoration: none;
    border-radius: 10px;
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 22px 0;
  }

  .stat-card,
  .phrase-card,
  .toolbar,
  .empty-state {
    background: white;
    border: 1px solid #e8e0d0;
    border-radius: 14px;
  }

  .stat-card {
    padding: 16px 18px;
  }

  .stat-num {
    font-weight: 900;
    font-size: 32px;
    line-height: 1;
    color: #1c2b22;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #5a7a64;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    margin-bottom: 18px;
  }

  .search-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 9px;
    color: #5a7a64;
    background: #f5f0e8;
    border: 1px solid #e8e0d0;
    border-radius: 10px;
    padding: 0 12px;
    height: 42px;
  }

  .search-wrap input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: 500 14px 'Instrument Sans', sans-serif;
    color: #1c2b22;
  }

  .sort-group {
    display: flex;
    gap: 6px;
  }

  .sort-group button,
  .pager button {
    border: 1px solid #e8e0d0;
    background: #fff;
    color: #5a7a64;
    border-radius: 9px;
    padding: 9px 12px;
    font: 700 12px 'Instrument Sans', sans-serif;
    cursor: pointer;
  }

  .sort-group button.active {
    background: #1c2b22;
    border-color: #1c2b22;
    color: #f5f0e8;
  }

  .phrase-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }

  .phrase-card {
    padding: 16px 18px 18px;
  }

  .phrase-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
  }

  .source-pill,
  .review-pill {
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .source-pill {
    background: rgba(45, 122, 80, 0.1);
    color: #2d7a50;
  }

  .review-pill {
    background: #e8e0d0;
    color: #5a7a64;
  }

  .phrase-card h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #1c2b22;
  }

  .pron {
    margin-top: 8px;
    font-size: 12px;
    color: #5a7a64;
    letter-spacing: 0.03em;
  }

  .translation {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #3a3a36;
  }

  .phrase-card p {
    margin: 12px 0 0;
    padding-top: 12px;
    border-top: 1px solid #e8e0d0;
    font-size: 12px;
    color: #888;
    line-height: 1.5;
  }

  .empty-state {
    padding: 28px;
    color: #5a7a64;
    font-size: 14px;
    text-align: center;
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 18px;
    color: #888;
    font-size: 12px;
  }

  .pager div {
    display: flex;
    gap: 8px;
  }

  .pager button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .mobile-nav {
    display: none;
  }

  @media (max-width: 768px) {
    .dash-nav {
      padding: 0 16px;
    }

    .nav-links {
      display: none;
    }

    .phrasebook-shell {
      padding: 24px 16px 96px;
    }

    .hero,
    .toolbar,
    .pager {
      flex-direction: column;
      align-items: stretch;
    }

    .review-cta {
      text-align: center;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .sort-group {
      overflow-x: auto;
    }

    .mobile-nav {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 68px;
      background: rgba(245, 240, 232, 0.96);
      backdrop-filter: blur(20px);
      border-top: 1px solid #e8e0d0;
      z-index: 50;
    }

    .mobile-nav {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 4px 4px;
    }

    .mnav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 0;
      text-decoration: none;
    }

    .mnav-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbb;
    }

    .mnav-item.active .mnav-icon {
      background: rgba(45, 122, 80, 0.12);
      color: #2d7a50;
    }

    .mnav-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #bbb;
    }

    .mnav-item.active .mnav-lbl {
      color: #2d7a50;
    }
  }
</style>
