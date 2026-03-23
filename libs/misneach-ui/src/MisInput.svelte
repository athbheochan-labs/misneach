<script lang="ts">
  export let id = '';
  export let name = '';
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let readonly = false;
  export let disabled = false;
  export let required = false;
  export let autocomplete: string | undefined = undefined;
  export let min: string | number | undefined = undefined;
  export let max: string | number | undefined = undefined;
  export let step: string | number | undefined = undefined;
  export let maxlength: number | undefined = undefined;
  export let inputmode:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search'
    | undefined = undefined;
  export let variant: 'default' | 'stripe' | 'unstyled' = 'default';
  export let invalid = false;
  export let className = '';
  export let oninput: ((event: Event) => void) | undefined = undefined;
  export let onchange: ((event: Event) => void) | undefined = undefined;
  export let onkeydown: ((event: KeyboardEvent) => void) | undefined = undefined;
  export let onblur: ((event: FocusEvent) => void) | undefined = undefined;

  $: classes = [
    'mis-input',
    `mis-input--${variant}`,
    invalid ? 'is-invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
</script>

<input
  {...$$restProps}
  {id}
  {name}
  {type}
  bind:value
  {placeholder}
  {readonly}
  {disabled}
  {required}
  {autocomplete}
  {min}
  {max}
  {step}
  {maxlength}
  {inputmode}
  class={classes}
  on:input={oninput}
  on:change={onchange}
  on:keydown={onkeydown}
  on:blur={onblur}
/>

<style>
  .mis-input {
    width: 100%;
    border: 1.5px solid var(--parchment-dark, #e8e0d0);
    border-radius: 10px;
    background: #fff;
    padding: 13px 16px;
    font-size: 15px;
    color: var(--ink, #1a1a18);
    font-family: 'Instrument Sans', sans-serif;
    font-weight: 500;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .mis-input:focus {
    border-color: var(--green, #2d7a50);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .mis-input[readonly] {
    background: #f4f4f4;
    color: #777;
  }

  .mis-input.is-invalid {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.1);
  }

  .mis-input--stripe {
    background: #f9f9f9;
    border-color: #e8e8e8;
    border-radius: 8px;
    padding: 11px 13px;
    font-size: 14px;
  }

  .mis-input--stripe:focus {
    border-color: var(--green, #2d7a50);
    box-shadow: none;
  }

  .mis-input--unstyled {
    width: auto;
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    font: inherit;
    color: inherit;
    box-shadow: none;
  }
</style>
