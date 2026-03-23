<script lang="ts">
  export type MisDialogueLine = {
    speaker: string;
    text: string;
    pronunciation?: string;
    translation?: string;
    side?: 'left' | 'right';
  };

  export let lines: MisDialogueLine[] = [];
  export let className = '';
</script>

<div class={`mis-course-dialogue ${className}`.trim()}>
  {#each lines as line}
    {@const right = line.side === 'right' || /customer|you/i.test(line.speaker)}
    <div class={`mis-course-dialogue__line ${right ? 'is-right' : ''}`}>
      <div class="mis-course-dialogue__avatar">{right ? '☕' : '🧑‍🍳'}</div>
      <div class="mis-course-dialogue__bubble">
        <div class="mis-course-dialogue__role">{line.speaker}</div>
        <div class="mis-course-dialogue__irish">{line.text}</div>
        {#if line.pronunciation}
          <div class="mis-course-dialogue__pron">{line.pronunciation}</div>
        {/if}
        {#if line.translation}
          <div class="mis-course-dialogue__translation">{line.translation}</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .mis-course-dialogue {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mis-course-dialogue__line {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .mis-course-dialogue__line.is-right {
    flex-direction: row-reverse;
  }

  .mis-course-dialogue__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(245, 240, 232, 0.08);
    border: 1px solid rgba(245, 240, 232, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .mis-course-dialogue__bubble {
    background: rgba(245, 240, 232, 0.07);
    border: 1px solid rgba(245, 240, 232, 0.1);
    border-radius: 14px;
    border-top-left-radius: 4px;
    padding: 12px 16px;
    max-width: 80%;
  }

  .mis-course-dialogue__line.is-right .mis-course-dialogue__bubble {
    background: rgba(45, 122, 80, 0.15);
    border-color: rgba(45, 122, 80, 0.25);
    border-radius: 14px;
    border-top-right-radius: 4px;
  }

  .mis-course-dialogue__role {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(90, 122, 100, 0.6);
    font-weight: 700;
    margin-bottom: 6px;
  }

  .mis-course-dialogue__irish {
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 17px;
    color: var(--parchment, #f5f0e8);
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-bottom: 3px;
  }

  .mis-course-dialogue__pron {
    font-size: 11.5px;
    color: var(--sage, #7ec99a);
    font-style: italic;
    margin-bottom: 2px;
  }

  .mis-course-dialogue__translation {
    font-size: 11.5px;
    color: var(--muted, #5a7a64);
  }
</style>
