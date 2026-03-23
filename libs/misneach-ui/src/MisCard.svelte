<script lang="ts">
  export let tone: 'paper' | 'frost' | 'dark' = 'paper';
  export let padded = true;
  export let className = '';

  $: classes = [
    'mis-card',
    `mis-card--${tone}`,
    padded ? 'mis-card--padded' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');
</script>

<section class={classes}>
  <slot />
</section>

<style>
  .mis-card {
    border-radius: 1rem;
    border: 1.5px solid var(--parchment-dark, #e8e0d0);
    overflow: hidden;
  }

  .mis-card--padded {
    padding: 1.4rem;
  }

  .mis-card--paper {
    background: var(--paper, #fff);
  }

  .mis-card--frost {
    background: rgba(245, 240, 232, 0.05);
    border-color: rgba(245, 240, 232, 0.12);
    backdrop-filter: blur(8px);
  }

  .mis-card--dark {
    background: var(--forest, #1c2b22);
    border-color: var(--forest-mid, #2e4436);
  }
</style>
