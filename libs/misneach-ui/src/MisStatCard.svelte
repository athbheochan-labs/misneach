<script lang="ts">
  export let tone: 'dark' | 'mid' | 'light' = 'light';
  export let value = '';
  export let label = '';
  export let source = '';
  export let className = '';
</script>

<article class={`mis-stat-card mis-stat-card--${tone} ${className}`.trim()}>
  <div class="mis-stat-card__num">{value}</div>
  <div class="mis-stat-card__label">{label}</div>
  {#if source}
    <div class="mis-stat-card__source">{source}</div>
  {/if}
</article>

<style>
  .mis-stat-card {
    border-radius: 16px;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mis-stat-card--dark {
    background: var(--forest, #1c2b22);
  }

  .mis-stat-card--mid {
    background: #e0ede5;
    border: 1px solid #cce0d4;
  }

  .mis-stat-card--light {
    background: white;
    border: 1px solid var(--parch-dark, #e8e0d0);
  }

  .mis-stat-card__num {
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(32px, 4.5vw, 52px);
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .mis-stat-card--dark .mis-stat-card__num {
    color: var(--sage, #7ec99a);
  }

  .mis-stat-card--mid .mis-stat-card__num {
    color: var(--forest, #1c2b22);
  }

  .mis-stat-card--light .mis-stat-card__num {
    color: var(--green, #2d7a50);
  }

  .mis-stat-card__label {
    font-size: 13px;
    line-height: 1.45;
  }

  .mis-stat-card--dark .mis-stat-card__label {
    color: rgba(245, 240, 232, 0.4);
  }

  .mis-stat-card--mid .mis-stat-card__label {
    color: var(--muted, #5a7a64);
  }

  .mis-stat-card--light .mis-stat-card__label {
    color: #777;
  }

  .mis-stat-card__source {
    font-size: 10px;
    margin-top: 4px;
    font-style: italic;
  }

  .mis-stat-card--dark .mis-stat-card__source {
    color: rgba(245, 240, 232, 0.18);
  }

  .mis-stat-card--mid .mis-stat-card__source {
    color: #aaa;
  }

  .mis-stat-card--light .mis-stat-card__source {
    color: #ccc;
  }
</style>
