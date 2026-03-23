<script lang="ts">
  export let id = '';
  export let name = '';
  export let value = '';
  export let disabled = false;
  export let required = false;
  export let variant: 'default' | 'unstyled' = 'default';
  export let className = '';
  export let onchange: ((event: Event) => void) | undefined = undefined;

  $: classes = ['mis-select', `mis-select--${variant}`, className]
    .filter(Boolean)
    .join(' ');
</script>

<select
  {...$$restProps}
  {id}
  {name}
  bind:value
  {disabled}
  {required}
  class={classes}
  on:change={onchange}
>
  <slot />
</select>

<style>
  .mis-select {
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

  .mis-select:focus {
    border-color: var(--green, #2d7a50);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .mis-select--unstyled {
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
