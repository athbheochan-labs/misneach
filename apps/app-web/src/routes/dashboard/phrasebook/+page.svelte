<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { loadAuthSession } from '$lib/mobile/session-storage';
  import { onDestroy, onMount, tick } from 'svelte';

  type Phrase = {
    id: number | string;
    text: string;
    translation?: string | null;
    pronunciation?: string | null;
    notes?: string | null;
    categoryId?: number | string | null;
    category?: string | null;
    groupId?: number | string | null;
    groupName?: string | null;
    source?: string | null;
    inPractice?: boolean;
    inFlashcards?: boolean;
    loading?: boolean;
    pendingRequestId?: string | null;
  };

  type PhraseModalForm = {
    text: string;
    translation: string;
    pronunciation: string;
    notes: string;
    category: string;
    groupName: string;
  };

  type FlashcardDeck = {
    id: number | string;
    name: string;
    cardCount?: number;
  };

  type PhraseCategory = {
    id: number | string;
    name: string;
    archived?: boolean;
  };

  type PhraseGroup = {
    id: number | string;
    categoryId: number | string;
    name: string;
    archived?: boolean;
  };

  type PhrasebookSummary = {
    total: number;
    inPractice: number;
    inFlashcards: number;
    own: number;
  };

  let loading = false;
  let phrases: Phrase[] = [];
  let searchTerm = '';
  let activeFilter: 'all' | 'course' | 'own' | 'unannotated' = 'all';
  let sortBy: 'newest' | 'oldest' | 'alphabetical' = 'newest';
  let selectedCategoryId = '';
  let selectedGroupId = '';
  let currentPage = 1;
  let pageSize = 24;
  let totalCount = 0;
  let totalPages = 1;
  let summary: PhrasebookSummary = {
    total: 0,
    inPractice: 0,
    inFlashcards: 0,
    own: 0
  };
  let categories: PhraseCategory[] = [];
  let groups: PhraseGroup[] = [];
  let categoryOptions: string[] = [];
  let groupOptions: string[] = [];
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  let phraseModalOpen = false;
  let editingPhraseId: number | string | null = null;
  let editingSource: string | null = null;
  let phraseTextInput: HTMLInputElement | null = null;
  let form: PhraseModalForm = {
    text: '',
    translation: '',
    pronunciation: '',
    notes: '',
    category: '',
    groupName: ''
  };

  let routePractice = true;
  let routeFlashcard = false;
  let flashcardDecks: FlashcardDeck[] = [];
  let selectedDeckId = '';
  let newDeckName = '';
  let savingPhrase = false;

  let toastVisible = false;
  let toastMessage = '';
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  let source: EventSource | null = null;
  const PHRASE_ACTION_TIMEOUT_MS = 8000;
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function isOwnSource(value?: string | null) {
    const sourceVal = String(value || '').toLowerCase();
    return sourceVal === 'own' || sourceVal === 'manual' || sourceVal === 'user' || sourceVal === 'user_added';
  }

  function sourceLabel(item: Phrase) {
    return isOwnSource(item.source) ? 'Added by you' : 'From course';
  }

  function sourceClass(item: Phrase) {
    return isOwnSource(item.source) ? 'source-own' : 'source-course';
  }

  function normalizePhrase(raw: Record<string, unknown>): Phrase {
    return {
      id: (raw.id as number | string) ?? `tmp-${Date.now()}`,
      text: String(raw.text || ''),
      translation: raw.translation ? String(raw.translation) : null,
      pronunciation: raw.pronunciation ? String(raw.pronunciation) : null,
      notes: raw.notes ? String(raw.notes) : null,
      categoryId: raw.categoryId != null ? String(raw.categoryId) : null,
      category: raw.category ? String(raw.category) : null,
      groupId: raw.groupId != null ? String(raw.groupId) : null,
      groupName: raw.groupName ? String(raw.groupName) : null,
      source: raw.source ? String(raw.source) : null,
      inPractice: Boolean(raw.inPractice),
      inFlashcards: Boolean(raw.inFlashcards),
      loading: false,
      pendingRequestId: null
    };
  }

  async function readErrorMessage(response: Response, fallback: string) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        if (body?.error) return String(body.error);
      }
      const text = await response.text();
      if (text) return text;
    } catch {
      // ignore parse errors
    }
    return fallback;
  }

  function showToast(message: string) {
    toastMessage = message;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 2400);
  }

  function setPhraseStateById(id: number | string, patch: Partial<Phrase>) {
    const idx = phrases.findIndex((item) => String(item.id) === String(id));
    if (idx === -1) return false;
    phrases[idx] = { ...phrases[idx], ...patch };
    phrases = [...phrases];
    return true;
  }

  function clearPendingTimer(key: string | null | undefined) {
    if (!key) return;
    const existing = pendingTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      pendingTimers.delete(key);
    }
  }

  function clearPendingForPhrase(item: Phrase | undefined | null) {
    if (!item) return;
    clearPendingTimer(`phrase:${String(item.id)}`);
    if (item.pendingRequestId) {
      clearPendingTimer(`request:${item.pendingRequestId}`);
    }
  }

  function markPhrasePending(item: Phrase | undefined | null, keySuffix: string) {
    if (!item) return;
    const timerKey = keySuffix;
    clearPendingTimer(timerKey);

    const timer = setTimeout(async () => {
      pendingTimers.delete(timerKey);
      const current = phrases.find((p) => String(p.id) === String(item.id));
      if (!current?.loading) return;
      setPhraseStateById(item.id, { loading: false, pendingRequestId: null });
      try {
        await loadPhrases();
      } catch {
        // ignore refresh failure; loading state has already been released
      }
    }, PHRASE_ACTION_TIMEOUT_MS);

    pendingTimers.set(timerKey, timer);
  }

  async function loadPhrases(page = currentPage) {
    loading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        filter: activeFilter,
        sort: sortBy
      });
      const normalizedSearch = searchTerm.trim();
      if (normalizedSearch) params.set('search', normalizedSearch);
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      if (selectedGroupId) params.set('groupId', selectedGroupId);

      const res = await apiFetch(`/api/proxy/phrasebook/list?${params.toString()}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load phrasebook'));
      const data = await res.json();
      phrases = Array.isArray(data?.items) ? data.items.map((item) => normalizePhrase(item)) : [];
      currentPage = Number(data?.page) > 0 ? Number(data.page) : page;
      pageSize = Number(data?.pageSize) > 0 ? Number(data.pageSize) : pageSize;
      totalCount = Number(data?.total) >= 0 ? Number(data.total) : phrases.length;
      totalPages = Number(data?.totalPages) > 0 ? Number(data.totalPages) : 1;
      summary = {
        total: Number(data?.summary?.total ?? totalCount),
        inPractice: Number(data?.summary?.inPractice ?? 0),
        inFlashcards: Number(data?.summary?.inFlashcards ?? 0),
        own: Number(data?.summary?.own ?? 0)
      };
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to load phrasebook');
      phrases = [];
      totalCount = 0;
      totalPages = 1;
      summary = {
        total: 0,
        inPractice: 0,
        inFlashcards: 0,
        own: 0
      };
    } finally {
      loading = false;
    }
  }

  async function loadOrganization() {
    try {
      const [categoryRes, groupRes] = await Promise.all([
        apiFetch('/api/proxy/phrasebook/categories', { cache: 'no-store' }),
        apiFetch('/api/proxy/phrasebook/groups', { cache: 'no-store' })
      ]);

      if (categoryRes.ok) {
        const payload = await categoryRes.json();
        categories = Array.isArray(payload)
          ? payload.map((item) => ({
              id: String(item.id),
              name: String(item.name || ''),
              archived: Boolean(item.archived)
            })).filter((item) => item.name)
          : [];
      }

      if (groupRes.ok) {
        const payload = await groupRes.json();
        groups = Array.isArray(payload)
          ? payload.map((item) => ({
              id: String(item.id),
              categoryId: String(item.categoryId),
              name: String(item.name || ''),
              archived: Boolean(item.archived)
            })).filter((item) => item.name)
          : [];
      }
    } catch (err) {
      console.warn('Failed to load phrase organization', err);
    }
  }

  function connectStream(accessToken?: string | null) {
    const streamUrl = accessToken
      ? `/api/phrasebook/stream?accessToken=${encodeURIComponent(accessToken)}`
      : '/api/phrasebook/stream';
    source = new EventSource(streamUrl);

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.type) return;

        if (msg.type === 'phrase.deleted') {
          const deleted = phrases.find((item) => String(item.id) === String(msg.phraseId));
          clearPendingForPhrase(deleted);
          phrases = phrases.filter((item) => String(item.id) !== String(msg.phraseId));
          return;
        }

        if (msg.type === 'phrase.translation.requested') {
          const idx = phrases.findIndex((item) => String(item.id) === String(msg.phraseId));
          if (idx !== -1) {
            phrases[idx].loading = true;
            phrases = [...phrases];
          }
          return;
        }

        if (!msg.phrase) return;

        const normalized = normalizePhrase(msg.phrase as Record<string, unknown>);
        const idx = phrases.findIndex((item) => String(item.id) === String(normalized.id));
        const pendingIdx = msg.requestId
          ? phrases.findIndex((item) => item.pendingRequestId === msg.requestId)
          : -1;

        if (idx !== -1) {
          clearPendingForPhrase(phrases[idx]);
          if (msg.requestId) clearPendingTimer(`request:${String(msg.requestId)}`);
          phrases[idx] = {
            ...phrases[idx],
            ...normalized,
            loading: false,
            pendingRequestId: null
          };
        } else if (pendingIdx !== -1) {
          clearPendingForPhrase(phrases[pendingIdx]);
          if (msg.requestId) clearPendingTimer(`request:${String(msg.requestId)}`);
          phrases[pendingIdx] = {
            ...phrases[pendingIdx],
            ...normalized,
            loading: false,
            pendingRequestId: null
          };
        } else {
          phrases = [{ ...normalized, loading: false, pendingRequestId: null }, ...phrases];
        }

        phrases = [...phrases];
      } catch (err) {
        console.warn('Failed to parse phrasebook stream message', err);
      }
    };

    source.onerror = () => {
      console.warn('Phrasebook SSE disconnected');
      for (const item of phrases) {
        if (!item.loading) continue;
        clearPendingForPhrase(item);
        setPhraseStateById(item.id, { loading: false, pendingRequestId: null });
      }
      void loadPhrases().catch(() => undefined);
    };
  }

  onMount(async () => {
    await Promise.all([loadPhrases(), loadOrganization()]);
    const session = await loadAuthSession().catch(() => null);
    connectStream(session?.accessToken || null);
  });

  onDestroy(() => {
    source?.close();
    source = null;
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
    if (toastTimer) clearTimeout(toastTimer);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  });

  $: normalizedSearch = searchTerm.toLowerCase().trim();
  $: filteredPhrases = phrases;
  $: inPracticeCount = summary.inPractice;
  $: inFlashcardsCount = summary.inFlashcards;
  $: ownCount = summary.own;
  $: categoryOptions = [
    ...new Set([
      ...categories.filter((item) => !item.archived).map((item) => item.name),
      ...phrases.map((item) => String(item.category || '').trim()).filter(Boolean)
    ])
  ].sort((a, b) => a.localeCompare(b));
  $: groupOptions = [
    ...new Set([
      ...groups
        .filter((item) => !item.archived)
        .filter((item) => !selectedCategoryId || String(item.categoryId) === selectedCategoryId)
        .map((item) => item.name),
      ...phrases
        .filter((item) => !selectedCategoryId || String(item.categoryId || '') === selectedCategoryId)
        .map((item) => String(item.groupName || '').trim())
        .filter(Boolean)
    ])
  ].sort((a, b) => a.localeCompare(b));
  $: visibleGroups = groups.filter((item) => !item.archived && (!selectedCategoryId || String(item.categoryId) === selectedCategoryId));
  $: if (selectedGroupId && !visibleGroups.some((item) => String(item.id) === selectedGroupId)) {
    selectedGroupId = '';
    void loadPhrases(1);
  }

  $: pronPreviewText = form.pronunciation.trim() && form.text.trim() ? `${form.text.trim()} -> ${form.pronunciation.trim()}` : '';

  function scheduleSearchReload() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      void loadPhrases(1);
    }, 250);
  }

  function updateFilter(next: typeof activeFilter) {
    if (activeFilter === next) return;
    activeFilter = next;
    void loadPhrases(1);
  }

  function updateSort(next: typeof sortBy) {
    if (sortBy === next) return;
    sortBy = next;
    void loadPhrases(1);
  }

  function updateCategory(next: string) {
    if (selectedCategoryId === next) return;
    selectedCategoryId = next;
    selectedGroupId = '';
    void loadPhrases(1);
  }

  function updateGroup(next: string) {
    if (selectedGroupId === next) return;
    selectedGroupId = next;
    void loadPhrases(1);
  }

  function updatePageSize(next: string) {
    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed < 1 || pageSize === parsed) return;
    pageSize = parsed;
    void loadPhrases(1);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage || loading) return;
    void loadPhrases(nextPage);
  }

  $: pageStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  $: pageEnd = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

  async function focusPhraseInput() {
    await tick();
    phraseTextInput?.focus();
  }

  function openAdd() {
    editingPhraseId = null;
    editingSource = 'own';
    form = {
      text: '',
      translation: '',
      pronunciation: '',
      notes: '',
      category: '',
      groupName: ''
    };
    routePractice = true;
    routeFlashcard = false;
    flashcardDecks = [];
    selectedDeckId = '';
    newDeckName = '';
    phraseModalOpen = true;
    void focusPhraseInput();
  }

  function openEdit(item: Phrase) {
    editingPhraseId = item.id;
    editingSource = item.source || 'own';
    form = {
      text: item.text || '',
      translation: item.translation || '',
      pronunciation: item.pronunciation || '',
      notes: item.notes || '',
      category: item.category || '',
      groupName: item.groupName || ''
    };
    phraseModalOpen = true;
    void focusPhraseInput();
  }

  function closePhraseModal() {
    phraseModalOpen = false;
    editingPhraseId = null;
    editingSource = null;
  }

  async function loadFlashcardDeckOptions() {
    const decksRes = await apiFetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
    if (!decksRes.ok) {
      throw new Error(await readErrorMessage(decksRes, 'Failed to load flashcard decks'));
    }
    const decks = await decksRes.json();
    flashcardDecks = Array.isArray(decks) ? decks : [];
    if (!selectedDeckId) {
      selectedDeckId = flashcardDecks[0] ? String(flashcardDecks[0].id) : '__new__';
    }
  }

  async function toggleRoute(route: 'practice' | 'flashcard') {
    if (route === 'practice') {
      routePractice = !routePractice;
      return;
    }
    routeFlashcard = !routeFlashcard;
    if (routeFlashcard) {
      try {
        await loadFlashcardDeckOptions();
      } catch (err) {
        console.error(err);
        selectedDeckId = '__new__';
        flashcardDecks = [];
        alert(err instanceof Error ? err.message : 'Failed to load flashcard decks');
      }
    }
  }

  async function savePhrase() {
    const text = form.text.trim();
    const translation = form.translation.trim();
    const pronunciation = form.pronunciation.trim();
    const notes = form.notes.trim();
    const category = form.category.trim();
    const groupName = form.groupName.trim();

    if (!text || !translation) {
      alert('Irish phrase and English translation are required');
      return;
    }

    if (savingPhrase) return;
    savingPhrase = true;
    try {
      if (editingPhraseId != null) {
        const res = await apiFetch(`/api/proxy/phrasebook/${editingPhraseId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            translation,
            pronunciation: pronunciation || null,
            notes: notes || null,
            category: category || null,
            groupName: groupName || null,
            source: editingSource || 'own'
          })
        });

        if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to update phrase'));

        const data = await res.json();
        const idx = phrases.findIndex((item) => String(item.id) === String(editingPhraseId));
        if (idx !== -1) {
          clearPendingForPhrase(phrases[idx]);
          phrases[idx] = {
            ...phrases[idx],
            text,
            translation,
            pronunciation: pronunciation || null,
            notes: notes || null,
            category: category || null,
            groupName: groupName || null,
            source: editingSource || phrases[idx].source,
            loading: true,
            pendingRequestId: data.requestId || null
          };
          markPhrasePending(
            phrases[idx],
            data.requestId ? `request:${String(data.requestId)}` : `phrase:${String(phrases[idx].id)}`,
          );
          phrases = [...phrases];
        }

        showToast('Phrase updated');
      } else {
        let deckId: string | null = null;
        if (routeFlashcard) {
          deckId = selectedDeckId || '';
          if (!deckId) {
            await loadFlashcardDeckOptions();
            deckId = selectedDeckId || '';
          }
          if (!deckId) throw new Error('Please select a flashcard deck');

          if (deckId === '__new__') {
            const deckName = newDeckName.trim();
            if (!deckName) throw new Error('New deck name is required');
            const createDeckRes = await apiFetch('/api/proxy/flashcards/decks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: deckName,
                description: 'Cards created from phrasebook entries',
                language: 'ga'
              })
            });
            if (!createDeckRes.ok) throw new Error(await readErrorMessage(createDeckRes, 'Failed to create deck'));
            const createdDeck = await createDeckRes.json();
            deckId = String(createdDeck.id);
          }
        }

        const res = await apiFetch('/api/proxy/phrasebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            translation,
            pronunciation: pronunciation || null,
            notes: notes || null,
            category: category || null,
            groupName: groupName || null,
            source: 'own',
            inPractice: routePractice,
            inFlashcards: routeFlashcard
          })
        });

        if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to save phrase'));

        const data = await res.json();

        if (routeFlashcard && deckId && deckId !== '__new__') {
          const cardRes = await apiFetch(`/api/proxy/flashcards/decks/${encodeURIComponent(deckId)}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              front: text,
              back: translation,
              pronunciation: pronunciation || undefined,
              notes: notes || undefined
            })
          });
          if (!cardRes.ok) throw new Error(await readErrorMessage(cardRes, 'Phrase saved, but failed to create flashcard'));
        }

        phrases = [
          {
            id: `tmp-${data.requestId || Date.now()}`,
            text,
            translation,
            pronunciation: pronunciation || null,
            notes: notes || null,
            category: category || null,
            groupName: groupName || null,
            source: 'own',
            inPractice: routePractice,
            inFlashcards: routeFlashcard,
            loading: true,
            pendingRequestId: data.requestId || null
          },
          ...phrases
        ];
        if (phrases[0]) {
          markPhrasePending(
            phrases[0],
            data.requestId ? `request:${String(data.requestId)}` : `phrase:${String(phrases[0].id)}`,
          );
        }

        const routeLabels = [routePractice ? 'practice' : '', routeFlashcard ? 'flashcards' : ''].filter(Boolean);
        showToast(routeLabels.length ? `Phrase saved -> added to ${routeLabels.join(' & ')}` : 'Phrase saved to phrasebook');
      }

      await Promise.all([loadOrganization(), loadPhrases()]);
      closePhraseModal();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save phrase');
    } finally {
      savingPhrase = false;
    }
  }

  async function deletePhrase() {
    if (editingPhraseId == null) return;
    const item = phrases.find((phrase) => String(phrase.id) === String(editingPhraseId));
    if (!item) return;

    const confirmed = confirm(`Remove "${item.text}" from your phrasebook?`);
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/proxy/phrasebook/${editingPhraseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to delete phrase'));
      closePhraseModal();
      showToast('Phrase removed');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete phrase');
    }
  }

  async function patchPhrase(id: number | string, patch: Partial<Phrase>) {
    const res = await apiFetch(`/api/proxy/phrasebook/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });

    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Failed to update phrase'));
    }

    const data = await res.json();
    return data?.requestId ? String(data.requestId) : null;
  }

  async function togglePractice(id: number | string) {
    const current = phrases.find((item) => String(item.id) === String(id));
    if (!current) return;

    const previous = Boolean(current.inPractice);
    const next = !previous;

    setPhraseStateById(id, { inPractice: next, loading: true });
    markPhrasePending(current, `phrase:${String(id)}`);

    try {
      const requestId = await patchPhrase(id, { inPractice: next });
      setPhraseStateById(id, { pendingRequestId: requestId });
      if (requestId) {
        markPhrasePending(phrases.find((item) => String(item.id) === String(id)), `request:${requestId}`);
      }
      const latest = phrases.find((item) => String(item.id) === String(id));
      showToast(next ? `Added to practice -> ${latest?.text || 'phrase'}` : 'Removed from practice');
    } catch (err) {
      console.error(err);
      const latest = phrases.find((item) => String(item.id) === String(id));
      clearPendingForPhrase(latest);
      setPhraseStateById(id, { inPractice: previous, loading: false, pendingRequestId: null });
      alert(err instanceof Error ? err.message : 'Failed to update practice status');
    }
  }

  async function toggleFlashcard(id: number | string) {
    const current = phrases.find((item) => String(item.id) === String(id));
    if (!current) return;

    const previous = Boolean(current.inFlashcards);
    const next = !previous;

    setPhraseStateById(id, { inFlashcards: next, loading: true });
    markPhrasePending(current, `phrase:${String(id)}`);

    try {
      const requestId = await patchPhrase(id, { inFlashcards: next });
      setPhraseStateById(id, { pendingRequestId: requestId });
      if (requestId) {
        markPhrasePending(phrases.find((item) => String(item.id) === String(id)), `request:${requestId}`);
      }
      const latest = phrases.find((item) => String(item.id) === String(id));
      showToast(next ? `Added to flashcards -> ${latest?.text || 'phrase'}` : 'Removed from flashcards');
    } catch (err) {
      console.error(err);
      const latest = phrases.find((item) => String(item.id) === String(id));
      clearPendingForPhrase(latest);
      setPhraseStateById(id, { inFlashcards: previous, loading: false, pendingRequestId: null });
      alert(err instanceof Error ? err.message : 'Failed to update flashcard status');
    }
  }
</script>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<section class="phrasebook-shell">
  <div class="page">
    <header class="page-header fade-up">
      <div>
        <div class="header-eyebrow">Your vocabulary</div>
        <h1 class="header-title">Phrase<em>book</em></h1>
        <p class="header-sub">Phrases you've encountered, annotated, and made your own</p>
      </div>
      <div class="subnav">
        <a href="/dashboard/lexicon" class="subnav-tab">Lexicon</a>
        <a href="/dashboard/phrasebook" class="subnav-tab active">Phrasebook</a>
      </div>
    </header>

    <div class="stat-row fade-up">
      <div class="stat-item">
        <div class="stat-num">{totalCount}</div>
        <div class="stat-lbl">Phrases saved</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-num green">{inPracticeCount}</div>
        <div class="stat-lbl">In practice</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-num">{inFlashcardsCount}</div>
        <div class="stat-lbl">In flashcards</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-num">{ownCount}</div>
        <div class="stat-lbl">Added by you</div>
      </div>
    </div>

    <div class="toolbar fade-up">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          class="search-input"
          type="text"
          bind:value={searchTerm}
          placeholder="Search phrases..."
          oninput={() => scheduleSearchReload()}
        />
      </div>
      <div class="filter-chips">
        <button class={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onclick={() => updateFilter('all')}>All</button>
        <button class={`filter-chip ${activeFilter === 'course' ? 'active' : ''}`} onclick={() => updateFilter('course')}>From course</button>
        <button class={`filter-chip ${activeFilter === 'own' ? 'active' : ''}`} onclick={() => updateFilter('own')}>Added by me</button>
        <button class={`filter-chip ${activeFilter === 'unannotated' ? 'active' : ''}`} onclick={() => updateFilter('unannotated')}>Not yet annotated</button>
      </div>
      <div class="org-filters">
        <label class="org-filter">
          <span>Category</span>
          <select value={selectedCategoryId} onchange={(event) => updateCategory((event.currentTarget as HTMLSelectElement).value)}>
            <option value="">All categories</option>
            {#each categories.filter((item) => !item.archived) as category (category.id)}
              <option value={String(category.id)}>{category.name}</option>
            {/each}
          </select>
        </label>
        <label class="org-filter">
          <span>Group</span>
          <select value={selectedGroupId} disabled={!visibleGroups.length} onchange={(event) => updateGroup((event.currentTarget as HTMLSelectElement).value)}>
            <option value="">All groups</option>
            {#each visibleGroups as group (group.id)}
              <option value={String(group.id)}>{group.name}</option>
            {/each}
          </select>
        </label>
        <label class="org-filter">
          <span>Sort</span>
          <select value={sortBy} onchange={(event) => updateSort((event.currentTarget as HTMLSelectElement).value as typeof sortBy)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </label>
        <label class="org-filter">
          <span>Page size</span>
          <select value={String(pageSize)} onchange={(event) => updatePageSize((event.currentTarget as HTMLSelectElement).value)}>
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="48">48</option>
            <option value="96">96</option>
          </select>
        </label>
      </div>
      <div class="toolbar-right">
        <button class="btn-add" onclick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add phrase
        </button>
      </div>
    </div>

    {#if loading}
      <div class="loading-wrap">
        <div class="spinner"></div>
      </div>
    {:else if !filteredPhrases.length}
      <div class="phrase-grid">
        <div class="empty-state">
          <span class="empty-icon">📖</span>
          <div class="empty-title">{normalizedSearch || activeFilter !== 'all' || selectedCategoryId || selectedGroupId ? 'No phrases found' : 'Your phrasebook is empty'}</div>
          <div class="empty-body">{normalizedSearch || activeFilter !== 'all' || selectedCategoryId || selectedGroupId
            ? 'Try a different search term, or clear the filter.'
            : 'Phrases from your lessons will appear here automatically. You can also add your own from a book, conversation, or anything you hear.'}</div>
          {#if !normalizedSearch && activeFilter === 'all' && !selectedCategoryId && !selectedGroupId}
            <button class="btn-add" style="margin: 0 auto;" onclick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add your first phrase
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="phrase-grid">
        {#each filteredPhrases as item (item.id)}
          <article class="phrase-card">
            {#if item.loading}
              <div class="loading-overlay"><div class="spinner"></div></div>
            {/if}

            <div class={`phrase-source-strip ${sourceClass(item)}`}>
              <span><span class="source-dot"></span>{sourceLabel(item)}</span>
            </div>

            <button class="card-edit-btn" onclick={() => openEdit(item)} title="Edit phrase">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            <div class="phrase-body">
              <div class="phrase-irish">{item.text}</div>
              {#if item.pronunciation}
                <div class="phrase-pron">
                  <svg class="pron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"></path><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                  {item.pronunciation}
                </div>
              {/if}
              <div class="phrase-english">{item.translation || '-'}</div>
              {#if item.notes}
                <div class="phrase-notes">{item.notes}</div>
              {/if}
              {#if item.category || item.groupName}
                <div class="phrase-meta">
                  {#if item.category}<span>{item.category}</span>{/if}
                  {#if item.groupName}<span>{item.groupName}</span>{/if}
                </div>
              {/if}
            </div>

            <div class="phrase-progress">
              <span class={`progress-pill pp-practice ${item.inPractice ? 'active' : ''}`}>
                {#if item.inPractice}<span class="pp-dot"></span>{/if}
                {item.inPractice ? 'In practice' : 'Practice'}
              </span>
              <span class={`progress-pill pp-flashcard ${item.inFlashcards ? 'active' : ''}`}>
                {#if item.inFlashcards}<span class="pp-dot"></span>{/if}
                {item.inFlashcards ? 'In flashcards' : 'Flashcards'}
              </span>
            </div>

            <div class="phrase-actions">
              <button class="action-btn practice" onclick={() => togglePractice(item.id)}>{item.inPractice ? 'In practice ✓' : 'Add to practice'}</button>
              <button class="action-btn" onclick={() => toggleFlashcard(item.id)}>{item.inFlashcards ? 'In flashcards ✓' : 'Add to flashcards'}</button>
              <button class="action-btn" onclick={() => openEdit(item)}>Edit</button>
            </div>
          </article>
        {/each}
      </div>
      <div class="pagination-bar fade-up">
        <div class="pagination-meta">
          Showing {pageStart}-{pageEnd} of {totalCount}
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick={() => goToPage(currentPage - 1)} disabled={loading || currentPage <= 1}>
            Previous
          </button>
          <span class="pagination-page">Page {currentPage} of {totalPages}</span>
          <button class="pagination-btn" onclick={() => goToPage(currentPage + 1)} disabled={loading || currentPage >= totalPages}>
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div
    class={`modal-backdrop ${phraseModalOpen ? 'open' : ''}`}
    onclick={(e) => e.target === e.currentTarget && closePhraseModal()}
    onkeydown={(e) => e.key === 'Escape' && closePhraseModal()}
    tabindex="-1"
    role="button"
  >
    <form class="modal-sheet" onsubmit={(event) => {
      event.preventDefault();
      void savePhrase();
    }}>
      <div class="modal-drag"></div>
      <h2 class="modal-title">{editingPhraseId != null ? 'Edit phrase' : 'Add a phrase'}</h2>
      <p class="modal-sub">{editingPhraseId != null ? 'Update the Irish, translation, pronunciation or notes.' : 'Save a phrase to your phrasebook. You can annotate it and route it to practice or flashcards.'}</p>

      <div class="field">
        <label for="phrase-text">Irish phrase</label>
        <input id="phrase-text" type="text" bind:this={phraseTextInput} bind:value={form.text} placeholder="e.g. Ce mhead ata air?" />
      </div>

      <div class="field">
        <label for="phrase-translation">English translation</label>
        <input id="phrase-translation" type="text" bind:value={form.translation} placeholder="e.g. How much does it cost?" />
      </div>

      <div class="field">
        <label for="phrase-pronunciation">Pronunciation <span class="field-opt">(optional)</span></label>
        <input id="phrase-pronunciation" type="text" bind:value={form.pronunciation} placeholder="e.g. Kay vaid ah-tuh air" />
        <div class={`pron-preview ${pronPreviewText ? 'visible' : ''}`}>{pronPreviewText}</div>
        <div class="field-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Write it how it sounds to you. There is no wrong answer.
        </div>
      </div>

      <div class="field">
        <label for="phrase-category">Category <span class="field-opt">(optional)</span></label>
        <input
          id="phrase-category"
          type="text"
          bind:value={form.category}
          list="phrase-category-options"
          placeholder="e.g. Reading, Conversation, Grammar"
        />
        <datalist id="phrase-category-options">
          {#each categoryOptions as option}
            <option value={option}></option>
          {/each}
        </datalist>
      </div>

      <div class="field">
        <label for="phrase-group">Group <span class="field-opt">(optional)</span></label>
        <input
          id="phrase-group"
          type="text"
          bind:value={form.groupName}
          list="phrase-group-options"
          placeholder="e.g. Book X, Chapter 4, Cafe Dialogues"
        />
        <datalist id="phrase-group-options">
          {#each groupOptions as option}
            <option value={option}></option>
          {/each}
        </datalist>
      </div>

      <div class="field">
        <label for="phrase-notes">Notes <span class="field-opt">(optional)</span></label>
        <textarea id="phrase-notes" rows="3" bind:value={form.notes} placeholder="e.g. Used when asking the price in a cafe."></textarea>
      </div>

      {#if editingPhraseId == null}
        <div class="route-section">
          <div class="route-label">Also add to</div>
          <div class="route-options">
            <button type="button" class={`route-opt ${routePractice ? 'selected' : ''}`} onclick={() => toggleRoute('practice')}>
              <div class="route-opt-name">Practice</div>
              <div class="route-opt-desc">Builds into your active phrase set</div>
            </button>
            <button type="button" class={`route-opt ${routeFlashcard ? 'selected' : ''}`} onclick={() => toggleRoute('flashcard')}>
              <div class="route-opt-name">Flashcards</div>
              <div class="route-opt-desc">Add to a deck for spaced repetition</div>
            </button>
          </div>

          {#if routeFlashcard}
            <div class="deck-options">
              {#each flashcardDecks as deck}
                <button
                  type="button"
                  class={`deck-opt ${selectedDeckId === String(deck.id) ? 'active' : ''}`}
                  onclick={() => (selectedDeckId = String(deck.id))}
                >
                  <div class="deck-opt-name">{deck.name}</div>
                  <div class="deck-opt-count">{deck.cardCount ?? 0} cards</div>
                </button>
              {/each}
              <button
                type="button"
                class={`deck-opt ${selectedDeckId === '__new__' ? 'active' : ''}`}
                onclick={() => (selectedDeckId = '__new__')}
              >
                <div class="deck-opt-name">+ New deck</div>
                <div class="deck-opt-count">Create fresh</div>
              </button>
            </div>
            {#if selectedDeckId === '__new__'}
              <div class="field deck-name-field">
                <label for="phrase-new-deck">New deck name</label>
                <input id="phrase-new-deck" type="text" bind:value={newDeckName} placeholder="e.g. Book 1 phrases" />
              </div>
            {/if}
          {/if}
        </div>
      {/if}

      <div class="modal-actions">
        {#if editingPhraseId != null}
          <button type="button" class="btn-delete" onclick={deletePhrase}>Delete phrase</button>
        {/if}
        <button type="button" class="btn-cancel" onclick={closePhraseModal}>Cancel</button>
        <button type="submit" class="btn-confirm" disabled={savingPhrase}>
          {#if savingPhrase}
            Saving...
          {:else}
            {editingPhraseId != null ? 'Save changes' : 'Save phrase'}
          {/if}
        </button>
      </div>
    </form>
  </div>

  <div class={`toast ${toastVisible ? 'show' : ''}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>{toastMessage}</span>
  </div>
</section>

<style>
  *, *::before, *::after {
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Instrument Sans', sans-serif;
  }

  .phrasebook-shell {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --forest-l: #3a5a44;
    --green: #2d7a50;
    --sage: #7ec99a;
    --parchment: #f5f0e8;
    --parch-dark: #e8e0d0;
    --parch-mid: #ede7da;
    --muted: #5a7a64;
    --ink: #1a1a18;
    --ink-l: #3a3a36;
    --amber: #f0b429;
    --red: #e05353;

    background: var(--parchment);
    color: var(--ink);
    min-height: calc(100vh - 64px);
    padding-bottom: 96px;
  }

  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 40px 28px 0;
  }

  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 36px;
    padding-bottom: 28px;
    border-bottom: 1.5px solid var(--parch-dark);
    gap: 20px;
    flex-wrap: wrap;
  }

  .header-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #b6b6b1;
    margin-bottom: 6px;
  }

  .header-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 36px;
    letter-spacing: -0.04em;
    color: var(--forest);
    line-height: 1;
    margin-bottom: 8px;
  }

  .header-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--green);
  }

  .header-sub {
    font-size: 14px;
    color: var(--muted);
  }

  .subnav {
    display: inline-flex;
    background: var(--parch-mid);
    border: 1.5px solid var(--parch-dark);
    border-radius: 12px;
    padding: 4px;
    gap: 2px;
  }

  .subnav-tab {
    padding: 8px 18px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
  }

  .subnav-tab.active {
    background: #fff;
    color: var(--forest);
    box-shadow: 0 1px 4px rgba(28, 43, 34, 0.1);
  }

  .subnav-tab:hover:not(.active) {
    color: var(--forest);
  }

  .stat-row {
    display: flex;
    align-items: center;
    gap: 28px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .stat-num {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 28px;
    letter-spacing: -0.04em;
    color: var(--forest);
    line-height: 1;
  }

  .stat-num.green {
    color: var(--green);
  }

  .stat-lbl {
    font-size: 11px;
    color: #b6b6b1;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin-top: 2px;
    text-transform: uppercase;
  }

  .stat-divider {
    width: 1px;
    height: 36px;
    background: var(--parch-dark);
    flex-shrink: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 180px;
    max-width: 320px;
  }

  .search-input {
    width: 100%;
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    padding: 9px 14px 9px 38px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 13px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .search-input:focus {
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 15px;
    color: #b6b6b1;
    pointer-events: none;
  }

  .filter-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-chip {
    padding: 6px 12px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    border: 1.5px solid var(--parch-dark);
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
  }

  .filter-chip:hover {
    border-color: var(--green);
    color: var(--green);
  }

  .filter-chip.active {
    background: var(--forest);
    border-color: var(--forest);
    color: var(--parchment);
  }

  .org-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .org-filter {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    padding: 5px 8px;
  }

  .org-filter span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .org-filter select {
    border: none;
    background: transparent;
    color: var(--forest);
    font-family: 'Instrument Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    outline: none;
    min-width: 130px;
  }

  .org-filter select:disabled {
    color: #aaa;
  }

  .toolbar-right {
    margin-left: auto;
  }

  .btn-add {
    background: var(--forest);
    color: var(--parchment);
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .btn-add:hover {
    background: var(--forest-mid);
  }

  .btn-add svg {
    width: 14px;
    height: 14px;
  }

  .phrase-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 18px;
    padding: 14px 16px;
    border: 1.5px solid var(--parch-dark);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
  }

  .pagination-meta {
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pagination-page {
    font-size: 13px;
    font-weight: 700;
    color: var(--forest);
    min-width: 92px;
    text-align: center;
  }

  .pagination-btn {
    border: 1.5px solid var(--parch-dark);
    background: #fff;
    color: var(--forest);
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, opacity 0.15s;
  }

  .pagination-btn:hover:not(:disabled) {
    border-color: var(--green);
    color: var(--green);
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .source-section {
    margin-bottom: 32px;
  }

  .source-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .source-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #b6b6b1;
  }

  .source-section-count {
    font-size: 10px;
    font-weight: 700;
    background: var(--parch-mid);
    border: 1px solid var(--parch-dark);
    border-radius: 100px;
    padding: 2px 8px;
    color: var(--muted);
  }

  .source-section-line {
    flex: 1;
    height: 1px;
    background: var(--parch-dark);
  }

  .phrase-card {
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: fadeUp 0.3s ease both;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
  }

  .phrase-card:hover {
    border-color: rgba(45, 122, 80, 0.25);
    box-shadow: 0 4px 20px -8px rgba(28, 43, 34, 0.12);
  }

  .phrase-source-strip {
    padding: 7px 16px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--parch-dark);
  }

  .source-course {
    background: rgba(45, 122, 80, 0.07);
    color: var(--green);
  }

  .source-own {
    background: rgba(240, 180, 41, 0.08);
    color: #b07e0a;
  }

  .source-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    margin-right: 5px;
    display: inline-block;
  }

  .card-edit-btn {
    position: absolute;
    top: 36px;
    right: 12px;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bcbcbc;
    transition: background 0.12s, color 0.12s;
    opacity: 0;
  }

  .phrase-card:hover .card-edit-btn {
    opacity: 1;
  }

  .card-edit-btn:hover {
    background: var(--parch-mid);
    color: var(--forest);
  }

  .card-edit-btn svg {
    width: 13px;
    height: 13px;
  }

  .phrase-body {
    padding: 18px 18px 14px;
    flex: 1;
  }

  .phrase-irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -0.02em;
    color: var(--forest);
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .phrase-pron {
    font-size: 13px;
    font-style: italic;
    color: var(--green);
    margin-bottom: 8px;
    line-height: 1.4;
    display: flex;
    align-items: flex-start;
    gap: 5px;
  }

  .pron-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--sage);
  }

  .phrase-english {
    font-size: 14px;
    color: var(--ink-l);
    line-height: 1.5;
    margin-bottom: 10px;
  }

  .phrase-notes {
    font-size: 12px;
    color: #9f9f9f;
    line-height: 1.6;
    border-top: 1px solid var(--parch-dark);
    padding-top: 10px;
    margin-top: 2px;
    font-style: italic;
  }

  .phrase-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .phrase-meta span {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    border: 1px solid var(--parch-dark);
    background: var(--parchment);
    padding: 3px 8px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
  }

  .phrase-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 18px 14px;
    flex-wrap: wrap;
  }

  .progress-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 100px;
    padding: 4px 9px;
    font-size: 10px;
    font-weight: 700;
    border: 1.5px solid transparent;
  }

  .pp-practice {
    background: rgba(28, 43, 34, 0.05);
    border-color: rgba(28, 43, 34, 0.1);
    color: var(--forest-l);
  }

  .pp-practice.active {
    background: rgba(45, 122, 80, 0.08);
    border-color: rgba(45, 122, 80, 0.2);
    color: var(--green);
  }

  .pp-flashcard {
    background: rgba(240, 180, 41, 0.06);
    border-color: rgba(240, 180, 41, 0.15);
    color: #b07e0a;
  }

  .pp-flashcard.active {
    background: rgba(240, 180, 41, 0.1);
    border-color: rgba(240, 180, 41, 0.3);
    color: #8a5e08;
  }

  .pp-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  .phrase-actions {
    display: flex;
    gap: 0;
    border-top: 1.5px solid var(--parch-dark);
  }

  .action-btn {
    flex: 1;
    padding: 11px 10px;
    background: none;
    border: none;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: background 0.12s, color 0.12s;
    color: var(--muted);
  }

  .action-btn:hover {
    background: var(--parch-mid);
    color: var(--forest);
  }

  .action-btn + .action-btn {
    border-left: 1.5px solid var(--parch-dark);
  }

  .action-btn.practice {
    color: var(--green);
  }

  .action-btn.practice:hover {
    background: rgba(45, 122, 80, 0.07);
    color: var(--green);
  }

  .empty-state {
    grid-column: 1 / -1;
    padding: 64px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 42px;
    display: block;
    margin-bottom: 16px;
  }

  .empty-title {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 22px;
    color: var(--forest);
    margin-bottom: 8px;
  }

  .empty-body {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.7;
    max-width: 400px;
    margin: 0 auto 20px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(28, 43, 34, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .modal-backdrop.open {
    opacity: 1;
    pointer-events: all;
  }

  .modal-sheet {
    background: var(--parchment);
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 640px;
    padding: 10px 24px 44px;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.34, 1.15, 0.64, 1);
    max-height: 92vh;
    overflow-y: auto;
  }

  .modal-backdrop.open .modal-sheet {
    transform: translateY(0);
  }

  .modal-drag {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--parch-dark);
    margin: 14px auto 22px;
  }

  .modal-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: var(--forest);
    margin-bottom: 4px;
  }

  .modal-sub {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 22px;
    line-height: 1.5;
  }

  .field {
    margin-bottom: 16px;
  }

  .field label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .field-opt {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: #a4a4a4;
    font-size: 11px;
  }

  .field input,
  .field textarea {
    width: 100%;
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    padding: 11px 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    color: var(--ink);
    outline: none;
    resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .field-hint {
    font-size: 11px;
    color: #a4a4a4;
    margin-top: 5px;
    display: flex;
    align-items: flex-start;
    gap: 4px;
    line-height: 1.5;
  }

  .field-hint svg {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .pron-preview {
    background: rgba(45, 122, 80, 0.06);
    border: 1px solid rgba(45, 122, 80, 0.15);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    font-style: italic;
    color: var(--green);
    margin-top: 6px;
    display: none;
  }

  .pron-preview.visible {
    display: block;
  }

  .route-section {
    margin-top: 6px;
    background: var(--parch-mid);
    border: 1.5px solid var(--parch-dark);
    border-radius: 12px;
    padding: 14px 16px;
  }

  .route-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .route-options {
    display: flex;
    gap: 8px;
  }

  .route-opt {
    appearance: none;
    flex: 1;
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
    text-align: left;
    font-family: 'Instrument Sans', sans-serif;
    transition: border-color 0.15s, background 0.15s;
  }

  .route-opt:hover {
    border-color: rgba(45, 122, 80, 0.3);
  }

  .route-opt.selected {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.05);
  }

  .route-opt-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--forest);
    margin-bottom: 2px;
  }

  .route-opt.selected .route-opt-name {
    color: var(--green);
  }

  .route-opt-desc {
    font-size: 11px;
    color: #a4a4a4;
    line-height: 1.4;
  }

  .deck-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }

  .deck-opt {
    background: #fff;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
  }

  .deck-opt.active {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.05);
  }

  .deck-opt-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--forest);
  }

  .deck-opt-count {
    font-size: 11px;
    color: #b0b0b0;
    margin-top: 2px;
  }

  .deck-name-field {
    margin-top: 10px;
    margin-bottom: 0;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 22px;
  }

  .btn-cancel {
    padding: 11px 20px;
    border-radius: 10px;
    background: none;
    border: 1.5px solid var(--parch-dark);
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-cancel:hover {
    border-color: var(--muted);
  }

  .btn-confirm {
    padding: 11px 24px;
    border-radius: 10px;
    background: var(--forest);
    border: none;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
    color: var(--parchment);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-confirm:hover {
    background: var(--forest-mid);
  }

  .btn-confirm:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-delete {
    padding: 11px 16px;
    border-radius: 10px;
    background: none;
    border: 1.5px solid rgba(224, 83, 83, 0.25);
    font-family: 'Instrument Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #c04040;
    cursor: pointer;
    margin-right: auto;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn-delete:hover {
    background: rgba(224, 83, 83, 0.06);
    border-color: var(--red);
  }

  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%) translateY(16px);
    z-index: 200;
    background: var(--forest);
    color: var(--parchment);
    border-radius: 100px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s, transform 0.2s;
    white-space: nowrap;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .toast svg {
    width: 14px;
    height: 14px;
    color: var(--sage);
  }

  .loading-wrap {
    border: 1.5px solid var(--parch-dark);
    border-radius: 16px;
    background: #fff;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(245, 240, 232, 0.8);
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d9d2c2;
    border-top-color: var(--green);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .fade-up {
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 860px) {
    .page {
      padding: 28px 16px 0;
    }

    .phrase-grid {
      grid-template-columns: 1fr;
    }

    .pagination-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .pagination-controls {
      justify-content: space-between;
    }

    .pagination-page {
      min-width: 0;
      flex: 1;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .stat-row {
      gap: 16px;
    }

    .route-options {
      flex-direction: column;
    }

    .deck-options {
      grid-template-columns: 1fr;
    }

    .modal-sheet {
      padding: 10px 16px 28px;
    }
  }
</style>
