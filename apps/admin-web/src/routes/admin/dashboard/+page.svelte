<script lang="ts">
  import { onMount } from 'svelte';

  type DashboardPayload = {
    generatedAt: string;
    courses: {
      learnerCount: number;
      lessonsTracked: number;
      lessonCompletion: {
        startedCount: number;
        completedCount: number;
        completionRate: number;
      };
      dropoff: {
        topLessons: Array<{
          courseSlug: string;
          lessonSlug: string;
          lessonTitle: string;
          startedCount: number;
          completedCount: number;
          dropoffCount: number;
          completionRate: number;
          dropoffRate: number;
          isChallengeLesson: boolean;
          isRealWorldChallenge: boolean;
        }>;
      };
      featureUsage: Array<{
        source: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect';
        events: number;
        activeClients: number;
      }>;
      courseGoalSignals: {
        challengeLessons: {
          startedCount: number;
          completedCount: number;
          completionRate: number;
        };
        realWorldChallenges: {
          startedCount: number;
          completedCount: number;
          completionRate: number;
        };
      };
    };
    focus:
      | {
          unavailable: true;
          error?: string;
        }
      | {
          goals: {
            totalGoals: number;
            completedGoals: number;
            activeGoals: number;
            completionRate: number;
          };
          courseRelatedGoals: {
            totalGoals: number;
            completedGoals: number;
            activeGoals: number;
            completionRate: number;
          };
          realWorldChallengeGoals: {
            totalGoals: number;
            completedGoals: number;
            activeGoals: number;
            completionRate: number;
          };
          learnersWithCourseGoals: number;
          courseGoalEntriesLast30Days: {
            totalEntries: number;
            manualCheckoffs: number;
            focusSessionEntries: number;
          };
        };
    challenges:
      | {
          unavailable: true;
          error?: string;
        }
      | {
          totalChallenges: number;
          completedChallenges: number;
          activeChallenges: number;
          completionRate: number;
          learnersWithChallenges: number;
          learnersWithCompletion: number;
          byLesson: Array<{
            courseSlug: string | null;
            lessonSlug: string | null;
            lessonTitle: string;
            total: number;
            completed: number;
            completionRate: number;
          }>;
        };
  };

  let loading = true;
  let error = '';
  let data: DashboardPayload | null = null;

  const percent = (value: number) => `${Math.round((value || 0) * 100)}%`;
  const compact = (value: number) => Intl.NumberFormat('en', { notation: 'compact' }).format(value || 0);

  async function loadDashboard() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/admin/analytics/dashboard', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const details =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error?: unknown }).error || '')
            : '';
        throw new Error(details || `Failed to load admin analytics dashboard (${res.status})`);
      }
      data = (await res.json()) as DashboardPayload;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  }

  onMount(loadDashboard);
</script>

<section class="page-card fade-in">
  <header class="page-header">
    <div>
      <h2>Engagement Dashboard</h2>
      <p>Completion, drop-off, feature usage, and course-goal/challenge engagement.</p>
    </div>
    <button class="btn" on:click={loadDashboard} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  </header>

  {#if data}
    <p class="muted">Generated {new Date(data.generatedAt).toLocaleString()}</p>
  {/if}
</section>

{#if loading}
  <section class="page-card fade-in">
    <p>Loading analytics…</p>
  </section>
{:else}
  {#if error}
    <section class="status status-error fade-in">{error}</section>
  {/if}

  {#if data}
    <section class="page-card fade-in">
      <h3 class="section-title">Lesson Engagement</h3>
      <div class="grid-metrics">
        <article class="metric">
          <p class="label">Learners Seen</p>
          <p class="value">{compact(data.courses.learnerCount)}</p>
        </article>
        <article class="metric">
          <p class="label">Lessons Tracked</p>
          <p class="value">{data.courses.lessonsTracked}</p>
        </article>
        <article class="metric">
          <p class="label">Overall Completion</p>
          <p class="value">{percent(data.courses.lessonCompletion.completionRate)}</p>
        </article>
      </div>
    </section>

    <section class="page-card fade-in">
      <h3 class="section-title">Where Learners Drop Off</h3>
      {#if data.courses.dropoff.topLessons.length === 0}
        <p class="muted">Not enough data yet to identify consistent drop-off points.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Started</th>
                <th>Completed</th>
                <th>Drop-off</th>
                <th>Drop-off Rate</th>
              </tr>
            </thead>
            <tbody>
              {#each data.courses.dropoff.topLessons as lesson}
                <tr>
                  <td>
                    <div class="lesson-title">{lesson.lessonTitle}</div>
                    <div class="muted small mono">{lesson.courseSlug}/{lesson.lessonSlug}</div>
                    {#if lesson.isRealWorldChallenge}
                      <span class="pill pill-active" style="margin-top: 6px;">Real world challenge</span>
                    {:else if lesson.isChallengeLesson}
                      <span class="pill pill-invalid" style="margin-top: 6px;">Challenge lesson</span>
                    {/if}
                  </td>
                  <td>{lesson.startedCount}</td>
                  <td>{lesson.completedCount}</td>
                  <td>{lesson.dropoffCount}</td>
                  <td>{percent(lesson.dropoffRate)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="page-card fade-in">
      <h3 class="section-title">Feature Usage</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Feature Signal</th>
              <th>Events</th>
              <th>Active Learners</th>
            </tr>
          </thead>
          <tbody>
            {#each data.courses.featureUsage as feature}
              <tr>
                <td class="mono">{feature.source}</td>
                <td>{compact(feature.events)}</td>
                <td>{feature.activeClients}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="page-card fade-in">
      <h3 class="section-title">Course Goals & Real-World Challenges</h3>
      <div class="grid-metrics">
        <article class="metric">
          <p class="label">Challenge Lessons Completion</p>
          <p class="value">{percent(data.courses.courseGoalSignals.challengeLessons.completionRate)}</p>
        </article>
        <article class="metric">
          <p class="label">Real-World Challenge Completion</p>
          <p class="value">{percent(data.courses.courseGoalSignals.realWorldChallenges.completionRate)}</p>
        </article>
        <article class="metric">
          <p class="label">Real-World Challenges Completed</p>
          <p class="value">{data.courses.courseGoalSignals.realWorldChallenges.completedCount}</p>
        </article>
      </div>

      {#if 'unavailable' in data.focus}
        <div class="status status-error" style="margin-top: 12px;">
          Focus goal analytics unavailable: {data.focus.error || 'service unavailable'}
        </div>
      {:else}
        <div class="grid-metrics" style="margin-top: 12px;">
          <article class="metric">
            <p class="label">Learners With Course Goals</p>
            <p class="value">{data.focus.learnersWithCourseGoals}</p>
          </article>
          <article class="metric">
            <p class="label">Course Goal Completion</p>
            <p class="value">{percent(data.focus.courseRelatedGoals.completionRate)}</p>
          </article>
          <article class="metric">
            <p class="label">Real-World Goal Completion</p>
            <p class="value">{percent(data.focus.realWorldChallengeGoals.completionRate)}</p>
          </article>
        </div>
      {/if}

      {#if 'unavailable' in data.challenges}
        <div class="status status-error" style="margin-top: 12px;">
          Challenges analytics unavailable: {data.challenges.error || 'service unavailable'}
        </div>
      {:else if data.challenges.byLesson.length > 0}
        <div class="table-wrap" style="margin-top: 12px;">
          <table>
            <thead>
              <tr>
                <th>Challenge Lesson</th>
                <th>Total</th>
                <th>Completed</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {#each data.challenges.byLesson as item}
                <tr>
                  <td>
                    <div class="lesson-title">{item.lessonTitle}</div>
                    {#if item.courseSlug && item.lessonSlug}
                      <div class="muted small mono">{item.courseSlug}/{item.lessonSlug}</div>
                    {/if}
                  </td>
                  <td>{item.total}</td>
                  <td>{item.completed}</td>
                  <td>{percent(item.completionRate)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
{/if}

<style>
  .small {
    font-size: 0.78rem;
  }

  .lesson-title {
    font-weight: 600;
  }
</style>
