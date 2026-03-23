<script lang="ts">
  import { onMount } from 'svelte';

  type DiscountCode = {
    id: number;
    code: string;
    label: string | null;
    description: string | null;
    audience: 'learner' | 'business' | 'both';
    appliesTo: 'monthly' | 'annual' | 'business-kit' | 'any';
    discountType: 'percent' | 'fixed_cents';
    discountValue: number;
    currency: string;
    isEnabled: boolean;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type FormState = {
    id: number | null;
    code: string;
    label: string;
    description: string;
    audience: 'learner' | 'business' | 'both';
    appliesTo: 'monthly' | 'annual' | 'business-kit' | 'any';
    discountType: 'percent' | 'fixed_cents';
    discountValue: number;
    currency: string;
    isEnabled: boolean;
    startsAt: string;
    endsAt: string;
  };

  const emptyForm = (): FormState => ({
    id: null,
    code: '',
    label: '',
    description: '',
    audience: 'both',
    appliesTo: 'any',
    discountType: 'percent',
    discountValue: 10,
    currency: 'eur',
    isEnabled: true,
    startsAt: '',
    endsAt: '',
  });

  let loading = true;
  let saving = false;
  let error = '';
  let message = '';
  let codes: DiscountCode[] = [];
  let form: FormState = emptyForm();

  function fmtDate(value: string | null | undefined) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'n/a';
    return date.toLocaleString();
  }

  function fromIsoToInput(value: string | null | undefined) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  function edit(code: DiscountCode) {
    form = {
      id: code.id,
      code: code.code,
      label: code.label || '',
      description: code.description || '',
      audience: code.audience,
      appliesTo: code.appliesTo,
      discountType: code.discountType,
      discountValue: code.discountValue,
      currency: code.currency,
      isEnabled: code.isEnabled,
      startsAt: fromIsoToInput(code.startsAt),
      endsAt: fromIsoToInput(code.endsAt),
    };
    message = '';
    error = '';
  }

  function resetForm() {
    form = emptyForm();
    error = '';
    message = '';
  }

  async function loadCodes() {
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/admin/discount-codes', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load discount codes');
      const payload = await res.json();
      codes = (payload?.codes || []) as DiscountCode[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load discount codes';
    } finally {
      loading = false;
    }
  }

  async function save() {
    saving = true;
    error = '';
    message = '';

    try {
      const body = {
        code: form.code,
        label: form.label || undefined,
        description: form.description || undefined,
        audience: form.audience,
        appliesTo: form.appliesTo,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        currency: form.currency,
        isEnabled: form.isEnabled,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };

      const isEdit = form.id != null;
      const path = isEdit ? `/api/admin/discount-codes/${form.id}` : '/api/admin/discount-codes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to save discount code');
      }

      message = isEdit ? 'Discount code updated' : 'Discount code created';
      await loadCodes();
      if (!isEdit) resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save discount code';
    } finally {
      saving = false;
    }
  }

  async function toggleEnabled(code: DiscountCode) {
    error = '';
    message = '';

    const res = await fetch(`/api/admin/discount-codes/${code.id}/enabled`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !code.isEnabled }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      error = payload?.message || payload?.error || 'Failed to update status';
      return;
    }

    message = `Code ${code.code} ${code.isEnabled ? 'disabled' : 'enabled'}`;
    await loadCodes();
  }

  onMount(loadCodes);
</script>

<section class="page-card fade-in">
  <header class="page-header">
    <div>
      <h2>Discount Codes</h2>
      <p>Create, enable, and schedule promo windows for learner and business checkout flows.</p>
    </div>
    <button class="btn" on:click={resetForm}>New code</button>
  </header>

  {#if error}
    <div class="status status-error">{error}</div>
  {/if}
  {#if message}
    <div class="status status-ok" style="margin-top: 8px;">{message}</div>
  {/if}

  <div class="field-grid cols-3" style="margin-top: 12px;">
    <div class="field">
      <label for="code">Code</label>
      <input id="code" bind:value={form.code} placeholder="e.g. SPRING25" />
    </div>

    <div class="field">
      <label for="label">Label</label>
      <input id="label" bind:value={form.label} placeholder="Spring launch" />
    </div>

    <div class="field">
      <label for="currency">Currency</label>
      <input id="currency" bind:value={form.currency} />
    </div>
  </div>

  <div class="field" style="margin-top: 10px;">
    <label for="description">Description</label>
    <textarea id="description" class="textarea-md" bind:value={form.description}></textarea>
  </div>

  <div class="field-grid cols-3" style="margin-top: 10px;">
    <div class="field">
      <label for="audience">Audience</label>
      <select id="audience" bind:value={form.audience}>
        <option value="both">Both</option>
        <option value="learner">Learner</option>
        <option value="business">Business</option>
      </select>
    </div>

    <div class="field">
      <label for="appliesTo">Applies To</label>
      <select id="appliesTo" bind:value={form.appliesTo}>
        <option value="any">Any</option>
        <option value="monthly">Monthly</option>
        <option value="annual">Annual</option>
        <option value="business-kit">Business kit</option>
      </select>
    </div>

    <div class="field">
      <label for="isEnabled">Enabled</label>
      <select id="isEnabled" bind:value={form.isEnabled}>
        <option value={true}>Enabled</option>
        <option value={false}>Disabled</option>
      </select>
    </div>
  </div>

  <div class="field-grid cols-3" style="margin-top: 10px;">
    <div class="field">
      <label for="discountType">Discount Type</label>
      <select id="discountType" bind:value={form.discountType}>
        <option value="percent">Percent</option>
        <option value="fixed_cents">Fixed cents</option>
      </select>
    </div>

    <div class="field">
      <label for="discountValue">Discount Value</label>
      <input id="discountValue" type="number" min="0" bind:value={form.discountValue} />
    </div>

    <div class="field"></div>
  </div>

  <div class="field-grid cols-3" style="margin-top: 10px;">
    <div class="field">
      <label for="startsAt">Starts At (optional)</label>
      <input id="startsAt" type="datetime-local" bind:value={form.startsAt} />
    </div>

    <div class="field">
      <label for="endsAt">Ends At (optional)</label>
      <input id="endsAt" type="datetime-local" bind:value={form.endsAt} />
    </div>

    <div class="field" style="display:flex;align-items:flex-end;">
      <button class="btn btn-primary" on:click={save} disabled={saving}>
        {saving ? 'Saving...' : form.id ? 'Update code' : 'Create code'}
      </button>
    </div>
  </div>
</section>

<section class="page-card fade-in">
  <h3 class="section-title">Existing Codes</h3>

  {#if loading}
    <p>Loading discount codes...</p>
  {:else if codes.length === 0}
    <p class="muted">No discount codes yet.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Status</th>
            <th>Audience</th>
            <th>Scope</th>
            <th>Discount</th>
            <th>Window</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each codes as code}
            <tr>
              <td>
                <strong class="mono">{code.code}</strong>
                {#if code.label}
                  <div class="muted" style="font-size:0.8rem; margin-top:2px;">{code.label}</div>
                {/if}
              </td>
              <td>
                <span class="pill {code.isEnabled ? 'pill-valid' : 'pill-invalid'}">
                  {code.isEnabled ? 'enabled' : 'disabled'}
                </span>
              </td>
              <td>{code.audience}</td>
              <td>{code.appliesTo}</td>
              <td>
                {#if code.discountType === 'percent'}
                  {code.discountValue}%
                {:else}
                  {code.discountValue} cents
                {/if}
              </td>
              <td>
                <div>{fmtDate(code.startsAt)}</div>
                <div class="muted" style="font-size:0.78rem;">to {fmtDate(code.endsAt)}</div>
              </td>
              <td>{fmtDate(code.updatedAt)}</td>
              <td>
                <div class="btn-row">
                  <button class="btn" on:click={() => edit(code)}>Edit</button>
                  <button class="btn" on:click={() => toggleEnabled(code)}>
                    {code.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
