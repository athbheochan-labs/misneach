<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe } from '$lib/api/auth-client';
  import { onMount } from 'svelte';

  type SnapshotStats = { score?: number | string; updatedAt?: string };
  type SnapshotItem = {
    id?: string | number;
    word?: string;
    lemma?: string;
    normalised?: string;
    pos?: string;
    stats?: SnapshotStats;
    cefr?: { level?: string; confidence?: number };
  };

  type FlashcardDeck = { id: number; name: string; cardCount?: number };
  type LexWord = {
    id: string;
    word: string;
    lemma: string;
    pos: string;
    score: number;
    updatedAt: string;
  };

  const POS_LABELS: Record<string, string> = {
    noun: 'Noun',
    verb: 'Verb',
    adj: 'Adjective',
    adv: 'Adverb',
    prep: 'Preposition',
    conj: 'Conjunction',
    pron: 'Pronoun',
    intj: 'Interjection',
    det: 'Determiner',
    phrase: 'Phrase',
  };

  let loading = true;
  let clientId = '';
  let snapshot: SnapshotItem[] = [];
  let allWords: LexWord[] = [];
  let cefrLevel = '-';

  let searchTerm = '';
  let sortKey: 'word' | 'lemma' | 'pos' | 'score' = 'word';
  let sortDir: 'asc' | 'desc' = 'asc';
  let currentPage = 1;
  const PAGE_SIZE = 10;

  let importOpen = false;
  let importText = '';

  let flashcardOpen = false;
  let flashcardBusy = false;
  let flashcardItem: LexWord | null = null;
  let flashcardDecks: FlashcardDeck[] = [];
  let selectedDeckId = '';
  let newDeckName = '';
  let fcFront = '';
  let fcBack = '';
  let fcNotes = '';

  let toastMessage = '';
  let toastVisible = false;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  $: parsedImportWords = importText
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter(Boolean);

  $: sortSelectValue = `${sortKey}-${sortDir}`;

  $: filteredWords = (() => {
    const term = searchTerm.trim().toLowerCase();
    let items = allWords;

    if (term) {
      items = items.filter(
        (w) =>
          w.word.toLowerCase().includes(term) ||
          w.lemma.toLowerCase().includes(term) ||
          (POS_LABELS[w.pos] || w.pos).toLowerCase().includes(term),
      );
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortKey === 'score') return (a.score - b.score) * dir;
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
  })();

  $: totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  $: currentPage = Math.min(currentPage, totalPages);
  $: pageStart = (currentPage - 1) * PAGE_SIZE;
  $: pageWords = filteredWords.slice(pageStart, pageStart + PAGE_SIZE);
  $: rangeStart = filteredWords.length ? pageStart + 1 : 0;
  $: rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredWords.length);

  $: highCount = allWords.filter((w) => w.score > 0.8).length;
  $: midCount = allWords.filter((w) => w.score > 0.5 && w.score <= 0.8).length;
  $: lowCount = allWords.filter((w) => w.score <= 0.5).length;
  $: totalCount = allWords.length;
  $: avgConfidence = totalCount
    ? (allWords.reduce((sum, w) => sum + w.score, 0) / totalCount).toFixed(2)
    : '--';
  $: lastUpdate = allWords[0]?.updatedAt
    ? new Date(allWords[0].updatedAt).toLocaleDateString()
    : '--';

  $: attentionWords = [...allWords]
    .filter((w) => w.score <= 0.5)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  $: highPct = totalCount ? (highCount / totalCount) * 100 : 0;
  $: midPct = totalCount ? (midCount / totalCount) * 100 : 0;
  $: lowPct = totalCount ? (lowCount / totalCount) * 100 : 0;

  function showToast(message: string) {
    toastMessage = message;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastVisible = false), 2400);
  }

  function confidenceClass(score: number) {
    if (score > 0.8) return 'conf-high';
    if (score > 0.5) return 'conf-mid';
    return 'conf-low';
  }

  function cefrClass(level: string) {
    const upper = level.toUpperCase();
    if (upper.startsWith('C')) return 'cefr-c';
    if (upper.startsWith('B')) return 'cefr-b';
    return 'cefr-a';
  }

  async function readError(response: Response, fallback: string) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        if (body?.error) return String(body.error);
      }
      const text = await response.text();
      if (text) return text;
    } catch {
      // no-op
    }
    return fallback;
  }

  function mapSnapshot(items: SnapshotItem[]) {
    return items
      .map((item, idx) => {
        const word = String(item.word || item.lemma || item.normalised || '').trim();
        if (!word) return null;
        const lemma = String(item.lemma || item.normalised || word).trim();
        const score = Number(item.stats?.score || 0);
        const pos = String(item.pos || 'phrase').trim();
        const updatedAt = String(item.stats?.updatedAt || new Date().toISOString());
        return {
          id: String(item.id ?? `${word}-${idx}`),
          word,
          lemma,
          pos,
          score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0,
          updatedAt,
        } satisfies LexWord;
      })
      .filter((item): item is LexWord => Boolean(item));
  }

  async function loadSnapshot(id: string) {
    const res = await apiFetch(`/api/proxy/snapshot/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await readError(res, 'Failed to load lexicon snapshot'));
    const data = await res.json();
    snapshot = Array.isArray(data.snapshot) ? data.snapshot : [];
    allWords = mapSnapshot(snapshot);
    cefrLevel = String(data?.cefr?.level || '-');
    currentPage = 1;
  }

  function onSort(value: string) {
    const [key, dir] = value.split('-');
    if (!['word', 'lemma', 'pos', 'score'].includes(key)) return;
    sortKey = key as typeof sortKey;
    sortDir = dir === 'desc' ? 'desc' : 'asc';
    currentPage = 1;
  }

  function toggleSort(key: 'word' | 'lemma' | 'pos' | 'score') {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else {
      sortKey = key;
      sortDir = 'asc';
    }
    currentPage = 1;
  }

  function filterLow() {
    searchTerm = '';
    sortKey = 'score';
    sortDir = 'asc';
    currentPage = 1;
  }

  function goPage(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
  }

  function openImport() {
    importOpen = true;
  }

  function closeImport() {
    importOpen = false;
    importText = '';
  }

  async function submitImport() {
    if (!parsedImportWords.length) return;
    const res = await apiFetch('/api/proxy/lexicon/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: parsedImportWords }),
    });
    if (!res.ok) {
      alert(await readError(res, 'Import failed'));
      return;
    }

    closeImport();
    if (clientId) await loadSnapshot(clientId);
    showToast(`${parsedImportWords.length} word${parsedImportWords.length === 1 ? '' : 's'} imported`);
  }

  async function openFlashcardFor(item: LexWord) {
    flashcardItem = item;
    fcFront = item.word;
    fcBack = '';
    fcNotes = `POS: ${POS_LABELS[item.pos] || item.pos} · Confidence: ${Math.round(item.score * 100)}%`;
    newDeckName = '';

    const decksRes = await apiFetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
    if (!decksRes.ok) {
      alert(await readError(decksRes, 'Failed to load decks'));
      return;
    }

    flashcardDecks = await decksRes.json();
    selectedDeckId = flashcardDecks[0] ? String(flashcardDecks[0].id) : '__new__';
    flashcardOpen = true;
  }

  function closeFlashcard() {
    flashcardOpen = false;
    flashcardBusy = false;
    flashcardItem = null;
  }

  async function submitFlashcard() {
    flashcardBusy = true;

    try {
      let deckId = selectedDeckId;
      if (!deckId) throw new Error('Please select a deck');

      if (deckId === '__new__') {
        const name = newDeckName.trim();
        if (!name) throw new Error('New deck name is required');

        const createRes = await apiFetch('/api/proxy/flashcards/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: 'Cards created from lexicon entries',
            language: 'ga',
          }),
        });

        if (!createRes.ok) throw new Error(await readError(createRes, 'Failed to create deck'));
        const createdDeck = await createRes.json();
        deckId = String(createdDeck.id);
      }

      const front = fcFront.trim();
      const back = fcBack.trim();
      if (!front || !back) throw new Error('Front and back are required');

      const cardRes = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front, back, notes: fcNotes.trim() || undefined }),
      });

      if (!cardRes.ok) throw new Error(await readError(cardRes, 'Failed to create flashcard'));

      closeFlashcard();
      showToast(`Flashcard created - ${front}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create flashcard');
      flashcardBusy = false;
    }
  }

  onMount(async () => {
    try {
      const auth = await getAuthMe();
      if (!auth.loggedIn || !auth.user) throw new Error('Not authenticated');
      clientId = String(auth.user.clientId || '').trim();
      if (!clientId) throw new Error('Missing client ID');
      await loadSnapshot(clientId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initialize lexicon');
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Lexicon - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="page">
  <header class="page-header fade-up">
    <div class="header-left">
      <div class="header-eyebrow">Your vocabulary</div>
      <h1 class="header-title">Lexic<em>on</em></h1>
      <p class="header-sub">Words you've encountered, tracked as you learn</p>
    </div>
    <div class="subnav">
      <a href="/dashboard/lexicon" class="subnav-tab active">Lexicon</a>
      <a href="/dashboard/phrasebook" class="subnav-tab">Phrasebook</a>
    </div>
  </header>

  <div class="stat-strip fade-up">
    <div class="stat-card">
      <div class="stat-label">Words tracked</div>
      <div class="stat-value">{totalCount}</div>
      <div class="conf-bar-wrap">
        <div class="conf-seg seg-high" style={`width:${highPct}%`}></div>
        <div class="conf-seg seg-mid" style={`width:${midPct}%`}></div>
        <div class="conf-seg seg-low" style={`width:${lowPct}%`}></div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg confidence</div>
      <div class="stat-value green">{avgConfidence}</div>
      <div class="stat-sub">Updated {lastUpdate}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Estimated level</div>
      <div><span class={`cefr-badge ${cefrClass(cefrLevel)}`}>{cefrLevel}</span></div>
      <div class="stat-sub">CEFR framework</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Needs attention</div>
      <div class="stat-value red">{lowCount}</div>
      <div class="stat-sub">Low confidence words</div>
    </div>
  </div>

  <section class="attention-section fade-up">
    <div class="attention-head">
      <div class="attention-title">
        <span class="attention-dot"></span>
        Focus on these
      </div>
      <button class="attention-see-all" onclick={filterLow}>See all low -&gt;</button>
    </div>
    <div class="attention-chips">
      {#each attentionWords as w}
        <button class="attention-chip" onclick={() => openFlashcardFor(w)}>
          <span class="chip-word">{w.word}</span>
          <span class="chip-score">{Math.round(w.score * 100)}%</span>
        </button>
      {/each}
    </div>
  </section>

  <div class="toolbar fade-up">
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="search-input" type="text" bind:value={searchTerm} placeholder="Search words..."/>
    </div>
    <div class="toolbar-right">
      <select class="sort-select" value={sortSelectValue} onchange={(e) => onSort((e.currentTarget as HTMLSelectElement).value)}>
        <option value="word-asc">Word A->Z</option>
        <option value="word-desc">Word Z->A</option>
        <option value="score-asc">Confidence ↑</option>
        <option value="score-desc">Confidence ↓</option>
        <option value="pos-asc">Part of speech</option>
      </select>
      <button class="btn-import" onclick={openImport}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Import words
      </button>
    </div>
  </div>

  <div class="table-wrap fade-up">
    <table class="lex-table">
      <thead>
        <tr>
          <th onclick={() => toggleSort('word')} class:sorted={sortKey==='word'}><div class="th-inner">Word <span class="th-sort">{sortKey==='word' ? (sortDir==='asc'?'↑':'↓') : ''}</span></div></th>
          <th onclick={() => toggleSort('lemma')} class:sorted={sortKey==='lemma'}><div class="th-inner">Base form <span class="th-sort">{sortKey==='lemma' ? (sortDir==='asc'?'↑':'↓') : ''}</span></div></th>
          <th onclick={() => toggleSort('pos')} class:sorted={sortKey==='pos'}><div class="th-inner">Part of speech <span class="th-sort">{sortKey==='pos' ? (sortDir==='asc'?'↑':'↓') : ''}</span></div></th>
          <th onclick={() => toggleSort('score')} class:sorted={sortKey==='score'}><div class="th-inner">Confidence <span class="th-sort">{sortKey==='score' ? (sortDir==='asc'?'↑':'↓') : ''}</span></div></th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr><td colspan="5" class="empty-state">Loading lexicon...</td></tr>
        {:else if !pageWords.length}
          <tr>
            <td colspan="5">
              <div class="empty-state">
                <span class="empty-icon">📖</span>
                <div class="empty-title">No words found</div>
                <div class="empty-body">Try a different search, or import some words to get started.</div>
                <button class="btn-import" style="margin:0 auto" onclick={openImport}>Import words</button>
              </div>
            </td>
          </tr>
        {:else}
          {#each pageWords as w}
            <tr>
              <td><span class="td-word">{w.word}</span></td>
              <td><span class="td-lemma">{w.lemma !== w.word ? w.lemma : '—'}</span></td>
              <td><span class="pos-pill">{POS_LABELS[w.pos] || w.pos}</span></td>
              <td><span class={`conf-pill ${confidenceClass(w.score)}`}>{Math.round(w.score * 100)}%</span></td>
              <td>
                <button class="btn-flashcard" onclick={() => openFlashcardFor(w)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  Add to deck
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mobile-list fade-up">
    {#if !loading && !pageWords.length}
      <div class="empty-state">
        <span class="empty-icon">📖</span>
        <div class="empty-title">No words found</div>
        <div class="empty-body">Try a different search, or import some words.</div>
        <button class="btn-import" style="margin:0 auto" onclick={openImport}>Import words</button>
      </div>
    {:else}
      {#each pageWords as w}
        <div class="word-card">
          <div class="wc-left">
            <div class="wc-word">{w.word}</div>
            {#if w.lemma !== w.word}
              <div class="wc-lemma">{w.lemma}</div>
            {/if}
            <div class="wc-tags">
              <span class="pos-pill">{POS_LABELS[w.pos] || w.pos}</span>
              <span class={`conf-pill ${confidenceClass(w.score)}`}>{Math.round(w.score * 100)}%</span>
            </div>
          </div>
          <div class="wc-right">
            <button class="btn-flashcard" onclick={() => openFlashcardFor(w)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Add to deck
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="pagination fade-up">
    <span>{rangeStart}-{rangeEnd} of {filteredWords.length} words</span>
    <div class="page-btns">
      <button class="page-btn" onclick={() => goPage(currentPage - 1)} disabled={currentPage === 1}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      {#each Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5) as pageNum}
        <button class={`page-btn ${pageNum === currentPage ? 'active' : ''}`} onclick={() => goPage(pageNum)}>{pageNum}</button>
      {/each}
      <button class="page-btn" onclick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</div>

<div class={`modal-backdrop ${importOpen ? 'open' : ''}`} onclick={(e) => e.target === e.currentTarget && closeImport()}>
  <div class="modal-sheet">
    <div class="modal-drag"></div>
    <h2 class="modal-title">Import words</h2>
    <p class="modal-sub">Paste words separated by commas or new lines. They'll be added to your lexicon and tracked as you practise them.</p>
    <div class="field">
      <label>Words</label>
      <textarea bind:value={importText} rows="7" placeholder={"Dia duit\nle do thoil\ncaife, bainne, siúcra"}></textarea>
      <div class="word-count">{parsedImportWords.length} word{parsedImportWords.length === 1 ? '' : 's'} detected</div>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick={closeImport}>Cancel</button>
      <button class="btn-confirm" onclick={submitImport}>Import words</button>
    </div>
  </div>
</div>

<div class={`modal-backdrop ${flashcardOpen ? 'open' : ''}`} onclick={(e) => e.target === e.currentTarget && closeFlashcard()}>
  <div class="modal-sheet">
    <div class="modal-drag"></div>
    <h2 class="modal-title">Create flashcard</h2>
    <p class="modal-sub">Add this word to a deck to review it with spaced repetition.</p>

    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Deck</div>
      <div class="deck-options">
        {#each flashcardDecks as deck}
          <button class={`deck-opt ${selectedDeckId === String(deck.id) ? 'active' : ''}`} onclick={() => (selectedDeckId = String(deck.id))}>
            <div class="deck-opt-name">{deck.name}</div>
            <div class="deck-opt-count">{deck.cardCount ?? 0} cards</div>
          </button>
        {/each}
        <button class={`deck-opt ${selectedDeckId === '__new__' ? 'active' : ''}`} onclick={() => (selectedDeckId = '__new__')}>
          <div class="deck-opt-name">+ New deck</div>
          <div class="deck-opt-count">Create fresh</div>
        </button>
      </div>
      {#if selectedDeckId === '__new__'}
        <div class="field" style="margin-top:8px">
          <label>New deck name</label>
          <input type="text" bind:value={newDeckName} placeholder="e.g. Everyday phrases"/>
        </div>
      {/if}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="field">
        <label>Front (Irish)</label>
        <input type="text" bind:value={fcFront}/>
      </div>
      <div class="field">
        <label>Back (English)</label>
        <input type="text" bind:value={fcBack} placeholder="Translation"/>
      </div>
    </div>
    <div class="field">
      <label>Notes <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px">(optional)</span></label>
      <input type="text" bind:value={fcNotes} placeholder="e.g. POS: noun · used in formal greetings"/>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick={closeFlashcard}>Cancel</button>
      <button class="btn-confirm" onclick={submitFlashcard} disabled={flashcardBusy}>{flashcardBusy ? 'Creating...' : 'Create card'}</button>
    </div>
  </div>
</div>

<div class={`toast ${toastVisible ? 'show' : ''}`}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  <span>{toastMessage}</span>
</div>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--forest:#1c2b22;--forest-mid:#2e4436;--forest-l:#3a5a44;--green:#2d7a50;--sage:#7ec99a;--sage-l:#c4e8d1;--parchment:#f5f0e8;--parch-dark:#e8e0d0;--parch-mid:#ede7da;--muted:#5a7a64;--ink:#1a1a18;--ink-l:#3a3a36;--amber:#f0b429;--red:#e05353}
.page{max-width:1080px;margin:0 auto;padding:48px 40px 96px}
.page-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:36px;padding-bottom:28px;border-bottom:1.5px solid var(--parch-dark);gap:20px;flex-wrap:wrap}
.header-eyebrow{font-size:10px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#bbb;margin-bottom:6px}
.header-title{font-family:'Fraunces',serif;font-weight:900;font-size:36px;letter-spacing:-.04em;color:var(--forest);line-height:1;margin-bottom:8px}
.header-title em{font-style:italic;font-weight:300;color:var(--green)}
.header-sub{font-size:14px;color:var(--muted)}
.subnav{display:inline-flex;background:var(--parch-mid);border:1.5px solid var(--parch-dark);border-radius:12px;padding:4px;gap:2px}
.subnav-tab{padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;color:var(--muted);text-decoration:none;transition:background .15s,color .15s}
.subnav-tab.active,.subnav-tab:hover{background:#fff;color:var(--forest)}
.stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
.stat-card{background:#fff;border:1.5px solid var(--parch-dark);border-radius:14px;padding:16px 18px}
.stat-label{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#bbb;margin-bottom:6px}
.stat-value{font-family:'Fraunces',serif;font-weight:900;font-size:26px;letter-spacing:-.04em;color:var(--forest);line-height:1}
.stat-value.green{color:var(--green)}
.stat-value.red{color:var(--red)}
.stat-sub{font-size:11px;color:#bbb;margin-top:3px}
.conf-bar-wrap{margin-top:10px;height:4px;background:var(--parch-dark);border-radius:2px;overflow:hidden;display:flex;gap:2px}
.conf-seg{height:100%;border-radius:2px;transition:width .5s ease}
.seg-high{background:var(--sage)}.seg-mid{background:var(--amber)}.seg-low{background:var(--red)}
.cefr-badge{display:inline-block;border-radius:100px;padding:4px 12px;font-family:'Fraunces',serif;font-weight:700;font-size:20px;letter-spacing:-.02em;color:#fff}
.cefr-c{background:var(--green)}.cefr-b{background:var(--amber)}.cefr-a{background:var(--red)}
.attention-section{margin-bottom:24px}
.attention-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.attention-title{font-family:'Fraunces',serif;font-weight:700;font-size:16px;letter-spacing:-.02em;color:var(--forest);display:flex;align-items:center;gap:8px}
.attention-dot{width:7px;height:7px;border-radius:50%;background:var(--amber);animation:pulse 2s ease infinite}
.attention-see-all{font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-weight:600}
.attention-chips{display:flex;gap:7px;flex-wrap:wrap}
.attention-chip{background:#fff;border:1.5px solid var(--parch-dark);border-radius:100px;padding:6px 14px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:border-color .15s,transform .1s}
.attention-chip:hover{border-color:var(--amber);transform:translateY(-1px)}
.chip-word{font-family:'Fraunces',serif;font-weight:700;font-size:14px;color:var(--forest)}
.chip-score{font-size:10px;font-weight:700;color:var(--amber);background:rgba(240,180,41,.1);border-radius:100px;padding:2px 6px}
.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.search-wrap{position:relative;flex:1;min-width:200px;max-width:340px}
.search-input{width:100%;background:#fff;border:1.5px solid var(--parch-dark);border-radius:10px;padding:9px 14px 9px 38px;font-family:'Instrument Sans',sans-serif;font-size:13px;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
.search-input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(45,122,80,.1)}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:#bbb;pointer-events:none}
.toolbar-right{display:flex;align-items:center;gap:8px;margin-left:auto}
.sort-select{background:#fff;border:1.5px solid var(--parch-dark);border-radius:10px;padding:9px 12px;font-family:'Instrument Sans',sans-serif;font-size:13px;color:var(--ink-l);outline:none;cursor:pointer}
.btn-import{background:var(--forest);color:var(--parchment);border:none;border-radius:10px;padding:9px 18px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background .15s}
.btn-import:hover{background:var(--forest-mid)}
.btn-import svg{width:14px;height:14px}
.table-wrap{background:#fff;border:1.5px solid var(--parch-dark);border-radius:16px;overflow:hidden}
.lex-table{width:100%;border-collapse:collapse}
.lex-table thead{background:var(--parch-mid)}
.lex-table th{padding:11px 18px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);border-bottom:1.5px solid var(--parch-dark);cursor:pointer;user-select:none;white-space:nowrap}
.lex-table th.sorted{color:var(--green)}
.th-inner{display:flex;align-items:center;gap:5px}
.th-sort{font-size:11px;color:var(--green)}
.lex-table tbody tr{border-bottom:1px solid var(--parch-dark);transition:background .1s}
.lex-table tbody tr:last-child{border-bottom:none}
.lex-table tbody tr:hover{background:rgba(245,240,232,.6)}
.lex-table td{padding:12px 18px;font-size:13px;color:var(--ink-l);vertical-align:middle}
.td-word{font-family:'Fraunces',serif;font-weight:700;font-size:15px;color:var(--forest)}
.td-lemma{font-size:12px;color:var(--muted)}
.pos-pill{display:inline-block;background:var(--parch-mid);border:1px solid var(--parch-dark);border-radius:100px;padding:3px 9px;font-size:11px;font-weight:600;color:var(--muted)}
.conf-pill{display:inline-block;border-radius:100px;padding:3px 10px;font-size:11px;font-weight:700;color:#fff}
.conf-high{background:var(--green)}.conf-mid{background:var(--amber);color:var(--ink)}.conf-low{background:var(--red)}
.btn-flashcard{display:inline-flex;align-items:center;gap:5px;background:none;border:1.5px solid var(--parch-dark);border-radius:8px;padding:5px 10px;font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:700;color:var(--muted);cursor:pointer;white-space:nowrap;transition:border-color .15s,color .15s,background .15s}
.btn-flashcard:hover{border-color:var(--green);color:var(--green);background:rgba(45,122,80,.05)}
.btn-flashcard svg{width:12px;height:12px}
.mobile-list{display:none;flex-direction:column;gap:8px}
.word-card{background:#fff;border:1.5px solid var(--parch-dark);border-radius:14px;padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;animation:fadeUp .2s ease both}
.wc-word{font-family:'Fraunces',serif;font-weight:700;font-size:17px;color:var(--forest);margin-bottom:3px}
.wc-lemma{font-size:12px;color:var(--muted);margin-bottom:8px}
.wc-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wc-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.empty-state{padding:60px 20px;text-align:center}
.empty-icon{font-size:40px;margin-bottom:16px;display:block}
.empty-title{font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:var(--forest);margin-bottom:8px}
.empty-body{font-size:14px;color:var(--muted);margin-bottom:20px;line-height:1.6}
.pagination{display:flex;align-items:center;justify-content:space-between;padding-top:16px;font-size:12px;color:var(--muted);flex-wrap:wrap;gap:10px}
.page-btns{display:flex;align-items:center;gap:6px}
.page-btn{width:30px;height:30px;border-radius:8px;border:1.5px solid var(--parch-dark);background:#fff;font-size:12px;font-weight:600;color:var(--ink-l);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .12s,background .12s,color .12s}
.page-btn:hover{border-color:var(--green);color:var(--green)}
.page-btn.active{background:var(--forest);border-color:var(--forest);color:#fff}
.page-btn:disabled{opacity:.35;cursor:default}
.page-btn svg{width:12px;height:12px}
.modal-backdrop{position:fixed;inset:0;z-index:50;background:rgba(28,43,34,.45);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}
.modal-backdrop.open{opacity:1;pointer-events:all}
.modal-sheet{background:var(--parchment);border-radius:24px 24px 0 0;width:100%;max-width:640px;padding:10px 24px 40px;transform:translateY(100%);transition:transform .3s cubic-bezier(.34,1.15,.64,1);max-height:88vh;overflow-y:auto}
.modal-backdrop.open .modal-sheet{transform:translateY(0)}
.modal-drag{width:40px;height:4px;border-radius:2px;background:var(--parch-dark);margin:14px auto 22px}
.modal-title{font-family:'Fraunces',serif;font-weight:900;font-size:22px;letter-spacing:-.03em;color:var(--forest);margin-bottom:4px}
.modal-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.field input,.field textarea,.field select{width:100%;background:#fff;border:1.5px solid var(--parch-dark);border-radius:10px;padding:11px 14px;font-family:'Instrument Sans',sans-serif;font-size:14px;color:var(--ink);outline:none;resize:vertical}
.word-count{font-size:11px;color:#bbb;margin-top:4px}
.modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.btn-cancel{padding:11px 20px;border-radius:10px;background:none;border:1.5px solid var(--parch-dark);font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer}
.btn-confirm{padding:11px 24px;border-radius:10px;background:var(--forest);border:none;font-family:'Fraunces',serif;font-weight:700;font-size:15px;letter-spacing:-.01em;color:var(--parchment);cursor:pointer}
.btn-confirm:disabled{opacity:.5;cursor:default}
.deck-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.deck-opt{background:#fff;border:1.5px solid var(--parch-dark);border-radius:10px;padding:10px 12px;cursor:pointer;text-align:left;transition:border-color .15s,background .15s}
.deck-opt.active{border-color:var(--green);background:rgba(45,122,80,.05)}
.deck-opt-name{font-size:13px;font-weight:600;color:var(--forest)}
.deck-opt-count{font-size:11px;color:#bbb;margin-top:2px}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);z-index:200;background:var(--forest);color:var(--parchment);border-radius:100px;padding:10px 20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;white-space:nowrap}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast svg{width:14px;height:14px;color:var(--sage)}
.fade-up{opacity:0;transform:translateY(12px);animation:fadeUp .4s cubic-bezier(.4,0,.2,1) forwards}
@keyframes fadeUp{to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
@media(max-width:860px){.page{padding:28px 20px 80px}.stat-strip{grid-template-columns:1fr 1fr}.table-wrap{display:none}.mobile-list{display:flex}.search-wrap{max-width:100%}.page-header{flex-direction:column;align-items:flex-start}}
@media(max-width:480px){.attention-chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}}
</style>
