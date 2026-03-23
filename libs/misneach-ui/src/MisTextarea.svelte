<script lang="ts">
  export let id = '';
  export let name = '';
  export let value = '';
  export let placeholder = '';
  export let rows = 4;
  export let disabled = false;
  export let readonly = false;
  export let variant: 'default' | 'unstyled' = 'default';
  export let invalid = false;
  export let className = '';
  export let oninput: ((event: Event) => void) | undefined = undefined;
  export let onblur: ((event: FocusEvent) => void) | undefined = undefined;

  $: classes = ['mis-textarea', `mis-textarea--${variant}`, invalid ? 'is-invalid' : '', className]
    .filter(Boolean)
    .join(' ');
</script>

<textarea
  {...$$restProps}
  {id}
  {name}
  bind:value
  {placeholder}
  {rows}
  {disabled}
  {readonly}
  class={classes}
  on:input={oninput}
  on:blur={onblur}
></textarea>

<style>
  .mis-textarea {
    width: 100%;
    border: 1.5px solid var(--parchment-dark, #e8e0d0);
    border-radius: 10px;
    background: #fff;
    padding: 13px 16px;
    font-size: 15px;
    color: var(--ink, #1a1a18);
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 500;
    line-height: 1.6;
    min-height: 100px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .mis-textarea:focus {
    border-color: var(--green, #2d7a50);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .mis-textarea.is-invalid {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.1);
  }

  .mis-textarea--unstyled {
    width: auto;
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    min-height: 0;
    resize: none;
    font: inherit;
    color: inherit;
    line-height: inherit;
    box-shadow: none;
  }
</style>
