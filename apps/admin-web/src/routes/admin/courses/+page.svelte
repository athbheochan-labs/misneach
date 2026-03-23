<script lang="ts">
  import { onMount } from 'svelte';

  type LessonItem = {
    lessonSlug: string;
    lessonTitle: string;
    moduleKey?: string | null;
    moduleName?: string | null;
    unitKey?: string | null;
    unitName?: string | null;
    group?: string | null;
    order: number;
    isValid: boolean;
  };

  type CourseItem = {
    courseSlug: string;
    courseTitle: string;
    lang: string;
    summary?: string | null;
    lessonCount: number;
    validLessonCount: number;
    lessons: LessonItem[];
    updatedAt: string;
  };

  type ReleaseItem = {
    id: string;
    status: 'candidate' | 'published';
    label?: string | null;
    contentVersion: string;
    createdAt: string;
    publishedAt?: string | null;
    isActive: boolean;
  };

  let loading = true;
  let error = '';
  let courses: CourseItem[] = [];
  let releases: ReleaseItem[] = [];
  let activeReleaseId: string | null = null;
  let provider = 'file';

  type LessonGroup = {
    key: string;
    title: string;
    moduleTitle: string | null;
    lessons: LessonItem[];
  };

  function titleize(value: string) {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function groupedLessons(course: CourseItem): LessonGroup[] {
    const map = new Map<string, LessonGroup>();

    for (const lesson of course.lessons || []) {
      const key = lesson.unitKey || lesson.group || 'general';
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: lesson.unitName || (lesson.group ? titleize(lesson.group) : 'General'),
          moduleTitle: lesson.moduleName || null,
          lessons: [],
        });
      }
      map.get(key)!.lessons.push(lesson);
    }

    const out = Array.from(map.values());
    for (const group of out) {
      group.lessons = group.lessons
        .slice()
        .sort((a, b) => a.order - b.order || a.lessonTitle.localeCompare(b.lessonTitle));
    }
    return out;
  }

  function fmtDate(value: string | null | undefined) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'n/a';
    return date.toLocaleString();
  }

  $: totalLessons = courses.reduce((count, course) => count + (course.lessonCount || 0), 0);
  $: invalidLessons = courses.reduce(
    (count, course) => count + Math.max(0, (course.lessonCount || 0) - (course.validLessonCount || 0)),
    0,
  );

  async function loadAll() {
    loading = true;
    error = '';
    try {
      const [coursesRes, releasesRes] = await Promise.all([
        fetch('/api/admin/courses', { cache: 'no-store' }),
        fetch('/api/admin/courses/releases', { cache: 'no-store' }),
      ]);
      if (!coursesRes.ok) throw new Error('Failed to load courses');
      if (!releasesRes.ok) throw new Error('Failed to load releases');

      const coursesPayload = await coursesRes.json();
      const releasesPayload = await releasesRes.json();

      provider = String(coursesPayload?.provider || 'file');
      courses = (coursesPayload?.courses || []) as CourseItem[];
      releases = (releasesPayload?.releases || []) as ReleaseItem[];
      activeReleaseId = (releasesPayload?.activeReleaseId as string) || null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load admin data';
    } finally {
      loading = false;
    }
  }

  async function publishRelease(releaseId: string) {
    error = '';
    const res = await fetch('/api/admin/courses/releases/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseId }),
    });
    if (!res.ok) {
      error = 'Publish failed';
      return;
    }
    await loadAll();
  }

  onMount(loadAll);
</script>

<section class="page-card fade-in">
  <header class="page-header">
    <div>
      <h2>Courses</h2>
      <p>Manage drafts and review validation status before publishing.</p>
    </div>
    <span class="pill pill-active">Provider: {provider}</span>
  </header>

  <div class="grid-metrics">
    <article class="metric">
      <p class="label">Draft Courses</p>
      <p class="value">{courses.length}</p>
    </article>
    <article class="metric">
      <p class="label">Draft Lessons</p>
      <p class="value">{totalLessons}</p>
    </article>
    <article class="metric">
      <p class="label">Invalid Lessons</p>
      <p class="value">{invalidLessons}</p>
    </article>
  </div>
</section>

{#if loading}
  <section class="page-card fade-in">
    <p>Loading courses and releases...</p>
  </section>
{:else}
  {#if error}
    <section class="status status-error fade-in">{error}</section>
  {/if}

  <section class="page-card fade-in">
    <h3 class="section-title">Course Drafts</h3>

    {#if courses.length === 0}
      <p class="muted">No course drafts found.</p>
    {:else}
      <div class="stack">
        {#each courses as course}
          <article class="course-card">
            <header class="course-topline">
              <div>
                <h4>{course.courseTitle}</h4>
                <p class="course-meta">
                  <span class="mono">{course.courseSlug}</span> • {course.lang} • Updated {fmtDate(course.updatedAt)}
                </p>
              </div>
              <span class="pill {course.validLessonCount === course.lessonCount ? 'pill-valid' : 'pill-invalid'}">
                {course.validLessonCount}/{course.lessonCount} valid
              </span>
            </header>

            {#if course.summary}
              <p class="muted" style="margin-top: 8px;">{course.summary}</p>
            {/if}

            {#if course.lessons?.length}
              <div class="unit-stack">
                {#each groupedLessons(course) as lessonGroup}
                  <section class="unit-block">
                    <p class="unit-title">
                      {#if lessonGroup.moduleTitle}
                        {lessonGroup.moduleTitle} •
                      {/if}
                      {lessonGroup.title}
                    </p>

                    <ul class="lessons-list">
                      {#each lessonGroup.lessons as lesson}
                        <li>
                          <a
                            class="lesson-link"
                            href={`/admin/courses/${encodeURIComponent(course.courseSlug)}/${encodeURIComponent(lesson.lessonSlug)}`}
                          >
                            <span class="index">{lesson.order}</span>
                            <span>{lesson.lessonTitle}</span>
                          </a>
                          {#if !lesson.isValid}
                            <span class="pill pill-invalid" style="margin-left: 8px;">invalid</span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  </section>
                {/each}
              </div>
            {:else}
              <p class="muted" style="margin-top: 8px;">No lesson drafts yet.</p>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <section class="page-card fade-in">
    <header class="page-header">
      <div>
        <h3>Releases</h3>
        <p>Published snapshots are immutable and can be switched active instantly.</p>
      </div>
      {#if activeReleaseId}
        <span class="pill pill-active">Active Release #{activeReleaseId}</span>
      {/if}
    </header>

    {#if releases.length === 0}
      <p class="muted">No releases yet.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Version</th>
              <th>Label</th>
              <th>Created</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each releases as release}
              <tr>
                <td class="mono">{release.id}</td>
                <td>
                  <span class="pill {release.isActive ? 'pill-active' : release.status === 'published' ? 'pill-valid' : 'pill-invalid'}">
                    {release.isActive || release.id === activeReleaseId ? 'active' : release.status}
                  </span>
                </td>
                <td class="mono">{release.contentVersion}</td>
                <td>{release.label || '-'}</td>
                <td>{fmtDate(release.createdAt)}</td>
                <td>{fmtDate(release.publishedAt)}</td>
                <td>
                  {#if !release.isActive}
                    <button class="btn btn-primary" on:click={() => publishRelease(release.id)}>Publish</button>
                  {:else}
                    <span class="muted">Current</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
{/if}
