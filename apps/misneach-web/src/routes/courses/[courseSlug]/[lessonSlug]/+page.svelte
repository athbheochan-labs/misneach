<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import {
    buildLessonScreensFromPayload,
    MisLessonPlayer,
    type LessonPayload,
    type LessonScreen,
  } from '@decyphr/misneach-ui';
  import { apiFetch } from '$lib/api/client';
  import { getAuthMe } from '$lib/api/auth-client';

  type LessonResponse = LessonPayload & {
    micro?: unknown;
  };

  let loading = true;
  let error = '';
  let payload: LessonResponse | null = null;
  let screens: LessonScreen[] = [];
  let initialIndex = 0;
  let saving = false;
  let lastSavedPercent = -1;

  $: courseSlug = page.params.courseSlug;
  $: lessonSlug = page.params.lessonSlug;
  $: courseTitle = payload?.lesson?.courseTitle || 'Misneach';

  function screenIndexForBlock(blockId?: string | null) {
    if (!blockId || !screens.length) return 0;
    const idx = screens.findIndex((screen) => screen.sourceId === blockId || screen.id === blockId);
    return idx >= 0 ? idx : 0;
  }

  function progressPercent(index: number) {
    if (!screens.length) return 0;
    return Math.max(1, Math.min(100, Math.round(((index + 1) / screens.length) * 100)));
  }

  function sourceIdFor(screen: LessonScreen) {
    return screen.sourceId && screen.sourceId !== 'vocab' ? screen.sourceId : screen.id;
  }

  async function loadLesson() {
    loading = true;
    error = '';

    const auth = await getAuthMe().catch(() => ({ loggedIn: false }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }

    try {
      const res = await apiFetch(`/api/courses/${courseSlug}/lessons/${lessonSlug}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Unable to load lesson');
      }

      payload = data as LessonResponse;
      screens = buildLessonScreensFromPayload(payload, {
        idPrefix: lessonSlug,
        includeIntro: true,
        includeRecap: true,
        includeFinal: true,
      });
      initialIndex = screenIndexForBlock(payload.progress?.lastBlockId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load lesson';
    } finally {
      loading = false;
    }
  }

  async function saveProgress(index: number, screen: LessonScreen, completed = false) {
    if (!payload) return;
    const pct = completed ? 100 : progressPercent(index);
    if (!completed && pct <= lastSavedPercent) return;

    saving = true;
    lastSavedPercent = pct;
    try {
      await apiFetch(`/api/courses/${courseSlug}/lessons/${lessonSlug}/progress`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lastBlockId: sourceIdFor(screen),
          completed,
          progressPercent: pct,
          contentVersion: payload.lesson.contentVersion,
        }),
      });
    } catch {
      lastSavedPercent = completed ? lastSavedPercent : Math.max(-1, lastSavedPercent - 1);
    } finally {
      saving = false;
    }
  }

  function handleProgress(event: CustomEvent<{ index: number; screen: LessonScreen }>) {
    void saveProgress(event.detail.index, event.detail.screen);
  }

  function handleComplete(event: CustomEvent<{ index: number; screen: LessonScreen }>) {
    void saveProgress(event.detail.index, event.detail.screen, true).then(() => goto('/dashboard'));
  }

  function handleExit() {
    void goto('/dashboard');
  }

  onMount(() => {
    void loadLesson();
  });
</script>

<svelte:head>
  <title>{courseTitle} - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if loading}
  <main class="course-empty">
    <h1>Loading lesson</h1>
    <p>Fetching your course material.</p>
  </main>
{:else if error || !screens.length}
  <main class="course-empty">
    <h1>Couldn&apos;t load lesson</h1>
    <p>{error || 'This lesson has no playable content yet.'}</p>
    <a href="/dashboard">Back to dashboard</a>
  </main>
{:else}
  <MisLessonPlayer
    {screens}
    {courseTitle}
    {initialIndex}
    homeHref="/dashboard"
    exitHref="/dashboard"
    exitLabel={saving ? 'Saving' : 'Exit'}
    advancing={saving}
    primaryCtaHref={null}
    continueLabel="Ar aghaidh - Continue"
    finishLabel="Criochnaithe - Finish"
    finishSavingLabel="Saving..."
    quizLockedLabel="Answer to continue"
    trackEnabled={true}
    plausiblePrefix={`Course Lesson: ${lessonSlug}`}
    on:progress={handleProgress}
    on:complete={handleComplete}
    on:exit={handleExit}
  />
{/if}

<style>
  .course-empty {
    min-height: 100vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    text-align: center;
    background: #1c2b22;
    color: #f5f0e8;
    padding: 24px;
  }

  .course-empty h1 {
    margin: 0;
    font-family: 'Fraunces', serif;
    font-size: 32px;
    letter-spacing: -0.03em;
  }

  .course-empty p {
    margin: 0;
    color: #7ec99a;
  }

  .course-empty a {
    margin-top: 6px;
    border-radius: 10px;
    background: #7ec99a;
    color: #1c2b22;
    padding: 10px 14px;
    font-weight: 800;
    text-decoration: none;
  }
</style>
