<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { MisButton, MisInput, MisSelect } from '@decyphr/misneach-ui';
  import {
    readJourneyGoalCounters,
    subscribeJourneyGoalCounters,
    syncJourneyGoalCounter,
  } from '$lib/stores/journey-goals';

  type GoalRecord = {
    id: string;
    title: string;
    description?: string | null;
    periodType: 'weekly' | 'monthly' | 'yearly' | 'custom';
    targetType: 'time_minutes' | 'session_count' | 'unit_count';
    targetValue: string;
    status: 'active' | 'completed' | 'archived';
    progress?: {
      achieved: number;
      target: number;
      remaining: number;
      percent: number;
      isComplete: boolean;
    };
  };

  type GoalsSummary = {
    goals?: {
      active?: number;
      completed?: number;
    };
  } | null;

  type CourseCatalog = {
    courses?: Array<{
      summaryProgress?: {
        completedLessons?: number;
        totalLessons?: number;
      };
      lessons?: Array<{
        progress?: {
          lastSeenAt?: string | null;
        };
      }>;
    }>;
  };

  type PracticeProgress = {
    totalCorrect?: number;
    totalAttempts?: number;
  } | null;

  type FlashcardsHealth = {
    rows?: Array<{
      reviewCount?: number;
    }>;
  } | null;

  type PersonalGoal = {
    id: string;
    type: 'checkbox' | 'count';
    name: string;
    target: number;
    current: number;
    done: boolean;
    period: 'week' | 'month' | 'ongoing';
  };

  type MilestoneTrack = {
    id: string;
    icon: string;
    label: string;
    current: number;
    tiers: Array<{ name: string; target: number }>;
  };

  type Suggestion = {
    name: string;
    type: 'checkbox' | 'count';
    target?: number;
    period?: 'week' | 'month' | 'ongoing';
  };

  const CIRC = 2 * Math.PI * 14;
  const suggestions: Record<'listening' | 'watching' | 'speaking', Suggestion[]> = {
    listening: [
      { name: 'Listen to a Raidió na Gaeltachta podcast', type: 'checkbox' },
      { name: 'Listen to 3 podcasts this week', type: 'count', target: 3, period: 'week' },
      { name: 'Put on an Irish radio station while cooking', type: 'checkbox' },
    ],
    watching: [
      { name: 'Watch one episode of Ros na Rún', type: 'checkbox' },
      { name: 'Watch an Irish language film', type: 'checkbox' },
      { name: 'Find the SpongeBob as Gaeilge clip on YouTube', type: 'checkbox' },
    ],
    speaking: [
      { name: 'Use Irish to order something in a café', type: 'checkbox' },
      { name: 'Say hello in Irish to someone this week', type: 'count', target: 3, period: 'week' },
      { name: 'Have a short conversation using only Irish', type: 'checkbox' },
    ],
  };

  let loading = false;
  let error = '';

  let goals: GoalRecord[] = [];
  let summary: GoalsSummary = null;
  let personalGoals: PersonalGoal[] = [];

  let milestonesOpen = true;
  let streakDays = 0;
  let activeDaySet = new Set<number>();

  let lessonsCompleted = 0;
  let lessonsTotal = 0;
  let mistakesCorrected = 0;
  let flashcardsReviewed = 0;

  let showCreateModal = false;
  let createType: 'checkbox' | 'count' = 'checkbox';
  let goalName = '';
  let goalTarget = '3';
  let goalPeriod: 'week' | 'month' | 'ongoing' = 'week';
  let formError = '';

  let toastText = '';
  let toastVisible = false;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeJourneyGoals: (() => void) | null = null;

  $: activePersonalGoals = personalGoals.filter((goal) => !goal.done);
  $: completedThisWeek = Number(summary?.goals?.completed || 0);
  $: heroPersonalCount = activePersonalGoals.length;
  $: milestones = buildMilestones();

  function startOfLocalDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function estimateStreakFromCatalog(payload: CourseCatalog) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const activeDays = new Set<number>();

    const courses = Array.isArray(payload?.courses) ? payload.courses : [];
    for (const course of courses) {
      const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
      for (const lesson of lessons) {
        const lastSeenAt = lesson?.progress?.lastSeenAt;
        if (!lastSeenAt) continue;
        const seen = new Date(lastSeenAt);
        if (Number.isNaN(seen.getTime())) continue;
        activeDays.add(startOfLocalDay(seen).getTime());
      }
    }

    activeDaySet = activeDays;

    if (activeDays.size === 0) return 0;

    const today = startOfLocalDay(new Date()).getTime();
    const yesterday = today - oneDayMs;
    let cursor = today;

    if (!activeDays.has(today)) {
      if (!activeDays.has(yesterday)) return 0;
      cursor = yesterday;
    }

    let streak = 0;
    while (activeDays.has(cursor)) {
      streak += 1;
      cursor -= oneDayMs;
    }

    return streak;
  }

  function weekDots() {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = startOfLocalDay(new Date());
    const day = today.getDay();
    const offset = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offset);

    return labels.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = startOfLocalDay(date).getTime();
      const isToday = key === today.getTime();
      const isDone = activeDaySet.has(key);
      if (isToday && isDone) return { label, className: 'today' };
      if (isDone) return { label, className: 'done' };
      return { label, className: 'upcoming' };
    });
  }

  function activeTier(track: MilestoneTrack) {
    for (let i = 0; i < track.tiers.length; i += 1) {
      if (track.current < track.tiers[i].target) return { tier: track.tiers[i], allDone: false };
    }
    return { tier: track.tiers[track.tiers.length - 1], allDone: true };
  }

  function toPersonalGoal(goal: GoalRecord): PersonalGoal {
    const targetRaw = Number(goal.progress?.target ?? goal.targetValue ?? 1);
    const target = Number.isFinite(targetRaw) ? Math.max(1, Math.round(targetRaw)) : 1;
    const current = Math.max(0, Number(goal.progress?.achieved || 0));
    const done = Boolean(goal.progress?.isComplete) || goal.status === 'completed' || current >= target;

    const isCheckbox = goal.targetType === 'unit_count' || target <= 1;
    let period: 'week' | 'month' | 'ongoing' = 'ongoing';
    if (goal.periodType === 'weekly') period = 'week';
    if (goal.periodType === 'monthly') period = 'month';

    return {
      id: goal.id,
      type: isCheckbox ? 'checkbox' : 'count',
      name: goal.title,
      target,
      current: Math.min(current, target),
      done,
      period,
    };
  }

  function buildMilestones(): MilestoneTrack[] {
    return [
      {
        id: 'lessons',
        icon: '📖',
        label: 'Lessons',
        current: lessonsCompleted,
        tiers: [
          { name: 'Complete your first 3 lessons', target: 3 },
          { name: 'Complete 5 lessons', target: 5 },
          { name: 'Complete 10 lessons', target: 10 },
          { name: `Complete all ${Math.max(12, lessonsTotal || 12)} lessons in Unit 1`, target: Math.max(12, lessonsTotal || 12) },
          { name: 'Complete 20 lessons', target: 20 },
        ],
      },
      {
        id: 'mistakes',
        icon: '✍️',
        label: 'Mistakes corrected',
        current: mistakesCorrected,
        tiers: [
          { name: 'Correct 5 mistakes', target: 5 },
          { name: 'Correct 25 mistakes', target: 25 },
          { name: 'Correct 50 mistakes', target: 50 },
        ],
      },
      {
        id: 'flashcards',
        icon: '🃏',
        label: 'Flashcards',
        current: flashcardsReviewed,
        tiers: [
          { name: 'Review 10 flashcards', target: 10 },
          { name: 'Review 50 flashcards', target: 50 },
          { name: 'Review 100 flashcards', target: 100 },
        ],
      },
    ];
  }

  function ringOffset(pct: number) {
    const clamped = Math.max(0, Math.min(100, pct));
    return (CIRC * (1 - clamped / 100)).toFixed(2);
  }

  function isSuggestionAdded(suggestion: Suggestion) {
    return personalGoals.some((goal) => goal.name.trim().toLowerCase() === suggestion.name.trim().toLowerCase());
  }

  function showToast(message: string) {
    toastText = message;
    toastVisible = true;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 2400);
  }

  async function readError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  function addDaysISO(days: number) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  function buildCreatePayload(name: string, type: 'checkbox' | 'count', target: number, period: 'week' | 'month' | 'ongoing') {
    if (type === 'checkbox') {
      return {
        title: name,
        description: undefined,
        periodType: 'custom',
        periodStart: addDaysISO(0),
        periodEnd: addDaysISO(89),
        targetType: 'unit_count',
        targetValue: 1,
      };
    }

    if (period === 'month') {
      return {
        title: name,
        description: undefined,
        periodType: 'monthly',
        periodStart: addDaysISO(0),
        periodEnd: addDaysISO(29),
        targetType: 'session_count',
        targetValue: target,
      };
    }

    if (period === 'ongoing') {
      return {
        title: name,
        description: undefined,
        periodType: 'custom',
        periodStart: addDaysISO(0),
        periodEnd: addDaysISO(89),
        targetType: 'session_count',
        targetValue: target,
      };
    }

    return {
      title: name,
      description: undefined,
      periodType: 'weekly',
      periodStart: addDaysISO(0),
      periodEnd: addDaysISO(6),
      targetType: 'session_count',
      targetValue: target,
    };
  }

  async function refreshAll() {
    loading = true;
    error = '';
    try {
      const [goalsRes, summaryRes, catalogRes, practiceRes, flashcardsRes] = await Promise.all([
        apiFetch('/api/proxy/goals', { cache: 'no-store' }),
        apiFetch('/api/proxy/goals/progress/summary', { cache: 'no-store' }),
        apiFetch('/api/proxy/courses/catalog', { cache: 'no-store' }),
        apiFetch('/api/proxy/practice/progress', { cache: 'no-store' }),
        apiFetch('/api/proxy/flashcards/health?limit=50&lookbackDays=365', { cache: 'no-store' }),
      ]);

      if (!goalsRes.ok) throw new Error(await readError(goalsRes, 'Failed to load goals'));
      if (!summaryRes.ok) throw new Error(await readError(summaryRes, 'Failed to load goal summary'));
      if (!catalogRes.ok) throw new Error(await readError(catalogRes, 'Failed to load course progress'));
      if (!practiceRes.ok) throw new Error(await readError(practiceRes, 'Failed to load practice progress'));
      if (!flashcardsRes.ok) throw new Error(await readError(flashcardsRes, 'Failed to load flashcard progress'));

      const goalsPayload = (await goalsRes.json()) as GoalRecord[];
      const summaryPayload = (await summaryRes.json()) as GoalsSummary;
      const catalogPayload = (await catalogRes.json()) as CourseCatalog;
      const practicePayload = (await practiceRes.json()) as PracticeProgress;
      const flashcardsPayload = (await flashcardsRes.json()) as FlashcardsHealth;

      goals = Array.isArray(goalsPayload) ? goalsPayload : [];
      summary = summaryPayload;

      const activeGoals = goals.filter((goal) => goal.status !== 'archived');
      personalGoals = activeGoals.map(toPersonalGoal);

      const courses = Array.isArray(catalogPayload?.courses) ? catalogPayload.courses : [];
      const lessonsCompletedFromApi = courses.reduce(
        (sum, course) => sum + Number(course?.summaryProgress?.completedLessons || 0),
        0,
      );
      lessonsTotal = courses.reduce(
        (sum, course) => sum + Number(course?.summaryProgress?.totalLessons || 0),
        0,
      );

      streakDays = estimateStreakFromCatalog(catalogPayload);
      const mistakesCorrectedFromApi = Math.max(0, Number(practicePayload?.totalCorrect || 0));
      const flashcardsReviewedFromApi = (Array.isArray(flashcardsPayload?.rows) ? flashcardsPayload.rows : []).reduce(
        (sum, row) => sum + Math.max(0, Number(row?.reviewCount || 0)),
        0,
      );

      const tracked = readJourneyGoalCounters();
      lessonsCompleted = Math.max(lessonsCompletedFromApi, tracked.lessonsCompleted);
      mistakesCorrected = Math.max(mistakesCorrectedFromApi, tracked.mistakesCorrected);
      flashcardsReviewed = Math.max(flashcardsReviewedFromApi, tracked.flashcardsReviewed);

      syncJourneyGoalCounter('lessonsCompleted', lessonsCompleted);
      syncJourneyGoalCounter('mistakesCorrected', mistakesCorrected);
      syncJourneyGoalCounter('flashcardsReviewed', flashcardsReviewed);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load goals';
    } finally {
      loading = false;
    }
  }

  async function createGoalFromValues(name: string, type: 'checkbox' | 'count', target: number, period: 'week' | 'month' | 'ongoing') {
    const res = await apiFetch('/api/proxy/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCreatePayload(name, type, target, period)),
    });

    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to create goal'));
    }
  }

  async function createGoal() {
    const name = goalName.trim();
    if (!name) {
      formError = 'Please name your goal.';
      return;
    }

    const target = Math.max(1, Math.round(Number(goalTarget) || 1));

    formError = '';
    try {
      await createGoalFromValues(name, createType, target, goalPeriod);
      showCreateModal = false;
      showToast('Goal added');
      await refreshAll();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to create goal';
    }
  }

  async function addSuggestion(suggestion: Suggestion) {
    if (isSuggestionAdded(suggestion)) return;

    try {
      await createGoalFromValues(
        suggestion.name,
        suggestion.type,
        suggestion.target ?? 1,
        suggestion.period ?? 'ongoing',
      );
      showToast(`Goal added — ${suggestion.name}`);
      await refreshAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add goal');
    }
  }

  async function removeGoal(goalId: string) {
    const res = await fetch(`/api/proxy/goals/${goalId}/archive`, { method: 'POST' });
    if (!res.ok) {
      showToast(await readError(res, 'Failed to remove goal'));
      return;
    }

    showToast('Goal removed');
    await refreshAll();
  }

  async function logOne(goalId: string) {
    const goal = personalGoals.find((item) => item.id === goalId);
    if (!goal || goal.done) return;

    const res = await fetch(`/api/proxy/goals/${goalId}/checkoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 }),
    });

    if (!res.ok) {
      showToast(await readError(res, 'Unable to log progress'));
      return;
    }

    showToast(goal.type === 'checkbox' ? 'Déanta — Done!' : 'Logged progress');
    await refreshAll();
  }

  function openCreateModal(prefill = '') {
    createType = 'checkbox';
    goalName = prefill;
    goalTarget = '3';
    goalPeriod = 'week';
    formError = '';
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
    formError = '';
  }

  function onModalBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeCreateModal();
    }
  }

  onMount(() => {
    refreshAll();
    unsubscribeJourneyGoals = subscribeJourneyGoalCounters((counters) => {
      lessonsCompleted = Math.max(lessonsCompleted, counters.lessonsCompleted);
      mistakesCorrected = Math.max(mistakesCorrected, counters.mistakesCorrected);
      flashcardsReviewed = Math.max(flashcardsReviewed, counters.flashcardsReviewed);
    });
  });

  onDestroy(() => {
    if (toastTimer) clearTimeout(toastTimer);
    if (unsubscribeJourneyGoals) unsubscribeJourneyGoals();
  });
</script>

<svelte:head>
  <title>Misneach — Goals</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<section class="wrap">
  <nav class="top-nav">
    <MisButton variant="unstyled" size="none" type="button" className="nav-back" onclick={() => goto('/dashboard')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
      Dashboard
    </MisButton>
    <div class="nav-brand">Misne<em>ach</em></div>
  </nav>

  <header class="hero">
    <div class="hero-eyebrow">Your progress</div>
    <h1 class="hero-title">Goals</h1>

    <div class="week-row">
      <span class="week-label">This week</span>
      {#each weekDots() as dot}
        <div class={`w-dot ${dot.className}`}>{dot.label}</div>
      {/each}
    </div>

    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hs-num green">{heroPersonalCount}</div>
        <div class="hs-label">personal goals active</div>
      </div>
      <div class="hero-stat">
        <div class="hs-num">{streakDays}</div>
        <div class="hs-label">day streak</div>
      </div>
      <div class="hero-stat">
        <div class="hs-num">{completedThisWeek}</div>
        <div class="hs-label">completed this week</div>
      </div>
    </div>
  </header>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <section class="section">
    <div class="section-head">
      <div>
        <h2 class="section-title">Your goals</h2>
        <p class="section-sub">Things you've decided to do</p>
      </div>
      <MisButton variant="unstyled" size="none" type="button" className="section-action" onclick={() => openCreateModal()}>+ Add goal</MisButton>
    </div>

    <div class="goal-list">
      {#if loading}
        <div class="personal-empty"><p>Loading goals…</p></div>
      {:else if personalGoals.length === 0}
        <div class="personal-empty">
          <p>No personal goals yet.<br />Add something from the suggestions below,<br />or write your own.</p>
        </div>
      {:else}
        {#each personalGoals as goal (goal.id)}
          {@const pct = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100))}
          <div class={`personal-goal ${goal.done ? 'done-goal' : ''}`}>
            {#if goal.type === 'checkbox'}
              <MisButton
                variant="unstyled"
                size="none"
                type="button"
                className={`goal-check ${goal.done ? 'checked' : ''}`}
                onclick={() => logOne(goal.id)}
                disabled={goal.done}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </MisButton>
            {:else}
              <div class="goal-count-ring" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <circle class="cr-bg" cx="16" cy="16" r="14"></circle>
                  <circle
                    class={`cr-fill ${goal.done ? 'done' : ''}`}
                    cx="16"
                    cy="16"
                    r="14"
                    stroke-dasharray={CIRC.toFixed(2)}
                    stroke-dashoffset={ringOffset(pct)}
                  ></circle>
                </svg>
                <div class="cr-label">{pct}%</div>
              </div>
            {/if}

            <div class="goal-body">
              <div class={`goal-name ${goal.done ? 'done-text' : ''}`}>{goal.name}</div>
              <div class="goal-meta">
                {#if goal.type === 'checkbox'}
                  {goal.done ? 'Completed ✓' : 'Tap to mark done'}
                {:else}
                  {goal.current} of {goal.target} · {goal.period}
                {/if}
              </div>
            </div>

            <div class="goal-actions-right">
              {#if goal.type === 'count' && !goal.done}
                <MisButton variant="unstyled" size="none" type="button" className="btn-count-log" onclick={() => logOne(goal.id)}>
                  + Log one
                </MisButton>
              {/if}
              <MisButton variant="unstyled" size="none" type="button" className="btn-remove" onclick={() => removeGoal(goal.id)} title="Remove">
                ✕
              </MisButton>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </section>

  <section class="section milestone-section">
    <MisButton variant="unstyled" size="none" type="button" className={`milestone-toggle ${milestonesOpen ? 'open' : ''}`} onclick={() => (milestonesOpen = !milestonesOpen)}>
      <h2 class="mt-title">Your journey</h2>
      <svg class="mt-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </MisButton>

    <p class="mt-sub">Milestones that track as you learn</p>

    {#if milestonesOpen}
      <div class="milestone-list">
        {#each milestones as track (track.id)}
          {@const active = activeTier(track)}
          {@const pct = active.allDone ? 100 : Math.min(99, Math.round((track.current / active.tier.target) * 100))}
          <div class="milestone-card">
            <div class="m-icon">{track.icon}</div>
            <div class="m-body">
              <div class="m-name">{active.tier.name}</div>
              <div class="m-track">
                <div class={`m-fill ${active.allDone ? 'done' : ''}`} style={`width:${pct}%`}></div>
              </div>
              <div class="m-meta">
                <span>{track.current} / {active.tier.target} {track.label.toLowerCase()}</span>
                <span class="m-pct">{pct}%</span>
              </div>
            </div>
            <span class={`m-badge ${active.allDone ? 'badge-done' : pct >= 50 ? 'badge-on-track' : 'badge-next'}`}>
              {#if active.allDone}
                ✓ Done
              {:else if pct >= 50}
                On track
              {:else}
                Next up
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="suggestions-section">
    <div class="sugg-title">Add something</div>
    <p class="sugg-sub">Tap to add a goal instantly, or write your own.</p>

    <div class="sugg-group">
      <div class="sugg-group-label">Listening</div>
      <div class="sugg-chips">
        {#each suggestions.listening as suggestion}
          {@const added = isSuggestionAdded(suggestion)}
          <MisButton variant="unstyled" size="none" type="button" className={`sugg-chip ${added ? 'added' : ''}`} disabled={added} onclick={() => addSuggestion(suggestion)}>
            {#if added}
              <svg class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            {/if}
            {suggestion.name}
          </MisButton>
        {/each}
      </div>
    </div>

    <div class="sugg-group">
      <div class="sugg-group-label">Watching</div>
      <div class="sugg-chips">
        {#each suggestions.watching as suggestion}
          {@const added = isSuggestionAdded(suggestion)}
          <MisButton variant="unstyled" size="none" type="button" className={`sugg-chip ${added ? 'added' : ''}`} disabled={added} onclick={() => addSuggestion(suggestion)}>
            {#if added}
              <svg class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            {/if}
            {suggestion.name}
          </MisButton>
        {/each}
      </div>
    </div>

    <div class="sugg-group">
      <div class="sugg-group-label">Speaking</div>
      <div class="sugg-chips">
        {#each suggestions.speaking as suggestion}
          {@const added = isSuggestionAdded(suggestion)}
          <MisButton variant="unstyled" size="none" type="button" className={`sugg-chip ${added ? 'added' : ''}`} disabled={added} onclick={() => addSuggestion(suggestion)}>
            {#if added}
              <svg class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            {/if}
            {suggestion.name}
          </MisButton>
        {/each}
      </div>
    </div>

    <div class="sugg-divider"></div>
    <MisButton variant="unstyled" size="none" type="button" className="btn-custom-goal" onclick={() => openCreateModal()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      Write your own goal
    </MisButton>
  </section>
</section>

<div
  class={`modal-backdrop ${showCreateModal ? 'open' : ''}`}
  onclick={(e) => e.target === e.currentTarget && closeCreateModal()}
  onkeydown={onModalBackdropKeydown}
  role="button"
  tabindex="-1"
  aria-label="Close add goal modal"
>
  <div class="modal-sheet">
    <div class="modal-drag"></div>
    <h2 class="modal-title">Add a goal</h2>
    <p class="modal-sub">Keep it simple. You can always add more later.</p>

    <div class="type-toggle">
      <MisButton variant="unstyled" size="none" type="button" className={`type-btn ${createType === 'checkbox' ? 'active' : ''}`} onclick={() => (createType = 'checkbox')}>
        <div class="type-btn-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Do it once
        </div>
        <div class="type-btn-desc">Check it off when done</div>
      </MisButton>

      <MisButton variant="unstyled" size="none" type="button" className={`type-btn ${createType === 'count' ? 'active' : ''}`} onclick={() => (createType = 'count')}>
        <div class="type-btn-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          Do it X times
        </div>
        <div class="type-btn-desc">Track progress toward a number</div>
      </MisButton>
    </div>

    <div class="field">
      <label for="goal-name">What do you want to do?</label>
      <MisInput id="goal-name" variant="unstyled" bind:value={goalName} type="text" className="field-input" placeholder="e.g. Watch an episode of Ros na Rún" />
    </div>

    <div class="count-row">
      <div class={`field count-field ${createType === 'count' ? 'visible' : ''}`}>
        <label for="goal-target">How many times?</label>
        <MisInput id="goal-target" variant="unstyled" bind:value={goalTarget} type="number" min="1" max="100" className="field-input" />
      </div>

      <div class={`field count-field ${createType === 'count' ? 'visible' : ''}`}>
        <label for="goal-period">By when?</label>
        <MisSelect id="goal-period" variant="unstyled" bind:value={goalPeriod} className="field-input">
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="ongoing">Ongoing</option>
        </MisSelect>
      </div>
    </div>

    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}

    <div class="modal-actions">
      <MisButton variant="unstyled" size="none" type="button" className="btn-cancel" onclick={closeCreateModal}>Cancel</MisButton>
      <MisButton variant="unstyled" size="none" type="button" className="btn-confirm" onclick={createGoal}>Add goal</MisButton>
    </div>
  </div>
</div>

<div class={`toast ${toastVisible ? 'show' : ''}`} role="status" aria-live="polite">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  <span>{toastText}</span>
</div>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: var(--parchment, #f5f0e8);
    color: var(--ink, #1a1a18);
    font-family: 'Instrument Sans', sans-serif;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --forest-l: #3a5a44;
    --green: #2d7a50;
    --sage: #7ec99a;
    --sage-l: #a8dbb8;
    --parchment: #f5f0e8;
    --parch-dark: #e8e0d0;
    --parch-mid: #ede7da;
    --muted: #5a7a64;
    --ink: #1a1a18;
    --ink-l: #3a3a36;

    max-width: 640px;
    margin: 0 auto;
    padding: 0 20px 100px;
  }

  .top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0 0;
  }

  :global(.nav-back) {
    display: flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
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

  .hero {
    border-radius: 20px;
    background: var(--forest);
    padding: 28px 28px 24px;
    margin: 20px 0 24px;
  }

  .hero-eyebrow {
    color: var(--sage);
    opacity: 0.8;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .hero-title {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 18px;
  }

  .week-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .week-label {
    color: rgba(245, 240, 232, 0.35);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin-right: 4px;
  }

  .w-dot {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .w-dot.done {
    background: rgba(126, 201, 154, 0.18);
    color: var(--sage);
  }

  .w-dot.today {
    background: var(--sage);
    color: var(--forest);
  }

  .w-dot.upcoming {
    background: rgba(245, 240, 232, 0.06);
    color: rgba(245, 240, 232, 0.25);
  }

  .hero-stats {
    display: flex;
    gap: 20px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid rgba(245, 240, 232, 0.08);
  }

  .hs-num {
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .hs-num.green {
    color: var(--sage);
  }

  .hs-label {
    color: rgba(245, 240, 232, 0.35);
    font-size: 11px;
    margin-top: 2px;
  }

  .error-banner {
    border: 1px solid #e3bbbb;
    background: #fff2f2;
    color: #8a2323;
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 12px;
    margin-bottom: 14px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .section-title {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .section-sub {
    color: var(--muted);
    font-size: 13px;
    margin-top: 1px;
  }

  :global(.section-action) {
    color: var(--green);
    border: none;
    background: none;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
  }

  .goal-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .personal-goal {
    border: 1.5px solid var(--parch-dark);
    border-radius: 14px;
    background: #fff;
    padding: 16px 18px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    animation: fadeUp 0.25s ease both;
  }

  .personal-goal.done-goal {
    opacity: 0.55;
  }

  :global(.goal-check) {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 2px solid var(--parch-dark);
    background: transparent;
    padding: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  :global(.goal-check.checked) {
    background: var(--green);
    border-color: var(--green);
  }

  :global(.goal-check svg) {
    width: 12px;
    height: 12px;
    color: #fff;
    stroke-width: 3;
    opacity: 0;
  }

  :global(.goal-check.checked svg) {
    opacity: 1;
  }

  .goal-count-ring {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    margin-top: -2px;
  }

  .goal-count-ring svg {
    width: 36px;
    height: 36px;
    transform: rotate(-90deg);
  }

  .cr-bg {
    fill: none;
    stroke: var(--parch-dark);
    stroke-width: 3;
  }

  .cr-fill {
    fill: none;
    stroke: var(--sage);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.4s ease;
  }

  .cr-fill.done {
    stroke: var(--green);
  }

  .cr-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--forest);
    font-size: 8px;
    font-weight: 700;
  }

  .goal-body {
    min-width: 0;
    flex: 1;
  }

  .goal-name {
    color: var(--forest);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 3px;
  }

  .goal-name.done-text {
    text-decoration: line-through;
    color: var(--muted);
  }

  .goal-meta {
    color: var(--muted);
    font-size: 12px;
  }

  .goal-actions-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    margin-top: 1px;
  }

  :global(.btn-count-log) {
    background: none;
    border: 1.5px solid rgba(45, 122, 80, 0.2);
    border-radius: 999px;
    padding: 4px 10px;
    color: var(--green);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  :global(.btn-remove) {
    border: none;
    background: none;
    color: #ccc;
    font-size: 11px;
    padding: 0;
    cursor: pointer;
  }

  .personal-empty {
    border: 1.5px dashed var(--parch-dark);
    border-radius: 14px;
    background: #fff;
    padding: 28px 20px;
    text-align: center;
  }

  .personal-empty p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
  }

  :global(.milestone-toggle) {
    display: flex;
    align-items: center;
    gap: 7px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
  }

  .mt-title {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .mt-chevron {
    width: 18px;
    height: 18px;
    color: var(--muted);
    transition: transform 0.2s;
  }

  :global(.milestone-toggle.open) .mt-chevron {
    transform: rotate(90deg);
  }

  .mt-sub {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .milestone-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .milestone-card {
    border: 1.5px solid var(--parch-dark);
    border-radius: 14px;
    background: #fff;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    animation: fadeUp 0.25s ease both;
  }

  .m-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    flex-shrink: 0;
  }

  .m-body {
    min-width: 0;
    flex: 1;
  }

  .m-name {
    color: var(--forest);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 6px;
  }

  .m-track {
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--parch-dark);
    margin-bottom: 4px;
  }

  .m-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--sage);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .m-fill.done {
    background: var(--green);
  }

  .m-meta {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 11px;
  }

  .m-pct {
    color: var(--green);
    font-weight: 600;
  }

  .m-badge {
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .badge-on-track {
    background: rgba(45, 122, 80, 0.1);
    color: var(--green);
  }

  .badge-next {
    background: var(--parch-dark);
    color: var(--muted);
  }

  .badge-done {
    background: rgba(45, 122, 80, 0.08);
    color: var(--green);
  }

  .suggestions-section {
    border: 1.5px solid var(--parch-dark);
    border-radius: 16px;
    background: var(--parch-mid);
    padding: 18px 20px;
  }

  .sugg-title {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 3px;
  }

  .sugg-sub {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 14px;
  }

  .sugg-group {
    margin-bottom: 14px;
  }

  .sugg-group:last-child {
    margin-bottom: 0;
  }

  .sugg-group-label {
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .sugg-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  :global(.sugg-chip) {
    border: 1.5px solid var(--parch-dark);
    border-radius: 999px;
    background: #fff;
    padding: 7px 14px;
    color: var(--forest);
    font-size: 13px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  :global(.sugg-chip.added) {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.08);
    color: var(--green);
    cursor: default;
  }

  :global(.sugg-chip svg) {
    width: 13px;
    height: 13px;
  }

  .chip-check {
    color: var(--green);
  }

  .sugg-divider {
    height: 1px;
    background: var(--parch-dark);
    margin: 14px 0;
  }

  :global(.btn-custom-goal) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: none;
    background: none;
    color: var(--green);
    font-size: 13px;
    font-weight: 700;
    padding: 0;
    cursor: pointer;
  }

  :global(.btn-custom-goal svg) {
    width: 15px;
    height: 15px;
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
    pointer-events: auto;
  }

  .modal-sheet {
    width: 100%;
    max-width: 640px;
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
    border-radius: 2px;
    background: var(--parch-dark);
    margin: 14px auto 22px;
  }

  .modal-title {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.03em;
    margin-bottom: 4px;
  }

  .modal-sub {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .type-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 18px;
  }

  :global(.type-btn) {
    border: 1.5px solid var(--parch-dark);
    border-radius: 12px;
    background: #fff;
    padding: 12px 16px;
    text-align: left;
    cursor: pointer;
  }

  :global(.type-btn.active) {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.05);
  }

  .type-btn-label {
    color: var(--forest);
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .type-btn-label svg {
    width: 14px;
    height: 14px;
    color: var(--green);
  }

  .type-btn-desc {
    color: var(--muted);
    font-size: 11px;
  }

  .field {
    margin-bottom: 14px;
  }

  .field label {
    display: block;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  :global(.field-input) {
    width: 100%;
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    background: #fff;
    padding: 11px 14px;
    color: var(--ink);
    font-size: 14px;
  }

  .count-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .count-field {
    display: none;
  }

  .count-field.visible {
    display: block;
  }

  .form-error {
    color: #9a2424;
    font-size: 12px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  :global(.btn-cancel) {
    border: 1.5px solid var(--parch-dark);
    border-radius: 10px;
    background: none;
    padding: 11px 20px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  :global(.btn-confirm) {
    border: none;
    border-radius: 10px;
    background: var(--forest);
    padding: 11px 24px;
    color: var(--parchment);
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    cursor: pointer;
  }

  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 8px;
    transform: translateX(-50%) translateY(16px);
    border-radius: 999px;
    background: var(--forest);
    padding: 10px 20px;
    color: var(--parchment);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s, transform 0.2s;
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

  @media (max-width: 640px) {
    .wrap {
      padding-left: 16px;
      padding-right: 16px;
    }

    .hero {
      padding: 22px 18px;
    }

    .hero-stats {
      flex-wrap: wrap;
      gap: 14px;
    }

    .count-row,
    .type-toggle {
      grid-template-columns: 1fr;
    }

    .personal-goal {
      gap: 10px;
      padding: 14px;
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
