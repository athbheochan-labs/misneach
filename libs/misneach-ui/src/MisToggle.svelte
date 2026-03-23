<script lang="ts">
  export let options: Array<{ label: string; value: string; badge?: string }> = [];
  export let value = '';
  export let className = '';
  export let onChange: (next: string) => void = () => {};

  function select(next: string) {
    if (next === value) return;
    value = next;
    onChange(next);
  }
</script>

<div class={`mis-toggle ${className}`} role="tablist" aria-label="Toggle options">
  {#each options as opt}
    <button
      type="button"
      class="mis-toggle__btn"
      class:is-active={opt.value === value}
      role="tab"
      aria-selected={opt.value === value}
      onclick={() => select(opt.value)}
    >
      <span>{opt.label}</span>
      {#if opt.badge}
        <span class="mis-toggle__badge">{opt.badge}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .mis-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.2rem;
    border-radius: 0.65rem;
    background: var(--parchment-dark, #e8e0d0);
  }

  .mis-toggle__btn {
    border: none;
    background: transparent;
    color: var(--muted, #5a7a64);
    padding: 0.45rem 0.95rem;
    border-radius: 0.5rem;
    font-family: 'Instrument Sans', sans-serif;
    font-size: 0.81rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .mis-toggle__btn.is-active {
    background: var(--paper, #fff);
    color: var(--forest, #1c2b22);
    box-shadow: 0 1px 4px rgba(28, 43, 34, 0.1);
  }

  .mis-toggle__badge {
    background: var(--sage, #7ec99a);
    color: var(--forest, #1c2b22);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 0.12rem 0.35rem;
    border-radius: 0.3rem;
  }

  .mis-toggle__btn.is-active .mis-toggle__badge {
    background: var(--green, #2d7a50);
    color: #fff;
  }
</style>
