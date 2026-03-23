<script lang="ts">
  export let id = '';
  export let name = '';
  export let checked = false;
  export let disabled = false;
  export let className = '';
  export let onchange: ((event: Event) => void) | undefined = undefined;

  $: classes = ['mis-checkbox', className].filter(Boolean).join(' ');
</script>

<input
  {...$$restProps}
  {id}
  {name}
  type="checkbox"
  bind:checked
  {disabled}
  class={classes}
  on:change={onchange}
/>

<style>
  .mis-checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: var(--green, #2d7a50);
  }
</style>
