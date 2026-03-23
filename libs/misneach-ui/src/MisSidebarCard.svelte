<script lang="ts">
  import MisCard from './MisCard.svelte';

  export let title = '';
  export let subtitle = '';
  export let className = '';
</script>

<MisCard tone="paper" padded={false} className={`mis-sidebar-card ${className}`.trim()}>
  {#if title || subtitle}
    <div class="mis-sidebar-card__head">
      {#if title}
        <div class="mis-sidebar-card__title">{title}</div>
      {/if}
      {#if subtitle}
        <div class="mis-sidebar-card__sub">{subtitle}</div>
      {/if}
    </div>
  {/if}
  <slot />
</MisCard>

<style>
  .mis-sidebar-card__head {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--parchment-dark, #e8e0d0);
  }

  .mis-sidebar-card__title {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.01em;
    color: var(--forest, #1c2b22);
    margin-bottom: 2px;
  }

  .mis-sidebar-card__sub {
    font-size: 11.5px;
    color: #aaa;
  }
</style>
