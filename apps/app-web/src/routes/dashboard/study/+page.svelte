<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe } from '$lib/api/auth-client';
  import { flip } from 'svelte/animate';
  import { goto } from '$app/navigation';
  import { fade, fly } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
  import { MisButton } from '@decyphr/misneach-ui';
  import { isLikelyNetworkError, isOnline } from '$lib/mobile/network-status';
  import {
    applyLessonProgressFromCatalog,
    endStudySession,
    loadCurrentStudySession,
    loadStudySession,
    recommendedStudyHref,
    recommendedStudyStep,
    saveStudySession,
    setCurrentStudySessionId,
    setStepSkipped,
    studyCoordinatorHref,
    studyFlashcardsHref,
    studyLessonHref,
    studyPracticeHref,
    type StudyCatalogCourse,
    type StudySession,
    type StudyStep,
  } from '$lib/study-session';

  const STEP_ORDER: StudyStep[] = ['lessons', 'practice', 'flashcards'];
  const STEP_LABEL: Record<StudyStep, string> = {
    lessons: 'Lessons',
    practice: 'Practice',
    flashcards: 'Flashcards',
  };

  let loading = true;
  let error = '';
  let session: StudySession | null = null;
  let sessionId = '';
  let authClientId = '';

  let returningToDashboard = false;
  let completionRedirectTimer: ReturnType<typeof setTimeout> | null = null;

  function stepTarget(step: StudyStep, nextSession: StudySession | null = session) {
    if (!nextSession) return 0;
    if (step === 'lessons') return nextSession.targets.lessons;
    if (step === 'practice') return nextSession.targets.practice;
    return nextSession.targets.flashcards;
  }

  function stepCompleted(step: StudyStep, nextSession: StudySession | null = session) {
    if (!nextSession) return 0;
    if (step === 'lessons') return nextSession.progress.lessonsCompleted;
    if (step === 'practice') return nextSession.progress.practiceCompleted;
    return nextSession.progress.flashcardsCompleted;
  }

  function stepSkipped(step: StudyStep, nextSession: StudySession | null = session) {
    if (!nextSession) return false;
    if (step === 'lessons') return nextSession.progress.lessonsSkipped;
    if (step === 'practice') return nextSession.progress.practiceSkipped;
    return nextSession.progress.flashcardsSkipped;
  }

  function isStepDone(step: StudyStep, nextSession: StudySession | null = session) {
    const target = stepTarget(step, nextSession);
    if (target <= 0) return true;
    return stepSkipped(step, nextSession) || stepCompleted(step, nextSession) >= target;
  }

  function visibleSteps(nextSession: StudySession | null = session) {
    if (!nextSession) return [] as StudyStep[];
    return STEP_ORDER.filter((step) => stepTarget(step, nextSession) > 0);
  }

  function allVisibleStepsDone(nextSession: StudySession | null = session) {
    const steps = visibleSteps(nextSession);
    return steps.length > 0 && steps.every((step) => isStepDone(step, nextSession));
  }

  function recommendedPendingStep(nextSession: StudySession | null = session) {
    if (!nextSession) return null;
    const step = recommendedStudyStep(nextSession);
    if (!step) return null;
    if (stepTarget(step, nextSession) <= 0) return null;
    if (isStepDone(step, nextSession)) return null;
    return step;
  }

  function lessonStepHref(next: StudySession) {
    const idx = Math.min(
      next.progress.lessonsCompleted,
      Math.max(0, next.lessonPlan.lessonSlugs.length - 1),
    );
    const lessonSlug = next.lessonPlan.lessonSlugs[idx];
    if (!lessonSlug || !next.activeCourse) return studyCoordinatorHref(next.id);
    return studyLessonHref(next, lessonSlug);
  }

  function stepHref(step: StudyStep) {
    if (!session) return '/dashboard';
    if (step === 'lessons') return lessonStepHref(session);
    if (step === 'practice') return studyPracticeHref(session, studyCoordinatorHref(session.id));
    return studyFlashcardsHref(session, studyCoordinatorHref(session.id));
  }

  function clearCompletionRedirect() {
    if (completionRedirectTimer) {
      clearTimeout(completionRedirectTimer);
      completionRedirectTimer = null;
    }
  }

  function armCompletionRedirect() {
    if (completionRedirectTimer) return;
    returningToDashboard = true;
    completionRedirectTimer = setTimeout(() => {
      goto('/dashboard').catch(() => undefined);
    }, 1800);
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

  async function loadSessionAndRefresh() {
    loading = true;
    error = '';

    try {
      if (!authClientId) {
        session = null;
        setCurrentStudySessionId(null);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      sessionId = params.get('session') || '';

      if (!sessionId) {
        const current = loadCurrentStudySession(authClientId || null);
        if (!current) {
          session = null;
          return;
        }
        sessionId = current.id;
      }

      const loaded = loadStudySession(sessionId, authClientId || null);
      if (!loaded) {
        session = null;
        setCurrentStudySessionId(null);
        return;
      }

      session = loaded;

      const catalogRes = await apiFetch('/api/proxy/courses/catalog', { cache: 'no-store' });
      if (catalogRes.ok) {
        const payload = await catalogRes.json();
        const courses = (payload?.courses ?? []) as StudyCatalogCourse[];
        if (session) {
          applyLessonProgressFromCatalog(session, courses);
          saveStudySession(session);
        }
      }
    } catch (err) {
      error = isLikelyNetworkError(err)
        ? 'You appear to be offline. Reconnect and retry.'
        : err instanceof Error
          ? err.message
          : 'Failed to load study session.';
    } finally {
      loading = false;
    }
  }

  async function continueRecommended() {
    if (!session) return;
    if (!recommendedPendingStep(session)) return;
    await goto(recommendedStudyHref(session));
  }

  async function continueStep(step: StudyStep) {
    if (!session) return;
    if (isStepDone(step, session)) return;
    await goto(stepHref(step));
  }

  function toggleSkip(step: StudyStep) {
    if (!session) return;
    if (stepTarget(step, session) <= 0) return;
    const nextSkipped = !stepSkipped(step, session);
    setStepSkipped(session, step, nextSkipped);
    saveStudySession(session);
  }

  async function endSessionNow() {
    if (!session) return;
    const next = endStudySession(session);
    saveStudySession(next);
    session = { ...next };
    setCurrentStudySessionId(null);
    await goto('/dashboard');
  }

  onMount(() => {
    loadAuthContext()
      .then(() => loadSessionAndRefresh())
      .catch(() => loadSessionAndRefresh());
    const onFocus = () => {
      loadAuthContext()
        .then(() => loadSessionAndRefresh())
        .catch(() => loadSessionAndRefresh());
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });

  onDestroy(() => {
    clearCompletionRedirect();
  });

  $: if (allVisibleStepsDone(session)) {
    armCompletionRedirect();
  } else {
    clearCompletionRedirect();
    returningToDashboard = false;
  }
</script>

<section class="mx-auto max-w-3xl space-y-5 pb-8 pt-0 sm:py-8">
  {#if !$isOnline}
    <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      You are offline. Study progress sync is temporarily unavailable.
    </div>
  {/if}

  <header class="-mx-4 -mt-4 rounded-none border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-500 p-7 text-white shadow sm:mx-0 sm:mt-0 sm:rounded-2xl">
    <h1 class="text-3xl font-bold">Guided Study Session</h1>
    <p class="mt-2 text-emerald-50">Follow the recommended path or jump between steps as needed.</p>
  </header>

  {#if loading}
    <div class="rounded-2xl border bg-white p-6 text-slate-600">Loading study session...</div>
  {:else if error}
    <div class="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-700">
      <p>{error}</p>
      <button
        type="button"
        class="mt-3 inline-flex rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        onclick={loadSessionAndRefresh}
      >
        Retry
      </button>
    </div>
  {:else if !session}
    <div class="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
      <h2 class="text-2xl font-bold text-slate-900">No active session</h2>
      <p class="text-slate-600">Start a new guided study session from the dashboard.</p>
      <a href="/dashboard" class="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
        Back to dashboard
      </a>
    </div>
  {:else}
    <section class="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {session.status === 'completed' ? 'Completed' : session.status === 'ended' ? 'Ended' : 'Active'}
        </p>
        <h2 class="text-2xl font-bold text-slate-900 mt-1">{session.minutes} minute balanced session</h2>
        {#if session.activeCourse}
          <p class="mt-1 text-slate-600">Active course: {session.activeCourse.courseTitle}</p>
        {/if}
      </div>

      {#if visibleSteps(session).length === 0}
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Nothing targeted right now. Return to the dashboard and start a fresh run.
        </div>
        <MisButton variant="unstyled" size="none"
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          onclick={() => goto('/dashboard')}
        >
          Back to Dashboard
        </MisButton>
      {:else}
        <div class="relative">
          <div class="pointer-events-none absolute left-[0.93rem] top-2 bottom-2 w-px bg-slate-200"></div>
          <ol class="space-y-3">
            {#each visibleSteps(session) as step (step)}
              {@const target = stepTarget(step)}
              {@const completed = stepCompleted(step)}
              {@const skipped = stepSkipped(step)}
              {@const done = isStepDone(step)}
              <li
                animate:flip={{ duration: 300 }}
                class={`relative rounded-xl border transition-all ${
                  done
                    ? skipped
                      ? 'border-slate-300 bg-slate-50/90'
                      : 'border-emerald-200 bg-emerald-50/80'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div class={`flex items-start gap-3 transition-all ${done ? 'p-3' : 'p-4'}`}>
                  <div
                    class={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      done
                        ? skipped
                          ? 'border-slate-400 bg-slate-300 text-slate-700'
                          : 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-500'
                    }`}
                  >
                    {#if done}
                      ✓
                    {/if}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-3">
                      <h3 class={`text-base font-semibold ${done ? 'text-slate-500' : 'text-slate-900'}`}>
                        {STEP_LABEL[step]}
                      </h3>
                      <p class={`text-sm font-semibold ${done ? (skipped ? 'text-slate-500' : 'text-emerald-700') : 'text-slate-700'}`}>
                        {completed} / {target}
                      </p>
                    </div>

                    {#if done}
                      <p class={`mt-1 text-sm ${skipped ? 'text-slate-500' : 'text-emerald-700'}`}>
                        {skipped ? 'Skipped' : 'Completed'}
                      </p>
                      {#if skipped}
                        <div class="mt-2">
                          <MisButton variant="unstyled" size="none"
                            type="button"
                            className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            onclick={() => toggleSkip(step)}
                          >
                            Unskip
                          </MisButton>
                        </div>
                      {/if}
                    {:else}
                      <div in:fly={{ y: 6, duration: 180 }} out:fade={{ duration: 120 }} class="mt-3 flex flex-wrap gap-2">
                        <MisButton variant="unstyled" size="none"
                          type="button"
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                          onclick={() => continueStep(step)}
                        >
                          Continue
                        </MisButton>
                        <MisButton variant="unstyled" size="none"
                          type="button"
                          className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onclick={() => toggleSkip(step)}
                        >
                          Skip
                        </MisButton>
                      </div>
                    {/if}
                  </div>
                </div>
              </li>
            {/each}
          </ol>
        </div>

        {#if allVisibleStepsDone(session)}
          <div in:fly={{ y: 8, duration: 220 }} class="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <p class="text-base font-semibold text-emerald-800">Great work. You finished this guided study session.</p>
            <p class="mt-1 text-sm text-emerald-700">
              {returningToDashboard ? 'Returning to dashboard…' : 'Preparing dashboard…'}
            </p>
            <MisButton variant="unstyled" size="none"
              type="button"
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              onclick={() => goto('/dashboard')}
            >
              Go to Dashboard
            </MisButton>
          </div>
        {:else}
          <div class="flex flex-wrap gap-2 pt-1">
            {#if recommendedPendingStep(session)}
              <MisButton variant="unstyled" size="none"
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onclick={continueRecommended}
              >
                Continue Recommended Step
              </MisButton>
            {/if}
            <MisButton variant="unstyled" size="none"
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onclick={endSessionNow}
            >
              End Session
            </MisButton>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</section>
