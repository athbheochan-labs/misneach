<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { enableAutoPageviews } from '$lib/analytics';
  import '../app.css';
  let { data, children } = $props();

  onMount(() => {
    if (browser) {
      enableAutoPageviews();
    }
  });
</script>

<svelte:head>
  <title>Misneach</title>
</svelte:head>

{@render children()}
