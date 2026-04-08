<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MisButton } from '@decyphr/misneach-ui';
  import {
    incrementFlashcardsProgress,
    loadStudySession,
    saveStudySession,
    studyCoordinatorHref,
    type StudySession,
  } from '$lib/study-session';
  import { incrementJourneyGoalCounter } from '$lib/stores/journey-goals';

  type StudyCard = {
    id: number;
    front: string;
    back: string;
    pronunciation?: string | null;
    notes?: string | null;
  };

  let deck = {
    id: null as number | null,
    name: 'Due cards',
  };

  let cards: StudyCard[] = [];
  let currentIndex = 0;
  let revealed = false;
  let loading = true;
  let complete = false;

  let studySessionId = '';
  let studySession: StudySession | null = null;
  let studyReturnTo = '';
  let studySessionLimit = 50;
  let studyScopePackIds: number[] = [];
  let studyGlobalFill = true;
  let studyMode = false;
  let attemptedInSession = 0;
  let authClientId = '';

  $: totalCards = cards.length;
  $: progressPct =
    totalCards > 0
      ? complete
        ? 100
        : Math.min(100, Math.max(0, Math.round((currentIndex / totalCards) * 100)))
      : 0;
  $: cardCounter =
    totalCards > 0
      ? complete
        ? `${totalCards} of ${totalCards}`
        : `${Math.min(currentIndex + 1, totalCards)} of ${totalCards}`
      : '0 of 0';
  $: currentCard =
    cards.length > 0 && currentIndex < cards.length
      ? {
          id: cards[currentIndex]?.id,
          text: cards[currentIndex]?.front,
          meaning: cards[currentIndex]?.back,
          pronunciation: cards[currentIndex]?.pronunciation,
          notes: cards[currentIndex]?.notes,
        }
      : {
          id: null,
          text: 'No due cards',
          meaning: 'You are caught up',
          pronunciation: null,
          notes: null,
        };

  function parseSessionLimit(raw: string | null) {
    const parsed = Number(raw || 50);
    if (!Number.isFinite(parsed)) return 50;
    return Math.max(1, Math.min(200, Math.round(parsed)));
  }

  function parseScopePackIds(raw: string | null) {
    if (!raw) return [];
    return raw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function dedupeCards(items: StudyCard[]) {
    const seen = new Set<number>();
    const deduped: StudyCard[] = [];
    for (const card of items) {
      if (!card?.id || seen.has(card.id)) continue;
      seen.add(card.id);
      deduped.push(card);
    }
    return deduped;
  }

  async function loadAuthContext() {
    authClientId = '';
    try {
      const res = await apiFetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      authClientId = String(payload?.clientId || '').trim();
    } catch {
      authClientId = '';
    }
  }

  async function fetchDueCards(params: URLSearchParams) {
    const res = await fetch(`/api/proxy/flashcards/study/due?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch due cards');
    const payload = await res.json();
    return Array.isArray(payload) ? (payload as StudyCard[]) : [];
  }

  function persistStudyFlashcardsProgress(delta: number) {
    if (!studySessionId || delta <= 0) return;
    const currentSession = loadStudySession(studySessionId, authClientId || null);
    if (!currentSession) return;
    incrementFlashcardsProgress(currentSession, delta);
    saveStudySession(currentSession);
    studySession = currentSession;
  }

  async function loadStudyCards() {
    try {
      await loadAuthContext();
      const params = new URLSearchParams(window.location.search);
      const packId = params.get('packId');
      studySessionId = params.get('studySession') || '';
      if (!authClientId) {
        studySessionId = '';
      }
      studySession = studySessionId ? loadStudySession(studySessionId, authClientId || null) : null;
      studyReturnTo = params.get('returnTo') || (studySessionId ? studyCoordinatorHref(studySessionId) : '');
      studySessionLimit = parseSessionLimit(params.get('sessionLimit'));
      studyScopePackIds = parseScopePackIds(params.get('scopePackIds'));
      studyGlobalFill = params.get('globalFill') !== '0';
      studyMode = Boolean(studySessionId);

      if (studySessionId && !studySession) {
        studySessionId = '';
        studyReturnTo = '';
        studyScopePackIds = [];
        studyMode = false;
      }

      if (studyMode && studyScopePackIds.length > 0) {
        deck.name = 'Study Session Flashcards';
        const scopedCards: StudyCard[] = [];

        for (const scopedPackId of studyScopePackIds) {
          if (scopedCards.length >= studySessionLimit) break;
          const remaining = Math.max(1, studySessionLimit - scopedCards.length);
          const query = new URLSearchParams();
          query.set('packId', String(scopedPackId));
          query.set('limit', String(remaining));
          const next = await fetchDueCards(query);
          scopedCards.push(...next);
        }

        let combined = dedupeCards(scopedCards);

        if (combined.length < studySessionLimit && studyGlobalFill) {
          const globalQuery = new URLSearchParams();
          globalQuery.set('limit', String(Math.max(studySessionLimit * 2, studySessionLimit + 20)));
          const globalCards = await fetchDueCards(globalQuery);
          combined = dedupeCards([...combined, ...globalCards]);
        }

        cards = combined.slice(0, studySessionLimit);
      } else {
        const query = new URLSearchParams();
        if (packId) query.set('packId', packId);
        query.set('limit', String(studySessionLimit));

        cards = await fetchDueCards(query);

        if (packId) {
          deck.id = Number(packId);
          const deckRes = await fetch(`/api/proxy/flashcards/decks/${packId}`);
          if (deckRes.ok) {
            const deckData = await deckRes.json();
            deck.name = deckData.name;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load study cards', err);
      cards = [];
    } finally {
      loading = false;
    }
  }

  onMount(loadStudyCards);

  function reveal() {
    revealed = true;
  }

  async function rate(result: 'again' | 'hard' | 'good' | 'easy') {
    if (!currentCard.id) return;

    let attemptRecorded = false;
    try {
      const res = await fetch(`/api/proxy/flashcards/cards/${currentCard.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: result }),
      });
      attemptRecorded = res.ok;
    } catch (err) {
      console.error('Failed to record attempt', err);
    } finally {
      if (attemptRecorded) {
        incrementJourneyGoalCounter('flashcardsReviewed', 1);
      }
      attemptedInSession += 1;
      persistStudyFlashcardsProgress(1);
      await nextCard();
    }
  }

  async function nextCard() {
    revealed = false;
    if (currentIndex < cards.length - 1) {
      currentIndex += 1;
      return;
    }

    if (studyMode) {
      await goto(studyReturnTo || studyCoordinatorHref(studySessionId));
      return;
    }

    complete = true;
  }

  function backToFlashcards() {
    goto('/dashboard/flashcards');
  }

  function backFromStudy() {
    if (studyMode && studyReturnTo) {
      goto(studyReturnTo);
      return;
    }
    backToFlashcards();
  }
</script>

<section class="study-wrap">
  <div class="prog-bar-wrap">
    <div class="prog-bar-top">
      <MisButton variant="unstyled" size="none" type="button" className="btn-back" onclick={backFromStudy}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Flashcards
      </MisButton>
      <div class="deck-label">{deck.name}</div>
      <div class="card-counter">{cardCounter}</div>
    </div>
    <div class="prog-track">
      <div class="prog-fill" style={`width:${progressPct}%`}></div>
    </div>
  </div>

  {#if studyMode && studySession}
    <div class="session-banner">
      <div class="sb-eyebrow">Guided session</div>
      <div class="sb-text">
        Flashcards: <strong>{studySession.progress.flashcardsCompleted}</strong> / <strong>{studySession.targets.flashcards}</strong> reviewed
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading-card"></div>
  {:else if cards.length === 0}
    <div class="empty-card">
      <div class="empty-title">{studyMode ? 'No cards due' : 'All caught up'}</div>
      <div class="empty-sub">
        {studyMode ? 'No due flashcards available for this session.' : 'No cards are due right now. Check back later.'}
      </div>
      <MisButton variant="unstyled" size="none" type="button" className="btn-empty" onclick={backFromStudy}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
        {studyMode ? 'Return to study session' : 'Back to decks'}
      </MisButton>
    </div>
  {:else if complete}
    <div class="complete-card">
      <div class="complete-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="complete-title">Criochnaithe. <em>Done.</em></div>
      <div class="complete-stat">
        You reviewed <strong>{attemptedInSession}</strong> cards.
      </div>
      <MisButton variant="unstyled" size="none" type="button" className="btn-done" onclick={backToFlashcards}>
        Back to decks
      </MisButton>
    </div>
  {:else}
    <div class="exercise-card">
      <div class="ex-header">
        <div class="ex-label">Irish</div>
        <div class="ex-prompt">{currentCard.text}</div>
      </div>

      <div class="ex-body">
        {#if revealed}
          <div class="answer-area visible">
            <div class="answer-meaning">{currentCard.meaning}</div>
            {#if currentCard.pronunciation}
              <div class="answer-pronunciation">{currentCard.pronunciation}</div>
            {/if}
            {#if currentCard.notes}
              <div class="answer-notes">{currentCard.notes}</div>
            {/if}
          </div>
        {:else}
          <div class="reveal-area"></div>
        {/if}

        <div class="action-row">
          {#if !revealed}
            <MisButton variant="unstyled" size="none" type="button" className="btn-reveal" onclick={reveal}>Show answer</MisButton>
          {/if}
        </div>
      </div>
    </div>

    {#if revealed}
      <div class="rating-grid">
        <MisButton variant="unstyled" size="none" type="button" className="rating-btn btn-again" onclick={() => rate('again')}>
          Again <span>soon</span>
        </MisButton>
        <MisButton variant="unstyled" size="none" type="button" className="rating-btn btn-hard" onclick={() => rate('hard')}>
          Hard <span>short</span>
        </MisButton>
        <MisButton variant="unstyled" size="none" type="button" className="rating-btn btn-good" onclick={() => rate('good')}>
          Good <span>normal</span>
        </MisButton>
        <MisButton variant="unstyled" size="none" type="button" className="rating-btn btn-easy" onclick={() => rate('easy')}>
          Easy <span>long</span>
        </MisButton>
      </div>
    {/if}
  {/if}
</section>

<style>
  :global(body) {
    background: var(--parchment, #f5f0e8);
  }

  .study-wrap {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --forest-l: #3a5a44;
    --green: #2d7a50;
    --sage: #7ec99a;
    --sage-l: #a8dbb8;
    --parchment: #f5f0e8;
    --parch-dark: #e8e0d0;
    --muted: #5a7a64;
    --ink: #1a1a18;

    max-width: 560px;
    margin: 0 auto;
    padding: 0 20px 80px;
    color: var(--ink);
  }

  .prog-bar-wrap {
    position: sticky;
    top: 0;
    z-index: 40;
    margin-bottom: 4px;
    background: rgba(245, 240, 232, 0.95);
    backdrop-filter: blur(10px);
    padding: 14px 0 12px;
  }

  .prog-bar-top {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  :global(.btn-back) {
    display: flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    padding: 0;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.btn-back svg) {
    width: 15px;
    height: 15px;
  }

  .deck-label {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-counter {
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .prog-track {
    height: 3px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--parch-dark);
  }

  .prog-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--sage);
    transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .session-banner {
    margin-bottom: 14px;
    border: 1.5px solid rgba(45, 122, 80, 0.2);
    border-radius: 12px;
    background: rgba(45, 122, 80, 0.08);
    padding: 12px 16px;
  }

  .sb-eyebrow {
    margin-bottom: 3px;
    color: var(--green);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .sb-text {
    color: var(--forest-l);
    font-size: 13px;
  }

  .sb-text strong {
    color: var(--forest);
  }

  .exercise-card {
    animation: cardIn 0.25s ease both;
    border-radius: 20px;
    overflow: hidden;
    background: var(--forest);
  }

  .ex-header {
    padding: 28px 26px 24px;
  }

  .ex-label {
    margin-bottom: 10px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .ex-prompt {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: clamp(24px, 6vw, 36px);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .ex-body {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--parchment);
    padding: 22px 24px 24px;
  }

  .reveal-area {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .answer-area {
    display: none;
  }

  .answer-area.visible {
    display: block;
    animation: fadeUp 0.2s ease both;
  }

  .answer-meaning {
    margin-bottom: 8px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: clamp(20px, 5vw, 26px);
    font-style: italic;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .answer-pronunciation {
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .answer-notes {
    margin-top: 10px;
    border-radius: 8px;
    background: rgba(245, 240, 232, 0.7);
    padding: 10px 14px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .action-row {
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  :global(.btn-reveal) {
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    background: none;
    padding: 11px 18px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .rating-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    animation: fadeUp 0.2s ease both;
  }

  :global(.rating-btn) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 12px;
    border: none;
    padding: 14px 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  :global(.rating-btn span) {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.65;
    letter-spacing: 0.04em;
  }

  :global(.btn-again) {
    background: #fde8e8;
    color: #b91c1c;
  }

  :global(.btn-hard) {
    background: #fef3cd;
    color: #92400e;
  }

  :global(.btn-good) {
    background: rgba(126, 201, 154, 0.2);
    color: var(--green);
  }

  :global(.btn-easy) {
    background: rgba(45, 122, 80, 0.1);
    color: var(--forest);
  }

  .complete-card {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    border-radius: 20px;
    background: var(--forest);
    padding: 52px 32px;
    text-align: center;
  }

  .complete-mark {
    width: 72px;
    height: 72px;
    border: 1px solid rgba(126, 201, 154, 0.3);
    border-radius: 20px;
    background: rgba(126, 201, 154, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .complete-mark svg {
    width: 32px;
    height: 32px;
    color: var(--sage);
  }

  .complete-title {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .complete-title em {
    color: var(--sage);
    font-style: italic;
    font-weight: 300;
  }

  .complete-stat {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.7;
  }

  .complete-stat strong {
    color: var(--sage);
  }

  :global(.btn-done) {
    border: none;
    border-radius: 10px;
    background: var(--sage);
    padding: 13px 28px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    cursor: pointer;
  }

  .empty-card {
    margin-top: 24px;
    border: 1.5px dashed var(--parch-dark);
    border-radius: 20px;
    background: #fff;
    padding: 48px 28px;
    text-align: center;
  }

  .empty-title {
    margin-bottom: 6px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  .empty-sub {
    margin-bottom: 22px;
    color: var(--muted);
    font-size: 14px;
  }

  :global(.btn-empty) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: none;
    border-radius: 10px;
    background: var(--forest);
    padding: 12px 22px;
    color: var(--parchment);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  :global(.btn-empty svg) {
    width: 14px;
    height: 14px;
  }

  .loading-card {
    margin-top: 24px;
    height: 220px;
    border-radius: 20px;
    background: #fff;
    animation: shimmer 1.4s ease infinite;
  }

  @media (max-width: 640px) {
    .study-wrap {
      padding-left: 16px;
      padding-right: 16px;
    }

    .prog-bar-top {
      grid-template-columns: 1fr;
    }

    .deck-label {
      flex: 1;
      text-align: center;
    }

    .rating-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes shimmer {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.85;
    }
  }
</style>
