<script lang="ts">
  export let href: string | null = null;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'ghost' | 'outline' | 'unstyled' = 'primary';
  export let size: 'none' | 'sm' | 'md' | 'lg' = 'md';
  export let block = false;
  export let disabled = false;
  export let className = '';
  export let onclick: ((event: MouseEvent) => void) | undefined = undefined;

  $: classes = [
    'mis-btn',
    `mis-btn--${variant}`,
    `mis-btn--${size}`,
    block ? 'mis-btn--block' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');
</script>

{#if href && !disabled}
  <a {...$$restProps} class={classes} href={href} on:click={onclick}>
    <slot />
  </a>
{:else}
  <button {...$$restProps} class={classes} {type} {disabled} on:click={onclick}>
    <slot />
  </button>
{/if}

<style>
  .mis-btn {
    --btn-bg: var(--sage, #7ec99a);
    --btn-text: var(--forest, #1c2b22);
    --btn-border: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border-radius: 0.75rem;
    border: 1px solid var(--btn-border);
    background: var(--btn-bg);
    color: var(--btn-text);
    text-decoration: none;
    font-weight: 700;
    letter-spacing: -0.01em;
    transition: background 120ms ease, border-color 120ms ease, transform 100ms ease, color 120ms ease;
    cursor: pointer;
  }

  .mis-btn:hover {
    transform: translateY(-1px);
  }

  .mis-btn:disabled,
  .mis-btn[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .mis-btn--sm {
    padding: 0.5rem 0.85rem;
    font-size: 0.76rem;
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .mis-btn--none {
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
  }

  .mis-btn--md {
    padding: 0.8rem 1.35rem;
    font-size: 1rem;
    font-family: 'Fraunces', serif;
  }

  .mis-btn--lg {
    padding: 0.95rem 1.75rem;
    font-size: 1.05rem;
    font-family: 'Fraunces', serif;
  }

  .mis-btn--block {
    width: 100%;
  }

  .mis-btn--primary:hover {
    background: #8fd4a8;
  }

  .mis-btn--ghost {
    --btn-bg: transparent;
    --btn-text: var(--muted, #5a7a64);
    --btn-border: rgba(245, 240, 232, 0.2);
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .mis-btn--ghost:hover {
    color: var(--parchment, #f5f0e8);
    border-color: rgba(245, 240, 232, 0.3);
    background: rgba(245, 240, 232, 0.06);
  }

  .mis-btn--outline {
    --btn-bg: transparent;
    --btn-text: var(--forest, #1c2b22);
    --btn-border: var(--forest, #1c2b22);
    font-family: 'Fraunces', serif;
  }

  .mis-btn--outline:hover {
    background: var(--forest, #1c2b22);
    color: var(--parchment, #f5f0e8);
  }

  .mis-btn--unstyled {
    --btn-bg: transparent;
    --btn-text: inherit;
    --btn-border: transparent;
    border-radius: 0;
    transition: none;
  }

  .mis-btn--unstyled:hover {
    transform: none;
    background: transparent;
  }
</style>
