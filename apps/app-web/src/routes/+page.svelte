<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAuthMe } from '$lib/api/auth-client';

  onMount(async () => {
    try {
      const auth = await getAuthMe();
      if (auth.loggedIn) {
        await goto('/dashboard');
        return;
      }
      if (auth.cause === 'unavailable') {
        return;
      }
    } catch {
      // fall through to login
    }

    await goto('/auth/login');
  });
</script>

<section class="min-h-screen grid place-items-center p-8">
  <p class="text-slate-600">Redirecting to app...</p>
</section>
