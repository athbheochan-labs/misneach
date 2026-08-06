<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe } from '$lib/api/auth-client';
  import {
    getCourseCatalog,
    lessonHref,
    nextLessonForCourse,
    selectCurrentCourse,
    unitsForCourse,
    type CourseCatalogItem,
    type CourseLesson,
    type CourseUnit,
  } from '$lib/api/courses-client';

  let loading = true;
  let error = '';
  let course: CourseCatalogItem | null = null;
  let units: CourseUnit[] = [];
  let nextLesson: CourseLesson | null = null;

  $: challenges = course
    ? course.lessons.filter((lesson) => /real-world|challenge/i.test(`${lesson.lessonSlug} ${lesson.lessonTitle}`))
    : [];
  $: coursePercent = course?.summaryProgress?.percent ?? 0;
  $: completedLessons = course?.summaryProgress?.completedLessons ?? 0;
  $: totalLessons = course?.summaryProgress?.totalLessons ?? 0;

  function statusLabel(status: string) {
    if (status === 'completed') return 'Done';
    if (status === 'in_progress') return 'In progress';
    return 'Not started';
  }

  async function loadProgress() {
    loading = true;
    error = '';
    const auth = await getAuthMe().catch(() => ({ loggedIn: false }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }

    try {
      const catalog = await getCourseCatalog();
      course = selectCurrentCourse(catalog.courses);
      units = unitsForCourse(course);
      nextLesson = nextLessonForCourse(course);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load course progress';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadProgress();
  });
</script>

<svelte:head>
  <title>Course progress - Misneach</title>
</svelte:head>

<div class="page">
  <header class="progress-hero">
    <div class="subhead">
      <a href="/me" class="back" aria-label="Back to Me">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
      </a>
      <div>
        <p class="eyebrow">Course progress</p>
        <h1>{course?.courseTitle || 'Course'} <em>progress</em></h1>
      </div>
    </div>

    <div class="meter-row">
      <div class="ring" style={`--pct: ${coursePercent}`}>
        <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
          <circle class="ring-bg" cx="46" cy="46" r="38"></circle>
          <circle class="ring-fill" cx="46" cy="46" r="38"></circle>
        </svg>
        <strong>{coursePercent}%</strong>
      </div>
      <div>
        <p>Course completion</p>
        <strong>{completedLessons} of {totalLessons} lessons done</strong>
        <span>{units.length} {units.length === 1 ? 'unit' : 'units'} available</span>
        {#if nextLesson}
          <a class="continue-link" href={lessonHref(course?.courseSlug || '', nextLesson)}>Continue {nextLesson.lessonTitle}</a>
        {/if}
      </div>
    </div>
  </header>

  {#if loading}
    <section class="panel empty">Loading your course material...</section>
  {:else if error}
    <section class="panel empty">{error}</section>
  {:else if course}
    <section class="panel">
      <div class="section-label">Units</div>
      {#each units as unit}
        <a href={unit.href} class="unit-row">
          <div class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} class="unit-num">{unit.unitNumber}</div>
          <div class="unit-info">
            <strong>{unit.unitName}</strong>
            <small>{unit.completedLessons} of {unit.totalLessons} lessons complete</small>
            <div class="bar"><span class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} style={`width:${unit.percent}%`}></span></div>
          </div>
          <span class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} class="status">{statusLabel(unit.status)}</span>
        </a>
      {/each}
    </section>

    <section class="panel">
      <div class="section-label">Course lessons</div>
      {#each course.lessons as lesson}
        <a class="lesson-row" href={lessonHref(course.courseSlug, lesson)}>
          <span>{lesson.lessonTitle}</span>
          <small>{statusLabel(lesson.progress.status)} · {lesson.estimatedMinutes} min</small>
        </a>
      {/each}
    </section>

    {#if challenges.length}
      <section class="panel">
        <div class="section-label">Real-world challenges</div>
        {#each challenges as challenge}
          <a class:pending={challenge.progress.status !== 'completed'} class="challenge-row" href={lessonHref(course.courseSlug, challenge)}>
            <div class:done={challenge.progress.status === 'completed'} class="check">
              {#if challenge.progress.status === 'completed'}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7"><path d="m20 6-11 11-5-5"/></svg>
              {/if}
            </div>
            <span>{challenge.lessonTitle}</span>
            <small>{statusLabel(challenge.progress.status)}</small>
          </a>
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .page {
    display: grid;
    gap: 14px;
    max-width: 900px;
  }

  .progress-hero {
    border-radius: 18px;
    background: #1c2b22;
    color: #f5f0e8;
    padding: clamp(22px, 4vw, 34px);
  }

  .subhead {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .back {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(245, 240, 232, 0.72);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .eyebrow,
  .section-label {
    margin: 0 0 7px;
    color: #7ec99a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: #f5f0e8;
    font-family: 'Fraunces', serif;
    font-size: clamp(30px, 5vw, 52px);
    letter-spacing: -0.04em;
    line-height: 0.98;
  }

  h1 em {
    color: #7ec99a;
    font-style: italic;
    font-weight: 300;
  }

  .meter-row {
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .ring {
    position: relative;
    width: 92px;
    height: 92px;
    flex: 0 0 auto;
  }

  .ring svg {
    transform: rotate(-90deg);
  }

  .ring-bg,
  .ring-fill {
    fill: none;
    stroke-width: 7;
  }

  .ring-bg {
    stroke: rgba(255, 255, 255, 0.08);
  }

  .ring-fill {
    stroke: #7ec99a;
    stroke-linecap: round;
    stroke-dasharray: 238.8;
    stroke-dashoffset: calc(238.8 - (238.8 * var(--pct)) / 100);
  }

  .ring strong {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #f5f0e8;
    font-family: 'Fraunces', serif;
    font-size: 28px;
    letter-spacing: -0.04em;
  }

  .meter-row p {
    margin: 0 0 4px;
    color: rgba(245, 240, 232, 0.42);
    font-size: 12px;
  }

  .meter-row strong,
  .meter-row span {
    display: block;
  }

  .meter-row strong {
    color: #f5f0e8;
    font-size: 15px;
  }

  .meter-row span {
    margin-top: 5px;
    color: rgba(245, 240, 232, 0.5);
    font-size: 13px;
  }

  .continue-link {
    display: inline-flex;
    margin-top: 12px;
    border-radius: 10px;
    background: #7ec99a;
    color: #1c2b22;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .panel {
    border: 1px solid #e8e0d0;
    border-radius: 16px;
    background: #fffdf8;
    overflow: hidden;
    padding-top: 14px;
  }

  .panel .section-label {
    color: #5a7a64;
    padding: 0 18px;
  }

  .unit-row,
  .challenge-row,
  .lesson-row {
    border-top: 1px solid #e8e0d0;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 13px;
    color: inherit;
    text-decoration: none;
  }

  .unit-num {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: #e8e0d0;
    color: #b2a998;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    font-family: 'Fraunces', serif;
    font-size: 17px;
    font-style: italic;
    font-weight: 300;
  }

  .unit-num.done {
    background: #2d7a50;
    color: #f5f0e8;
  }

  .unit-num.active {
    background: #1c2b22;
    color: #7ec99a;
  }

  .unit-info {
    flex: 1;
    min-width: 0;
  }

  .unit-info strong {
    display: block;
    color: #1c2b22;
    font-size: 14px;
  }

  .unit-info small {
    color: #8d968f;
    font-size: 12px;
  }

  .challenge-row.pending span {
    color: #aaa391;
  }

  .bar {
    height: 4px;
    border-radius: 999px;
    background: #e8e0d0;
    overflow: hidden;
    margin-top: 7px;
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  .bar span.done {
    background: #2d7a50;
  }

  .bar span.active {
    background: #7ec99a;
  }

  .status {
    border-radius: 8px;
    background: #e8e0d0;
    color: #b2a998;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status.done {
    background: rgba(45, 122, 80, 0.1);
    color: #2d7a50;
  }

  .status.active {
    background: rgba(126, 201, 154, 0.16);
    color: #5a7a64;
  }

  .check {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1.5px solid #e8e0d0;
    color: #2d7a50;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .check.done {
    border-color: transparent;
    background: rgba(45, 122, 80, 0.1);
  }

  .challenge-row span {
    flex: 1;
    color: #1c2b22;
    font-size: 14px;
  }

  .challenge-row small {
    color: #9c9588;
    font-size: 11px;
  }

  .lesson-row {
    justify-content: space-between;
  }

  .lesson-row span {
    color: #1c2b22;
    font-size: 14px;
    font-weight: 700;
  }

  .lesson-row small {
    color: #7d8d81;
    font-size: 12px;
    text-align: right;
  }

  .empty {
    padding: 18px;
    color: #5a7a64;
  }

  @media (max-width: 620px) {
    .meter-row {
      align-items: flex-start;
    }

    .unit-row {
      align-items: flex-start;
    }

    .status {
      max-width: 92px;
      text-align: center;
      white-space: normal;
    }
  }
</style>
