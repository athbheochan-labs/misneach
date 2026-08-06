<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe, requestLogout, type AuthUser } from '$lib/api/auth-client';
  import {
    getCourseCatalog,
    lessonHref,
    nextLessonForCourse,
    selectCurrentCourse,
    type CourseCatalogItem,
    type CourseLesson,
  } from '$lib/api/courses-client';

  let user: AuthUser | null = null;
  let course: CourseCatalogItem | null = null;
  let nextLesson: CourseLesson | null = null;
  let loading = true;
  let courseLoading = true;
  let courseError = '';

  function fallbackName(email?: string | null) {
    const local = String(email || '').split('@')[0] || 'Learner';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  $: displayName = user?.displayName || fallbackName(user?.email);
  $: initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'M';
  $: coursePercent = course?.summaryProgress?.percent ?? 0;
  $: courseHref = course && nextLesson ? lessonHref(course.courseSlug, nextLesson) : '/me/course-progress';

  async function loadMe() {
    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }
    user = auth.user;
    loading = false;
    await loadCourses();
  }

  async function loadCourses() {
    courseLoading = true;
    courseError = '';
    try {
      const catalog = await getCourseCatalog();
      course = selectCurrentCourse(catalog.courses);
      nextLesson = nextLessonForCourse(course);
    } catch (error) {
      courseError = error instanceof Error ? error.message : 'Unable to load course progress';
      course = null;
      nextLesson = null;
    } finally {
      courseLoading = false;
    }
  }

  async function logout() {
    await requestLogout();
    await goto('/auth/login');
  }

  onMount(() => {
    void loadMe();
  });
</script>

<svelte:head>
  <title>Me - Misneach</title>
</svelte:head>

{#if !loading}
  <div class="grid">
    <section class="hero">
      <div class="avatar">{initials}</div>
      <div>
        <p class="eyebrow">Me</p>
        <h1>{displayName}</h1>
        <p class="muted">Early adopter - joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Misneach'}</p>
      </div>
    </section>

    <section class="summary">
      <a class="tile" href="/me/profile">
        <span class="icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <span>
          <strong>Profile</strong>
          <small>Name, email, and reminders</small>
        </span>
        <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
      </a>

      <a class="tile" href="/me/subscription">
        <span class="icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
        </span>
        <span>
          <strong>Subscription</strong>
          <small>Account access</small>
        </span>
        <span class="badge">Signed in</span>
        <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
      </a>

      <a class="tile" href="/me/course-progress">
        <span class="icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/></svg>
        </span>
        <span>
          <strong>Course progress</strong>
          <small>{course?.courseTitle || 'Course catalog'}</small>
        </span>
        <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
      </a>
    </section>

    <section class="course-card">
      <div>
        <p class="eyebrow">Current course</p>
        {#if courseLoading}
          <h2>Loading course...</h2>
          <p>Checking your latest lesson progress.</p>
        {:else if course}
          <h2>{course.courseTitle}</h2>
          <p>
            {course.summaryProgress.completedLessons} of {course.summaryProgress.totalLessons} lessons complete.
            {#if nextLesson}
              Next: {nextLesson.lessonTitle}.
            {/if}
          </p>
          <div class="course-progress" aria-label={`${coursePercent}% complete`}>
            <span style={`width:${coursePercent}%`}></span>
          </div>
        {:else}
          <h2>Course unavailable</h2>
          <p>{courseError || 'The course catalog could not be loaded.'}</p>
        {/if}
      </div>
      <a href={courseHref}>{course && nextLesson ? 'Continue course' : 'View progress'}</a>
    </section>

    <section class="account-card">
      <button type="button" onclick={logout}>
        <span class="icon danger" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
        </span>
        <span>Sign out</span>
      </button>
    </section>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    gap: 16px;
  }

  .hero,
  .course-card {
    background: #1c2b22;
    color: #f5f0e8;
    border-radius: 18px;
    padding: clamp(22px, 4vw, 34px);
    position: relative;
    overflow: hidden;
  }

  .hero {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .hero::after,
  .course-card::after {
    content: '';
    position: absolute;
    right: -70px;
    bottom: -80px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(45, 122, 80, 0.18);
  }

  .avatar {
    position: relative;
    z-index: 1;
    width: 74px;
    height: 74px;
    border-radius: 50%;
    background: rgba(126, 201, 154, 0.16);
    border: 2px solid rgba(126, 201, 154, 0.28);
    color: #7ec99a;
    display: grid;
    place-items: center;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 28px;
  }

  .hero > div:not(.avatar),
  .course-card > div,
  .course-card a {
    position: relative;
    z-index: 1;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #5a7a64;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .hero .eyebrow,
  .course-card .eyebrow {
    color: rgba(126, 201, 154, 0.75);
  }

  h1,
  h2 {
    margin: 0;
    font-family: 'Fraunces', serif;
    letter-spacing: -0.03em;
  }

  h1 {
    font-size: clamp(30px, 5vw, 48px);
    line-height: 0.95;
  }

  h2 {
    font-size: clamp(24px, 4vw, 34px);
  }

  .muted,
  .course-card p:not(.eyebrow) {
    margin: 8px 0 0;
    color: rgba(245, 240, 232, 0.55);
  }

  .course-progress {
    margin-top: 18px;
    width: min(360px, 100%);
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1);
  }

  .course-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #7ec99a;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .tile,
  .account-card button {
    min-height: 86px;
    border-radius: 14px;
    border: 1px solid #e8e0d0;
    background: #fffdf8;
    color: #1c2b22;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    text-decoration: none;
    font: inherit;
    text-align: left;
  }

  .tile:hover {
    border-color: rgba(45, 122, 80, 0.25);
  }

  .icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #e8e0d0;
    color: #5a7a64;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .tile span:nth-child(2) {
    flex: 1;
    min-width: 0;
  }

  strong {
    display: block;
    font-size: 14px;
  }

  small {
    display: block;
    margin-top: 3px;
    color: #7d8d81;
    font-size: 12px;
  }

  .badge {
    border-radius: 8px;
    background: rgba(45, 122, 80, 0.1);
    color: #2d7a50;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .arrow {
    color: #b9b0a0;
    flex: 0 0 auto;
  }

  .course-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .course-card a {
    border-radius: 12px;
    background: #7ec99a;
    color: #1c2b22;
    padding: 12px 16px;
    font-weight: 800;
    text-decoration: none;
    white-space: nowrap;
  }

  .account-card {
    display: flex;
  }

  .account-card button {
    width: 100%;
    min-height: 58px;
    cursor: pointer;
  }

  .icon.danger {
    color: #c0392b;
    background: rgba(192, 57, 43, 0.08);
  }

  @media (max-width: 900px) {
    .summary {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 620px) {
    .hero {
      align-items: flex-start;
      flex-direction: column;
      border-radius: 16px;
    }

    .course-card {
      align-items: flex-start;
      flex-direction: column;
      border-radius: 16px;
    }

    .course-card a {
      width: 100%;
      text-align: center;
    }
  }
</style>
