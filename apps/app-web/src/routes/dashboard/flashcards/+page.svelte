<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MisButton, MisInput, MisSelect, MisTextarea } from '@decyphr/misneach-ui';

  type Deck = {
    id: number;
    name: string;
    description?: string | null;
    language?: string;
    cardCount?: number;
    dueCount?: number;
  };

  let decks: Deck[] = [];
  let loading = true;

  let showDeckModal = false;
  let showCardModal = false;

  let deckForm = {
    name: '',
    description: '',
    language: 'ga',
  };

  let cardForm = {
    deckId: '',
    front: '',
    back: '',
    pronunciation: '',
    notes: '',
  };

  let deckError = '';
  let cardError = '';

  async function loadDecks() {
    loading = true;
    try {
      const res = await fetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch decks');
      decks = await res.json();
    } catch (err) {
      console.error('Failed to load decks', err);
      decks = [];
    } finally {
      loading = false;
    }
  }

  onMount(loadDecks);

  function startQuickStudy() {
    goto('/dashboard/flashcards/study');
  }

  function openDeck(deck: Deck) {
    goto(`/dashboard/flashcards/study?packId=${deck.id}`);
  }

  function openDeckModal() {
    deckForm = { name: '', description: '', language: 'ga' };
    deckError = '';
    showDeckModal = true;
  }

  function closeDeckModal() {
    showDeckModal = false;
    deckError = '';
  }

  function openCardModal(deck?: Deck) {
    cardForm = {
      deckId: deck ? String(deck.id) : decks[0] ? String(decks[0].id) : '',
      front: '',
      back: '',
      pronunciation: '',
      notes: '',
    };
    cardError = '';
    showCardModal = true;
  }

  function closeCardModal() {
    showCardModal = false;
    cardError = '';
  }

  function handleModalKeydown(event: KeyboardEvent, close: () => void) {
    if (event.key === 'Escape') {
      close();
    }
  }

  async function createDeck() {
    const name = deckForm.name.trim();
    if (!name) {
      deckError = 'Deck name is required.';
      return;
    }

    deckError = '';

    try {
      const res = await fetch('/api/proxy/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: deckForm.description || undefined,
          language: deckForm.language || 'ga',
        }),
      });

      if (!res.ok) throw new Error('Failed to create deck');
      const deck = await res.json();

      decks = [
        {
          ...deck,
          cardCount: deck.cardCount ?? 0,
          dueCount: deck.dueCount ?? 0,
        },
        ...decks,
      ];
      closeDeckModal();
    } catch (err) {
      console.error('Failed to create deck', err);
      deckError = 'Could not create deck right now.';
    }
  }

  async function submitCard() {
    const deckId = Number(cardForm.deckId);
    const front = cardForm.front.trim();
    const back = cardForm.back.trim();

    if (!deckId || !front || !back) {
      cardError = 'Deck, front, and back are required.';
      return;
    }

    cardError = '';

    try {
      const res = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front,
          back,
          pronunciation: cardForm.pronunciation || undefined,
          notes: cardForm.notes || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to add card');

      decks = decks.map((deck) =>
        deck.id === deckId ? { ...deck, cardCount: (deck.cardCount || 0) + 1 } : deck,
      );

      closeCardModal();
    } catch (err) {
      console.error('Failed to add card', err);
      cardError = 'Could not save card right now.';
    }
  }
</script>

<section class="flash-wrap">
  <nav class="top-nav">
    <MisButton variant="unstyled" size="none" onclick={() => goto('/dashboard')} className="nav-back" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
      Dashboard
    </MisButton>
    <div class="nav-brand">Misne<em>ach</em></div>
  </nav>

  <header class="page-head">
    <h1 class="page-title">Flashcards</h1>
    <p class="page-sub">Review what you've learned. Build decks as you go.</p>
    <a href="/dashboard/practice" class="page-link">
      Try Practice Lab for typed translation &amp; cloze drills
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </a>
  </header>

  <MisButton variant="unstyled" size="none" onclick={startQuickStudy} className="quick-start" type="button">
    <div>
      <div class="qs-eyebrow">Ready to review</div>
      <div class="qs-title">Quick Start</div>
      <div class="qs-sub">Study all cards due right now</div>
    </div>
    <div class="qs-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
    </div>
  </MisButton>

  <section>
    <div class="section-head">
      <h2 class="section-title">Your decks</h2>
      <MisButton variant="unstyled" size="none" onclick={openDeckModal} className="btn-new" type="button">+ New deck</MisButton>
    </div>

    {#if loading}
      <div class="empty-state"><p>Loading decks...</p></div>
    {:else if decks.length === 0}
      <div class="empty-state"><p>No decks yet - create your first one above.</p></div>
    {:else}
      <div class="deck-list">
        {#each decks as deck, index (deck.id)}
          <div
            class="deck-card"
            role="button"
            tabindex="0"
            style={`animation-delay: ${Math.min(index, 5) * 0.05}s`}
            onclick={() => openDeck(deck)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDeck(deck);
              }
            }}
          >
            <div class="deck-top">
              <div class="deck-name">{deck.name}</div>
              <div class={`due-pill ${(deck.dueCount || 0) > 0 ? 'has-due' : 'caught-up'}`}>
                {(deck.dueCount || 0) > 0 ? `${deck.dueCount || 0} due` : 'Up to date'}
              </div>
            </div>
            {#if deck.description}
              <p class="deck-desc">{deck.description}</p>
            {/if}
            <div class="deck-footer">
              <span class="deck-count">{deck.cardCount || 0} card{(deck.cardCount || 0) === 1 ? '' : 's'}</span>
              <MisButton
                variant="unstyled"
                size="none"
                className="btn-add"
                type="button"
                onclick={(event) => {
                  event.stopPropagation();
                  openCardModal(deck);
                }}
              >
                + Add card
              </MisButton>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</section>

<div
  class={`modal-backdrop ${showDeckModal ? 'open' : ''}`}
  onclick={(event) => event.target === event.currentTarget && closeDeckModal()}
  onkeydown={(event) => handleModalKeydown(event, closeDeckModal)}
  role="presentation"
  tabindex="-1"
>
  <div class="modal-sheet">
    <div class="modal-drag"></div>
    <h2 class="modal-title">Create deck</h2>

    <div class="field">
      <label for="deck-name">Name</label>
      <MisInput id="deck-name" variant="unstyled" bind:value={deckForm.name} type="text" className="sheet-input" placeholder="e.g. Ordering in a cafe" />
    </div>

    <div class="field">
      <label for="deck-description">Description <span class="opt-label">(optional)</span></label>
      <MisInput id="deck-description" variant="unstyled" bind:value={deckForm.description} type="text" className="sheet-input" placeholder="What's this deck for?" />
    </div>

    <div class="field">
      <label for="deck-language">Language</label>
      <MisInput id="deck-language" variant="unstyled" bind:value={deckForm.language} type="text" className="sheet-input" placeholder="ga" />
    </div>

    {#if deckError}
      <p class="form-error">{deckError}</p>
    {/if}

    <div class="modal-actions">
      <MisButton variant="unstyled" size="none" type="button" className="btn-cancel" onclick={closeDeckModal}>Cancel</MisButton>
      <MisButton variant="unstyled" size="none" type="button" className="btn-confirm" onclick={createDeck}>Create deck</MisButton>
    </div>
  </div>
</div>

<div
  class={`modal-backdrop ${showCardModal ? 'open' : ''}`}
  onclick={(event) => event.target === event.currentTarget && closeCardModal()}
  onkeydown={(event) => handleModalKeydown(event, closeCardModal)}
  role="presentation"
  tabindex="-1"
>
  <div class="modal-sheet">
    <div class="modal-drag"></div>
    <h2 class="modal-title">Add flashcard</h2>

    <div class="field">
      <label for="card-deck">Deck</label>
      <MisSelect id="card-deck" variant="unstyled" bind:value={cardForm.deckId} className="sheet-input">
        {#each decks as deck (deck.id)}
          <option value={String(deck.id)}>{deck.name}</option>
        {/each}
      </MisSelect>
    </div>

    <div class="field">
      <label for="card-front">Front <span class="opt-label">(Irish)</span></label>
      <MisTextarea id="card-front" variant="unstyled" bind:value={cardForm.front} rows={4} className="sheet-input sheet-textarea" placeholder="e.g. Caife le do thoil"></MisTextarea>
    </div>

    <div class="field">
      <label for="card-back">Back <span class="opt-label">(English)</span></label>
      <MisTextarea id="card-back" variant="unstyled" bind:value={cardForm.back} rows={4} className="sheet-input sheet-textarea" placeholder="e.g. A coffee please"></MisTextarea>
    </div>

    <div class="field">
      <label for="card-pron">Pronunciation <span class="opt-label">(optional)</span></label>
      <MisInput id="card-pron" variant="unstyled" bind:value={cardForm.pronunciation} type="text" className="sheet-input" placeholder="e.g. KAF-eh leh duh HUL" />
    </div>

    <div class="field">
      <label for="card-notes">Notes <span class="opt-label">(optional)</span></label>
      <MisTextarea id="card-notes" variant="unstyled" bind:value={cardForm.notes} rows={3} className="sheet-input sheet-textarea" placeholder="Context or memory aids"></MisTextarea>
    </div>

    {#if cardError}
      <p class="form-error">{cardError}</p>
    {/if}

    <div class="modal-actions">
      <MisButton variant="unstyled" size="none" type="button" className="btn-cancel" onclick={closeCardModal}>Cancel</MisButton>
      <MisButton variant="unstyled" size="none" type="button" className="btn-confirm" onclick={submitCard}>Save card</MisButton>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: var(--parchment, #f5f0e8);
  }

  .flash-wrap {
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
  }

  .top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0 28px;
  }

  :global(.nav-back) {
    display: flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    padding: 0;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.nav-back svg) {
    width: 15px;
    height: 15px;
  }

  .nav-brand {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .nav-brand em {
    color: var(--green);
    font-style: italic;
    font-weight: 300;
  }

  .page-head {
    margin-bottom: 24px;
  }

  .page-title {
    margin-bottom: 6px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 34px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .page-sub {
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
  }

  .page-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--green);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }

  .page-link svg {
    width: 12px;
    height: 12px;
  }

  :global(.quick-start) {
    width: 100%;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-radius: 20px;
    border: none;
    background: var(--forest);
    padding: 26px 28px;
    text-align: left;
    color: inherit;
  }

  .qs-eyebrow {
    margin-bottom: 7px;
    color: var(--sage);
    opacity: 0.8;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .qs-title {
    margin-bottom: 5px;
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .qs-sub {
    color: rgba(245, 240, 232, 0.45);
    font-size: 13px;
  }

  .qs-arrow {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1.5px solid rgba(126, 201, 154, 0.22);
    background: rgba(126, 201, 154, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qs-arrow svg {
    width: 18px;
    height: 18px;
    color: var(--sage);
  }

  .section-head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  :global(.btn-new) {
    border: none;
    border-radius: 999px;
    background: none;
    padding: 6px 12px;
    color: var(--green);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
  }

  .deck-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .deck-card {
    width: 100%;
    border: 1.5px solid var(--parch-dark);
    border-radius: 16px;
    background: #fff;
    padding: 20px 22px 18px;
    text-align: left;
    cursor: pointer;
    animation: fadeUp 0.3s ease both;
  }

  .deck-top {
    margin-bottom: 4px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .deck-name {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .due-pill {
    margin-top: 2px;
    flex-shrink: 0;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .due-pill.has-due {
    background: rgba(45, 122, 80, 0.1);
    color: var(--green);
  }

  .due-pill.caught-up {
    background: var(--parch-dark);
    color: var(--muted);
  }

  .deck-desc {
    margin-bottom: 12px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .deck-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--parch-dark);
    padding-top: 10px;
  }

  .deck-count {
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
  }

  :global(.btn-add) {
    border-radius: 999px;
    border: 1.5px solid rgba(45, 122, 80, 0.22);
    background: none;
    padding: 5px 13px;
    color: var(--green);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .empty-state {
    border: 1.5px dashed var(--parch-dark);
    border-radius: 16px;
    background: #fff;
    padding: 40px 24px;
    text-align: center;
  }

  .empty-state p {
    color: var(--muted);
    font-size: 14px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(28, 43, 34, 0.45);
    backdrop-filter: blur(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .modal-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .modal-sheet {
    width: 100%;
    max-width: 560px;
    max-height: 92vh;
    overflow-y: auto;
    transform: translateY(100%);
    border-radius: 24px 24px 0 0;
    background: var(--parchment);
    padding: 10px 24px 40px;
    transition: transform 0.3s cubic-bezier(0.34, 1.15, 0.64, 1);
  }

  .modal-backdrop.open .modal-sheet {
    transform: translateY(0);
  }

  .modal-drag {
    width: 40px;
    height: 4px;
    margin: 14px auto 22px;
    border-radius: 2px;
    background: var(--parch-dark);
  }

  .modal-title {
    margin-bottom: 20px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.03em;
  }

  .field {
    margin-bottom: 14px;
  }

  .field label {
    display: block;
    margin-bottom: 6px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .opt-label {
    text-transform: none;
    letter-spacing: 0;
    font-size: 11px;
    font-weight: 400;
  }

  :global(.sheet-input) {
    width: 100%;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    background: #fff;
    padding: 11px 14px;
    color: var(--ink);
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    outline: none;
  }

  :global(.sheet-textarea) {
    min-height: 80px;
    line-height: 1.5;
    resize: vertical;
  }

  .form-error {
    margin-top: 2px;
    color: #9a2424;
    font-size: 12px;
  }

  .modal-actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  :global(.btn-cancel) {
    border-radius: 10px;
    border: 1.5px solid var(--parch-dark);
    background: none;
    padding: 11px 20px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.btn-confirm) {
    border-radius: 10px;
    border: none;
    background: var(--forest);
    padding: 11px 24px;
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .flash-wrap {
      padding-left: 16px;
      padding-right: 16px;
    }

    :global(.quick-start) {
      padding: 22px 20px;
    }

    .modal-sheet {
      padding-left: 16px;
      padding-right: 16px;
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
</style>
