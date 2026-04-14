<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe } from '$lib/api/auth-client';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { MisButton, MisModeCard, MisProgressStrip, MisTextarea } from '@decyphr/misneach-ui';
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
  const SESSION_SIZE = 15;

  type Exercise = {
    exerciseId: string;
    phraseId: number;
    exerciseType: ExerciseType;
    prompt: string;
    tokens?: string[];
    maskedIndex?: number;
    dueAt: string;
    expectedAnswer: string;
    source: 'main' | 'retry';
  };

  let loading = false;
  let submitting = false;
  let sessionMode: 'idle' | 'lesson' | 'fix_mistakes' | 'complete' = 'idle';

  let queue: Exercise[] = [];
  let index = 0;
  let completedCount = 0;
  let totalPlanned = 0;
  let masteredKeys = new Set<string>();

  let freeTextAnswer = '';
  let sentenceChoices: Array<{ id: string; value: string; selectedAt: number | null }> = [];
  let sentenceSelectionCounter = 0;
  let showAnswer = false;

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
  $: progress = totalPlanned > 0 ? Math.min(100, Math.round((completedCount / totalPlanned) * 100)) : 0;
  $: studyMode = Boolean(studySessionId);
  $: remainingCount = countRemaining();
  $: canSubmit = current
    ? current.exerciseType === 'sentence_builder'
      ? selectedSentenceTokens.length > 0
      : freeTextAnswer.trim().length > 0
    : false;

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

  function startFlashcardReview() {
    if (studySession) {
      goto(studyFlashcardsHref(studySession, studyReturnTo || studyCoordinatorHref(studySession.id)));
      return;
    }
    goto('/dashboard/flashcards/study');
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

  function nextQuestion() {
    index += 1;
    if (index >= queue.length) {
      sessionMode = 'complete';
      return;
    }
    skipInvalidExercises();
  }

  async function submitAttempt() {
    if (!current || !canSubmit) return;
    if (!ensureOnline('submit your answer')) return;

    const body: Record<string, unknown> = {
      exerciseType: current.exerciseType,
      phraseId: current.phraseId,
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

  function restart() {
    sessionMode = 'idle';
    queue = [];
    index = 0;
    completedCount = 0;
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

  <MisProgressStrip
    visible={sessionMode === 'lesson' || sessionMode === 'fix_mistakes'}
    masteredLabel={`${completedCount} mastered`}
    remainingLabel={`${remainingCount} left`}
    value={progress}
  />

  {#if studyMode}
    <section class="study-banner">
      <p class="study-title">Study session mode</p>
      {#if studySession}
        <p class="study-meta">
          Practice target: {studySession.progress.practiceCompleted} / {studySession.targets.practice}
        </p>
      {/if}
      {#if studyReturnTo}
        <p class="study-meta">You will return to your guided session after completion.</p>
      {/if}
    </section>
  {/if}

  {#if sessionMode === 'idle'}
    <div class="mode-grid">
      <MisModeCard
        onclick={startLesson}
        disabled={loading}
        tone="practice"
        eyebrow="Anytime session"
        title="Start"
        emphasis="practice"
        description="Due phrases first, then saved phrases so you can keep going any time."
      />

      <MisModeCard
        onclick={startFixMistakes}
        disabled={loading}
        id="mistakes-hub"
        tone="mistakes"
        eyebrow="Targeted review"
        title="Fix"
        emphasis="mistakes"
        description="Retry phrases you got wrong recently. Short and focused."
      />

      <MisModeCard
        onclick={startFlashcardReview}
        tone="flash"
        eyebrow="Spaced repetition"
        title="Flashcard"
        emphasis="review"
        description="Open your due flashcards for a different kind of recall."
      />
    </div>
  {:else if sessionMode === 'complete'}
    <div class="complete-card">
      <div class="complete-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2 class="complete-title">Críochnaithe. <em>Done.</em></h2>
      <p class="complete-stat">
        <strong>{completedCount}</strong> phrase{completedCount === 1 ? '' : 's'} mastered this session.
      </p>
      <MisButton variant="unstyled" size="none" onclick={restart} className="btn-restart">Back to practice</MisButton>
      {#if showContinueStudy && studyReturnTo}
        <MisButton variant="unstyled" size="none" onclick={() => goto(studyReturnTo)} className="btn-secondary">
          Continue Study Session
        </MisButton>
      {/if}
    </div>
  {:else}
    <article class="exercise-card">
      <header class="ex-header">
        {#if current?.source === 'retry'}
          <div class="retry-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10"></path>
            </svg>
            Retry
          </div>
        {:else}
          <p class="ex-label">{sessionMode === 'fix_mistakes' ? 'Fix Mistakes' : 'Practice'}</p>
        {/if}

        {#if current}
          <h2 class="ex-prompt">{current.prompt}</h2>
          <p class="ex-instruction">
            {current.exerciseType === 'sentence_builder'
              ? 'Build the Irish sentence in order'
              : current.exerciseType === 'typed_translation'
                ? typedInstruction(current)
                : 'Fill in the missing Irish word'}
          </p>
        {/if}
      </header>

      {#if current}
        <div class="ex-body">
          {#if current.exerciseType === 'sentence_builder'}
            <div class="tray-actions">
              <MisButton variant="unstyled" size="none" onclick={clearSentenceSelection} className="btn-clear" disabled={selectedSentenceTokens.length === 0}>
                Clear
              </MisButton>
            </div>

            <div class={`answer-tray ${selectedSentenceTokens.length ? 'has-words' : ''}`}>
              {#if selectedSentenceTokens.length === 0}
                <span class="answer-tray-placeholder">Tap words below to build your answer…</span>
              {:else}
                {#each selectedSentenceTokens as token, tokenIndex (`${token}-${tokenIndex}`)}
                  <span class="word-token placed">{token}</span>
                {/each}
              {/if}
            </div>

            <div class="word-bank">
              <div class="word-bank-label">Word bank</div>
              {#each sentenceChoices as token, tokenIndex (token.id)}
                <MisButton
                  variant="unstyled"
                  size="none"
                  onclick={() => toggleSentenceToken(tokenIndex)}
                  className={`word-token bank ${token.selectedAt != null ? 'selected' : ''}`}
                >
                  {token.value}
                </MisButton>
              {/each}
            </div>
          {:else}
            <MisTextarea
              id="practice-answer"
              bind:value={freeTextAnswer}
              rows={3}
              className="answer-textarea"
              placeholder="Type your answer…"
            ></MisTextarea>
          {/if}

          {#if showAnswer && !feedback}
            <div class="reveal-box">
              <p class="reveal-label">Expected answer</p>
              <p>{current.expectedAnswer}</p>
            </div>
          {/if}

          {#if feedback}
            <div class={`feedback-box show ${feedback.isCorrect ? 'correct' : 'wrong'}`}>
              <p class="feedback-message">{feedbackMessage}</p>
              {#if !feedback.isCorrect}
                <div class="feedback-diff">
                  <p>Your answer: {@html feedback.userAnswerHtml || '<em>(blank)</em>'}</p>
                  <p>Expected: {@html feedback.expectedAnswerHtml}</p>
                </div>
                <p class="feedback-retry-note">This one will come back around.</p>
              {/if}
            </div>
          {/if}

          <div class="action-row">
            {#if !feedback}
              <MisButton
                variant="unstyled"
                size="none"
                onclick={submitAttempt}
                disabled={submitting || !canSubmit}
                className="btn-check"
              >
                {submitting ? 'Checking…' : 'Check'}
              </MisButton>
              <MisButton
                variant="unstyled"
                size="none"
                onclick={() => (showAnswer = !showAnswer)}
                className="btn-show"
              >
                {showAnswer ? 'Hide answer' : 'Show answer'}
              </MisButton>
            {:else}
              <MisButton variant="unstyled" size="none" onclick={continueAfterFeedback} className="btn-continue">
                Continue →
              </MisButton>
            {/if}
          </div>
        </div>
      {/if}
    </article>
  {/if}
</section>

<AppModal
  open={showNoDueChoiceModal}
  title="Daily due complete"
  description="You've finished today's due phrases. Keep practicing saved phrases, or continue your course to unlock new ones."
  on:close={() => (showNoDueChoiceModal = false)}
>
  <div slot="actions" class="modal-actions">
    <MisButton variant="unstyled" size="none" type="button" className="btn-modal-ghost" onclick={() => (showNoDueChoiceModal = false)}>
      Cancel
    </MisButton>
    <MisButton variant="unstyled" size="none" type="button" className="btn-modal-soft" onclick={continueWithSavedPhrases}>
      Practice saved phrases
    </MisButton>
    <MisButton variant="unstyled" size="none" type="button" className="btn-modal-primary" onclick={continueWithCourse}>
      Continue course
    </MisButton>
  </div>
</AppModal>

<AppModal
  open={showInfoModal}
  title={infoModalTitle}
  description={infoModalMessage}
  on:close={closeInfoModal}
>
  <div slot="actions" class="modal-actions">
    <MisButton variant="unstyled" size="none" type="button" className="btn-modal-primary" onclick={closeInfoModal}>
      OK
    </MisButton>
  </div>
</AppModal>

<style>
  :global(body) {
    background: var(--parchment, #f5f0e8);
  }

  .practice-wrap {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
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

  .study-banner {
    margin-top: 8px;
    margin-bottom: 12px;
    border-radius: 12px;
    border: 1px solid rgba(45, 122, 80, 0.2);
    background: rgba(45, 122, 80, 0.08);
    padding: 12px 14px;
  }

  .offline-banner {
    margin-top: 12px;
    border-radius: 12px;
    border: 1px solid rgba(180, 83, 9, 0.28);
    background: rgba(180, 83, 9, 0.11);
    padding: 10px 12px;
    font-size: 13px;
    color: #9a3412;
    line-height: 1.5;
  }

  .study-title {
    color: var(--green);
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

  .mode-grid {
    display: flex;
    flex-direction: column;
    gap: 11px;
    padding-top: 32px;
  }


  .exercise-card {
    margin-top: 22px;
    border-radius: 20px;
    background: var(--forest);
    overflow: hidden;
  }

  .ex-header {
    padding: 28px 26px 22px;
  }

  .ex-label {
    margin-bottom: 10px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .retry-badge {
    margin-bottom: 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    border: 1px solid rgba(180, 83, 9, 0.25);
    background: rgba(180, 83, 9, 0.15);
    padding: 3px 10px;
    color: #d97706;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .retry-badge svg {
    width: 9px;
    height: 9px;
  }

  .ex-prompt {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: clamp(24px, 6vw, 34px);
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .ex-instruction {
    margin-top: 10px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .ex-body {
    background: var(--parchment);
    padding: 20px 22px 24px;
  }

  :global(.answer-textarea) {
    width: 100%;
    min-height: 80px;
    border-radius: 12px;
    border: 1.5px solid var(--parch-dark);
    background: #fff;
    padding: 14px 16px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 16px;
    color: var(--ink);
    line-height: 1.5;
    resize: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  :global(.answer-textarea:focus) {
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.12);
  }

  .tray-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .answer-tray {
    min-height: 52px;
    border-radius: 12px;
    border: 1.5px solid var(--parch-dark);
    background: #fff;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
    transition: border-color 0.15s;
  }

  .answer-tray.has-words {
    border-color: var(--parch-dark);
  }

  .answer-tray-placeholder {
    color: #c7c2b5;
    font-size: 13px;
    font-style: italic;
  }

  .word-bank {
    border-radius: 12px;
    background: var(--parch-dark);
    padding: 14px;
    margin-bottom: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 56px;
  }

  .word-bank-label {
    width: 100%;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 4px;
  }

  :global(.word-token) {
    display: inline-flex;
    align-items: center;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 14px;
    font-weight: 600;
    border: 1.5px solid transparent;
    cursor: pointer;
    user-select: none;
    transition: all 0.12s;
    white-space: nowrap;
  }

  :global(.word-token.bank) {
    background: #fff;
    border-color: var(--parch-dark);
    color: var(--ink);
  }

  :global(.word-token.bank:hover) {
    border-color: var(--green);
    color: var(--green);
  }

  :global(.word-token.bank.selected) {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.08);
    color: var(--green);
  }

  :global(.word-token.placed) {
    background: var(--forest);
    border-color: var(--forest);
    color: var(--parchment);
    cursor: default;
  }

  :global(.btn-clear) {
    border: none;
    background: transparent;
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }

  :global(.btn-clear:hover) {
    color: var(--forest);
    background: var(--parch-dark);
  }

  :global(.btn-clear:disabled) {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .reveal-box {
    margin-top: 14px;
    border-radius: 10px;
    border: 1px solid rgba(45, 122, 80, 0.2);
    background: rgba(45, 122, 80, 0.07);
    padding: 12px 16px;
    color: var(--forest);
    font-size: 14px;
    animation: fadeUp 0.15s ease;
  }

  .reveal-label {
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .feedback-box {
    margin-top: 14px;
    display: none;
    border-radius: 12px;
    padding: 16px 18px;
    font-size: 14px;
    line-height: 1.6;
    animation: feedIn 0.2s ease;
  }

  .feedback-box.show {
    display: block;
  }

  .feedback-box.correct {
    border: 1.5px solid rgba(45, 122, 80, 0.25);
    background: rgba(45, 122, 80, 0.1);
    color: var(--forest);
  }

  .feedback-box.wrong {
    border: 1.5px solid rgba(180, 60, 40, 0.2);
    background: rgba(180, 60, 40, 0.07);
    color: #7a1f10;
  }

  .feedback-message {
    margin-bottom: 8px;
    font-family: 'Fraunces', serif;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .feedback-diff {
    font-size: 13px;
    line-height: 1.8;
  }

  .feedback-diff :global(strong) {
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .feedback-retry-note {
    margin-top: 8px;
    opacity: 0.65;
    font-size: 12px;
    font-style: italic;
  }

  .action-row {
    margin-top: 16px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  :global(.btn-check),
  :global(.btn-continue),
  :global(.btn-restart),
  :global(.btn-secondary),
  :global(.btn-modal-primary),
  :global(.btn-modal-soft),
  :global(.btn-modal-ghost),
  :global(.btn-show) {
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s, border-color 0.15s, color 0.15s;
  }

  :global(.btn-check) {
    border: none;
    background: var(--forest);
    padding: 12px 26px;
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  :global(.btn-check:hover) {
    background: var(--forest-mid);
    transform: translateY(-1px);
  }

  :global(.btn-check:disabled) {
    opacity: 0.45;
    transform: none;
    cursor: not-allowed;
  }

  :global(.btn-show) {
    border: 1.5px solid var(--parch-dark);
    background: #fff;
    padding: 11px 18px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }

  :global(.btn-show:hover) {
    border-color: var(--forest);
    color: var(--forest);
  }

  :global(.btn-continue) {
    border: none;
    background: var(--sage);
    padding: 12px 26px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  :global(.btn-continue:hover) {
    background: var(--sage-l);
    transform: translateY(-1px);
  }

  .complete-card {
    margin-top: 32px;
    border-radius: 20px;
    background: var(--forest);
    padding: 52px 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .complete-mark {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    border: 1px solid rgba(126, 201, 154, 0.3);
    background: rgba(126, 201, 154, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .complete-mark svg {
    width: 32px;
    height: 32px;
    color: var(--sage);
  }

  .complete-title {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: clamp(30px, 7vw, 44px);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
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

  :global(.btn-restart) {
    margin-top: 8px;
    border: none;
    background: var(--sage);
    padding: 14px 36px;
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  :global(.btn-restart:hover) {
    background: var(--sage-l);
    transform: translateY(-1px);
  }

  :global(.btn-secondary) {
    border: 1px solid rgba(126, 201, 154, 0.35);
    background: rgba(126, 201, 154, 0.15);
    padding: 11px 18px;
    color: var(--sage);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  :global(.btn-secondary:hover) {
    background: rgba(126, 201, 154, 0.25);
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  :global(.btn-modal-ghost) {
    border: 1.5px solid var(--parch-dark);
    background: transparent;
    padding: 9px 16px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
  }

  :global(.btn-modal-ghost:hover) {
    border-color: var(--forest);
    color: var(--forest);
  }

  :global(.btn-modal-soft) {
    border: 1px solid rgba(45, 122, 80, 0.2);
    background: rgba(45, 122, 80, 0.1);
    padding: 9px 16px;
    color: var(--green);
    font-size: 13px;
    font-weight: 700;
  }

  :global(.btn-modal-soft:hover) {
    background: rgba(45, 122, 80, 0.18);
  }

  :global(.btn-modal-primary) {
    border: none;
    background: var(--forest);
    padding: 9px 16px;
    color: var(--parchment);
    font-size: 13px;
    font-weight: 700;
  }

  :global(.btn-modal-primary:hover) {
    background: var(--forest-mid);
  }

  @media (max-width: 480px) {
    .practice-wrap {
      padding-left: 16px;
      padding-right: 16px;
    }

    .ex-header,
    .ex-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .action-row {
      align-items: stretch;
      flex-direction: column;
    }

    :global(.btn-check),
    :global(.btn-show),
    :global(.btn-continue) {
      width: 100%;
      justify-content: center;
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

  @keyframes feedIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
