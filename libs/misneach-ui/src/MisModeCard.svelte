<script lang="ts">
  export let eyebrow = '';
  export let title = '';
  export let emphasis = '';
  export let description = '';
  export let tone: 'practice' | 'mistakes' | 'flash' = 'practice';
  export let href: string | null = null;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let className = '';
  export let onclick: ((event: MouseEvent) => void) | undefined = undefined;

  $: classes = ['mis-mode-card', `mis-mode-card--${tone}`, className].filter(Boolean).join(' ');
</script>

{#if href && !disabled}
  <a {...$$restProps} class={classes} {href} on:click={onclick}>
    {#if eyebrow}
      <span class="mis-mode-card__eyebrow">{eyebrow}</span>
    {/if}
    <span class="mis-mode-card__title">
      {title}
      {#if emphasis}
        <em>{emphasis}</em>
      {/if}
    </span>
    {#if description}
      <span class="mis-mode-card__desc">{description}</span>
    {/if}
  </a>
{:else}
  <button {...$$restProps} class={classes} {type} {disabled} on:click={onclick}>
    {#if eyebrow}
      <span class="mis-mode-card__eyebrow">{eyebrow}</span>
    {/if}
    <span class="mis-mode-card__title">
      {title}
      {#if emphasis}
        <em>{emphasis}</em>
      {/if}
    </span>
    {#if description}
      <span class="mis-mode-card__desc">{description}</span>
    {/if}
  </button>
{/if}

<style>
  .mis-mode-card {
    width: 100%;
    border: 1.5px solid var(--parchment-dark, #e8e0d0);
    border-radius: 16px;
    background: #fff;
    padding: 22px 22px 20px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-decoration: none;
  }

  .mis-mode-card:hover {
    border-color: var(--green, #2d7a50);
    box-shadow: 0 4px 20px rgba(28, 43, 34, 0.1);
    transform: translateY(-2px);
  }

  .mis-mode-card:disabled,
  .mis-mode-card[disabled] {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .mis-mode-card__eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .mis-mode-card--practice .mis-mode-card__eyebrow {
    color: var(--green, #2d7a50);
  }

  .mis-mode-card--mistakes .mis-mode-card__eyebrow {
    color: #b45309;
  }

  .mis-mode-card--flash .mis-mode-card__eyebrow {
    color: #0369a1;
  }

  .mis-mode-card__title {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: var(--forest, #1c2b22);
    line-height: 1;
  }

  .mis-mode-card__title em {
    margin-left: 0.2ch;
    font-style: italic;
    font-weight: 300;
    color: var(--green, #2d7a50);
  }

  .mis-mode-card__desc {
    font-size: 13px;
    line-height: 1.6;
    color: #888;
  }
</style>
