<script lang="ts">
  export type MisAccordionItem = {
    question: string;
    answerHtml: string;
  };

  export let items: MisAccordionItem[] = [];
  export let singleOpen = true;
  export let className = '';

  let openIndexes = new Set<number>();

  function isOpen(index: number) {
    return openIndexes.has(index);
  }

  function toggle(index: number) {
    if (isOpen(index)) {
      openIndexes.delete(index);
      openIndexes = new Set(openIndexes);
      return;
    }

    if (singleOpen) {
      openIndexes = new Set([index]);
      return;
    }

    openIndexes.add(index);
    openIndexes = new Set(openIndexes);
  }
</script>

<div class={`mis-accordion ${className}`.trim()}>
  {#each items as item, index}
    <div class={`mis-accordion__item ${isOpen(index) ? 'is-open' : ''}`}>
      <button
        type="button"
        class="mis-accordion__toggle"
        aria-expanded={isOpen(index)}
        on:click={() => toggle(index)}
      >
        <span class="mis-accordion__q">{item.question}</span>
        <span class="mis-accordion__chevron">↓</span>
      </button>
      <div class="mis-accordion__body">
        <p>{@html item.answerHtml}</p>
      </div>
    </div>
  {/each}
</div>

<style>
  .mis-accordion {
    display: flex;
    flex-direction: column;
    gap: 1px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--parch-dark, #e8e0d0);
    background: var(--parch-dark, #e8e0d0);
  }

  .mis-accordion__item {
    background: white;
  }

  .mis-accordion__toggle {
    width: 100%;
    background: none;
    border: none;
    padding: 22px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    text-align: left;
    gap: 16px;
  }

  .mis-accordion__q {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 16px;
    color: var(--forest, #1c2b22);
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .mis-accordion__chevron {
    color: var(--muted, #5a7a64);
    font-size: 18px;
    flex-shrink: 0;
    transition: transform 0.25s;
  }

  .mis-accordion__body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
  }

  .mis-accordion__body p {
    overflow: hidden;
    padding: 0 24px;
    font-size: 14px;
    color: #555;
    line-height: 1.75;
  }

  .mis-accordion__body p :global(strong) {
    color: var(--forest, #1c2b22);
  }

  .mis-accordion__item.is-open .mis-accordion__chevron {
    transform: rotate(180deg);
  }

  .mis-accordion__item.is-open .mis-accordion__body {
    grid-template-rows: 1fr;
  }

  .mis-accordion__item.is-open .mis-accordion__body p {
    padding-bottom: 22px;
  }
</style>
