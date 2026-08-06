<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe, requestLogout, type AuthUser } from '$lib/api/auth-client';
  import {
    getCourseFlashcardSummary,
    recordFlashcardAttempt,
    type Flashcard,
  } from '$lib/api/flashcards-client';

  let user: AuthUser | null = null;
  let cards: Flashcard[] = [];
  let dueCount = 0;
  let cardCount = 0;
  let loading = true;
  let error = '';
  let answerShown = false;
  let saving = false;
  let startedAt = Date.now();

  $: currentCard = cards[0] || null;
  $: displayName = user?.displayName || String(user?.email || 'Learner').split('@')[0] || 'Learner';
  $: initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'M';

  async function loadReview() {
    loading = true;
    error = '';

    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }

    user = auth.user;

    try {
      const summary = await getCourseFlashcardSummary(50);
      cards = summary.sampleDueCards;
      dueCount = summary.dueCount;
      cardCount = summary.cardCount;
      startedAt = Date.now();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load review cards';
    } finally {
      loading = false;
    }
  }

  async function logout() {
    await requestLogout();
    await goto('/auth/login');
  }

  async function gradeCurrent(grade: 'again' | 'hard' | 'good' | 'easy') {
    if (!currentCard || saving) return;
    saving = true;
    try {
      await recordFlashcardAttempt(currentCard.id, grade, Date.now() - startedAt);
      cards = cards.slice(1);
      dueCount = Math.max(0, dueCount - 1);
      answerShown = false;
      startedAt = Date.now();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to save review';
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    void loadReview();
  });
</script>

<svelte:head>
  <title>Review - Misneach</title>
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
    <a href="/dashboard/review" class="nav-link active">Review</a>
    <a href="/dashboard/phrases" class="nav-link">Phrases</a>
  </div>
  <button class="nav-avatar" type="button" on:click={logout}>{initials}</button>
</nav>

<main class="review-page">
  <header class="review-head">
    <div>
      <div class="eyebrow">Course flashcards</div>
      <h1>Review <em>lesson phrases</em></h1>
      <p>Only flashcards generated from Misneach course material appear here.</p>
    </div>
    <div class="review-stat">
      <strong>{dueCount}</strong>
      <span>due now</span>
    </div>
  </header>

  {#if loading}
    <section class="review-card muted">Loading review cards...</section>
  {:else if error}
    <section class="review-card muted">{error}</section>
  {:else if !cardCount}
    <section class="review-card muted">
      Open a lesson first. Course phrases become flashcards as the course material is encountered.
    </section>
  {:else if !currentCard}
    <section class="review-card complete">
      <div class="complete-mark">✓</div>
      <h2>All caught up.</h2>
      <p>No course flashcards are due right now.</p>
      <a href="/dashboard" class="back-link">Back to dashboard</a>
    </section>
  {:else}
    <section class="review-card">
      <div class="card-counter">{cards.length} left in this session</div>
      <div class="front">{currentCard.front}</div>
      {#if answerShown}
        <div class="answer">
          <div class="answer-label">Meaning</div>
          <div class="back">{currentCard.back}</div>
          {#if currentCard.pronunciation}
            <div class="pronunciation">{currentCard.pronunciation}</div>
          {/if}
        </div>
        <div class="grade-row">
          <button type="button" disabled={saving} on:click={() => gradeCurrent('again')}>Again</button>
          <button type="button" disabled={saving} on:click={() => gradeCurrent('hard')}>Hard</button>
          <button type="button" disabled={saving} on:click={() => gradeCurrent('good')}>Good</button>
          <button type="button" disabled={saving} on:click={() => gradeCurrent('easy')}>Easy</button>
        </div>
      {:else}
        <button class="reveal-btn" type="button" on:click={() => (answerShown = true)}>Show answer</button>
      {/if}
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f5f0e8;
    color: #1a1a18;
    font-family: 'Instrument Sans', system-ui, sans-serif;
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
  .nav-links {
    display: flex;
    align-items: center;
  }

  .nav-brand {
    gap: 10px;
    text-decoration: none;
  }

  .nav-wordmark {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  .nav-wordmark em,
  h1 em {
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

  .nav-link.active,
  .nav-link:hover {
    background: #e8e0d0;
    color: #1c2b22;
  }

  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #e8e0d0;
    background: #1c2b22;
    color: #f5f0e8;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    cursor: pointer;
  }

  .review-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 44px 24px 80px;
  }

  .review-head {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-end;
    padding-bottom: 24px;
    border-bottom: 1px solid #e8e0d0;
    margin-bottom: 24px;
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
    margin: 0 0 6px;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(30px, 5vw, 42px);
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #5a7a64;
    line-height: 1.5;
  }

  .review-stat {
    background: #1c2b22;
    color: #f5f0e8;
    border-radius: 18px;
    padding: 12px 18px;
    text-align: center;
  }

  .review-stat strong {
    display: block;
    font-family: 'Fraunces', serif;
    color: #7ec99a;
    font-size: 32px;
    line-height: 1;
  }

  .review-stat span {
    font-size: 11px;
    color: rgba(245, 240, 232, 0.5);
    font-weight: 700;
  }

  .review-card {
    background: #fff;
    border: 1px solid #e8e0d0;
    border-radius: 16px;
    padding: 28px;
  }

  .review-card.muted {
    color: #777;
    font-size: 14px;
    line-height: 1.5;
  }

  .card-counter {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 18px;
  }

  .front {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 300;
    font-size: clamp(30px, 7vw, 54px);
    color: #1c2b22;
    margin-bottom: 24px;
  }

  .answer {
    background: #f5f0e8;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 18px;
  }

  .answer-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 6px;
  }

  .back {
    font-size: 18px;
    font-weight: 700;
    color: #1c2b22;
  }

  .pronunciation {
    margin-top: 5px;
    font-size: 13px;
    color: #888;
  }

  .reveal-btn,
  .grade-row button,
  .back-link {
    border: none;
    border-radius: 10px;
    background: #1c2b22;
    color: #f5f0e8;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 18px;
    cursor: pointer;
    text-decoration: none;
  }

  .grade-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .grade-row button:nth-child(1) {
    background: #7d3131;
  }

  .grade-row button:nth-child(2) {
    background: #5a7a64;
  }

  .grade-row button:nth-child(3),
  .grade-row button:nth-child(4) {
    background: #2d7a50;
  }

  .complete {
    text-align: center;
  }

  .complete-mark {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin: 0 auto 14px;
    background: rgba(45, 122, 80, 0.1);
    color: #2d7a50;
    border: 2px solid #7ec99a;
    font-weight: 900;
  }

  .complete h2 {
    margin: 0 0 6px;
    font-family: 'Fraunces', serif;
    color: #1c2b22;
  }

  .back-link {
    display: inline-flex;
    margin-top: 18px;
  }

  @media (max-width: 720px) {
    .dash-nav {
      padding: 0 16px;
    }

    .nav-links {
      display: none;
    }

    .review-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .grade-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
