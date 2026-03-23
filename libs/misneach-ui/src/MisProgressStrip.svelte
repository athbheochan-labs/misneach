<script lang="ts">
  export let masteredLabel = '0 mastered';
  export let remainingLabel = '0 left';
  export let value = 0;
  export let visible = true;
  export let className = '';

  $: clampedValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
</script>

{#if visible}
  <div class={`mis-progress-strip ${className}`.trim()}>
    <div class="mis-progress-strip__meta">
      <span class="mis-progress-strip__mastered">{masteredLabel}</span>
      <span class="mis-progress-strip__remaining">{remainingLabel}</span>
    </div>
    <div class="mis-progress-strip__track" aria-hidden="true">
      <div class="mis-progress-strip__fill" style={`width:${clampedValue}%`}></div>
    </div>
  </div>
{/if}

<style>
  .mis-progress-strip {
    position: sticky;
    top: 0;
    z-index: 40;
    background: color-mix(in srgb, var(--parchment, #f5f0e8) 95%, transparent);
    backdrop-filter: blur(10px);
    padding: 14px 0 12px;
    margin-bottom: 4px;
  }

  .mis-progress-strip__meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .mis-progress-strip__mastered {
    color: var(--green, #2d7a50);
  }

  .mis-progress-strip__remaining {
    color: var(--muted, #5a7a64);
  }

  .mis-progress-strip__track {
    height: 3px;
    background: var(--parchment-dark, #e8e0d0);
    border-radius: 2px;
    overflow: hidden;
  }

  .mis-progress-strip__fill {
    height: 100%;
    background: var(--sage, #7ec99a);
    border-radius: 2px;
    transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
