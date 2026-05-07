<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/api/client';
  import { isLikelyNetworkError } from '$lib/mobile/network-status';

  type DailyPrompt = {
    id: string;
    title: string;
    description: string;
    placeholder: string;
    dashed?: boolean;
  };

  type DailyEntry = {
    id: number;
    text: string;
    promptId: string;
    createdAt: string;
  };

  const prompts: DailyPrompt[] = [
    {
      id: 'your-day',
      title: 'Your day',
      description: 'How your day went, from morning to now.',
      placeholder:
        'Bhí lá maith agam inniu. D\'éirigh mé ar a seacht a chlog. Chuaigh mé ag obair agus ansin...'
    },
    {
      id: 'conversation-catch-up',
      title: 'Conversation catch-up',
      description: 'What you would tell your conversation partner next time.',
      placeholder:
        'An chéad uair eile a chasfaidh mé le mo chara comhrá, déarfaidh mé gur...'
    },
    {
      id: 'make-something',
      title: 'Make something',
      description: 'Walk through a process step by step.',
      placeholder:
        'Ar dtús, cuirim an citeal ar siúl. Ansin tógaim cupán amach agus cuirim tae ann...'
    },
    {
      id: 'describe-where-you-are',
      title: 'Describe where you are',
      description: 'Write what you can see around you right now.',
      placeholder:
        'Tá mé i mo shuí sa chistin anois. Tá bord mór os mo chomhair agus tá...'
    },
    {
      id: 'order-a-coffee',
      title: 'Order a coffee',
      description: 'Rehearse the full café conversation.',
      placeholder:
        'Dia duit, ba mhaith liom caife beag le bainne, le do thoil. An bhfuil sé le hól anseo nó le tabhairt leat?...'
    },
    {
      id: 'write-freely',
      title: 'Write freely',
      description: 'No prompt. Follow whatever Irish you have today.',
      placeholder:
        'Scríobh rud ar bith anseo. Ní gá plean a bheith agat. Tosaigh le habairt amháin agus lean ort...'
      ,
      dashed: true,
    },
  ];

  let loading = true;
  let saving = false;
  let selectedPromptId = '';
  let draftText = '';
  let entries: DailyEntry[] = [];
  let confirmationMessage = '';
  let errorMessage = '';

  $: selectedPrompt = prompts.find((prompt) => prompt.id === selectedPromptId) || null;
  $: canSubmit = draftText.trim().length > 0 && Boolean(selectedPromptId);

  function formatEntryDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function todayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function loadEntries() {
    loading = true;
    errorMessage = '';
    try {
      const response = await apiFetch('/api/proxy/daily-notes', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load previous entries');
      }
      const payload = await response.json();
      entries = Array.isArray(payload?.items)
        ? payload.items
            .map((item: any) => ({
              id: Number(item?.id),
              text: String(item?.text || ''),
              promptId: String(item?.promptId || ''),
              createdAt: String(item?.createdAt || ''),
            }))
            .filter((item: DailyEntry) => Number.isFinite(item.id) && item.text)
        : [];
    } catch (error) {
      errorMessage = isLikelyNetworkError(error)
        ? 'Reconnect to load your previous entries.'
        : error instanceof Error
          ? error.message
          : 'Failed to load previous entries';
    } finally {
      loading = false;
    }
  }

  function selectPrompt(promptId: string) {
    selectedPromptId = promptId;
    confirmationMessage = '';
    errorMessage = '';
  }

  function resetComposer() {
    draftText = '';
    selectedPromptId = '';
  }

  function finishWithoutSaving() {
    if (!canSubmit) return;
    confirmationMessage = "Done. The practice still counts.";
    errorMessage = '';
    resetComposer();
  }

  async function saveEntry() {
    if (!canSubmit || !selectedPrompt) return;
    saving = true;
    confirmationMessage = '';
    errorMessage = '';
    try {
      const response = await apiFetch('/api/proxy/daily-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draftText.trim(),
          promptId: selectedPrompt.id,
          date: todayIsoDate(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save entry');
      }

      const saved = await response.json();
      entries = [
        {
          id: Number(saved?.id || Date.now()),
          text: String(saved?.text || draftText.trim()),
          promptId: String(saved?.promptId || selectedPrompt.id),
          createdAt: String(saved?.createdAt || new Date().toISOString()),
        },
        ...entries,
      ];
      confirmationMessage = 'Saved. See you tomorrow.';
      resetComposer();
    } catch (error) {
      errorMessage = isLikelyNetworkError(error)
        ? 'Reconnect to save your entry.'
        : error instanceof Error
          ? error.message
          : 'Failed to save entry';
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    loadEntries().catch(() => undefined);
  });
</script>

<section class="daily-shell">
  <div class="daily-wrap">
    <div class="daily-head">
      <button class="back-link" type="button" onclick={() => goto('/dashboard/practice')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        Practice
      </button>
      <div class="daily-eyebrow">Daily production</div>
      <h1 class="daily-title">Write about <em>your day</em></h1>
      <p class="daily-sub">Choose a prompt, write freely in Irish, and either save it or simply count the practice and move on.</p>
    </div>

    {#if confirmationMessage}
      <div class="daily-confirmation" role="status">
        <div class="daily-confirmation-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="daily-confirmation-text">{confirmationMessage}</div>
      </div>
    {/if}

    {#if errorMessage}
      <div class="daily-error" role="alert">{errorMessage}</div>
    {/if}

    <section class="daily-panel">
      <div class="daily-section-label">Pick a prompt</div>
      <div class="prompt-grid">
        {#each prompts as prompt}
          <button
            class={`prompt-card ${selectedPromptId === prompt.id ? 'selected' : ''} ${prompt.dashed ? 'dashed' : ''}`}
            type="button"
            onclick={() => selectPrompt(prompt.id)}
          >
            <div class="prompt-title">{prompt.title}</div>
            <div class="prompt-description">{prompt.description}</div>
          </button>
        {/each}
      </div>
    </section>

    {#if entries.length > 0}
      <section class="daily-panel previous-panel">
        <div class="daily-section-label">Previous entries</div>
        <div class="entry-list">
          {#each entries as entry}
            <article class="entry-card">
              <div class="entry-date">{formatEntryDate(entry.createdAt)}</div>
              <div class="entry-text">{entry.text}</div>
            </article>
          {/each}
        </div>
      </section>
    {:else if loading}
      <section class="daily-panel previous-panel">
        <div class="daily-section-label">Previous entries</div>
        <div class="empty-state">Loading your recent entries...</div>
      </section>
    {/if}

    {#if selectedPrompt}
      <section class="daily-panel composer-panel">
        <div class="daily-section-label">{selectedPrompt.title}</div>
        <textarea
          class="daily-textarea"
          bind:value={draftText}
          rows="8"
          placeholder={selectedPrompt.placeholder}
        ></textarea>

        <div class="composer-actions">
          <button class="composer-btn ghost" type="button" onclick={finishWithoutSaving} disabled={!canSubmit || saving}>
            Done, don't save
          </button>
          <button class="composer-btn primary" type="button" onclick={saveEntry} disabled={!canSubmit || saving}>
            {saving ? 'Saving...' : 'Save entry'}
          </button>
        </div>
      </section>
    {/if}
  </div>
</section>

<style>
  :global(body) {
    background: #f5f0e8;
  }

  .daily-shell {
    --forest: #1c2b22;
    --parchment: #f5f0e8;
    --parchment-dark: #e8e0d0;
    --moss: #2d7a50;
    --sage: #7ec99a;
    --muted: #5a7a64;
    --error: #9a3412;
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 20px 72px;
  }

  .daily-wrap {
    display: grid;
    gap: 18px;
  }

  .daily-head {
    display: grid;
    gap: 8px;
  }

  .back-link {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .daily-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--moss);
  }

  .daily-title {
    font-family: 'Fraunces', serif;
    font-size: clamp(30px, 4vw, 42px);
    line-height: 1.04;
    letter-spacing: -0.04em;
    color: var(--forest);
  }

  .daily-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--moss);
  }

  .daily-sub {
    max-width: 640px;
    font-size: 14px;
    line-height: 1.6;
    color: #6f746e;
    margin: 0;
  }

  .daily-panel {
    background: rgba(255, 253, 248, 0.95);
    border: 1.5px solid var(--parchment-dark);
    border-radius: 24px;
    padding: 20px;
  }

  .daily-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .prompt-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .prompt-card {
    border: 1.5px solid var(--parchment-dark);
    background: #fff;
    border-radius: 18px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    transition: border-color .15s ease, transform .1s ease, box-shadow .15s ease, background .15s ease;
  }

  .prompt-card:hover {
    transform: translateY(-1px);
    border-color: rgba(45, 122, 80, 0.42);
    box-shadow: 0 10px 24px rgba(28, 43, 34, 0.08);
  }

  .prompt-card.selected {
    border-color: var(--moss);
    background: rgba(45, 122, 80, 0.06);
  }

  .prompt-card.dashed {
    border-style: dashed;
  }

  .prompt-title {
    font-family: 'Fraunces', serif;
    font-size: 22px;
    line-height: 1.1;
    color: var(--forest);
    margin-bottom: 6px;
  }

  .prompt-description {
    font-size: 13px;
    line-height: 1.5;
    color: #6f746e;
  }

  .previous-panel,
  .composer-panel {
    display: grid;
    gap: 12px;
  }

  .entry-list {
    display: grid;
    gap: 10px;
  }

  .entry-card {
    border-radius: 16px;
    border: 1px solid rgba(28, 43, 34, 0.08);
    background: #fff;
    padding: 14px 16px;
  }

  .entry-date {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--moss);
    margin-bottom: 8px;
  }

  .entry-text {
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.65;
    color: var(--forest);
  }

  .daily-textarea {
    width: 100%;
    min-height: 220px;
    resize: vertical;
    border-radius: 18px;
    border: 1.5px solid var(--parchment-dark);
    background: #fff;
    padding: 16px 18px;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: var(--forest);
    outline: none;
  }

  .daily-textarea:focus {
    border-color: var(--moss);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.08);
  }

  .composer-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .composer-btn {
    width: 100%;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity .15s ease, transform .1s ease, background .15s ease, color .15s ease, border-color .15s ease;
  }

  .composer-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .composer-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .composer-btn.ghost {
    border: 1.5px solid var(--parchment-dark);
    background: #fff;
    color: var(--muted);
  }

  .composer-btn.primary {
    border: 0;
    background: var(--forest);
    color: var(--parchment);
  }

  .daily-confirmation {
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 18px;
    border: 1px solid rgba(45, 122, 80, 0.24);
    background: rgba(45, 122, 80, 0.1);
    padding: 14px 16px;
    color: var(--moss);
  }

  .daily-confirmation-mark {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .daily-confirmation-text {
    font-size: 14px;
    font-weight: 700;
  }

  .daily-error,
  .empty-state {
    border-radius: 16px;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.5;
  }

  .daily-error {
    border: 1px solid rgba(154, 52, 18, 0.2);
    background: rgba(154, 52, 18, 0.08);
    color: var(--error);
  }

  .empty-state {
    border: 1px dashed rgba(28, 43, 34, 0.14);
    background: rgba(255, 255, 255, 0.72);
    color: #6f746e;
  }

  @media (max-width: 720px) {
    .daily-shell {
      padding: 20px 14px 56px;
    }

    .prompt-grid,
    .composer-actions {
      grid-template-columns: 1fr;
    }

    .daily-panel {
      padding: 16px;
      border-radius: 20px;
    }

    .prompt-title {
      font-size: 19px;
    }
  }
</style>
