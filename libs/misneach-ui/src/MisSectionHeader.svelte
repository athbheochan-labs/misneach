<script lang="ts">
  export let tag = '';
  export let headline = '';
  export let intro = '';
  export let align: 'left' | 'center' = 'left';
  export let className = '';
</script>

<div class={`mis-section-header mis-section-header--${align} ${className}`}>
  {#if tag}
    <span class="mis-section-header__tag">{tag}</span>
  {/if}
  {#if headline}
    <h2 class="mis-section-header__headline">{@html headline}</h2>
  {/if}
  {#if intro}
    <p class="mis-section-header__intro">{intro}</p>
  {/if}
</div>

<style>
  .mis-section-header {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    margin-bottom: 2.25rem;
  }

  .mis-section-header--center {
    text-align: center;
    align-items: center;
  }

  .mis-section-header__tag {
    font-size: 9.5px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--muted, #5a7a64);
    font-weight: 700;
  }

  .mis-section-header__headline {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(28px, 4vw, 44px);
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: var(--forest, #1c2b22);
  }

  .mis-section-header__headline :global(em) {
    font-style: italic;
    font-weight: 300;
    color: var(--green, #2d7a50);
  }

  .mis-section-header__intro {
    font-size: 16px;
    line-height: 1.7;
    color: #666;
    max-width: 540px;
  }
</style>
