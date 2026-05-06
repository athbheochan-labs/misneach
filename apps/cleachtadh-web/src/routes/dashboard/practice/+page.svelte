<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe } from '$lib/api/auth-client';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import AppModal from '$lib/components/ui/AppModal.svelte';
  import {
    incrementPracticeProgress,
    loadStudySession,
    saveStudySession,
    studyFlashcardsHref,
    studyCoordinatorHref,
    type StudySession,
  } from '$lib/study-session';
  import { incrementJourneyGoalCounter } from '$lib/stores/journey-goals';
  import { isLikelyNetworkError, isOnline } from '$lib/mobile/network-status';

  type ExerciseType = 'typed_translation' | 'sentence_builder' | 'cloze';
  type FlashDueCard = {
    id: number;
    front: string;
    back: string;
  };
  const SESSION_SIZE = 15;

  type Exercise = {
    exerciseId: string;
    phraseId: number;
    exerciseType: ExerciseType;
    prompt: string;
    hintTranslation?: string;
    hintContext?: string;
    tokens?: string[];
    maskedIndex?: number;
    dueAt: string;
    expectedAnswer: string;
    source: 'main' | 'retry';
  };

  let loading = false;
  let submitting = false;
  let sessionMode: 'idle' | 'lesson' | 'fix_mistakes' | 'flash' | 'complete' = 'idle';

  let queue: Exercise[] = [];
  let index = 0;
  let completedCount = 0;
  let totalPlanned = 0;
  let masteredKeys = new Set<string>();
  let sessionCorrectCount = 0;
  let sessionWrongCount = 0;
  let lastSessionMode: 'lesson' | 'fix_mistakes' | 'flash' = 'lesson';

  let freeTextAnswer = '';
  let sentenceChoices: Array<{ id: string; value: string; selectedAt: number | null }> = [];
  let sentenceSelectionCounter = 0;
  let showAnswer = false;
  let showClozeHint = false;
  let hintRevealCount = 0;

  let feedback: {
    isCorrect: boolean;
    expectedAnswer: string;
    userAnswer: string;
    userAnswerHtml: string;
    expectedAnswerHtml: string;
  } | null = null;
  let feedbackMessage = '';
  let sessionLimit = SESSION_SIZE;
  let studySessionId = '';
  let studySession: StudySession | null = null;
  let studyReturnTo = '';
  let studyAutoStartDue = false;
  let studyProgressSavedForRun = false;
  let studyProgressPersistedForRun = 0;
  let showContinueStudy = false;
  let studyMode = false;
  let authClientId = '';
  let showInfoModal = false;
  let infoModalTitle = '';
  let infoModalMessage = '';
  let showNoDueChoiceModal = false;
  let warmupDueToday = 0;
  let warmupMistakesToFix = 0;
  let flashcards: FlashDueCard[] = [];
  let flashIndex = 0;
  let flashFlipped = false;
  let showPauseOverlay = false;
  let pauseCorrect = 0;
  let pauseWrong = 0;
  let pauseLeft = 0;

  const successMessages = [
    'Great job. That was spot on.',
    'Nice work. You nailed that one.',
    'Excellent answer. Keep the momentum going.',
    'Well done. Your Irish is improving.',
    'Strong work. You got it exactly right.',
  ];

  const retryMessages = [
    'Good effort. Let’s tighten that one up.',
    'Nice try. You are close.',
    'No problem. This one will stick after another pass.',
    'Keep going. You are building real progress.',
    'You are doing well. Let’s review this phrase once more.',
  ];

  function pickRandom(items: string[]): string {
    return items[Math.floor(Math.random() * items.length)];
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeToken(token: string): string {
    return token
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^\p{L}\p{N}\s'-]/gu, '')
      .trim();
  }

  function looksIrish(text: string): boolean {
    const value = text.toLowerCase();
    if (/[áéíóú]/i.test(text)) return true;
    return /\b(tá|ní|bhí|agus|conas|cad|go|raibh|maith|an|ar|le|mé|tú|sí|sé|siad)\b/.test(value);
  }

  function looksEnglish(text: string): boolean {
    const value = text.toLowerCase();
    return /\b(the|is|are|what|how|where|why|hello|good|morning|i|you|we|they|can|do|does|review|book|word)\b/.test(
      value,
    );
  }

  function typedInstruction(exercise: Exercise): string {
    return looksIrish(exercise.prompt)
      ? 'Type the English translation'
      : 'Type the Irish translation';
  }

  function buildDiffHtml(expected: string, actual: string) {
    const expectedParts = expected.split(/\s+/).filter(Boolean);
    const actualParts = actual.split(/\s+/).filter(Boolean);
    const length = Math.max(expectedParts.length, actualParts.length);

    const expectedHtmlParts: string[] = [];
    const actualHtmlParts: string[] = [];

    for (let i = 0; i < length; i += 1) {
      const expectedPart = expectedParts[i] ?? '';
      const actualPart = actualParts[i] ?? '';
      const matches = normalizeToken(expectedPart) === normalizeToken(actualPart);

      if (expectedPart) {
        expectedHtmlParts.push(
          matches ? escapeHtml(expectedPart) : `<strong>${escapeHtml(expectedPart)}</strong>`,
        );
      }

      if (actualPart) {
        actualHtmlParts.push(
          matches ? escapeHtml(actualPart) : `<strong>${escapeHtml(actualPart)}</strong>`,
        );
      }
    }

    return {
      expectedHtml: expectedHtmlParts.join(' '),
      actualHtml: actualHtmlParts.join(' '),
    };
  }

  function usableTokens(exercise: Exercise | null | undefined): string[] {
    if (!exercise || exercise.exerciseType !== 'sentence_builder') return [];
    return (exercise.tokens || []).map((token) => token.trim()).filter(Boolean);
  }

  function isInvalidSentenceBuilder(exercise: Exercise | null | undefined): boolean {
    return !!exercise && exercise.exerciseType === 'sentence_builder' && usableTokens(exercise).length === 0;
  }

  function hasVisibleClozeContext(exercise: Exercise | null | undefined): boolean {
    if (!exercise || exercise.exerciseType !== 'cloze') return true;
    const prompt = (exercise.prompt || '').trim();
    const visibleTokens = prompt
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token && token !== '____')
      .filter((token) => /[\p{L}\p{N}]/u.test(token));

    if (visibleTokens.length === 0) return false;
    return !looksEnglish(visibleTokens.join(' '));
  }

  function isInvalidExercise(exercise: Exercise | null | undefined): boolean {
    if (!exercise) return true;
    if (isInvalidSentenceBuilder(exercise)) return true;
    if (!hasVisibleClozeContext(exercise)) return true;
    return false;
  }

  function exerciseMasteryKey(exercise: Exercise): string {
    return `${exercise.exerciseType}:${exercise.phraseId}`;
  }

  function countRemaining() {
    if (!queue.length) return 0;

    const pending = new Set<string>();
    for (let i = index; i < queue.length; i += 1) {
      const exercise = queue[i];
      if (!exercise) continue;
      const key = exerciseMasteryKey(exercise);
      if (!masteredKeys.has(key)) pending.add(key);
    }

    return pending.size;
  }

  $: current = queue[index] || null;
  $: selectedSentenceTokens = sentenceChoices
    .filter((token) => token.selectedAt != null)
    .sort((a, b) => Number(a.selectedAt) - Number(b.selectedAt))
    .map((token) => token.value);
  $: progress =
    sessionMode === 'flash'
      ? flashcards.length > 0
        ? Math.min(100, Math.round((flashIndex / flashcards.length) * 100))
        : 0
      : totalPlanned > 0
        ? Math.min(100, Math.round((completedCount / totalPlanned) * 100))
        : 0;
  $: studyMode = Boolean(studySessionId);
  $: remainingCount = countRemaining();
  $: canSubmit = current
    ? current.exerciseType === 'sentence_builder'
      ? selectedSentenceTokens.length > 0
      : freeTextAnswer.trim().length > 0
    : false;
  $: masteredLabel = `${sessionMode === 'flash' ? sessionCorrectCount : completedCount}`;
  $: leftLabel = `${sessionMode === 'flash' ? Math.max(0, flashcards.length - flashIndex) : remainingCount} left`;
  $: sessionTotalCount = sessionCorrectCount + sessionWrongCount;
  $: currentFlash = flashcards[flashIndex] || null;

  function parseSessionLimit(raw: string | null) {
    const parsed = Number(raw || SESSION_SIZE);
    if (!Number.isFinite(parsed)) return SESSION_SIZE;
    return Math.max(1, Math.min(100, Math.round(parsed)));
  }

  async function loadAuthContext() {
    authClientId = '';
    try {
      const auth = await getAuthMe();
      if (!auth.loggedIn || !auth.user) return;
      authClientId = String(auth.user.clientId || '').trim();
    } catch {
      authClientId = '';
    }
  }

  function openInfoModal(title: string, message: string) {
    infoModalTitle = title;
    infoModalMessage = message;
    showInfoModal = true;
  }

  function closeInfoModal() {
    showInfoModal = false;
  }

  function ensureOnline(action: string) {
    if ($isOnline) return true;
    openInfoModal('You are offline', `Reconnect to ${action} and try again.`);
    return false;
  }

  async function fetchDueCount() {
    try {
      const res = await apiFetch('/api/proxy/practice/progress', { cache: 'no-store' });
      if (!res.ok) return null;
      const payload = await res.json();
      const rawCount = Number(payload?.dueCount);
      if (!Number.isFinite(rawCount)) return null;
      return Math.max(0, Math.round(rawCount));
    } catch {
      return null;
    }
  }

  async function refreshWarmupStats() {
    try {
      const [progressRes, mistakesRes] = await Promise.all([
        apiFetch('/api/proxy/practice/progress', { cache: 'no-store' }),
        apiFetch('/api/proxy/practice/mistakes?limit=100', { cache: 'no-store' }),
      ]);

      if (progressRes.ok) {
        const payload = await progressRes.json();
        const dueCount = Number(payload?.dueCount);
        if (Number.isFinite(dueCount)) {
          warmupDueToday = Math.max(0, Math.round(dueCount));
        }
      }

      if (mistakesRes.ok) {
        const payload = await mistakesRes.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        warmupMistakesToFix = items.length;
      }
    } catch {
      // Keep UI usable even if warm-up stats fail to load.
    }
  }

  function loadStudyQueryConfig() {
    const params = new URLSearchParams(window.location.search);
    studySessionId = params.get('studySession') || '';
    sessionLimit = parseSessionLimit(params.get('sessionLimit'));
    studyAutoStartDue = params.get('autoStart') === 'due';
    studyReturnTo = params.get('returnTo') || (studySessionId ? studyCoordinatorHref(studySessionId) : '');
    if (!authClientId) {
      studySessionId = '';
      studySession = null;
      studyReturnTo = '';
      studyAutoStartDue = false;
      sessionLimit = SESSION_SIZE;
      return;
    }

    studySession = studySessionId ? loadStudySession(studySessionId, authClientId || null) : null;

    if (studySessionId && !studySession) {
      studySessionId = '';
      studyReturnTo = '';
      studyAutoStartDue = false;
      sessionLimit = SESSION_SIZE;
    }
  }

  function persistStudyPracticeProgress(delta: number) {
    if (!studySessionId || delta <= 0) return;
    const currentSession = loadStudySession(studySessionId, authClientId || null);
    if (!currentSession) return;
    incrementPracticeProgress(currentSession, delta);
    saveStudySession(currentSession);
    studySession = currentSession;
  }

  async function readError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  function resetAnswerState() {
    freeTextAnswer = '';
    showAnswer = false;
    showClozeHint = false;
    feedback = null;
    feedbackMessage = '';
    sentenceChoices = [];
    sentenceSelectionCounter = 0;

    const active = queue[index];
    if (active?.exerciseType === 'sentence_builder') {
      sentenceChoices = usableTokens(active).map((token, tokenIndex) => ({
        id: `${tokenIndex}-${token}`,
        value: token,
        selectedAt: null,
      }));
    }
  }

  function skipInvalidExercises() {
    while (index < queue.length && isInvalidExercise(queue[index])) {
      index += 1;
    }

    if (index >= queue.length) {
      sessionMode = 'complete';
      return;
    }

    resetAnswerState();
  }

  function beginSession(items: any[], mode: 'lesson' | 'fix_mistakes') {
    queue = (items || [])
      .map((item) => ({ ...item, source: 'main' as const }))
      .filter((item) => !isInvalidExercise(item))
      .slice(0, sessionLimit);

    index = 0;
    completedCount = 0;
    totalPlanned = queue.length;
    masteredKeys = new Set<string>();
    sessionCorrectCount = 0;
    sessionWrongCount = 0;
    lastSessionMode = mode;
    sessionMode = queue.length > 0 ? mode : 'idle';
    studyProgressSavedForRun = false;
    studyProgressPersistedForRun = 0;
    showContinueStudy = false;

    skipInvalidExercises();

    if (queue.length === 0) {
      openInfoModal(
        mode === 'lesson' ? 'No practice phrases yet' : 'No recent mistakes',
        mode === 'lesson'
          ? 'Continue with course material to unlock new phrases, then come back to practice.'
          : 'Great work. You have no recent mistakes to review right now.',
      );
    }
  }

  async function startLesson(skipNoDueDecision = false) {
    if (loading) return;
    if (!ensureOnline('start practice')) return;
    loading = true;
    try {
      if (!skipNoDueDecision) {
        const dueCount = await fetchDueCount();
        if (dueCount === 0) {
          showNoDueChoiceModal = true;
          return;
        }
      }

      const res = await apiFetch(`/api/proxy/practice/due?limit=${sessionLimit}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load practice session'));
      const payload = await res.json();
      beginSession(payload?.items || [], 'lesson');
    } catch (error) {
      console.error(error);
      openInfoModal(
        'Unable to start practice',
        isLikelyNetworkError(error)
          ? 'Network request failed. Check your connection and retry.'
          : error instanceof Error
            ? error.message
            : 'Failed to start practice session',
      );
    } finally {
      loading = false;
    }
  }

  async function startFixMistakes() {
    if (loading) return;
    if (!ensureOnline('start mistakes review')) return;
    loading = true;
    try {
      const res = await apiFetch(`/api/proxy/practice/mistakes?limit=${sessionLimit}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load mistakes session'));
      const payload = await res.json();
      beginSession(payload?.items || [], 'fix_mistakes');
    } catch (error) {
      console.error(error);
      openInfoModal(
        'Unable to start mistakes review',
        isLikelyNetworkError(error)
          ? 'Network request failed. Check your connection and retry.'
          : error instanceof Error
            ? error.message
            : 'Failed to start mistakes session',
      );
    } finally {
      loading = false;
    }
  }

  function continueWithSavedPhrases() {
    showNoDueChoiceModal = false;
    startLesson(true).catch(() => undefined);
  }

  function continueWithCourse() {
    showNoDueChoiceModal = false;
    goto('/dashboard/courses?view=all');
  }

  async function startFlashcardReview() {
    if (studySession) {
      await goto(studyFlashcardsHref(studySession, studyReturnTo || studyCoordinatorHref(studySession.id)));
      return;
    }
    if (loading) return;
    if (!ensureOnline('start flashcard review')) return;
    loading = true;
    try {
      const res = await apiFetch(`/api/proxy/flashcards/study/due?limit=${sessionLimit}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load flashcards'));
      const payload = await res.json();
      const cards = Array.isArray(payload)
        ? payload
            .map((item: any) => ({
              id: Number(item?.id),
              front: String(item?.front || ''),
              back: String(item?.back || ''),
            }))
            .filter((item: FlashDueCard) => Number.isFinite(item.id) && item.front && item.back)
        : [];

      flashcards = cards.slice(0, sessionLimit);
      flashIndex = 0;
      flashFlipped = false;
      queue = [];
      index = 0;
      completedCount = 0;
      totalPlanned = flashcards.length;
      sessionCorrectCount = 0;
      sessionWrongCount = 0;
      lastSessionMode = 'flash';
      sessionMode = flashcards.length > 0 ? 'flash' : 'idle';
      if (flashcards.length === 0) {
        openInfoModal('No due flashcards', 'No cards are due right now. Check back later.');
      }
    } catch (error) {
      console.error(error);
      openInfoModal(
        'Unable to start flashcards',
        isLikelyNetworkError(error)
          ? 'Network request failed. Check your connection and retry.'
          : error instanceof Error
            ? error.message
            : 'Failed to load flashcards',
      );
    } finally {
      loading = false;
    }
  }

  function revealFlash() {
    flashFlipped = true;
  }

  async function rateFlash(knew: boolean) {
    const card = currentFlash;
    if (!card) return;
    try {
      await apiFetch(`/api/proxy/flashcards/cards/${card.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: knew ? 'good' : 'again' }),
      });
    } catch (error) {
      console.error(error);
    }
    incrementJourneyGoalCounter('flashcardsReviewed', 1);
    if (knew) sessionCorrectCount += 1;
    else sessionWrongCount += 1;
    flashIndex += 1;
    flashFlipped = false;
    if (flashIndex >= flashcards.length) {
      sessionMode = 'complete';
    }
  }

  function toggleSentenceToken(tokenIndex: number) {
    const token = sentenceChoices[tokenIndex];
    if (!token) return;

    sentenceChoices = sentenceChoices.map((item, idx) =>
      idx === tokenIndex
        ? {
            ...item,
            selectedAt: item.selectedAt == null ? sentenceSelectionCounter : null,
          }
        : item,
    );

    if (token.selectedAt == null) {
      sentenceSelectionCounter += 1;
    }
  }

  function clearSentenceSelection() {
    sentenceChoices = sentenceChoices.map((item) => ({ ...item, selectedAt: null }));
    sentenceSelectionCounter = 0;
  }

  function removeSelectedToken(selectionIndex: number) {
    const selected = sentenceChoices
      .map((token, tokenIndex) => ({ token, tokenIndex }))
      .filter((entry) => entry.token.selectedAt != null)
      .sort((a, b) => Number(a.token.selectedAt) - Number(b.token.selectedAt));

    const target = selected[selectionIndex];
    if (!target) return;
    toggleSentenceToken(target.tokenIndex);
  }

  function nextQuestion() {
    index += 1;
    if (index >= queue.length) {
      sessionMode = 'complete';
      return;
    }
    skipInvalidExercises();
  }

  function handleAnswerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (feedback) {
      continueAfterFeedback();
      return;
    }
    if (canSubmit && !submitting) {
      submitAttempt().catch(() => undefined);
    }
  }

  function revealClozeHint() {
    if (!current || current.exerciseType !== 'cloze' || showClozeHint) return;
    showClozeHint = true;
    hintRevealCount += 1;
  }

  async function submitAttempt() {
    if (!current || !canSubmit) return;
    if (!ensureOnline('submit your answer')) return;

    const body: Record<string, unknown> = {
      exerciseType: current.exerciseType,
      phraseId: current.phraseId,
      hintsUsed: hintRevealCount,
    };

    if (current.exerciseType === 'sentence_builder') {
      body.userTokens = selectedSentenceTokens;
    } else {
      body.userAnswer = freeTextAnswer;
    }

    submitting = true;
    try {
      const res = await apiFetch('/api/proxy/practice/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Failed to submit attempt'));
      }

      const payload = await res.json();
      const isCorrect = !!payload?.isCorrect;
      const submittedAnswer =
        current.exerciseType === 'sentence_builder'
          ? selectedSentenceTokens.join(' ')
          : freeTextAnswer;
      const diff = buildDiffHtml(current.expectedAnswer, submittedAnswer);

      feedback = {
        isCorrect,
        expectedAnswer: current.expectedAnswer,
        userAnswer: submittedAnswer,
        userAnswerHtml: diff.actualHtml,
        expectedAnswerHtml: diff.expectedHtml,
      };
      feedbackMessage = isCorrect ? pickRandom(successMessages) : pickRandom(retryMessages);
      if (isCorrect) sessionCorrectCount += 1;
      else sessionWrongCount += 1;

      if (isCorrect) {
        const key = exerciseMasteryKey(current);
        if (!masteredKeys.has(key)) {
          masteredKeys.add(key);
          completedCount = masteredKeys.size;
          if (studyMode) {
            persistStudyPracticeProgress(1);
            studyProgressPersistedForRun += 1;
          }
        }

        if (sessionMode === 'fix_mistakes' || current.source === 'retry') {
          incrementJourneyGoalCounter('mistakesCorrected', 1);
        }
      } else {
        queue = [...queue, { ...current, source: 'retry' }];
      }
    } catch (error) {
      console.error(error);
      openInfoModal(
        'Unable to submit answer',
        isLikelyNetworkError(error)
          ? 'Network request failed while submitting. Reconnect and try again.'
          : error instanceof Error
            ? error.message
            : 'Failed to submit answer',
      );
    } finally {
      submitting = false;
    }
  }

  function continueAfterFeedback() {
    nextQuestion();
  }

  function openPause() {
    pauseCorrect = sessionCorrectCount;
    pauseWrong = sessionWrongCount;
    pauseLeft = remainingCount;
    showPauseOverlay = true;
  }

  function closePause() {
    showPauseOverlay = false;
  }

  function closePauseOutside(event: MouseEvent) {
    if (event.target === event.currentTarget) closePause();
  }

  function exitSession() {
    closePause();
    restart();
  }

  function restart() {
    sessionMode = 'idle';
    queue = [];
    index = 0;
    completedCount = 0;
    sessionCorrectCount = 0;
    sessionWrongCount = 0;
    totalPlanned = 0;
    masteredKeys = new Set<string>();
    feedback = null;
    feedbackMessage = '';
    showAnswer = false;
    freeTextAnswer = '';
    sentenceChoices = [];
    studyProgressSavedForRun = false;
    studyProgressPersistedForRun = 0;
    showContinueStudy = false;
    refreshWarmupStats().catch(() => undefined);
  }

  function repeatLastSession() {
    if (lastSessionMode === 'fix_mistakes') {
      startFixMistakes().catch(() => undefined);
      return;
    }
    if (lastSessionMode === 'flash') {
      startFlashcardReview().catch(() => undefined);
      return;
    }
    startLesson(true).catch(() => undefined);
  }

  $: if (sessionMode === 'complete' && studyMode && !studyProgressSavedForRun) {
    studyProgressSavedForRun = true;
    const remaining = Math.max(0, completedCount - studyProgressPersistedForRun);
    if (remaining > 0) {
      persistStudyPracticeProgress(remaining);
      studyProgressPersistedForRun += remaining;
    }
    showContinueStudy = true;
    if (studyReturnTo) {
      const redirectTo = studyReturnTo;
      setTimeout(() => {
        goto(redirectTo).catch(() => undefined);
      }, 1200);
    }
  }

  onMount(() => {
    loadAuthContext().finally(() => {
      loadStudyQueryConfig();
      refreshWarmupStats().catch(() => undefined);
      if (studyAutoStartDue) {
        startLesson(true).catch(() => undefined);
      }
    });
  });
</script>

<section class="practice-wrap">
  {#if !$isOnline}
    <div class="offline-banner" role="status">You are offline. Some actions are temporarily unavailable.</div>
  {/if}

  {#if studyMode}
    <section class="study-banner">
      <p class="study-title">Study session mode</p>
      {#if studySession}
        <p class="study-meta">Practice target: {studySession.progress.practiceCompleted} / {studySession.targets.practice}</p>
      {/if}
      {#if studyReturnTo}
        <p class="study-meta">You will return to your guided session after completion.</p>
      {/if}
    </section>
  {/if}

  {#if sessionMode === 'idle'}
    <div class="screen active" id="screen-warmup">
      <div class="warmup-wrap">
        <div class="warmup-eyebrow">Practice session</div>
        <h1 class="warmup-headline">Ready to <em>cleachtadh?</em></h1>
        <p class="warmup-sub">{warmupDueToday} phrases are due for review today. Pick a mode or jump straight in.</p>

        <div class="due-strip">
          <div class="due-pill primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            {warmupDueToday} due today
          </div>
          <div class="due-pill secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            {warmupMistakesToFix} mistakes to fix
          </div>
          <div class="due-pill dim">{sessionLimit} phrase session</div>
        </div>

        <div class="mode-list">
          <button class="mode-card primary-mode" type="button" onclick={startLesson} disabled={loading}>
            <div class="mc-icon-wrap dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ec99a" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div class="mc-text">
              <div class="mc-eyebrow">Anytime session</div>
              <div class="mc-title">Start <em>practice</em></div>
              <div class="mc-sub">Due phrases first, then saved phrases</div>
            </div>
            <div class="mc-badge">{loading ? 'Loading' : `${warmupDueToday} due`}</div>
            <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
          </button>

          <button class="mode-card" type="button" onclick={startFixMistakes} disabled={loading}>
            <div class="mc-icon-wrap light">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <div class="mc-text">
              <div class="mc-eyebrow">Targeted review</div>
              <div class="mc-title">Fix <em>mistakes</em></div>
              <div class="mc-sub">Retry phrases you got wrong recently</div>
            </div>
            <div class="mc-badge amber">{warmupMistakesToFix} to fix</div>
            <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
          </button>

          <button class="mode-card" type="button" onclick={startFlashcardReview}>
            <div class="mc-icon-wrap dim">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <div class="mc-text">
              <div class="mc-eyebrow">Spaced repetition</div>
              <div class="mc-title">Flashcard <em>review</em></div>
              <div class="mc-sub">Open your due flashcards</div>
            </div>
            <div class="mc-badge none">{warmupDueToday} due</div>
            <div class="mc-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
          </button>
        </div>
      </div>
    </div>
  {:else if sessionMode === 'complete'}
    <div class="screen active" id="screen-complete">
      <div class="complete-wrap">
        <div class="complete-mark">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 class="complete-title">Maith <em>thu!</em></h2>
        <p class="complete-sub">Session complete. You're building something real.</p>
        <div class="complete-stats">
          <div class="cs-stat"><div class="cs-num">{sessionCorrectCount}</div><div class="cs-lbl">Correct</div></div>
          <div class="cs-stat"><div class="cs-num">{sessionWrongCount}</div><div class="cs-lbl">Wrong</div></div>
          <div class="cs-stat"><div class="cs-num">{sessionTotalCount}</div><div class="cs-lbl">Total</div></div>
        </div>
        <button class="btn-done" type="button" onclick={restart}>Back to practice</button>
        <button class="btn-again" type="button" onclick={repeatLastSession}>Go again</button>
        {#if showContinueStudy && studyReturnTo}
          <button class="btn-again" type="button" onclick={() => goto(studyReturnTo)}>Continue Study Session</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="screen active" id={sessionMode === 'fix_mistakes' ? 'screen-fix' : 'screen-practice'}>
      <div class="session-bar">
        <button class="session-exit" type="button" onclick={openPause} title="Pause session">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="session-progress-track"><div class="session-progress-fill" style={`width:${progress}%`}></div></div>
        <div class="session-score">
          <span class="score-mastered">{masteredLabel}</span>
          <span class="score-left">{leftLabel}</span>
        </div>
      </div>

      {#if sessionMode === 'flash' && currentFlash}
        <div class="flashcard-wrap">
          <button class={`flashcard ${flashFlipped ? 'flipped' : ''}`} id="fc-card" type="button" onclick={revealFlash} disabled={flashFlipped}>
            <div class="fc-front">
              <div class="fc-irish">{currentFlash.front}</div>
              {#if !flashFlipped}
                <div class="fc-tap-hint">Tap to reveal</div>
              {/if}
            </div>
            {#if flashFlipped}
              <div class="fc-back">
                <div class="fc-english">{currentFlash.back}</div>
                <div class="fc-flip-hint">How well did you know this?</div>
              </div>
            {/if}
          </button>
          <div class={`flash-rating ${flashFlipped ? '' : 'hidden'}`} id="fc-rating">
            <button class="btn-rating btn-nope" type="button" onclick={() => rateFlash(false)}>Nior thuig me</button>
            <button class="btn-rating btn-yep" type="button" onclick={() => rateFlash(true)}>Thuig me</button>
          </div>
        </div>
      {:else if current}
        <div class="exercise-wrap">
          <div class="ex-header">
            <div class="ex-mode-label"><div class="ex-mode-dot"></div>{sessionMode === 'fix_mistakes' ? 'Fix mistakes' : 'Practice'}</div>
            <div class="ex-phrase">{current.prompt}</div>
            <div class="ex-instruction">
              {current.exerciseType === 'sentence_builder'
                ? 'Build the Irish sentence in order'
                : current.exerciseType === 'typed_translation'
                  ? typedInstruction(current)
                  : 'Fill in the missing Irish word'}
            </div>
          </div>

          <div class="ex-body">
            {#if current.exerciseType === 'sentence_builder'}
              <div class="tray-actions">
                <button class="btn-clear" type="button" onclick={clearSentenceSelection} disabled={selectedSentenceTokens.length === 0}>Clear</button>
              </div>

              <div class={`answer-tray ${selectedSentenceTokens.length ? 'has-words' : ''}`}>
                {#if selectedSentenceTokens.length === 0}
                  <span class="answer-tray-placeholder">Tap words below to build your answer...</span>
                {:else}
                  {#each selectedSentenceTokens as token, tokenIndex (`${token}-${tokenIndex}`)}
                    <button class="word-token placed" type="button" onclick={() => removeSelectedToken(tokenIndex)}>{token}</button>
                  {/each}
                {/if}
              </div>

              <div class="word-bank">
                <div class="word-bank-label">Word bank</div>
                {#each sentenceChoices as token, tokenIndex (token.id)}
                  <button
                    class={`word-token bank ${token.selectedAt != null ? 'selected' : ''}`}
                    type="button"
                    onclick={() => toggleSentenceToken(tokenIndex)}
                  >
                    {token.value}
                  </button>
                {/each}
              </div>
            {:else}
              <div class="fill-input-wrap">
                <input
                  id="practice-answer"
                  bind:value={freeTextAnswer}
                  class={`fill-input ${feedback ? (feedback.isCorrect ? 'correct-input' : 'error-input') : ''}`}
                  type="text"
                  placeholder={sessionMode === 'fix_mistakes' ? 'Type your answer...' : 'Type your answer...'}
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  onkeydown={handleAnswerKeydown}
                />
                <div class="input-hint">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {feedback ? 'Press Enter or tap Continue' : 'Press Enter or tap Check to submit'}
                </div>
              </div>
            {/if}

            {#if current.exerciseType === 'cloze' && (current.hintTranslation || current.hintContext)}
              <div class="cloze-hint-wrap">
                <div class="cloze-hint-card">
                  {#if current.hintTranslation}
                    <div class="cloze-hint-row">
                      <span class="cloze-hint-label">Translation</span>
                      <span class="cloze-hint-value">{current.hintTranslation}</span>
                    </div>
                  {/if}
                  {#if current.hintContext}
                    {#if !showClozeHint}
                      <button class="btn-cloze-hint" type="button" onclick={revealClozeHint}>
                        Show context
                      </button>
                    {:else}
                      <div class="cloze-hint-row">
                        <span class="cloze-hint-label">Context</span>
                        <span class="cloze-hint-value">{current.hintContext}</span>
                      </div>
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}

            {#if showAnswer && !feedback}
              <div class="feedback-strip show correct">
                <div class="fb-body">
                  <div class="fb-title">Answer shown</div>
                  <div class="fb-answer"><strong>{current.expectedAnswer}</strong></div>
                </div>
              </div>
            {/if}

            {#if feedback}
              <div class={`feedback-strip show ${feedback.isCorrect ? 'correct' : 'wrong'}`}>
                <div class="fb-body">
                  <div class="fb-title">{feedback.isCorrect ? 'Correct!' : 'Not quite'}</div>
                  <div class="fb-answer">
                    {#if feedback.isCorrect}
                      <strong>{feedback.expectedAnswer}</strong>
                    {:else}
                      The answer is <strong>{feedback.expectedAnswer}</strong>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div class="action-bar">
            {#if !feedback}
              <button class="btn-show" type="button" onclick={() => (showAnswer = !showAnswer)}>
                {showAnswer ? 'Hide answer' : 'Show answer'}
              </button>
              <button class="btn-check" type="button" onclick={submitAttempt} disabled={submitting || !canSubmit}>
                {submitting ? 'Checking...' : 'Check'}
              </button>
            {:else}
              <button class="btn-check" type="button" onclick={continueAfterFeedback}>Next</button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<AppModal
  open={showNoDueChoiceModal}
  title="Daily due complete"
  description="You've finished today's due phrases. Keep practicing saved phrases, or continue your course to unlock new ones."
  onclose={() => (showNoDueChoiceModal = false)}
>
  <div slot="actions" class="modal-actions">
    <button type="button" class="btn-modal-ghost" onclick={() => (showNoDueChoiceModal = false)}>Cancel</button>
    <button type="button" class="btn-modal-soft" onclick={continueWithSavedPhrases}>Practice saved phrases</button>
    <button type="button" class="btn-modal-primary" onclick={continueWithCourse}>Continue course</button>
  </div>
</AppModal>

<AppModal
  open={showInfoModal}
  title={infoModalTitle}
  description={infoModalMessage}
  onclose={closeInfoModal}
>
  <div slot="actions" class="modal-actions">
    <button type="button" class="btn-modal-primary" onclick={closeInfoModal}>OK</button>
  </div>
</AppModal>

<div class={`pause-overlay ${showPauseOverlay ? 'show' : ''}`} onclick={closePauseOutside} onkeydown={(event) => event.key === 'Escape' && closePause()} role="dialog" tabindex="0" aria-modal="true">
  <div class="pause-sheet" id="pause-sheet">
    <div class="pause-handle"></div>
    <div class="pause-title">Session paused</div>
    <div class="pause-sub">Your progress is saved. Pick up where you left off any time.</div>
    <div class="pause-progress">
      <div class="pp-stat"><div class="pp-num">{pauseCorrect}</div><div class="pp-lbl">Correct</div></div>
      <div class="pp-stat"><div class="pp-num">{pauseWrong}</div><div class="pp-lbl">Wrong</div></div>
      <div class="pp-stat"><div class="pp-num">{pauseLeft}</div><div class="pp-lbl">Left</div></div>
    </div>
    <button class="btn-resume" type="button" onclick={closePause}>Resume session</button>
    <button class="btn-exit-session" type="button" onclick={exitSession}>Exit to practice menu</button>
  </div>
</div>

<style>
  :global(body) {
    background: #f5f0e8;
  }

  .practice-wrap {
    --forest: #1c2b22;
    --parchment: #f5f0e8;
    --parchment-dark: #e8e0d0;
    --moss: #2d7a50;
    --sage: #7ec99a;
    --muted: #5a7a64;
    --error: #c0392b;
    --error-bg: #fdf0ee;
    --error-border: #e8a89e;
    --correct: #2d7a50;
    --correct-bg: #edf7f0;
    --correct-border: #7ec99a;
    max-width: 760px;
    margin: 0 auto;
    padding: 0 0 calc(44px + env(safe-area-inset-bottom, 0px));
  }

  .study-banner {
    margin: 12px 16px 0;
    border-radius: 12px;
    border: 1px solid rgba(45, 122, 80, 0.2);
    background: rgba(45, 122, 80, 0.08);
    padding: 12px 14px;
  }

  .study-title {
    color: var(--moss);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .study-meta {
    margin-top: 6px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .offline-banner {
    margin: 12px 16px 0;
    border-radius: 12px;
    border: 1px solid rgba(180, 83, 9, 0.28);
    background: rgba(180, 83, 9, 0.11);
    padding: 10px 12px;
    font-size: 13px;
    color: #9a3412;
    line-height: 1.5;
  }

  .screen {
    display: none;
    min-height: calc(100vh - 58px);
    flex-direction: column;
  }

  .screen.active {
    display: flex;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .screen.active {
    animation: fadeIn .25s cubic-bezier(.4,0,.2,1) both;
  }

  .warmup-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
    padding: 48px 24px 80px;
  }

  .warmup-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .warmup-headline {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(28px,4vw,40px);
    letter-spacing: -.03em;
    line-height: 1.05;
    margin-bottom: 8px;
  }

  .warmup-headline em {
    font-style: italic;
    font-weight: 300;
    color: var(--moss);
  }

  .warmup-sub {
    font-size: 14px;
    color: #777;
    margin-bottom: 36px;
    line-height: 1.6;
  }

  .due-strip {
    display: flex;
    gap: 10px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }

  .due-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }

  .due-pill.primary { background: var(--forest); color: var(--parchment); }
  .due-pill.secondary { background: white; color: var(--forest); border: 1px solid var(--parchment-dark); }
  .due-pill.dim { background: var(--parchment-dark); color: var(--muted); }

  .mode-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }

  .mode-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: white;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 16px;
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s, transform .1s, background .15s;
    text-align: left;
    width: 100%;
    font-family: 'Instrument Sans', sans-serif;
  }

  .mode-card:hover {
    border-color: var(--moss);
    box-shadow: 0 4px 16px rgba(45,122,80,.1);
    transform: translateY(-1px);
  }

  .mode-card:active { transform: translateY(0); box-shadow: none; }
  .mode-card.primary-mode { background: var(--forest); border-color: var(--forest); }
  .mode-card.primary-mode:hover { background: #243529; border-color: #243529; box-shadow: 0 4px 20px rgba(28,43,34,.25); }

  .mc-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mc-icon-wrap.dark { background: rgba(126,201,154,.15); }
  .mc-icon-wrap.light { background: rgba(45,122,80,.08); }
  .mc-icon-wrap.dim { background: var(--parchment-dark); }
  .mode-card.primary-mode .mc-icon-wrap { background: rgba(126,201,154,.15); }

  .mc-text { flex: 1; }
  .mc-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
  .mode-card.primary-mode .mc-eyebrow { color: rgba(245,240,232,.4); }

  .mc-title {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 17px;
    color: var(--forest);
    letter-spacing: -.01em;
  }

  .mode-card.primary-mode .mc-title { color: var(--parchment); }
  .mc-title em { font-style: italic; font-weight: 300; color: var(--moss); }
  .mode-card.primary-mode .mc-title em { color: var(--sage); }

  .mc-sub { font-size: 12px; color: #888; margin-top: 2px; line-height: 1.4; }
  .mode-card.primary-mode .mc-sub { color: rgba(245,240,232,.45); }

  .mc-badge { font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 10px; flex-shrink: 0; }
  .mc-badge.amber { background: rgba(200,120,40,.1); color: #c07828; }
  .mc-badge.none { background: var(--parchment-dark); color: #bbb; }
  .mode-card.primary-mode .mc-badge { background: rgba(126,201,154,.2); color: var(--sage); }
  .mc-arrow { color: #ccc; flex-shrink: 0; }
  .mode-card:hover .mc-arrow { color: var(--muted); }
  .mode-card.primary-mode .mc-arrow { color: rgba(245,240,232,.3); }

  .session-bar {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 20px;
    background: var(--parchment);
    border-bottom: 1px solid var(--parchment-dark);
    position: sticky;
    top: 58px;
    z-index: 25;
  }

  .session-exit {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 999px;
    background: rgba(28,43,34,.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .session-progress-track {
    flex: 1;
    height: 4px;
    background: var(--parchment-dark);
    border-radius: 2px;
    overflow: hidden;
  }

  .session-progress-fill {
    height: 100%;
    background: var(--moss);
    border-radius: 2px;
    transition: width .4s cubic-bezier(.4,0,.2,1);
  }

  .session-score {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .score-mastered { color: var(--moss); }
  .score-left { color: var(--muted); }

  .exercise-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    padding: 0 0 40px;
  }

  .ex-header {
    background: var(--forest);
    padding: 28px 28px 24px;
    margin: 20px 20px 0;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }

  .ex-header::after {
    content: '';
    position: absolute;
    bottom: -40px;
    right: -40px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: rgba(45,122,80,.15);
  }

  .ex-mode-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: rgba(245,240,232,.35);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .ex-mode-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--sage);
    flex-shrink: 0;
  }

  .ex-phrase {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(22px,3.5vw,30px);
    color: var(--parchment);
    letter-spacing: -.02em;
    line-height: 1.2;
    margin-bottom: 6px;
    position: relative;
    z-index: 1;
  }

  .ex-instruction {
    font-size: 12px;
    color: rgba(245,240,232,.4);
    position: relative;
    z-index: 1;
  }

  .ex-body { padding: 20px 20px 0; }
  .tray-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }

  .btn-clear {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'Instrument Sans', sans-serif;
  }

  .btn-clear:hover { background: var(--parchment-dark); color: var(--forest); }
  .btn-clear:disabled { opacity: .3; pointer-events: none; }

  .answer-tray {
    min-height: 52px;
    background: white;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 12px;
    padding: 10px 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
  }

  .answer-tray-placeholder {
    font-size: 13px;
    color: #ccc;
    font-style: italic;
    pointer-events: none;
  }

  .word-token {
    display: inline-flex;
    align-items: center;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid transparent;
    user-select: none;
    white-space: nowrap;
  }

  .word-token.bank { background: white; border-color: var(--parchment-dark); color: var(--forest); }
  .word-token.bank:hover { border-color: var(--moss); background: rgba(45,122,80,.04); }
  .word-token.bank.selected { border-color: var(--moss); background: rgba(45,122,80,.08); color: var(--moss); }
  .word-token.placed { background: var(--forest); border-color: var(--forest); color: var(--parchment); }

  .word-bank {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    background: var(--parchment-dark);
    border-radius: 12px;
    margin-bottom: 20px;
    min-height: 52px;
  }

  .word-bank-label {
    width: 100%;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .fill-input-wrap { margin-bottom: 16px; position: relative; }

  .fill-input {
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 12px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 16px;
    color: var(--forest);
    background: white;
    outline: none;
  }

  .fill-input::placeholder { color: #ccc; }
  .fill-input:focus { border-color: var(--moss); box-shadow: 0 0 0 3px rgba(45,122,80,.08); }
  .fill-input.correct-input { border-color: var(--correct-border); background: var(--correct-bg); color: var(--correct); }
  .fill-input.error-input { border-color: var(--error-border); background: var(--error-bg); color: var(--error); }

  .input-hint {
    font-size: 12px;
    color: var(--muted);
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .cloze-hint-wrap {
    margin: -2px 0 16px;
  }

  .btn-cloze-hint {
    border: 1px solid var(--parchment-dark);
    background: rgba(255, 255, 255, 0.72);
    color: var(--forest);
    border-radius: 999px;
    padding: 9px 12px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .cloze-hint-card {
    border: 1px solid var(--parchment-dark);
    background: rgba(255, 253, 248, 0.96);
    border-radius: 12px;
    padding: 12px 14px;
    display: grid;
    gap: 8px;
  }

  .cloze-hint-row {
    display: grid;
    gap: 3px;
  }

  .cloze-hint-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .cloze-hint-value {
    font-size: 13px;
    line-height: 1.45;
    color: #4c5b51;
  }

  .feedback-strip {
    padding: 14px 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    display: none;
    align-items: flex-start;
    gap: 10px;
  }

  .feedback-strip.show { display: flex; }
  .feedback-strip.correct { background: var(--correct-bg); border: 1px solid var(--correct-border); }
  .feedback-strip.wrong { background: var(--error-bg); border: 1px solid var(--error-border); }
  .fb-title { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .feedback-strip.correct .fb-title { color: var(--correct); }
  .feedback-strip.wrong .fb-title { color: var(--error); }
  .fb-answer { font-size: 13px; line-height: 1.5; color: #666; }
  .fb-answer strong { font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; font-size: 15px; color: var(--forest); }

  .action-bar {
    padding: 0 20px;
    margin-top: auto;
    padding-top: 20px;
    display: flex;
    gap: 10px;
  }

  .btn-check {
    flex: 1;
    padding: 15px;
    background: var(--forest);
    color: var(--parchment);
    border: none;
    border-radius: 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-check:disabled { opacity: .35; cursor: not-allowed; }

  .btn-show {
    padding: 15px 18px;
    background: white;
    color: var(--muted);
    border: 1.5px solid var(--parchment-dark);
    border-radius: 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .flashcard-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 20px;
  }

  .flashcard {
    width: 100%;
    max-width: 500px;
    background: white;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 24px;
    padding: 40px 32px;
    text-align: center;
    cursor: pointer;
    transition: transform .15s, box-shadow .15s, border-color .2s;
    position: relative;
    overflow: hidden;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .flashcard::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(45,122,80,.04);
  }

  .flashcard:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(28,43,34,.1);
    border-color: var(--parchment-dark);
  }

  .flashcard.flipped {
    background: var(--forest);
    border-color: var(--forest);
    cursor: default;
  }

  .fc-irish {
    font-family: 'Fraunces', serif;
    font-weight: 300;
    font-style: italic;
    font-size: clamp(24px,4vw,32px);
    color: var(--forest);
    letter-spacing: -.02em;
    line-height: 1.25;
  }

  .flashcard.flipped .fc-irish {
    color: var(--parchment);
  }

  .fc-tap-hint {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #ccc;
  }

  .fc-english {
    font-size: 16px;
    color: rgba(245,240,232,.6);
    margin-top: 4px;
  }

  .fc-flip-hint {
    font-size: 11px;
    color: rgba(245,240,232,.25);
    margin-top: 8px;
  }

  .flash-rating {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 500px;
  }

  .flash-rating.hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .btn-rating {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-nope {
    background: rgba(192,57,43,.1);
    color: var(--error);
    border: 1.5px solid var(--error-border);
  }

  .btn-yep {
    background: rgba(45,122,80,.1);
    color: var(--correct);
    border: 1.5px solid var(--correct-border);
  }

  .complete-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
    max-width: 480px;
    margin: 0 auto;
  }

  .complete-mark {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(45,122,80,.1);
    border: 2px solid var(--correct-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  }

  .complete-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 32px;
    letter-spacing: -.03em;
    line-height: 1.1;
    color: var(--forest);
    margin-bottom: 8px;
  }

  .complete-title em { font-style: italic; font-weight: 300; color: var(--moss); }
  .complete-sub { font-size: 14px; color: #888; margin-bottom: 32px; line-height: 1.6; }

  .complete-stats {
    display: flex;
    gap: 1px;
    width: 100%;
    margin-bottom: 32px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid var(--parchment-dark);
  }

  .cs-stat { flex: 1; background: white; padding: 16px 12px; text-align: center; }
  .cs-num { font-family: 'Fraunces', serif; font-weight: 900; font-size: 28px; color: var(--forest); letter-spacing: -.02em; }
  .cs-lbl { font-size: 10px; color: #aaa; font-weight: 600; margin-top: 2px; letter-spacing: .05em; text-transform: uppercase; }

  .btn-done {
    width: 100%;
    padding: 15px;
    background: var(--forest);
    color: var(--parchment);
    border: none;
    border-radius: 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 10px;
  }

  .btn-again {
    width: 100%;
    padding: 13px;
    background: none;
    color: var(--muted);
    border: 1.5px solid var(--parchment-dark);
    border-radius: 14px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .pause-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.42);
    display: none;
    align-items: flex-end;
    z-index: 80;
  }

  .pause-overlay.show { display: flex; }

  .pause-sheet {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    background: var(--parchment);
    border-radius: 20px 20px 12px 12px;
    padding: 20px 16px 28px;
    border: 1px solid var(--parchment-dark);
  }

  .pause-handle { width: 40px; height: 4px; border-radius: 4px; background: #ccc; margin: 0 auto 14px; }
  .pause-title { font-size: 18px; font-weight: 700; color: var(--forest); margin-bottom: 4px; text-align: center; }
  .pause-sub { font-size: 12px; color: #888; margin-bottom: 16px; text-align: center; }
  .pause-progress { display: flex; gap: 1px; border: 1px solid var(--parchment-dark); border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
  .pp-stat { flex: 1; background: white; text-align: center; padding: 12px; }
  .pp-num { font-size: 20px; font-weight: 800; color: var(--forest); font-family: 'Fraunces', serif; }
  .pp-lbl { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: .06em; }

  .btn-resume {
    width: 100%;
    padding: 13px;
    border: none;
    border-radius: 12px;
    background: var(--forest);
    color: var(--parchment);
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .btn-exit-session {
    width: 100%;
    padding: 12px;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 12px;
    background: white;
    color: var(--muted);
    font-weight: 600;
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn-modal-ghost,
  .btn-modal-soft,
  .btn-modal-primary {
    border-radius: 10px;
    cursor: pointer;
    padding: 9px 16px;
    font-size: 13px;
  }

  .btn-modal-ghost { border: 1.5px solid var(--parchment-dark); background: transparent; color: var(--muted); font-weight: 600; }
  .btn-modal-soft { border: 1px solid rgba(45, 122, 80, 0.2); background: rgba(45, 122, 80, 0.1); color: var(--moss); font-weight: 700; }
  .btn-modal-primary { border: none; background: var(--forest); color: var(--parchment); font-weight: 700; }

  @media (max-width: 600px) {
    .warmup-wrap { padding: 28px 16px 80px; }
    .warmup-headline { font-size: 28px; }
    .warmup-sub { font-size: 13px; margin-bottom: 28px; }
    .due-strip { gap: 8px; margin-bottom: 28px; }
    .due-pill { font-size: 12px; padding: 7px 12px; }
    .mode-list { gap: 8px; }
    .mode-card { padding: 14px 16px; gap: 12px; border-radius: 14px; }
    .mc-icon-wrap { width: 38px; height: 38px; border-radius: 10px; }
    .mc-title { font-size: 15px; }
    .mc-sub { font-size: 11px; }
    .session-bar { padding: 0 12px; gap: 10px; }
    .session-score { gap: 10px; font-size: 11px; }
    .exercise-wrap { padding: 0 0 24px; }
    .ex-header { margin: 12px 12px 0; padding: 20px 20px 18px; border-radius: 16px; }
    .ex-phrase { font-size: 20px; }
    .ex-body { padding: 14px 12px 0; }
    .answer-tray { padding: 8px 10px; min-height: 48px; }
    .word-token { padding: 8px 12px; font-size: 13px; border-radius: 8px; }
    .word-bank { padding: 12px; gap: 7px; border-radius: 10px; margin-bottom: 16px; }
    .feedback-strip { padding: 12px 14px; border-radius: 10px; }
    .fb-title { font-size: 12px; }
    .fb-answer { font-size: 12px; }
    .fill-input { font-size: 15px; padding: 13px 14px; }
    .action-bar { padding: 0 12px; padding-top: 16px; gap: 8px; }
    .btn-check { padding: 14px; font-size: 14px; border-radius: 12px; }
    .btn-show { padding: 14px 14px; font-size: 13px; border-radius: 12px; }
    .complete-wrap { padding: 32px 16px; }
    .complete-title { font-size: 26px; }
    .complete-sub { font-size: 13px; margin-bottom: 24px; }
    .complete-stats { margin-bottom: 24px; }
    .cs-num { font-size: 24px; }
    .btn-done { padding: 14px; font-size: 14px; }
    .btn-again { padding: 12px; font-size: 13px; }
    .flashcard-wrap { padding: 16px; gap: 16px; }
    .flashcard { padding: 32px 24px; border-radius: 20px; min-height: 180px; }
    .fc-irish { font-size: 24px; }
    .fc-english { font-size: 15px; }
    .flash-rating { gap: 8px; }
    .btn-rating { padding: 13px; font-size: 13px; border-radius: 12px; }
  }
</style>
