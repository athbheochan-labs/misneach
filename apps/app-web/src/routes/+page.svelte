<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(async () => {
    try {
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      if (sessionRes.ok) {
        await goto('/dashboard');
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
