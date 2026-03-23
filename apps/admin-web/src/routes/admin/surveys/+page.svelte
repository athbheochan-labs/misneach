<script lang="ts">
  import { onMount } from 'svelte';

  type Template = {
    id: string;
    key: string;
    legacyId: string | null;
    title: string;
    audience: 'staff' | 'customers';
    description: string | null;
    questions: unknown[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  };

  type FormState = {
    id: string | null;
    key: string;
    legacyId: string;
    title: string;
    audience: 'staff' | 'customers';
    description: string;
    isActive: boolean;
    questionsJson: string;
  };

  const emptyForm = (): FormState => ({
    id: null,
    key: '',
    legacyId: '',
    title: '',
    audience: 'staff',
    description: '',
    isActive: true,
    questionsJson: '[]',
  });

  let loading = true;
  let saving = false;
  let error = '';
  let message = '';
  let templates: Template[] = [];
  let form: FormState = emptyForm();

  function resetForm() {
    form = emptyForm();
    error = '';
    message = '';
  }

  function edit(template: Template) {
    form = {
      id: template.id,
      key: template.key,
      legacyId: template.legacyId || '',
      title: template.title,
      audience: template.audience,
      description: template.description || '',
      isActive: template.isActive,
      questionsJson: JSON.stringify(template.questions, null, 2),
    };
    error = '';
    message = '';
  }

  async function loadTemplates() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/admin/surveys/templates', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load survey templates');
      const payload = await res.json();
      templates = (payload?.templates || []) as Template[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load survey templates';
    } finally {
      loading = false;
    }
  }

  async function saveTemplate() {
    saving = true;
    error = '';
    message = '';

    try {
      const parsedQuestions = JSON.parse(form.questionsJson);
      const body = {
        key: form.key,
        legacyId: form.legacyId || undefined,
        title: form.title,
        audience: form.audience,
        description: form.description || undefined,
        isActive: form.isActive,
        questions: parsedQuestions,
      };

      const isEdit = Boolean(form.id);
      const path = isEdit ? `/api/admin/surveys/templates/${form.id}` : '/api/admin/surveys/templates';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to save survey template');
      }

      message = isEdit ? 'Survey template updated' : 'Survey template created';
      await loadTemplates();
      if (!isEdit) resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save survey template';
    } finally {
      saving = false;
    }
  }

  async function removeTemplate(template: Template) {
    if (!confirm(`Delete template ${template.key}?`)) return;
    error = '';
    message = '';
    const res = await fetch(`/api/admin/surveys/templates/${template.id}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      error = payload?.message || payload?.error || 'Failed to delete template';
      return;
    }
    message = `Template ${template.key} deleted`;
    await loadTemplates();
    if (form.id === template.id) resetForm();
  }

  onMount(loadTemplates);
</script>

<section class="page-card fade-in">
  <header class="page-header">
    <div>
      <h2>Survey Templates</h2>
      <p>Create and manage DB-backed survey definitions used by setup preview and live forms.</p>
    </div>
    <button class="btn" on:click={resetForm}>New template</button>
  </header>

  {#if error}
    <div class="status status-error">{error}</div>
  {/if}
  {#if message}
    <div class="status status-ok" style="margin-top: 8px;">{message}</div>
  {/if}

  <div class="field-grid cols-3" style="margin-top: 12px;">
    <div class="field">
      <label for="key">Key</label>
      <input id="key" bind:value={form.key} placeholder="staff-appetite" />
    </div>
    <div class="field">
      <label for="legacyId">Legacy ID (optional)</label>
      <input id="legacyId" bind:value={form.legacyId} placeholder="staff-cafe-v1" />
    </div>
    <div class="field">
      <label for="audience">Audience</label>
      <select id="audience" bind:value={form.audience}>
        <option value="staff">Staff</option>
        <option value="customers">Customers</option>
      </select>
    </div>
  </div>

  <div class="field-grid cols-3" style="margin-top: 10px;">
    <div class="field">
      <label for="title">Title</label>
      <input id="title" bind:value={form.title} />
    </div>
    <div class="field">
      <label for="active">Active</label>
      <select id="active" bind:value={form.isActive}>
        <option value={true}>true</option>
        <option value={false}>false</option>
      </select>
    </div>
    <div class="field"></div>
  </div>

  <div class="field" style="margin-top: 10px;">
    <label for="description">Description</label>
    <textarea id="description" class="textarea-md" bind:value={form.description}></textarea>
  </div>

  <div class="field" style="margin-top: 10px;">
    <label for="questions">Questions JSON</label>
    <textarea id="questions" class="textarea-lg mono" bind:value={form.questionsJson}></textarea>
  </div>

  <div style="margin-top: 10px;">
    <button class="btn btn-primary" on:click={saveTemplate} disabled={saving}>
      {saving ? 'Saving...' : form.id ? 'Update template' : 'Create template'}
    </button>
  </div>
</section>

<section class="page-card fade-in">
  <h3 class="section-title">Existing Templates</h3>

  {#if loading}
    <p>Loading templates...</p>
  {:else if templates.length === 0}
    <p class="muted">No survey templates yet.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Title</th>
            <th>Audience</th>
            <th>Status</th>
            <th>Questions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each templates as template}
            <tr>
              <td><strong class="mono">{template.key}</strong></td>
              <td>{template.title}</td>
              <td>{template.audience}</td>
              <td>{template.isActive ? 'active' : 'inactive'}</td>
              <td>{template.questions?.length || 0}</td>
              <td>
                <div class="btn-row">
                  <button class="btn" on:click={() => edit(template)}>Edit</button>
                  <button class="btn" on:click={() => removeTemplate(template)}>Delete</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
