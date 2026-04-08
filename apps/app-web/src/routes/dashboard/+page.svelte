<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { clearAuthSession } from '$lib/mobile/session-storage';
  import {
    MisButton,
    MisCard,
    MisInput,
    MisSectionHeader,
    MisSidebarCard,
  } from '@decyphr/misneach-ui';
  import AppModal from '$lib/components/ui/AppModal.svelte';
  import { compareLessonsByHierarchy } from '$lib/course-order';
  import { readDashboardCache, writeDashboardCache } from '$lib/stores/dashboard-cache';

  type LessonItem = {
    lessonSlug: string;
    lessonTitle: string;
    estimatedMinutes: number;
    summary?: string | null;
    progress: {
      status: 'not_started' | 'in_progress' | 'completed';
      progressPercent: number;
      lastBlockId: string | null;
      lastSeenAt?: string | null;
    };
  };

  type CourseItem = {
    courseSlug: string;
    courseTitle: string;
    summary?: string;
    lessons: LessonItem[];
    summaryProgress: {
      completedLessons: number;
      totalLessons: number;
      percent: number;
    };
  };

  type PhraseHealthRow = {
    irish: string;
    english: string;
    pct: number;
    fillClass: 'fill-strong' | 'fill-mid' | 'fill-weak';
  };

  type GoalPreviewItem = {
    id: string;
    name: string;
    typeLabel: string;
    current: number;
    target: number;
    pct: number;
    isComplete: boolean;
  };

  type DashboardViewState = {
    journeyCourse: CourseItem | null;
    journeyLessons: LessonItem[];
    nextLessonIndex: number;
    phraseHealthRows: PhraseHealthRow[];
    flashcardPreview: Array<{ irish: string; meta: string; due: boolean }>;
    goalsPreview: GoalPreviewItem[];
    activeGoalsCount: number;
    duePracticeCount: number;
    dueFlashcardCount: number;
    streakDays: number;
  };

  let journeyLoading = true;
  let phraseLoading = true;
  let flashcardsLoading = true;
  let goalsLoading = true;

  let journeyError = '';
  let phraseError = '';
  let flashcardsError = '';
  let goalsError = '';

  let journeyCourse: CourseItem | null = null;
  let journeyLessons: LessonItem[] = [];
  let nextLessonIndex = 0;
  let unitLessons: LessonItem[] = [];
  let unitNextLessonIndex = 0;
  let currentUnitNumber: number | null = null;

  let phraseHealthRows: PhraseHealthRow[] = [];

  let flashcardPreview: Array<{ irish: string; meta: string; due: boolean }> = [];
  let goalsPreview: GoalPreviewItem[] = [];
  let activeGoalsCount = 0;
  let goalsLoggedIds = new Set<string>();
  let duePracticeCount = 0;
  let dueFlashcardCount = 0;

  let streakDays = 0;
  let showChallengeDone = false;
  let challengeId = '';
  let challengeLoading = true;
  let challengeSaving = false;
  let challengeError = '';
  let profileMenuOpen = false;
  let profileModalOpen = false;
  let profileName = '';
  let profileDraftName = '';
  let profileClientId = '';
  let profileEmail = '';
  let profileMenuEl: HTMLDivElement | null = null;
  let toastMessage = '';
  let toastVisible = false;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const PROFILE_STORAGE_PREFIX = 'dashboard-profile:';
  const GOALS_RING_RADIUS = 14;
  const GOALS_RING_CIRCUMFERENCE = 2 * Math.PI * GOALS_RING_RADIUS;

  function lessonHref(course: CourseItem, lesson: LessonItem) {
    const base = `/dashboard/courses/${course.courseSlug}/${lesson.lessonSlug}`;
    return lesson.progress.lastBlockId ? `${base}#${lesson.progress.lastBlockId}` : base;
  }

  function firstOpenLessonIndex(lessons: LessonItem[]) {
    const idx = lessons.findIndex((lesson) => lesson.progress.status !== 'completed');
    return idx === -1 ? Math.max(0, lessons.length - 1) : idx;
  }

  function unitNumberFromLessonSlug(lessonSlug: string) {
    const match = /(?:^|-)lesson-(\d+)-/.exec(String(lessonSlug || ''));
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function unitScopedLessons(lessons: LessonItem[], lessonIndex: number) {
    if (!lessons.length) {
      return {
        unitNumber: null as number | null,
        lessons: [] as LessonItem[],
        nextIndex: 0,
      };
    }

    const anchor = lessons[Math.max(0, Math.min(lessonIndex, lessons.length - 1))] || lessons[0];
    const anchorUnit = unitNumberFromLessonSlug(anchor.lessonSlug);

    if (!anchorUnit) {
      const fallback = lessons.slice(0, 12);
      return {
        unitNumber: null as number | null,
        lessons: fallback,
        nextIndex: firstOpenLessonIndex(fallback),
      };
    }

    const scoped = lessons.filter((lesson) => unitNumberFromLessonSlug(lesson.lessonSlug) === anchorUnit);
    const safeScoped = scoped.length ? scoped : lessons.slice(0, 12);
    return {
      unitNumber: anchorUnit,
      lessons: safeScoped,
      nextIndex: firstOpenLessonIndex(safeScoped),
    };
  }

  $: {
    const scoped = unitScopedLessons(journeyLessons, nextLessonIndex);
    currentUnitNumber = scoped.unitNumber;
    unitLessons = scoped.lessons;
    unitNextLessonIndex = scoped.nextIndex;
  }

  function latestLessonTimestamp(lessons: LessonItem[]) {
    let latest = 0;
    for (const lesson of lessons) {
      const stamp = lesson?.progress?.lastSeenAt ? new Date(lesson.progress.lastSeenAt).getTime() : 0;
      if (Number.isFinite(stamp) && stamp > latest) latest = stamp;
    }
    return latest;
  }

  function hasInProgressLesson(course: CourseItem) {
    return course.lessons.some((lesson) => lesson.progress.status === 'in_progress');
  }

  function selectCurrentJourneyCourse(courses: CourseItem[]) {
    if (!courses.length) return null;

    const withInProgress = courses.filter(hasInProgressLesson);
    if (withInProgress.length) {
      return withInProgress.sort((a, b) => latestLessonTimestamp(b.lessons) - latestLessonTimestamp(a.lessons))[0];
    }

    const withActivity = courses.filter((course) => latestLessonTimestamp(course.lessons) > 0);
    if (withActivity.length) {
      return withActivity.sort((a, b) => latestLessonTimestamp(b.lessons) - latestLessonTimestamp(a.lessons))[0];
    }

    return (
      courses.find((course) => course.lessons.some((lesson) => lesson.progress.status !== 'completed')) ||
      courses[0]
    );
  }

  function pctClass(pct: number): PhraseHealthRow['fillClass'] {
    if (pct >= 75) return 'fill-strong';
    if (pct >= 45) return 'fill-mid';
    return 'fill-weak';
  }

  function startOfLocalDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function estimateStreak(lessons: LessonItem[]) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const activeDays = new Set<number>();

    for (const lesson of lessons) {
      const lastSeenAt = lesson.progress.lastSeenAt;
      if (!lastSeenAt) continue;
      const seen = new Date(lastSeenAt);
      if (Number.isNaN(seen.getTime())) continue;
      activeDays.add(startOfLocalDay(seen).getTime());
    }

    if (activeDays.size === 0) return 0;

    const today = startOfLocalDay(new Date()).getTime();
    const yesterday = today - oneDayMs;
    let cursor = today;

    // No streak unless learner was active today or yesterday.
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

  function snapshotDashboardState(): DashboardViewState {
    return {
      journeyCourse,
      journeyLessons,
      nextLessonIndex,
      phraseHealthRows,
      flashcardPreview,
      goalsPreview,
      activeGoalsCount,
      duePracticeCount,
      dueFlashcardCount,
      streakDays,
    };
  }

  function applyDashboardState(state: DashboardViewState) {
    journeyCourse = state.journeyCourse;
    journeyLessons = state.journeyLessons;
    nextLessonIndex = state.nextLessonIndex;
    phraseHealthRows = state.phraseHealthRows;
    flashcardPreview = state.flashcardPreview;
    goalsPreview = Array.isArray(state.goalsPreview) ? state.goalsPreview : [];
    activeGoalsCount = Math.max(0, Number(state.activeGoalsCount || 0));
    duePracticeCount = state.duePracticeCount;
    dueFlashcardCount = state.dueFlashcardCount;
    streakDays = Math.max(0, Number(state.streakDays || 0));
  }

  function saveDashboardCache() {
    writeDashboardCache('dashboard:main', { data: snapshotDashboardState(), cachedAt: Date.now() });
  }

  function showToast(message: string) {
    toastMessage = message;
    toastVisible = true;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 2200);
  }

  async function readError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  async function loadJourneySection() {
    journeyLoading = true;
    journeyError = '';
    try {
      const catalogRes = await apiFetch('/api/proxy/courses/catalog', { cache: 'no-store' });
      if (!catalogRes.ok) throw new Error('Failed to load your course journey.');

      const catalogPayload = await catalogRes.json();
      const courses = ((catalogPayload?.courses ?? []) as CourseItem[]).slice();
      const selected = selectCurrentJourneyCourse(courses);

      journeyCourse = selected;
      journeyLessons = (selected?.lessons ?? []).slice().sort(compareLessonsByHierarchy);
      nextLessonIndex = firstOpenLessonIndex(journeyLessons);
      streakDays = estimateStreak(
        courses.flatMap((course) => (Array.isArray(course.lessons) ? course.lessons : [])),
      );
      saveDashboardCache();
    } catch (err) {
      journeyError = err instanceof Error ? err.message : 'Failed to load your course journey.';
    } finally {
      journeyLoading = false;
    }
  }

  async function loadPhraseSection() {
    phraseLoading = true;
    phraseError = '';
    try {
      const phraseHealthRes = await apiFetch('/api/proxy/practice/phrase-health?limit=5&lookbackDays=30', {
        cache: 'no-store',
      });

      if (!phraseHealthRes.ok) {
        throw new Error('Failed to load phrase health.');
      }

      const payload = await phraseHealthRes.json();
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      duePracticeCount = Number.isFinite(Number(payload?.duePhraseCount))
        ? Math.max(0, Number(payload.duePhraseCount))
        : 0;

      phraseHealthRows = rows
        .map((row: any) => {
          const pct = Math.max(0, Math.min(100, Math.round(Number(row?.pct) || 0)));
          const irish = String(row?.irish || '').trim();
          const english = String(row?.english || '').trim();
          if (!irish || !english) return null;
          return {
            irish,
            english,
            pct,
            fillClass: pctClass(pct),
          } as PhraseHealthRow;
        })
        .filter(Boolean) as PhraseHealthRow[];

      saveDashboardCache();
    } catch (err) {
      phraseError = err instanceof Error ? err.message : 'Failed to load phrase health.';
      phraseHealthRows = [];
      duePracticeCount = 0;
    } finally {
      phraseLoading = false;
    }
  }

  async function loadFlashcardsSection() {
    flashcardsLoading = true;
    flashcardsError = '';
    try {
      const flashcardsHealthRes = await apiFetch('/api/proxy/flashcards/health?limit=5&lookbackDays=30',
        { cache: 'no-store' },
      );

      if (flashcardsHealthRes.ok) {
        const payload = await flashcardsHealthRes.json();
        dueFlashcardCount = Number.isFinite(Number(payload?.dueCardCount))
          ? Math.max(0, Number(payload.dueCardCount))
          : 0;

        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        flashcardPreview = rows
          .map((row: any) => {
            const front = String(row?.front || '').trim();
            const pct = Math.max(0, Math.min(100, Math.round(Number(row?.pct) || 0)));
            const due = Boolean(row?.due);
            if (!front) return null;
            return {
              irish: front,
              meta: due ? `Due · ${pct}%` : `${pct}%`,
              due,
            };
          })
          .filter(Boolean) as Array<{ irish: string; meta: string; due: boolean }>;
      } else {
        // Backward-compatible fallback for environments where /flashcards/health is not deployed yet.
        const dueRes = await apiFetch('/api/proxy/flashcards/study/due?limit=5', { cache: 'no-store' });
        if (!dueRes.ok) throw new Error('Failed to load flashcards.');
        const dueCards = await dueRes.json();
        const items = Array.isArray(dueCards) ? dueCards : [];
        dueFlashcardCount = items.length;
        flashcardPreview = items
          .map((row: any) => {
            const front = String(row?.front || '').trim();
            if (!front) return null;
            return {
              irish: front,
              meta: 'Due',
              due: true,
            };
          })
          .filter(Boolean) as Array<{ irish: string; meta: string; due: boolean }>;
      }
      saveDashboardCache();
    } catch (err) {
      flashcardsError = err instanceof Error ? err.message : 'Failed to load flashcards.';
      flashcardPreview = [];
      dueFlashcardCount = 0;
    } finally {
      flashcardsLoading = false;
    }
  }

  function goalTypeLabel(goal: any): string {
    const targetType = String(goal?.targetType || '').toLowerCase();
    const periodType = String(goal?.periodType || '').toLowerCase();
    if (targetType === 'unit_count' || periodType === 'custom') return 'Milestone';
    if (targetType === 'session_count' && Number(goal?.targetValue) <= 7) return 'Daily';
    if (periodType === 'weekly') return 'Weekly';
    if (periodType === 'monthly') return 'Monthly';
    if (periodType === 'yearly') return 'Yearly';
    return 'Goal';
  }

  function toGoalPreview(goal: any): GoalPreviewItem | null {
    const id = String(goal?.id || '').trim();
    const name = String(goal?.title || '').trim();
    if (!id || !name) return null;

    const current = Math.max(0, Number(goal?.progress?.achieved || 0));
    const targetRaw = Number(goal?.progress?.target ?? goal?.targetValue ?? 0);
    const target = Number.isFinite(targetRaw) ? Math.max(1, Math.round(targetRaw)) : 1;
    const pct = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          Number(goal?.progress?.percent) ||
            (target > 0 ? (current / target) * 100 : 0),
        ),
      ),
    );
    const isComplete = Boolean(goal?.progress?.isComplete) || String(goal?.status || '') === 'completed';

    return {
      id,
      name,
      typeLabel: goalTypeLabel(goal),
      current,
      target,
      pct,
      isComplete,
    };
  }

  function goalRingOffset(pct: number): string {
    const clamped = Math.max(0, Math.min(100, pct));
    return (GOALS_RING_CIRCUMFERENCE * (1 - clamped / 100)).toFixed(2);
  }

  async function loadGoalsSection() {
    goalsLoading = true;
    goalsError = '';
    try {
      const res = await apiFetch('/api/proxy/goals', { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load goals'));

      const payload = await res.json();
      const rows = Array.isArray(payload) ? payload : [];
      const active = rows.filter((goal: any) => String(goal?.status || '') !== 'archived');
      activeGoalsCount = active.length;
      goalsPreview = active
        .map((goal: any) => toGoalPreview(goal))
        .filter(Boolean)
        .slice(0, 3) as GoalPreviewItem[];
      saveDashboardCache();
    } catch (err) {
      goalsError = err instanceof Error ? err.message : 'Failed to load goals.';
      goalsPreview = [];
      activeGoalsCount = 0;
    } finally {
      goalsLoading = false;
    }
  }

  async function loadChallengeSection() {
    challengeLoading = true;
    challengeError = '';
    try {
      const res = await apiFetch('/api/proxy/challenges', { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load challenge'));

      const payload = await res.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const selected =
        items.find((item: any) => String(item?.type || '') === 'real_world_phrase_use') ||
        items[0] ||
        null;

      challengeId = String(selected?.id || '').trim();
      showChallengeDone = String(selected?.status || '') === 'completed';
      if (!challengeId) {
        challengeError = 'No challenge is available yet. Complete a lesson to unlock one.';
      }
    } catch (err) {
      challengeError = err instanceof Error ? err.message : 'Failed to load challenge.';
    } finally {
      challengeLoading = false;
    }
  }

  async function logGoalProgress(goalId: string) {
    if (!goalId || goalsLoggedIds.has(goalId)) return;
    const res = await fetch(`/api/proxy/goals/${goalId}/checkoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 }),
    });

    if (!res.ok) {
      goalsError = await readError(res, 'Failed to log goal progress.');
      showToast('Unable to log goal right now');
      return;
    }

    goalsError = '';
    goalsLoggedIds = new Set([...goalsLoggedIds, goalId]);
    showToast('Goal logged');
    await loadGoalsSection();
  }

  async function loadDashboard() {
    const cached = readDashboardCache('dashboard:main');
    if (cached) {
      applyDashboardState(cached.data as DashboardViewState);
      journeyLoading = false;
      phraseLoading = false;
      flashcardsLoading = false;
      goalsLoading = false;
    }

    void loadJourneySection();
    void loadPhraseSection();
    void loadFlashcardsSection();
    void loadGoalsSection();
    void loadChallengeSection();
  }

  function nextLessonHref() {
    if (!journeyCourse || !journeyLessons.length) {
      return '/dashboard/courses?view=all';
    }

    const lesson = journeyLessons[nextLessonIndex] || journeyLessons[journeyLessons.length - 1];
    return lessonHref(journeyCourse, lesson);
  }

  function nextLessonDescription() {
    const lesson = journeyLessons[nextLessonIndex];
    const summary = String(lesson?.summary || '').trim();
    if (summary) return summary;
    return 'Continue your next lesson to build confidence with practical, everyday Irish.';
  }

  async function markChallengeDone() {
    if (showChallengeDone || challengeSaving || !challengeId) return;

    challengeSaving = true;
    challengeError = '';
    try {
      const res = await fetch(`/api/proxy/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Failed to save challenge completion'));
      }

      showChallengeDone = true;
      showToast('Challenge completed');
    } catch (err) {
      challengeError = err instanceof Error ? err.message : 'Failed to save challenge completion.';
      showToast('Unable to save challenge');
    } finally {
      challengeSaving = false;
    }
  }

  function capitalize(value: string) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function emailFallbackName(email: string) {
    const local = String(email || '').split('@')[0] || '';
    const chunks = local
      .replace(/[._-]+/g, ' ')
      .split(/\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(capitalize);

    return chunks.join(' ').trim();
  }

  function profileStorageKey() {
    return profileClientId ? `${PROFILE_STORAGE_PREFIX}${profileClientId}` : '';
  }

  function greetingName() {
    const explicit = profileName.trim();
    if (explicit) return explicit;
    const fallback = emailFallbackName(profileEmail);
    if (fallback) return fallback;
    return 'a chara';
  }

  function avatarInitials() {
    const source = greetingName();
    const parts = source
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }

  async function loadProfileContext() {
    try {
      const res = await apiFetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      profileClientId = String(payload?.clientId || '').trim();
      profileEmail = String(payload?.email || '').trim();
    } catch {
      profileClientId = '';
      profileEmail = '';
    }

    const key = profileStorageKey();
    if (!key) return;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      profileName = String(parsed?.displayName || '').trim();
    } catch {
      profileName = '';
    }
  }

  function persistProfileName() {
    const key = profileStorageKey();
    if (!key) return;

    const value = profileName.trim();
    if (!value) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify({ displayName: value }));
  }

  function openProfileModal() {
    profileDraftName = profileName;
    profileModalOpen = true;
    profileMenuOpen = false;
  }

  function closeProfileModal() {
    profileModalOpen = false;
  }

  function saveProfileName() {
    profileName = profileDraftName.trim().slice(0, 64);
    persistProfileName();
    profileModalOpen = false;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await clearAuthSession();
    await goto('/auth/login');
  }

  function onWindowClick(event: MouseEvent) {
    if (!profileMenuOpen) return;
    const target = event.target as Node | null;
    if (target && profileMenuEl?.contains(target)) return;
    profileMenuOpen = false;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      profileMenuOpen = false;
    }
  }

  onMount(() => {
    loadDashboard();
    loadProfileContext();
  });

  onDestroy(() => {
    if (toastTimer) clearTimeout(toastTimer);
  });
</script>

<svelte:head>
  <title>Dashboard — Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<section class="dashboard-shell">
  {#if journeyError}
    <div class="journey-error-banner">{journeyError}</div>
  {/if}

  <div class="page">
      <header class="page-header fade-up">
        <div class="greeting">
          <span class="greeting-label">Fáilte ar ais · Welcome back</span>
          <div class="greeting-name">Dia <em>duit,</em> {greetingName()}.</div>
          <div class="greeting-sub">
            {#if journeyLoading}
              Loading your course progress...
            {:else}
            {#if journeyCourse && journeyLessons.length}
              You're on lesson {Math.min(nextLessonIndex + 1, journeyLessons.length)} of {journeyLessons.length} — {journeyCourse.courseTitle}
            {:else}
              Pick a course to begin
            {/if}
            {/if}
          </div>
        </div>
        <div class="header-streak">
          <span class="streak-num">{streakDays}</span>
          <span class="streak-label">{streakDays === 1 ? 'day in a row' : 'days in a row'}</span>
        </div>
      </header>

      <main class="main-col">
        <MisCard tone="dark" className="next-up fade-up" padded={false}>
          <a class="next-up-click" href={nextLessonHref()}>
            <div class="next-tag">Next up</div>
            <div class="next-lesson-title">
              {#if journeyLoading}
                Loading <em>lesson...</em>
              {:else if journeyLessons[nextLessonIndex]?.lessonTitle}
                {journeyLessons[nextLessonIndex]?.lessonTitle}
              {:else}
                Payment & <em>cárta nó airgead</em>
              {/if}
            </div>
            <div class="next-desc">
              {nextLessonDescription()}
            </div>
            <div class="next-meta">
              <span class="next-btn">Tosaigh - Begin</span>
              <span class="next-lesson-num">
                Lesson {Math.min(nextLessonIndex + 1, journeyLessons.length || 1)} of {journeyLessons.length || 12} · ~{journeyLessons[nextLessonIndex]?.estimatedMinutes || 6} min
              </span>
            </div>
          </a>
        </MisCard>

        <section class="fade-up">
          <div class="section-head">
            <MisSectionHeader
              className="unit-heading"
              headline={`${journeyCourse?.courseTitle || 'Coffee Shop'}${
                currentUnitNumber ? ` <em>Unit ${currentUnitNumber}</em>` : ''
              }`}
            />
            <a href="/dashboard/courses?view=all" class="section-link">All courses -></a>
          </div>

          <div class="lessons-grid">
            {#if unitLessons.length}
              {#each unitLessons as lesson, index}
                {@const isDone = lesson.progress.status === 'completed'}
                {@const isActive = index === unitNextLessonIndex && !isDone}
                {@const isLocked = !isDone && !isActive}
                {@const cardClass = isDone ? 'done' : isActive ? 'active' : 'locked'}
                {@const lessonNumber = String(index + 1).padStart(2, '0')}

                {#if isLocked}
                  <div class={`lesson-pip ${cardClass}`}>
                    <span class="lesson-pip-num">{lessonNumber}</span>
                    <span class="lesson-pip-name">{lesson.lessonTitle}</span>
                  </div>
                {:else}
                  <a
                    href={journeyCourse ? lessonHref(journeyCourse, lesson) : '/dashboard/courses?view=all'}
                    class={`lesson-pip ${cardClass}`}
                    aria-label={`Open lesson ${lessonNumber}: ${lesson.lessonTitle}`}
                  >
                    <span class="lesson-pip-num">{lessonNumber}</span>
                    <span class="lesson-pip-name">{lesson.lessonTitle}</span>
                    {#if isDone}
                      <div class="lesson-pip-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    {/if}
                  </a>
                {/if}
              {/each}
            {:else}
              {#each Array.from({ length: 12 }) as _, index}
                <div class="lesson-pip locked">
                  <span class="lesson-pip-num">{String(index + 1).padStart(2, '0')}</span>
                  <span class="lesson-pip-name">Lesson {index + 1}</span>
                </div>
              {/each}
            {/if}
          </div>
        </section>

        <MisCard tone="paper" className="challenge-card fade-up" padded={false}>
          {#if challengeLoading}
            <div class="challenge-complete">
              <div class="challenge-complete-title">Loading challenge…</div>
              <div class="challenge-complete-body">
                Pulling your latest completion status.
              </div>
            </div>
          {:else if showChallengeDone}
            <div class="challenge-complete">
              <div class="challenge-complete-title">Maith thú. <em>Well done.</em></div>
              <div class="challenge-complete-body">
                You did the hard part. The next one will be easier because you've already proved you can do it.
              </div>
            </div>
          {:else}
            <div class="challenge-tag">
              <span class="challenge-dot"></span>
              Dúshlán — Real World Challenge
            </div>
            <div class="challenge-headline">Use one phrase. Once. Out loud.</div>
            <div class="challenge-body">
              You don't need to be fluent. You don't need to have a full conversation. Just use <em>one</em> phrase next time you're in a café, shop, or passing someone on the street. <strong>The discomfort is the lesson.</strong>
            </div>
            <div class="challenge-phrase">
              <span class="challenge-phrase-irish">Go raibh maith agat</span>
              <span class="challenge-phrase-pron">Guh rev mah ah-gut</span>
            </div>
            <div class="challenge-actions">
              <MisButton className="challenge-done-btn" size="sm" onclick={markChallengeDone} disabled={challengeSaving || !challengeId}>
                {challengeSaving ? 'Saving...' : '✓ I did it'}
              </MisButton>
              <a class="challenge-later" href="/dashboard/practice">Remind me later</a>
            </div>
            {#if challengeError}
              <div class="card-error">{challengeError}</div>
            {/if}
          {/if}
        </MisCard>
      </main>

      <aside class="sidebar">
        <MisSidebarCard title="Phrase health" subtitle="Based on your recent practice" className="fade-up">
          {#if phraseLoading}
            <div class="card-loading">Syncing phrase health…</div>
          {/if}
          {#if phraseHealthRows.length > 0}
            <div class="phrase-health-list">
              {#each phraseHealthRows as row}
                <div class="phrase-row">
                  <div>
                    <div class="phrase-row-irish">{row.irish}</div>
                    <div class="phrase-row-eng">{row.english}</div>
                  </div>
                  <div class="phrase-health-bar">
                    <div class={`phrase-health-fill ${row.fillClass}`} style={`width:${row.pct}%`}></div>
                  </div>
                  <div class="phrase-health-pct">{row.pct}%</div>
                </div>
              {/each}
            </div>
          {:else if !phraseLoading && !phraseError}
            <div class="card-loading">Complete a few practice attempts to build phrase health.</div>
          {/if}
          {#if phraseError}
            <div class="card-error">{phraseError}</div>
          {/if}
          <div class="practice-nudge">
            <div class="practice-nudge-text"><strong>{duePracticeCount}</strong> phrases need attention</div>
            <MisButton href="/dashboard/practice" className="practice-btn" size="sm">Practice now</MisButton>
          </div>
        </MisSidebarCard>

        <section class="goals-card fade-up" aria-label="Goals">
          <div class="goals-card-head">
            <div class="goals-card-title">
              <span class="goals-icon">🎯</span>
              <span class="goals-title-text">Goals</span>
            </div>
            <a href="/dashboard/goals" class="goals-view-all">
              View all
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
          </div>

          <div class="goals-list">
            {#if goalsLoading}
              <div class="card-loading">Syncing goals…</div>
            {:else if goalsPreview.length > 0}
              {#each goalsPreview as goal}
                <div class="goal-row">
                  <div class="ring" aria-hidden="true">
                    <svg viewBox="0 0 32 32">
                      <circle class="ring-bg" cx="16" cy="16" r={GOALS_RING_RADIUS}></circle>
                      <circle
                        class={`ring-fill ${goal.isComplete ? 'done' : ''}`}
                        cx="16"
                        cy="16"
                        r={GOALS_RING_RADIUS}
                        stroke-dasharray={GOALS_RING_CIRCUMFERENCE.toFixed(2)}
                        stroke-dashoffset={goalRingOffset(goal.pct)}
                      ></circle>
                    </svg>
                    <div class="ring-label">{goal.pct}%</div>
                  </div>

                  <div class="goal-row-text">
                    <div class="goal-row-name">{goal.name}</div>
                    <div class="goal-row-meta">
                      {#if goal.current > 0}
                        <span class="streak-dot"></span>
                      {/if}
                      {goal.current}/{goal.target} · {goal.typeLabel}
                    </div>
                  </div>

                  {#if goal.isComplete}
                    <span class="btn-log logged">✓ Done</span>
                  {:else if goalsLoggedIds.has(goal.id)}
                    <span class="btn-log logged">✓ Logged</span>
                  {:else}
                    <MisButton variant="unstyled" size="none" type="button" className="btn-log" onclick={() => logGoalProgress(goal.id)}>
                      + Log
                    </MisButton>
                  {/if}
                </div>
              {/each}
            {:else}
              <div class="goals-empty">
                <p>No active goals yet. Set a target to work toward.</p>
                <a href="/dashboard/goals" class="btn-goals-empty">Set a goal</a>
              </div>
            {/if}
          </div>

          {#if goalsError}
            <div class="card-error">{goalsError}</div>
          {/if}

          <div class="goals-cta">
            <div class="goals-cta-text"><strong>{activeGoalsCount}</strong> active goal{activeGoalsCount === 1 ? '' : 's'}</div>
            <a href="/dashboard/goals" class="btn-goals-new">+ New goal</a>
          </div>
        </section>

        <MisSidebarCard title="Flashcards" subtitle={`5 cards · ${dueFlashcardCount} due for review`} className="fade-up">
          {#if flashcardsLoading}
            <div class="card-loading">Syncing flashcards…</div>
          {/if}
          {#if flashcardPreview.length > 0}
            <div class="flashcard-preview">
              {#each flashcardPreview as card}
                <div class="flashcard-item">
                  <div class={`flashcard-status ${card.due ? 'status-due' : 'status-ok'}`}></div>
                  <div class="flashcard-irish">{card.irish}</div>
                  <div class="flashcard-meta">{card.meta}</div>
                </div>
              {/each}
            </div>
          {:else if !flashcardsLoading && !flashcardsError}
            <div class="card-loading">Create and review cards to build flashcard health.</div>
          {/if}
          {#if flashcardsError}
            <div class="card-error">{flashcardsError}</div>
          {/if}
          <div class="flashcards-cta">
            <MisButton href="/dashboard/flashcards/study" className="flashcards-cta-btn" size="sm" variant="outline">
              Review {Math.max(1, dueFlashcardCount || 3)} due cards
            </MisButton>
          </div>
        </MisSidebarCard>
      </aside>
  </div>
</section>

<AppModal
  open={profileModalOpen}
  title="Edit profile"
  description="Set the display name shown on your dashboard."
  on:close={closeProfileModal}
>
  <div class="profile-modal-body">
    <label for="profile-display-name" class="profile-modal-label">Display name</label>
    <MisInput
      id="profile-display-name"
      variant="unstyled"
      bind:value={profileDraftName}
      placeholder="Your name (optional)"
      className="profile-modal-input"
    />
    <p class="profile-modal-help">
      Leave blank to use your email name.
    </p>
  </div>
  <div slot="actions" class="profile-modal-actions">
    <MisButton variant="unstyled" size="none" type="button" className="profile-modal-cancel" onclick={closeProfileModal}>
      Cancel
    </MisButton>
    <MisButton variant="unstyled" size="none" type="button" className="profile-modal-save" onclick={saveProfileName}>
      Save
    </MisButton>
  </div>
</AppModal>

<div class={`dash-toast ${toastVisible ? 'show' : ''}`} role="status" aria-live="polite">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
  <span>{toastMessage}</span>
</div>

<style>
  .dashboard-shell {
    --forest: #1c2b22;
    --forest-mid: #2e4436;
    --forest-light: #3a5a44;
    --parchment: #f5f0e8;
    --parchment-dark: #e8e0d0;
    --parchment-mid: #ede7da;
    --green: #2d7a50;
    --sage: #7ec99a;
    --muted: #5a7a64;
    --ink: #1a1a18;
    --ink-light: #3a3a36;
    background: var(--parchment);
    border-radius: 22px;
    overflow: hidden;
  }

  .state-card {
    border-radius: 20px;
    border: 1.5px solid var(--parchment-dark);
    background: white;
    color: var(--ink-light);
    padding: 18px 20px;
  }

  .state-card--error {
    border-color: #e9bbbb;
    background: #fff1f1;
    color: #8a2323;
  }

  .card-loading {
    font-size: 12px;
    color: #9aa89d;
    padding: 8px 20px 4px;
  }

  .card-error {
    font-size: 11px;
    color: #9f4a4a;
    padding: 8px 20px 0;
  }

  .dash-nav {
    background: rgba(245, 240, 232, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--parchment-dark);
    padding: 0 40px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 30;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }

  .nav-name {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: var(--forest);
  }

  .nav-name em {
    font-style: italic;
    font-weight: 300;
    color: var(--green);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .nav-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.12s;
  }

  .nav-link:hover {
    color: var(--forest);
  }

  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--forest);
    border: 2px solid var(--parchment-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 13px;
    color: var(--parchment);
    text-decoration: none;
  }

  .nav-profile {
    position: relative;
  }

  :global(.nav-avatar-btn) {
    border: none;
    padding: 0;
    cursor: pointer;
  }

  :global(.nav-avatar-btn:hover) {
    opacity: 0.92;
  }

  .profile-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 190px;
    border-radius: 12px;
    border: 1px solid var(--parchment-dark);
    background: #fff;
    box-shadow: 0 16px 36px rgba(19, 31, 24, 0.16);
    overflow: hidden;
    z-index: 20;
  }

  .profile-item {
    display: block;
    width: 100%;
    border: none;
    background: transparent;
    padding: 10px 12px;
    text-align: left;
    font-size: 13px;
    color: var(--ink-light);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .profile-item:hover {
    background: var(--parchment);
    color: var(--forest);
  }

  .profile-item.danger {
    color: #9a2424;
  }

  .profile-modal-body {
    display: grid;
    gap: 8px;
  }

  .profile-modal-label {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
  }

  :global(.profile-modal-input) {
    width: 100%;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    padding: 10px 12px;
    font-size: 14px;
  }

  .profile-modal-help {
    font-size: 12px;
    color: #6b7280;
  }

  .profile-modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  :global(.profile-modal-cancel) {
    border-radius: 10px;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    color: #374151;
    font-size: 13px;
    font-weight: 600;
  }

  :global(.profile-modal-save) {
    border-radius: 10px;
    border: none;
    background: var(--forest);
    padding: 8px 12px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  .journey-error-banner {
    margin: 12px 40px 0;
    border-radius: 10px;
    border: 1px solid #e3bbbb;
    background: #fff2f2;
    color: #8a2323;
    padding: 10px 12px;
    font-size: 12px;
  }

  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 48px 40px 96px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0 40px;
  }

  .page-header {
    grid-column: 1 / -1;
    margin-bottom: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 32px;
    border-bottom: 1.5px solid var(--parchment-dark);
  }

  .greeting {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .greeting-label {
    font-size: 10px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #bbb;
    font-weight: 700;
  }

  .greeting-name {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 34px;
    letter-spacing: -0.04em;
    color: var(--forest);
    line-height: 1;
  }

  .greeting-name em {
    font-style: italic;
    font-weight: 300;
    color: var(--green);
  }

  .greeting-sub {
    font-size: 14px;
    color: #999;
    margin-top: 2px;
  }

  .header-streak {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .streak-num {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 40px;
    letter-spacing: -0.05em;
    color: var(--forest);
    line-height: 1;
  }

  .streak-label {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #bbb;
    font-weight: 700;
  }

  .main-col {
    grid-column: 1;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  :global(.next-up.mis-card) {
    border: none;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
  }

  .next-up-click {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    cursor: pointer;
    padding: 32px 36px;
    position: relative;
  }

  .next-up-click::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .next-up-click::after {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 280px;
    height: 280px;
    background: radial-gradient(circle, rgba(45, 122, 80, 0.25) 0%, transparent 65%);
    pointer-events: none;
  }

  .next-tag,
  .next-lesson-title,
  .next-desc,
  .next-meta {
    position: relative;
    z-index: 1;
  }

  .next-tag {
    font-size: 9px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 14px;
  }

  .next-lesson-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 28px;
    letter-spacing: -0.03em;
    color: var(--parchment);
    line-height: 1.1;
    margin-bottom: 8px;
  }

  .next-lesson-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--sage);
  }

  .next-desc {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.6;
    margin-bottom: 24px;
    max-width: 440px;
  }

  .next-meta {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .next-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--sage);
    color: var(--forest);
    border: none;
    border-radius: 10px;
    padding: 11px 24px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
  }

  .next-lesson-num {
    font-size: 12px;
    color: var(--forest-light);
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;
  }

  :global(.unit-heading.mis-section-header) {
    margin-bottom: 0;
  }

  :global(.unit-heading .mis-section-header__headline) {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .section-link {
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: color 0.12s;
    white-space: nowrap;
  }

  .section-link:hover {
    color: var(--forest);
  }

  .lessons-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .lesson-pip {
    border-radius: 10px;
    padding: 12px 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1.5px solid transparent;
    text-decoration: none;
  }

  .lesson-pip.done {
    background: rgba(28, 43, 34, 0.05);
  }

  .lesson-pip.active {
    background: white;
    border-color: var(--forest);
    box-shadow: 0 2px 12px -4px rgba(28, 43, 34, 0.12);
  }

  .lesson-pip.locked {
    background: transparent;
    border-color: var(--parchment-dark);
    opacity: 0.5;
  }

  .lesson-pip-num {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #bbb;
  }

  .lesson-pip.active .lesson-pip-num {
    color: var(--green);
  }

  .lesson-pip-name {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 12px;
    color: var(--ink-light);
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .lesson-pip.done .lesson-pip-name {
    color: var(--muted);
  }

  .lesson-pip.active .lesson-pip-name {
    color: var(--forest);
  }

  .lesson-pip.locked .lesson-pip-name {
    color: #bbb;
  }

  .lesson-pip-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sage);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lesson-pip-check svg {
    width: 8px;
    height: 8px;
    color: var(--forest);
  }

  :global(.challenge-card.mis-card) {
    background: var(--parchment-mid);
    border: 1.5px solid var(--parchment-dark);
    border-radius: 20px;
    padding: 28px 32px;
    position: relative;
    overflow: hidden;
  }

  :global(.challenge-card.mis-card)::before {
    content: '"';
    position: absolute;
    top: -20px;
    right: 20px;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 160px;
    color: rgba(28, 43, 34, 0.04);
    line-height: 1;
  }

  .challenge-tag {
    font-size: 9px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .challenge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 2s ease infinite;
  }

  .challenge-headline {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: var(--forest);
    line-height: 1.15;
    margin-bottom: 10px;
  }

  .challenge-body {
    font-size: 14px;
    line-height: 1.7;
    color: var(--ink-light);
    margin-bottom: 20px;
    max-width: 460px;
  }

  .challenge-body strong {
    color: var(--forest);
    font-weight: 600;
  }

  .challenge-body em {
    font-style: italic;
    color: var(--green);
  }

  .challenge-phrase {
    background: white;
    border: 1.5px solid var(--parchment-dark);
    border-radius: 12px;
    padding: 14px 18px;
    display: inline-flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
  }

  .challenge-phrase-irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 20px;
    color: var(--forest);
    letter-spacing: -0.02em;
  }

  .challenge-phrase-pron {
    font-size: 13px;
    color: var(--green);
    font-style: italic;
  }

  .challenge-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  :global(.challenge-done-btn.mis-btn) {
    background: var(--forest);
    color: var(--parchment);
  }

  .challenge-later {
    background: transparent;
    color: var(--muted);
    border: 1.5px solid var(--parchment-dark);
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
  }

  .challenge-complete {
    text-align: center;
    padding: 12px 0;
  }

  .challenge-complete-title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 24px;
    color: var(--forest);
    letter-spacing: -0.03em;
    margin-bottom: 8px;
  }

  .challenge-complete-title em {
    font-weight: 300;
    color: var(--green);
    font-style: italic;
  }

  .challenge-complete-body {
    font-size: 14px;
    color: #888;
    line-height: 1.6;
    max-width: 380px;
    margin: 0 auto;
  }

  .sidebar {
    grid-column: 2;
    grid-row: 2 / 5;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-self: start;
    position: sticky;
    top: 78px;
  }

  :global(.mis-sidebar-card.fade-up) {
    border-radius: 18px;
  }

  .phrase-health-list {
    padding: 8px 0;
  }

  .phrase-row {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    gap: 12px;
    border-bottom: 1px solid var(--parchment-dark);
  }

  .phrase-row:last-child {
    border-bottom: none;
  }

  .phrase-row-irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 14px;
    color: var(--forest);
    line-height: 1.2;
  }

  .phrase-row-eng {
    font-size: 10.5px;
    color: #aaa;
    margin-top: 1px;
  }

  .phrase-health-bar {
    width: 48px;
    height: 4px;
    border-radius: 2px;
    background: var(--parchment-dark);
    overflow: hidden;
    flex-shrink: 0;
  }

  .phrase-health-fill {
    height: 100%;
    border-radius: 2px;
  }

  .fill-strong {
    background: var(--sage);
  }

  .fill-mid {
    background: #f0b429;
  }

  .fill-weak {
    background: #e05353;
  }

  .phrase-health-pct {
    font-size: 10px;
    font-weight: 700;
    color: #bbb;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }

  .practice-nudge {
    padding: 14px 20px;
    border-top: 1px solid var(--parchment-dark);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .practice-nudge-text {
    font-size: 12px;
    color: #aaa;
    line-height: 1.4;
  }

  .practice-nudge-text strong {
    color: var(--ink-light);
  }

  :global(.practice-btn.mis-btn) {
    background: var(--forest);
    color: var(--parchment);
    padding: 8px 14px;
    border-radius: 8px;
  }

  .goals-card {
    border: 1.5px solid var(--parchment-dark);
    border-radius: 18px;
    background: #fff;
    overflow: hidden;
  }

  .goals-card-head {
    border-bottom: 1px solid var(--parchment-dark);
    padding: 16px 20px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .goals-card-title {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .goals-title-text {
    color: var(--forest);
    font-family: 'Fraunces', serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .goals-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(45, 122, 80, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .goals-view-all {
    color: var(--green);
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    transition: color 0.12s;
  }

  .goals-view-all:hover {
    color: var(--forest);
  }

  .goals-view-all svg {
    width: 11px;
    height: 11px;
  }

  .goals-list {
    padding: 4px 0;
  }

  .goal-row {
    border-bottom: 1px solid var(--parchment-dark);
    padding: 11px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .goal-row:last-child {
    border-bottom: none;
  }

  .ring {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  .ring svg {
    width: 36px;
    height: 36px;
    display: block;
    border: 0;
    outline: 0;
    box-shadow: none;
    background: transparent;
    overflow: visible;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: var(--parchment-dark);
    stroke-width: 3;
    border: 0 !important;
    outline: 0 !important;
  }

  .ring-fill {
    fill: none;
    stroke: var(--sage);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border: 0 !important;
    outline: 0 !important;
  }

  .ring-fill.done {
    stroke: var(--green);
  }

  .ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--forest);
    font-size: 8px;
    font-weight: 700;
  }

  .goal-row-text {
    min-width: 0;
    flex: 1;
  }

  .goal-row-name {
    margin-bottom: 2px;
    color: var(--forest);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .goal-row-meta {
    color: #aaa;
    font-size: 10.5px;
  }

  .goal-row-meta .streak-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--green);
    margin-right: 4px;
    margin-bottom: 1px;
    vertical-align: middle;
  }

  .btn-log,
  :global(.btn-log) {
    border: 1.5px solid rgba(45, 122, 80, 0.2);
    border-radius: 999px;
    background: none;
    padding: 4px 10px;
    color: var(--green);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }

  :global(.btn-log) {
    cursor: pointer;
  }

  .btn-log.logged,
  :global(.btn-log.logged) {
    border-color: var(--green);
    background: rgba(45, 122, 80, 0.07);
    cursor: default;
  }

  .goals-cta {
    border-top: 1px solid var(--parchment-dark);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .goals-cta-text {
    color: #aaa;
    font-size: 12px;
  }

  .goals-cta-text strong {
    color: var(--ink-light);
  }

  .btn-goals-new {
    border: none;
    border-radius: 8px;
    background: var(--forest);
    color: var(--parchment);
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    padding: 7px 12px;
  }

  .goals-empty {
    padding: 20px;
    text-align: center;
  }

  .goals-empty p {
    margin-bottom: 12px;
    color: #bbb;
    font-size: 13px;
    line-height: 1.5;
  }

  .btn-goals-empty {
    border: none;
    border-radius: 8px;
    background: var(--forest);
    color: var(--parchment);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    padding: 8px 16px;
    display: inline-block;
  }

  .flashcard-preview {
    padding: 18px 20px;
  }

  .flashcard-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--parchment-dark);
  }

  .flashcard-item:last-child {
    border-bottom: none;
  }

  .flashcard-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-due {
    background: #f0b429;
  }

  .status-ok {
    background: var(--sage);
  }

  .flashcard-irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 13px;
    color: var(--forest);
    flex: 1;
  }

  .flashcard-meta {
    font-size: 10.5px;
    color: #bbb;
  }

  .flashcards-cta {
    padding: 14px 20px;
    border-top: 1px solid var(--parchment-dark);
  }

  :global(.flashcards-cta-btn.mis-btn) {
    width: 100%;
    border-radius: 10px;
    border-width: 1.5px;
  }

  .dash-toast {
    position: fixed;
    left: 50%;
    bottom: 28px;
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

  .dash-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .dash-toast svg {
    width: 14px;
    height: 14px;
    color: var(--sage);
  }

  @media (max-width: 860px) {
    .dash-nav {
      padding: 0 20px;
    }

    .page {
      grid-template-columns: 1fr;
      padding: 32px 20px 72px;
    }

    .sidebar {
      grid-column: 1;
      grid-row: auto;
      position: static;
    }

    .lessons-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .journey-error-banner {
      margin: 12px 20px 0;
    }
  }

  .fade-up {
    opacity: 0;
    transform: translateY(14px);
    animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.5;
      transform: scale(0.8);
    }
  }
</style>
