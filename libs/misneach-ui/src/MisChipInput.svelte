<script lang="ts">
  export let id = '';
  export let value: string[] = [];
  export let placeholder = 'name@example.com - press Enter or comma to add';
  export let invalid = false;
  export let className = '';
  export let mode: 'email' | 'text' = 'email';

  let inputValue = '';

  $: wrapperClasses = [
    'mis-chip-input',
    invalid ? 'is-invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  function normalise(raw: string) {
    return raw.replace(',', '').trim().toLowerCase();
  }

  function valid(raw: string) {
    if (mode === 'text') return raw.length > 0;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
  }

  function add(raw: string) {
    const next = normalise(raw);
    if (!next || !valid(next)) return;
    if (value.includes(next)) {
      inputValue = '';
      return;
    }
    value = [...value, next];
    inputValue = '';
  }

  function remove(item: string) {
    value = value.filter((entry) => entry !== item);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(inputValue);
      return;
    }

    if (event.key === 'Backspace' && inputValue === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }
</script>

<div class={wrapperClasses}>
  {#each value as item}
    <div class="mis-chip-input__chip">
      <span>{item}</span>
      <button
        type="button"
        class="mis-chip-input__remove"
        onclick={() => remove(item)}
        aria-label={`Remove ${item}`}
      >
        x
      </button>
    </div>
  {/each}
  <input
    {id}
    class="mis-chip-input__input"
    bind:value={inputValue}
    {placeholder}
    onkeydown={onKeydown}
    onblur={() => add(inputValue)}
    inputmode={mode === 'email' ? 'email' : 'text'}
    type={mode === 'email' ? 'email' : 'text'}
  />
</div>

<style>
  .mis-chip-input {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    border: 1.5px solid var(--parchment-dark, #e8e0d0);
    border-radius: 10px;
    background: #fff;
    padding: 10px 12px;
    min-height: 48px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .mis-chip-input:focus-within {
    border-color: var(--green, #2d7a50);
    box-shadow: 0 0 0 3px rgba(45, 122, 80, 0.1);
  }

  .mis-chip-input.is-invalid {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.1);
  }

  .mis-chip-input__chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    background: rgba(45, 122, 80, 0.1);
    border: 1px solid rgba(45, 122, 80, 0.2);
    padding: 4px 10px 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #1c2b22;
  }

  .mis-chip-input__remove {
    border: none;
    background: transparent;
    cursor: pointer;
    color: #5a7a64;
    opacity: 0.8;
    line-height: 1;
  }

  .mis-chip-input__remove:hover {
    opacity: 1;
  }

  .mis-chip-input__input {
    border: none;
    padding: 3px 0;
    min-width: 160px;
    flex: 1;
    outline: none;
    font-size: 14px;
    font-family: 'Instrument Sans', sans-serif;
    background: transparent;
    color: #1a1a18;
  }

  .mis-chip-input__input::placeholder {
    color: #bbb;
  }
</style>
