<script lang="ts">
  import { apiFetch } from '$lib/api/client';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { compareLessonsByHierarchy } from '$lib/course-order';
  import {
    readLessonPlayerCache,
    writeLessonPlayerCache,
    type LessonNavigationCache,
  } from '$lib/stores/lesson-player-cache';
  import { incrementJourneyGoalCounter } from '$lib/stores/journey-goals';
  import {
    MisLessonPlayer,
    buildLessonScreensFromPayload,
    type LessonPayload,
    type LessonScreen,
  } from '@decyphr/misneach-ui';

  export let data: { courseSlug: string; lessonSlug: string };

  type CourseNavLesson = {
    lessonSlug: string;
    lessonTitle: string;
    order: number;
    estimatedMinutes: number;
    progress?: {
      status?: 'not_started' | 'in_progress' | 'completed';
    };
  };

  type CourseNavCourse = {
    courseSlug: string;
    lessons: CourseNavLesson[];
  };

  type LessonLoadResult = {
    payload: LessonPayload;
    screens: LessonScreen[];
    navigation: LessonNavigationCache;
  };

  let loading = true;
  let error = '';
  let payload: LessonPayload | null = null;
  let screens: LessonScreen[] = [];
  let current = 0;

  let nextLessonHref = '';
  let finishUnitHref = '/dashboard';
  let advancing = false;
  let activeRouteKey = '';

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function isTasterLessonSlug(lessonSlug: string) {
    const slug = String(lessonSlug || '').toLowerCase();
    return slug.includes('taster') || slug.includes('lesson-1-1-conversation');
  }

  async function resolveLessonNavigation(courseSlug: string, lessonSlug: string): Promise<LessonNavigationCache> {
    const fallback: LessonNavigationCache = {
      previousLessonHref: '',
      nextLessonHref: '',
      finishUnitHref: '/dashboard',
    };

    const res = await apiFetch('/api/proxy/courses/catalog', { cache: 'no-store' });
    if (!res.ok) return fallback;

    const catalog = await res.json();
    const courses = (catalog?.courses ?? []) as CourseNavCourse[];
    const currentCourse = courses.find((item) => item.courseSlug === courseSlug);
    if (!currentCourse || !Array.isArray(currentCourse.lessons)) return fallback;

    const currentCourseIndex = courses.findIndex((item) => item.courseSlug === courseSlug);
    const lessons = currentCourse.lessons.slice().sort(compareLessonsByHierarchy);
    const index = lessons.findIndex((item) => item.lessonSlug === lessonSlug);
    if (index < 0) return fallback;

    let previousHref = '';
    let nextHref = '';
    let finishHref = '/dashboard';

    const previous = lessons[index - 1];
    const next = lessons[index + 1];

    if (previous) {
      previousHref = `/dashboard/courses/${encodeURIComponent(courseSlug)}/${encodeURIComponent(previous.lessonSlug)}`;
    }

    if (next) {
      nextHref = `/dashboard/courses/${encodeURIComponent(courseSlug)}/${encodeURIComponent(next.lessonSlug)}`;
    }

    if (!nextHref && currentCourseIndex >= 0) {
      for (let i = currentCourseIndex + 1; i < courses.length; i += 1) {
        const candidate = courses[i];
        const candidateLessons = (candidate.lessons || []).slice().sort(compareLessonsByHierarchy);
        if (!candidateLessons.length) continue;

        const firstOpen = candidateLessons.find((item) => item.progress?.status !== 'completed') || candidateLessons[0];
        finishHref = `/dashboard/courses/${encodeURIComponent(candidate.courseSlug)}/${encodeURIComponent(firstOpen.lessonSlug)}`;
        break;
      }
    }

    return { previousLessonHref: previousHref, nextLessonHref: nextHref, finishUnitHref: finishHref };
  }

  function applyNavigation(navigation: LessonNavigationCache) {
    nextLessonHref = navigation.nextLessonHref;
    finishUnitHref = navigation.finishUnitHref;
  }

  function findResumeIndex(nextPayload: LessonPayload, nextScreens: LessonScreen[]) {
    const targetId = nextPayload.progress.lastBlockId;
    if (!targetId) return 0;
    const foundIndex = nextScreens.findIndex((screen) => screen.id === targetId || screen.sourceId === targetId);
    return foundIndex >= 0 ? foundIndex : 0;
  }

  function hydrateLesson(result: LessonLoadResult) {
    payload = result.payload;
    screens = result.screens;
    applyNavigation(result.navigation);
    current = findResumeIndex(result.payload, result.screens);
  }

  async function fetchLessonResult(courseSlug: string, lessonSlug: string): Promise<LessonLoadResult> {
    const res = await fetch(`/api/proxy/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(await res.text());

    const nextPayload = (await res.json()) as LessonPayload;
    const nextScreens = buildLessonScreensFromPayload(nextPayload);
    const navigation = await resolveLessonNavigation(courseSlug, lessonSlug);

    return {
      payload: nextPayload,
      screens: nextScreens,
      navigation,
    };
  }

  async function persistProgress(completed = false) {
    if (!payload || !screens.length) return true;

    const currentScreen = screens[current] || screens[screens.length - 1];
    const progressPercent = completed ? 100 : Math.max(1, Math.round(((current + 1) / screens.length) * 100));

    const body = {
      lastBlockId: currentScreen.sourceId || currentScreen.id,
      progressPercent,
      completed,
      timeSpentDeltaSec: completed ? 0 : 12,
      contentVersion: payload.lesson.contentVersion || payload.progress.contentVersion || 'fallback',
    };

    const res = await fetch(
      `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(body),
      },
    );

    return res.ok;
  }

  function scheduleProgressSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistProgress(false).catch(() => undefined);
    }, 320);
  }

  function handlePlayerProgress(event: CustomEvent<{ index: number; screen: LessonScreen }>) {
    current = event.detail.index;
    scheduleProgressSave();
  }

  async function completeAndAdvance() {
    if (advancing) return;
    advancing = true;
    try {
      const wasCompleted = payload?.progress.status === 'completed';
      await persistProgress(true);
      if (!wasCompleted && payload?.progress) {
        incrementJourneyGoalCounter('lessonsCompleted', 1);
        payload.progress.status = 'completed';
      }
      if (nextLessonHref) {
        await goto(nextLessonHref);
      } else {
        await goto(finishUnitHref || '/dashboard');
      }
    } finally {
      advancing = false;
    }
  }

  function handlePlayerComplete() {
    void completeAndAdvance();
  }

  async function loadLesson() {
    error = '';
    const cacheKey = `${data.courseSlug}:${data.lessonSlug}`;
    const cached = readLessonPlayerCache(cacheKey);

    if (cached) {
      loading = false;
      hydrateLesson({
        payload: cached.payload as LessonPayload,
        screens: cached.screens as LessonScreen[],
        navigation: cached.navigation,
      });

      void (async () => {
        try {
          const result = await fetchLessonResult(data.courseSlug, data.lessonSlug);
          writeLessonPlayerCache(cacheKey, {
            payload: result.payload,
            screens: result.screens,
            navigation: result.navigation,
            cachedAt: Date.now(),
          });
        } catch {
          // Keep cached lesson on background refresh failures.
        }
      })();
      return;
    }

    loading = true;
    payload = null;
    screens = [];
    current = 0;

    try {
      const result = await fetchLessonResult(data.courseSlug, data.lessonSlug);
      hydrateLesson(result);
      writeLessonPlayerCache(cacheKey, {
        payload: result.payload,
        screens: result.screens,
        navigation: result.navigation,
        cachedAt: Date.now(),
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load lesson';
    } finally {
      loading = false;
    }
  }

  $: {
    const key = `${data?.courseSlug || ''}:${data?.lessonSlug || ''}`;
    if (key && browser && key !== activeRouteKey) {
      activeRouteKey = key;
      loadLesson();
    }
  }

  onMount(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        persistProgress(false).catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', onHidden);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
    };
  });

  onDestroy(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (browser) {
      persistProgress(false).catch(() => undefined);
    }
  });
</script>

<div class="immersive-page">
  {#if loading}
    <div class="state state-loading" role="status" aria-live="polite">
      <div class="state-mark" aria-hidden="true"></div>
      <div class="state-title">Preparing your lesson</div>
      <div class="state-sub">Loading phrases, notes, and your progress.</div>
    </div>
  {:else if error}
    <div class="state state-error" role="alert">
      <div class="state-title">Couldn&apos;t load lesson</div>
      <div class="state-sub">{error}</div>
    </div>
  {:else if payload && screens.length}
    {#key `${payload.lesson.lessonSlug}-${screens.length}`}
      <MisLessonPlayer
        screens={screens}
        courseTitle={payload.lesson.courseTitle}
        initialIndex={current}
        homeHref="/dashboard"
        showAuthLinks={false}
        showExit={true}
        exitHref="/dashboard"
        exitLabel="Exit"
        continueLabel="Ar aghaidh — Continue"
        finishLabel="Criochnaithe — Finish"
        finishSavingLabel="Saving..."
        quizLockedLabel="Answer to continue"
        advancing={advancing}
        trackEnabled={!isTasterLessonSlug(payload.lesson.lessonSlug)}
        plausiblePrefix="Course Lesson"
        on:progress={handlePlayerProgress}
        on:complete={handlePlayerComplete}
        on:exit={() => goto('/dashboard')}
      />
    {/key}
  {/if}
</div>

<style>
  .immersive-page {
    min-height: 100vh;
    background: #1c2b22;
  }

  .state {
    margin: auto;
    border-radius: 18px;
    padding: 24px 28px;
    width: min(420px, calc(100% - 40px));
    text-align: center;
    backdrop-filter: blur(4px);
  }

  .state-loading {
    color: rgba(245, 240, 232, 0.86);
    background: linear-gradient(145deg, rgba(245, 240, 232, 0.06), rgba(245, 240, 232, 0.03));
    border: 1px solid rgba(245, 240, 232, 0.12);
    box-shadow: 0 28px 52px -38px rgba(0, 0, 0, 0.72);
  }

  .state-error {
    color: #fbd1d1;
    border: 1px solid rgba(224, 83, 83, 0.5);
    background: rgba(224, 83, 83, 0.12);
  }

  .state-mark {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    margin: 0 auto 14px;
    border: 2px solid rgba(126, 201, 154, 0.3);
    border-top-color: #7ec99a;
    animation: state-spin 0.9s linear infinite;
  }

  .state-title {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    letter-spacing: -0.01em;
    font-size: 20px;
    color: #f5f0e8;
    margin-bottom: 6px;
  }

  .state-sub {
    font-size: 13px;
    line-height: 1.55;
    color: #5a7a64;
  }

  @keyframes state-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
