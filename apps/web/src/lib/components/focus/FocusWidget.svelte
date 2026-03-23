<script lang="ts">
  import { onMount } from 'svelte';
  import { MisButton, MisInput, MisSelect } from '@decyphr/misneach-ui';
  import { focusStore } from '$lib/stores/focus';

  const activityTypes = [
    'reading',
    'course_material',
    'listening',
    'conversation',
    'writing',
    'review',
    'other',
  ];

  let open = false;
  let mode: 'time' | 'goal' = 'time';
  let activityType = 'course_material';
  let plannedMinutes = 25;
  let goalText = '';
  let loading = false;

  $: state = $focusStore;
  $: session = state.session;

  function formatTime(seconds: number | null | undefined) {
    if (seconds == null) return '--:--';
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  async function start() {
    loading = true;
    await focusStore.startSession({
      mode,
      activityType,
      goalText: mode === 'goal' ? goalText.trim() : undefined,
      plannedSeconds: mode === 'time' ? plannedMinutes * 60 : undefined,
      metadataJson: { source: 'focus_widget' },
    });
    loading = false;
    open = false;
  }

  onMount(() => {
    focusStore.loadActive();
  });
</script>

<div class="fixed bottom-5 right-5 z-30">
  {#if session && (session.status === 'running' || session.status === 'paused')}
    <div class="w-80 rounded-2xl bg-white border shadow-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-800">Focus Session</h3>
        <span class="text-xs px-2 py-1 rounded-full {session.status === 'running' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          {session.status}
        </span>
      </div>

      <p class="text-xs text-gray-500">{session.activityType.replace('_', ' ')}</p>
      {#if session.goalText}
        <p class="text-sm text-gray-700">{session.goalText}</p>
      {/if}

      <div class="rounded-xl bg-gray-50 p-3">
        <p class="text-xs text-gray-500">{session.mode === 'time' ? 'Remaining' : 'Elapsed'}</p>
        <p class="text-2xl font-bold text-gray-900">
          {session.mode === 'time' ? formatTime(session.remainingSeconds) : formatTime(session.actualSeconds)}
        </p>
      </div>

      <div class="flex items-center gap-2">
        {#if session.status === 'running'}
          <MisButton variant="unstyled" size="none" onclick={() => focusStore.pause()} className="flex-1 rounded-lg bg-amber-500 text-white py-2 text-sm font-medium">Pause</MisButton>
        {:else}
          <MisButton variant="unstyled" size="none" onclick={() => focusStore.resume()} className="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium">Resume</MisButton>
        {/if}
        <MisButton variant="unstyled" size="none" onclick={() => focusStore.complete()} className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-medium">Complete</MisButton>
        <MisButton variant="unstyled" size="none" onclick={() => focusStore.cancel()} className="rounded-lg border px-3 py-2 text-sm">End</MisButton>
      </div>

      {#if session.mode === 'time'}
        <div class="flex items-center gap-2">
          <MisButton variant="unstyled" size="none" onclick={() => focusStore.adjust({ remainingSecondsDelta: 300 })} className="rounded border px-2 py-1 text-xs">+5m</MisButton>
          <MisButton variant="unstyled" size="none" onclick={() => focusStore.adjust({ remainingSecondsDelta: 600 })} className="rounded border px-2 py-1 text-xs">+10m</MisButton>
          <MisButton variant="unstyled" size="none" onclick={() => focusStore.adjust({ remainingSecondsDelta: -300 })} className="rounded border px-2 py-1 text-xs">-5m</MisButton>
        </div>
      {/if}
    </div>
  {:else}
    <MisButton
      variant="unstyled"
      size="none"
      onclick={() => (open = !open)}
      className="rounded-full bg-emerald-600 text-white px-4 py-3 shadow-lg hover:bg-emerald-700 text-sm font-semibold"
    >
      Start Focus
    </MisButton>

    {#if open}
      <div class="mt-2 w-80 rounded-2xl bg-white border shadow-lg p-4 space-y-3">
        <h3 class="text-sm font-semibold text-gray-800">New Focus Session</h3>

        <div>
          <label for="focus-mode" class="block text-xs text-gray-500 mb-1">Mode</label>
          <MisSelect id="focus-mode" bind:value={mode} variant="unstyled" className="w-full rounded-lg border px-2 py-2 text-sm">
            <option value="time">Time mode</option>
            <option value="goal">Goal mode</option>
          </MisSelect>
        </div>

        <div>
          <label for="focus-activity" class="block text-xs text-gray-500 mb-1">Activity</label>
          <MisSelect id="focus-activity" bind:value={activityType} variant="unstyled" className="w-full rounded-lg border px-2 py-2 text-sm">
            {#each activityTypes as activity}
              <option value={activity}>{activity.replace('_', ' ')}</option>
            {/each}
          </MisSelect>
        </div>

        {#if mode === 'time'}
          <div>
            <label for="focus-minutes" class="block text-xs text-gray-500 mb-1">Minutes</label>
            <MisInput id="focus-minutes" type="number" min="1" bind:value={plannedMinutes} variant="unstyled" className="w-full rounded-lg border px-2 py-2 text-sm" />
          </div>
        {:else}
          <div>
            <label for="focus-goal" class="block text-xs text-gray-500 mb-1">Goal target</label>
            <MisInput id="focus-goal" type="text" bind:value={goalText} placeholder="Finish lesson 3" variant="unstyled" className="w-full rounded-lg border px-2 py-2 text-sm" />
          </div>
        {/if}

        <div class="flex items-center gap-2">
          <MisButton variant="unstyled" size="none" onclick={start} disabled={loading} className="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium disabled:opacity-50">
            {loading ? 'Starting...' : 'Start'}
          </MisButton>
          <MisButton variant="unstyled" size="none" onclick={() => (open = false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</MisButton>
        </div>
      </div>
    {/if}
  {/if}
</div>
