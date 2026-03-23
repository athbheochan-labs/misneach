<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let loading = true;
  let saving = false;
  let message = '';
  let error = '';
  let previewUrl = '';

  let courseSlug = '';
  let lessonSlug = '';

  let courseTitle = '';
  let lessonTitle = '';
  let order = 1;
  let lang = 'ga';
  let estimatedMinutes = 10;
  let summary = '';
  let markdown = '';

  let isValid = false;
  let validationErrors: string[] = [];
  let contentVersion: string | null = null;

  const learnerBase = import.meta.env.VITE_LEARNER_BASE_URL || 'http://localhost:5173';

  async function loadDraft() {
    loading = true;
    error = '';
    message = '';

    try {
      const params = $page.params;
      courseSlug = params.courseSlug;
      lessonSlug = params.lessonSlug;

      const res = await fetch(
        `/api/admin/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/draft`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        throw new Error('Failed to load lesson draft');
      }

      const payload = await res.json();
      courseTitle = payload?.course?.courseTitle || courseSlug;
      lessonTitle = payload?.lesson?.lessonTitle || lessonSlug;
      order = Number(payload?.lesson?.order || 1);
      lang = String(payload?.lesson?.lang || payload?.course?.lang || 'ga');
      estimatedMinutes = Number(payload?.lesson?.estimatedMinutes || 10);
      summary = String(payload?.lesson?.summary || '');
      markdown = String(payload?.lesson?.markdown || '');
      isValid = Boolean(payload?.lesson?.isValid);
      validationErrors = (payload?.lesson?.validationErrors || []) as string[];
      contentVersion = payload?.lesson?.contentVersion || null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load draft';
    } finally {
      loading = false;
    }
  }

  async function saveDraft() {
    saving = true;
    error = '';
    message = '';
    previewUrl = '';

    try {
      const res = await fetch(
        `/api/admin/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/draft`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseTitle,
            lessonTitle,
            order,
            lang,
            estimatedMinutes,
            summary,
            markdown,
          }),
        },
      );
      if (!res.ok) {
        throw new Error('Failed to save draft');
      }

      const payload = await res.json();
      isValid = Boolean(payload?.lesson?.isValid);
      validationErrors = (payload?.lesson?.validationErrors || []) as string[];
      contentVersion = payload?.lesson?.contentVersion || null;
      message = 'Draft saved';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save draft';
    } finally {
      saving = false;
    }
  }

  async function createPreviewLink() {
    error = '';
    message = '';
    previewUrl = '';

    const res = await fetch('/api/admin/courses/releases/preview-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      error = 'Failed to create preview token';
      return;
    }

    const payload = await res.json();
    const token = String(payload?.token || '');
    if (!token) {
      error = 'Preview token missing from response';
      return;
    }

    previewUrl = `${learnerBase}/dashboard/courses/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lessonSlug)}?previewToken=${encodeURIComponent(token)}`;
    message = 'Preview token created';
  }

  async function publishNow() {
    error = '';
    message = '';

    const res = await fetch('/api/admin/courses/releases/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      error = 'Publish failed';
      return;
    }

    message = 'Published successfully';
  }

  onMount(loadDraft);
</script>

{#if loading}
  <section class="page-card fade-in">
    <p>Loading draft...</p>
  </section>
{:else}
  <a class="back-link" href="/admin/courses">← Back to courses</a>

  <section class="page-card fade-in">
    <header class="page-header">
      <div>
        <h2>{courseTitle}</h2>
        <p>
          <span class="mono">{courseSlug}/{lessonSlug}</span>
          {#if contentVersion}
            • version <span class="mono">{contentVersion}</span>
          {/if}
        </p>
      </div>
      <span class="pill {isValid ? 'pill-valid' : 'pill-invalid'}">{isValid ? 'valid draft' : 'needs fixes'}</span>
    </header>

    {#if error}
      <div class="status status-error">{error}</div>
    {/if}
    {#if message}
      <div class="status status-ok" style="margin-top: 8px;">{message}</div>
    {/if}
  </section>

  <section class="page-card fade-in">
    <h3 class="section-title">Lesson Metadata</h3>

    <div class="field-grid">
      <div class="field">
        <label for="courseTitle">Course title</label>
        <input id="courseTitle" bind:value={courseTitle} />
      </div>

      <div class="field">
        <label for="lessonTitle">Lesson title</label>
        <input id="lessonTitle" bind:value={lessonTitle} />
      </div>
    </div>

    <div class="field-grid cols-3" style="margin-top: 10px;">
      <div class="field">
        <label for="order">Order</label>
        <input id="order" bind:value={order} type="number" min="1" />
      </div>
      <div class="field">
        <label for="lang">Language</label>
        <input id="lang" bind:value={lang} />
      </div>
      <div class="field">
        <label for="estimatedMinutes">Estimated minutes</label>
        <input id="estimatedMinutes" bind:value={estimatedMinutes} type="number" min="1" />
      </div>
    </div>

    <div class="field" style="margin-top: 10px;">
      <label for="summary">Summary</label>
      <textarea id="summary" class="textarea-md" bind:value={summary}></textarea>
    </div>
  </section>

  <section class="page-card fade-in">
    <div class="inline-split" style="margin-bottom: 10px;">
      <h3 class="section-title" style="margin-bottom: 0;">Markdown Source</h3>
      <p class="muted">Saved revisions are immutable once published.</p>
    </div>

    <div class="field">
      <label for="markdown">Lesson markdown</label>
      <textarea id="markdown" class="textarea-lg mono" bind:value={markdown}></textarea>
    </div>

    <div class="btn-row" style="margin-top: 12px;">
      <button class="btn btn-primary" on:click={saveDraft} disabled={saving}>
        {saving ? 'Saving...' : 'Save Draft'}
      </button>
      <button class="btn" on:click={createPreviewLink}>Create Preview Link</button>
      <button class="btn btn-danger" on:click={publishNow}>Publish Current Valid Drafts</button>
    </div>
  </section>

  {#if previewUrl}
    <section class="page-card fade-in">
      <h3 class="section-title">Preview Link</h3>
      <p class="muted" style="margin-bottom: 8px;">
        This tokenized link lets admins review candidate content in learner flow.
      </p>
      <p><a href={previewUrl} target="_blank" rel="noreferrer">Open learner preview</a></p>
      <div class="preview-url mono" style="margin-top: 8px;">{previewUrl}</div>
    </section>
  {/if}

  <section class="page-card fade-in">
    <h3 class="section-title">Validation</h3>
    <p style="margin-bottom: 10px;">
      Status:
      <span class="pill {isValid ? 'pill-valid' : 'pill-invalid'}" style="margin-left: 8px;">
        {isValid ? 'valid' : 'invalid'}
      </span>
    </p>
    {#if validationErrors.length > 0}
      <ul class="stack" style="padding-left: 18px; margin: 0;">
        {#each validationErrors as issue}
          <li>{issue}</li>
        {/each}
      </ul>
    {:else}
      <p class="muted">No validation errors.</p>
    {/if}
  </section>
{/if}
