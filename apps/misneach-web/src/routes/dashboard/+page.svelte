<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe, requestLogout, type AuthUser } from '$lib/api/auth-client';
  import {
    getCourseCatalog,
    lessonHref,
    nextLessonForCourse,
    selectCurrentCourse,
    unitsForCourse,
    type CourseCatalog,
    type CourseCatalogItem,
    type CourseLesson,
    type CourseUnit,
  } from '$lib/api/courses-client';
  import {
    getChallenges,
    setChallengeCompleted,
    type ChallengesPayload,
    type UserChallenge,
  } from '$lib/api/challenges-client';
  import {
    getCourseFlashcardSummary,
    type CourseFlashcardSummary,
  } from '$lib/api/flashcards-client';
  import { getGoals, type UserGoal } from '$lib/api/goals-client';

  let user: AuthUser | null = null;
  let course: CourseCatalogItem | null = null;
  let nextLesson: CourseLesson | null = null;
  let units: CourseUnit[] = [];
  let activityStreak: CourseCatalog['activityStreak'] = { currentDays: 0, lastActivityDate: null };
  let challenges: ChallengesPayload | null = null;
  let goals: UserGoal[] = [];
  let flashcards: CourseFlashcardSummary | null = null;
  let loading = true;
  let error = '';
  let challengesError = '';
  let goalsError = '';
  let flashcardsError = '';
  let profileMenuOpen = false;
  let toast = '';
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function fallbackName(email?: string | null) {
    const local = String(email || '').split('@')[0] || 'Learner';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  $: displayName = user?.displayName || fallbackName(user?.email);
  $: firstName = displayName.split(/\s+/)[0] || 'there';
  $: initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'M';
  $: nextHref = course && nextLesson ? lessonHref(course.courseSlug, nextLesson) : '/me/course-progress';
  $: currentUnit = nextLesson
    ? units.find((unit) => unit.lessons.some((lesson) => lesson.lessonSlug === nextLesson?.lessonSlug))
    : units.find((unit) => unit.status === 'in_progress') || units[0] || null;
  $: challengeLesson = course?.lessons.find((lesson) => /real-world|challenge/i.test(`${lesson.lessonSlug} ${lesson.lessonTitle}`)) || null;
  $: activeChallenge = challenges?.items.find((item) => item.status === 'active') || null;
  $: completedChallenge = challenges?.items.find((item) => item.status === 'completed') || null;

  function statusLabel(status: string) {
    if (status === 'completed') return 'Complete';
    if (status === 'in_progress') return 'In progress';
    return 'Not started';
  }

  function showToast(message: string) {
    toast = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
    }, 2200);
  }

  function goalProgressPercent(goal: UserGoal) {
    return Math.max(0, Math.min(100, Math.round(Number(goal.progress?.percent ?? 0))));
  }

  function goalMeta(goal: UserGoal) {
    const progress = goal.progress;
    if (!progress) return goal.activityType ? goal.activityType.replace(/_/g, ' ') : goal.periodType;
    const achieved = Number(progress.achieved || 0);
    const target = Number(progress.target || goal.targetValue || 0);
    return `${achieved} of ${target} ${goal.targetType.replace(/_/g, ' ')}`;
  }

  function challengeLessonHref(challenge: UserChallenge) {
    if (!challenge.source) return '/me/course-progress';
    return `/courses/${challenge.source.courseSlug}/${challenge.source.lessonSlug}`;
  }

  async function loadDashboard() {
    loading = true;
    error = '';
    const auth = await getAuthMe().catch(() => ({ loggedIn: false, user: null }));
    if (!auth.loggedIn) {
      await goto('/auth/login');
      return;
    }

    user = auth.user;

    try {
      const [catalog, challengePayload, goalPayload, flashcardPayload] = await Promise.all([
        getCourseCatalog(),
        getChallenges().catch((err) => {
          challengesError = err instanceof Error ? err.message : 'Unable to load challenges';
          return null;
        }),
        getGoals('active').catch((err) => {
          goalsError = err instanceof Error ? err.message : 'Unable to load goals';
          return [];
        }),
        getCourseFlashcardSummary().catch((err) => {
          flashcardsError = err instanceof Error ? err.message : 'Unable to load flashcards';
          return null;
        }),
      ]);
      activityStreak = catalog.activityStreak || { currentDays: 0, lastActivityDate: null };
      challenges = challengePayload;
      goals = goalPayload;
      flashcards = flashcardPayload;
      course = selectCurrentCourse(catalog.courses);
      nextLesson = nextLessonForCourse(course);
      units = unitsForCourse(course);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load your dashboard';
    } finally {
      loading = false;
    }
  }

  async function logout() {
    await requestLogout();
    await goto('/auth/login');
  }

  async function markChallengeDone(challenge: UserChallenge) {
    try {
      const updated = await setChallengeCompleted(challenge.id, true);
      challenges = {
        items: (challenges?.items || []).map((item) => (item.id === updated.id ? updated : item)),
        summary: {
          activeCount: Math.max(0, (challenges?.summary.activeCount || 0) - 1),
          completedCount: (challenges?.summary.completedCount || 0) + 1,
          total: challenges?.summary.total || 1,
        },
      };
      showToast('Challenge complete - maith thu!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update challenge');
    }
  }

  onMount(() => {
    void loadDashboard();
  });
</script>

<svelte:head>
  <title>Dashboard - Misneach</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<nav class="dash-nav">
  <a href="/dashboard" class="nav-brand">
    <svg width="22" height="22" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M40 7C19 7,9 19,9 34C9 50,19 61,37 62L30 73L47 62C63 60,71 50,71 34C71 19,61 7,40 7Z" fill="#1c2b22" />
      <path d="M33 46C35.5 37,42 30,47 25" stroke="#f5f0e8" stroke-width="5" stroke-linecap="round" fill="none" />
      <circle cx="33.5" cy="45" r="3" fill="#7ec99a" />
    </svg>
    <span class="nav-wordmark">Misne<em>ach</em></span>
  </a>
  <div class="nav-links">
    <a href="/dashboard" class="nav-link active">Learn</a>
    <a href="/dashboard/review" class="nav-link">Review</a>
    <a href="/dashboard/phrases" class="nav-link">Phrases</a>
  </div>
  <div class="nav-right">
    <div class="nav-avatar-wrap">
      <button class="nav-avatar" type="button" on:click={() => (profileMenuOpen = !profileMenuOpen)}>{initials}</button>
      <div class:open={profileMenuOpen} class="profile-menu">
        <a href="/me/profile" class="pm-item">Profile</a>
        <a href="/me/course-progress" class="pm-item">Course</a>
        <a href="/me/subscription" class="pm-item">Subscription</a>
        <div class="pm-divider"></div>
        <button class="pm-item danger" type="button" on:click={logout}>Sign out</button>
      </div>
    </div>
  </div>
</nav>

{#if loading}
  <main class="loading-shell">Loading your dashboard...</main>
{:else}
  <div class="page">
    <div class="greeting">
      <div class="greeting-text">
        <div class="greeting-eyebrow">Failte ar ais - Welcome back</div>
        <div class="greeting-headline">Dia <em>duit,</em> {firstName}.</div>
        <div class="greeting-sub">
          {#if error}
            {error}
          {:else if nextLesson}
            You&apos;re on {currentUnit ? `Unit ${currentUnit.unitNumber}` : 'your next lesson'} - {nextLesson.lessonTitle}
          {:else}
            Your course is ready when you are.
          {/if}
        </div>
      </div>
      <div class="greeting-meta">
        <div class="streak-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7ec99a" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          <span class="streak-num">{activityStreak?.currentDays || 0}</span>
          <span class="streak-lbl">day streak</span>
        </div>
        <div class="course-pill">{course?.courseTitle || 'Misneach'}{currentUnit ? ` - Unit ${currentUnit.unitNumber} of ${units.length}` : ''}</div>
      </div>
    </div>

    <main class="main-col">
      <a href={nextHref} class="next-up">
        <div class="next-tag">Continue</div>
        <div class="next-lesson">{nextLesson?.lessonTitle || 'Start'} <em>{course?.courseTitle || 'learning'}</em></div>
        <div class="next-desc">
          {nextLesson?.summary || course?.summary || 'Start with practical Irish built around real conversations.'}
        </div>
        <div class="next-meta">
          <span class="next-btn">Lean ar aghaidh - Continue</span>
          <span class="next-num">
            {#if nextLesson && currentUnit}
              Unit {currentUnit.unitNumber} - {nextLesson.estimatedMinutes} min
            {:else}
              Course overview
            {/if}
          </span>
        </div>
      </a>

      <section>
        <div class="section-head">
          <div class="section-title">Course <em>units</em></div>
          <a href="/me/course-progress" class="section-link">All lessons</a>
        </div>
        <div class="units-list">
          {#each units as unit}
            <a href={unit.href} class="unit-card">
              <div class="unit-inner">
                <div class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} class="unit-num">{unit.unitNumber}</div>
                <div class="unit-info">
                  <div class="unit-title">{unit.unitName}</div>
                  <div class="unit-sub">{unit.completedLessons} of {unit.totalLessons} lessons complete</div>
                </div>
                <div class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} class="unit-badge">{statusLabel(unit.status)}</div>
              </div>
              <div class="unit-prog-track"><div class:done={unit.status === 'completed'} class:active={unit.status === 'in_progress'} class="unit-prog-fill" style={`width:${unit.percent}%`}></div></div>
            </a>
          {/each}
        </div>
      </section>

      <div class="challenge-card">
        {#if activeChallenge}
          <div class="challenge-tag"><span class="challenge-dot"></span>Dushlan - Real world challenge</div>
          <div class="challenge-headline">{activeChallenge.title}</div>
          {#if activeChallenge.description}
            <div class="challenge-body">{activeChallenge.description}</div>
          {/if}
          {#if activeChallenge.source}
            <div class="challenge-phrase">
              <span class="challenge-irish">{activeChallenge.source.lessonTitle || 'Real world challenge'}</span>
              <span class="challenge-pron">{activeChallenge.source.courseTitle || activeChallenge.source.courseSlug}</span>
            </div>
          {/if}
          <div class="challenge-actions">
            <button class="btn-challenge-done" type="button" on:click={() => markChallengeDone(activeChallenge)}>I did it</button>
            {#if activeChallenge.source}
              <a class="challenge-later" href={challengeLessonHref(activeChallenge)}>Review lesson</a>
            {/if}
          </div>
        {:else if completedChallenge}
          <div class="challenge-complete">
            <div class="complete-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d7a50" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div class="challenge-headline">Maith thu.</div>
            <div class="challenge-body">
              {challenges?.summary.completedCount || 0} real-world {challenges?.summary.completedCount === 1 ? 'challenge' : 'challenges'} completed.
            </div>
          </div>
        {:else if challengesError}
          <div class="challenge-tag"><span class="challenge-dot"></span>Dushlan - Real world challenge</div>
          <div class="challenge-headline">Challenge data unavailable</div>
          <div class="challenge-body">{challengesError}</div>
        {:else}
          <div class="challenge-tag"><span class="challenge-dot"></span>Dushlan - Real world challenge</div>
          <div class="challenge-headline">No real-world challenge unlocked yet</div>
          <div class="challenge-body">Challenges appear here after you reach a real-world challenge lesson.</div>
          {#if challengeLesson && course}
            <div class="challenge-actions">
              <a class="btn-challenge-done" href={lessonHref(course.courseSlug, challengeLesson)}>Go to challenge lesson</a>
            </div>
          {/if}
        {/if}
      </div>
    </main>

    <aside class="sidebar">
      <div class="s-card" id="practice">
        <div class="s-card-head">
          <div class="s-card-title">Review course phrases</div>
          <div class="s-card-sub">
            {#if flashcards}
              {flashcards.cardCount} phrases from your lessons
            {:else}
              Course flashcards
            {/if}
          </div>
        </div>
        <div class="pw-due">
          <div class="pw-due-copy">
            <div class="pw-due-count">{flashcards?.dueCount ?? '-'}</div>
            <div>
              <div class="pw-due-label">Due for review</div>
              <div class="pw-due-sub">
                {#if flashcards?.dueCount}
                  est. {Math.max(1, Math.ceil(flashcards.dueCount * 0.6))} minutes
                {:else if flashcardsError}
                  {flashcardsError}
                {:else}
                  Nothing due right now
                {/if}
              </div>
            </div>
          </div>
          <a href="/dashboard/review" class="btn-start">Review now</a>
        </div>
        {#if flashcards}
          <div class="pw-secondary">
            <div class="pw-pill">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              {flashcards.notDueCount} not yet due
            </div>
            <div class="pw-pill dim">{flashcards.decks.length} course {flashcards.decks.length === 1 ? 'deck' : 'decks'}</div>
          </div>
        {/if}
        <div class="pw-output" id="phrases">
          <div class="pw-output-label">Due phrases</div>
          {#if flashcards?.sampleDueCards.length}
            <div class="pw-chips">
              {#each flashcards.sampleDueCards as card}
                <span class="pw-chip">{card.front}</span>
              {/each}
            </div>
            <div class="pw-output-sub">These are generated from lessons you have opened.</div>
          {:else}
            <div class="pw-output-sub">Course phrases appear here once lesson flashcards are generated and due.</div>
          {/if}
        </div>
      </div>

      <div class="s-card">
        <div class="cleachtadh-cta">
          <div class="cleachtadh-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a7a64" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <div>
            <div class="cleachtadh-title">Want to go deeper?</div>
            <div class="cleachtadh-body">Cleachtadh has spaced repetition, sentence builder, daily production practice, and more - built for serious learners.</div>
            <a class="cleachtadh-link" href="https://cleachtadh.misneach.site" target="_blank" rel="noreferrer">
              Try Cleachtadh
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          </div>
        </div>
      </div>

      <div class="s-card">
        <div class="s-card-head">
          <div class="s-card-title">Goals</div>
          <div class="s-card-sub">{goals.length} active</div>
        </div>
        {#if goals.length}
          {#each goals.slice(0, 3) as goal}
            {@const pct = goalProgressPercent(goal)}
            <div class="goal-row">
              <div class="goal-ring">
                <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
                  <circle class="gr-bg" cx="18" cy="18" r="14" />
                  <circle class="gr-fill milestone" cx="18" cy="18" r="14" stroke-dasharray="87.96" stroke-dashoffset={String(87.96 * (1 - pct / 100))} />
                </svg>
                <div class="goal-pct">{pct}%</div>
              </div>
              <div class="goal-info">
                <div class="goal-name">{goal.title}</div>
                <div class="goal-meta">{goalMeta(goal)}</div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-state">
            {goalsError || 'No active goals yet.'}
          </div>
        {/if}
        <div class="goals-footer">
          <span class="goals-count">{goals.length} active {goals.length === 1 ? 'goal' : 'goals'}</span>
          <a class="btn-new-goal" href="/me/course-progress">View course</a>
        </div>
      </div>
    </aside>
  </div>
{/if}

<nav class="mobile-nav">
  <a class="mnav-item active" href="/dashboard">
    <div class="mnav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg></div>
    <div class="mnav-lbl">Learn</div>
  </a>
  <a class="mnav-item" href="/dashboard/review">
    <div class="mnav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
    <div class="mnav-lbl">Review</div>
  </a>
  <a class="mnav-item" href="/dashboard/phrases">
    <div class="mnav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
    <div class="mnav-lbl">Phrases</div>
  </a>
  <a class="mnav-item" href="/me">
    <div class="mnav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
    <div class="mnav-lbl">Me</div>
  </a>
</nav>

{#if toast}
  <div class="toast show">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
    <span>{toast}</span>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: #f5f0e8;
    color: #1a1a18;
    font-family: 'Instrument Sans', system-ui, sans-serif;
  }

  .dash-nav {
    background: rgba(245, 240, 232, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e8e0d0;
    padding: 0 40px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .nav-wordmark {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.03em;
    color: #1c2b22;
  }

  .nav-wordmark em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }

  .nav-links,
  .nav-right {
    display: flex;
    align-items: center;
  }

  .nav-links {
    gap: 6px;
  }

  .nav-link {
    font-size: 13px;
    font-weight: 500;
    color: #5a7a64;
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 8px;
  }

  .nav-link:hover,
  .nav-link.active {
    color: #1c2b22;
    background: #e8e0d0;
  }

  .nav-avatar-wrap {
    position: relative;
  }

  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #e8e0d0;
    background: #1c2b22;
    color: #f5f0e8;
    display: grid;
    place-items: center;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    cursor: pointer;
  }

  .profile-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 180px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e8e0d0;
    box-shadow: 0 16px 32px rgba(28, 43, 34, 0.14);
    overflow: hidden;
    display: none;
    z-index: 60;
  }

  .profile-menu.open {
    display: block;
  }

  .pm-item {
    display: block;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    text-align: left;
    font: inherit;
    font-size: 13px;
    color: #3a3a36;
    cursor: pointer;
    text-decoration: none;
  }

  .pm-item:hover {
    background: #f5f0e8;
  }

  .pm-item.danger {
    color: #9a2424;
  }

  .pm-divider {
    height: 1px;
    background: #e8e0d0;
    margin: 4px 0;
  }

  .loading-shell,
  .page {
    max-width: 1080px;
    margin: 0 auto;
  }

  .loading-shell {
    padding: 44px 40px;
    color: #5a7a64;
  }

  .page {
    padding: 44px 40px 80px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 32px;
  }

  .greeting {
    grid-column: 1 / -1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 32px;
    border-bottom: 1px solid #e8e0d0;
    margin-bottom: 8px;
  }

  .greeting-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 8px;
  }

  .greeting-headline {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(28px, 3vw, 38px);
    color: #1c2b22;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin-bottom: 6px;
  }

  .greeting-headline em {
    font-style: italic;
    font-weight: 300;
    color: #2d7a50;
  }

  .greeting-sub {
    font-size: 14px;
    color: #5a7a64;
    line-height: 1.5;
  }

  .greeting-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .streak-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    background: #1c2b22;
    border-radius: 20px;
    padding: 8px 14px;
  }

  .streak-num {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 20px;
    color: #7ec99a;
    letter-spacing: -0.02em;
  }

  .streak-lbl {
    font-size: 11px;
    color: rgba(245, 240, 232, 0.45);
    font-weight: 600;
  }

  .course-pill {
    font-size: 11px;
    font-weight: 600;
    color: #5a7a64;
    background: #fff;
    border: 1px solid #e8e0d0;
    border-radius: 20px;
    padding: 5px 12px;
  }

  .main-col,
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .next-up {
    display: block;
    text-decoration: none;
    background: #1c2b22;
    border-radius: 20px;
    padding: 24px 28px;
    position: relative;
    overflow: hidden;
  }

  .next-up:hover {
    transform: translateY(-2px);
  }

  .next-up::after {
    content: '';
    position: absolute;
    bottom: -60px;
    right: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(45, 122, 80, 0.15);
  }

  .next-tag {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(245, 240, 232, 0.35);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .next-tag::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #7ec99a;
  }

  .next-lesson,
  .next-desc,
  .next-meta {
    position: relative;
    z-index: 1;
  }

  .next-lesson {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(22px, 2.5vw, 28px);
    color: #f5f0e8;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin-bottom: 8px;
  }

  .next-lesson em {
    font-style: italic;
    font-weight: 300;
    color: #7ec99a;
  }

  .next-desc {
    font-size: 14px;
    color: rgba(245, 240, 232, 0.5);
    line-height: 1.55;
    margin-bottom: 20px;
    max-width: 480px;
  }

  .next-meta {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .next-btn {
    background: #7ec99a;
    color: #1c2b22;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
  }

  .next-num {
    font-size: 12px;
    color: rgba(245, 240, 232, 0.35);
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .section-title {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 17px;
    color: #1c2b22;
  }

  .section-title em {
    font-style: italic;
    font-weight: 300;
    color: #5a7a64;
  }

  .section-link,
  .btn-new-goal {
    font-size: 12px;
    color: #2d7a50;
    font-weight: 600;
    text-decoration: none;
  }

  .units-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unit-card {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e8e0d0;
    overflow: hidden;
    color: inherit;
    text-decoration: none;
  }

  .unit-card:hover {
    border-color: #5a7a64;
  }

  .unit-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }

  .unit-num {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: #e8e0d0;
    color: #bbb;
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 16px;
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

  .unit-title {
    font-size: 14px;
    font-weight: 700;
    color: #1c2b22;
    margin-bottom: 2px;
  }

  .unit-sub {
    font-size: 11px;
    color: #999;
  }

  .unit-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 8px;
    color: #bbb;
    background: #e8e0d0;
    flex-shrink: 0;
  }

  .unit-badge.done {
    background: rgba(45, 122, 80, 0.1);
    color: #2d7a50;
  }

  .unit-badge.active {
    background: rgba(126, 201, 154, 0.15);
    color: #5a7a64;
  }

  .unit-prog-track {
    height: 3px;
    background: #e8e0d0;
    margin: 0 16px 14px;
    border-radius: 2px;
    overflow: hidden;
  }

  .unit-prog-fill {
    height: 100%;
    border-radius: 2px;
  }

  .unit-prog-fill.done {
    background: #2d7a50;
  }

  .unit-prog-fill.active {
    background: #7ec99a;
  }

  .challenge-card,
  .s-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e8e0d0;
  }

  .challenge-card {
    padding: 22px 24px;
  }

  .challenge-tag {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 12px;
  }

  .challenge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7ec99a;
  }

  .challenge-headline {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 19px;
    color: #1c2b22;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .challenge-body {
    font-size: 13px;
    color: #777;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .challenge-phrase {
    background: #f5f0e8;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .challenge-irish {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 18px;
    color: #1c2b22;
    display: block;
    margin-bottom: 3px;
  }

  .challenge-pron {
    font-size: 11px;
    color: #999;
  }

  .challenge-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn-challenge-done {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    padding: 10px 18px;
    background: #1c2b22;
    color: #f5f0e8;
    border: none;
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .challenge-later {
    font-size: 12px;
    color: #5a7a64;
    text-decoration: none;
  }

  .challenge-complete {
    padding: 8px 0;
    text-align: center;
  }

  .complete-mark {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(45, 122, 80, 0.1);
    border: 2px solid #7ec99a;
    display: grid;
    place-items: center;
    margin: 0 auto 14px;
  }

  .s-card {
    overflow: hidden;
  }

  .s-card-head {
    padding: 16px 20px 14px;
    border-bottom: 1px solid #e8e0d0;
  }

  .s-card-title {
    font-size: 13px;
    font-weight: 700;
    color: #1c2b22;
    margin-bottom: 2px;
  }

  .s-card-sub {
    font-size: 11px;
    color: #999;
  }

  .pw-due {
    background: #1c2b22;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .pw-due-copy {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pw-due-count {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 38px;
    color: #7ec99a;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .pw-due-label {
    font-size: 13px;
    font-weight: 700;
    color: #f5f0e8;
  }

  .pw-due-sub {
    font-size: 11px;
    color: rgba(245, 240, 232, 0.4);
  }

  .btn-start {
    background: #7ec99a;
    color: #1c2b22;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }

  .pw-secondary {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid #e8e0d0;
    flex-wrap: wrap;
  }

  .pw-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #5a7a64;
    background: #e8e0d0;
    border-radius: 20px;
    padding: 4px 10px;
  }

  .pw-pill.dim {
    color: #999;
    background: transparent;
    border: 1px solid #e8e0d0;
  }

  .pw-output {
    padding: 12px 16px 16px;
  }

  .pw-output-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5a7a64;
    margin-bottom: 8px;
  }

  .pw-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
  }

  .pw-chip {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 12px;
    color: #1c2b22;
    background: #f5f0e8;
    border: 1px solid #e8e0d0;
    border-radius: 7px;
    padding: 4px 9px;
  }

  .pw-output-sub {
    font-size: 11px;
    color: #999;
    line-height: 1.4;
  }

  .cleachtadh-cta {
    padding: 16px 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .cleachtadh-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(28, 43, 34, 0.06);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .cleachtadh-title {
    font-size: 13px;
    font-weight: 700;
    color: #1c2b22;
    margin-bottom: 3px;
  }

  .cleachtadh-body {
    font-size: 12px;
    color: #777;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .cleachtadh-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #2d7a50;
    text-decoration: none;
  }

  .goal-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
  }

  .goal-row + .goal-row {
    border-top: 1px solid #e8e0d0;
  }

  .empty-state {
    padding: 16px 20px;
    font-size: 12px;
    color: #777;
    line-height: 1.5;
  }

  .goal-ring {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .goal-ring svg {
    transform: rotate(-90deg);
  }

  .gr-bg,
  .gr-fill {
    fill: none;
    stroke-width: 3;
  }

  .gr-bg {
    stroke: #e8e0d0;
  }

  .gr-fill {
    stroke: #2d7a50;
    stroke-linecap: round;
  }

  .goal-pct {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 8px;
    font-weight: 700;
    color: #5a7a64;
  }

  .goal-info {
    flex: 1;
    min-width: 0;
  }

  .goal-name {
    font-size: 12px;
    font-weight: 700;
    color: #1c2b22;
    margin-bottom: 1px;
    line-height: 1.3;
  }

  .goal-meta,
  .goals-count {
    font-size: 10px;
    color: #999;
  }

  .goals-footer {
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #e8e0d0;
  }

  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1c2b22;
    color: #f5f0e8;
    border-radius: 12px;
    padding: 11px 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 999;
  }

  .mobile-nav {
    display: none;
  }

  @media (max-width: 768px) {
    .dash-nav {
      padding: 0 16px;
    }

    .nav-links {
      display: none;
    }

    .page {
      grid-template-columns: 1fr;
      padding: 20px 16px 100px;
      gap: 16px;
    }

    .greeting {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 20px;
      margin-bottom: 0;
    }

    .greeting-meta {
      flex-direction: row;
      align-items: center;
    }

    .greeting-headline {
      font-size: 26px;
    }

    .next-up {
      padding: 20px;
      border-radius: 16px;
    }

    .next-lesson {
      font-size: 20px;
    }

    .next-desc {
      font-size: 13px;
      margin-bottom: 16px;
    }

    .main-col,
    .sidebar {
      grid-column: 1 / -1;
      gap: 16px;
    }

    .mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 68px;
      background: rgba(245, 240, 232, 0.96);
      backdrop-filter: blur(20px);
      border-top: 1px solid #e8e0d0;
      z-index: 50;
      align-items: center;
      justify-content: space-around;
      padding: 0 4px 4px;
    }

    .mnav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 0;
      text-decoration: none;
    }

    .mnav-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      color: #bbb;
    }

    .mnav-item.active .mnav-icon {
      background: rgba(45, 122, 80, 0.12);
      color: #2d7a50;
    }

    .mnav-lbl {
      font-size: 10px;
      font-weight: 600;
      color: #bbb;
    }

    .mnav-item.active .mnav-lbl {
      color: #2d7a50;
    }
  }
</style>
