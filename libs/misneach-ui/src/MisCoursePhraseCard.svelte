<script lang="ts">
  export let irish = '';
  export let pronunciation = '';
  export let translation = '';
  export let className = '';
</script>

<div class={`mis-course-phrase-card ${className}`.trim()}>
  <div class="mis-course-phrase-card__irish">{irish}</div>
  {#if pronunciation}
    <div class="mis-course-phrase-card__pron">{pronunciation}</div>
  {/if}
  {#if translation}
    <div class="mis-course-phrase-card__translation">{translation}</div>
  {/if}
</div>

<style>
  .mis-course-phrase-card {
    width: 100%;
    background: rgba(245, 240, 232, 0.05);
    border: 1px solid rgba(245, 240, 232, 0.1);
    border-radius: 20px;
    padding: 40px 44px;
    text-align: center;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(8px);
  }

  .mis-course-phrase-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .mis-course-phrase-card__irish {
    position: relative;
    font-family: 'Fraunces', serif;
    font-weight: 900;
    font-size: clamp(36px, 6vw, 56px);
    letter-spacing: -0.04em;
    color: var(--parchment, #f5f0e8);
    line-height: 1.1;
    margin-bottom: 10px;
  }

  .mis-course-phrase-card__pron {
    position: relative;
    font-size: 16px;
    color: var(--sage, #7ec99a);
    font-style: italic;
    margin-bottom: 12px;
  }

  .mis-course-phrase-card__translation {
    position: relative;
    font-size: 14px;
    color: var(--muted, #5a7a64);
    letter-spacing: 0.04em;
  }
</style>
