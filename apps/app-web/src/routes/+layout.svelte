<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { enableAutoPageviews } from '$lib/analytics';
  import { toInAppPath } from '$lib/mobile/deep-links';
  import '../app.css';
  let { data, children } = $props();

  onMount(() => {
    if (!browser) return;
    enableAutoPageviews();

    let removeListener: (() => void) | undefined;

    const openDeepLink = async (url: string) => {
      const inAppPath = toInAppPath(url);
      if (!inAppPath) return;
      await goto(inAppPath, { replaceState: true });
    };

    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');

        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          console.log('[deep-link] launchUrl', launch.url);
          await openDeepLink(launch.url);
        }

        const listener = await App.addListener('appUrlOpen', ({ url }: { url?: string }) => {
          console.log('[deep-link] appUrlOpen', url);
          if (url) void openDeepLink(url);
        });
        removeListener = () => listener.remove();
      } catch (error) {
        console.warn('Deep link setup failed', error);
      }
    })();

    return () => {
      removeListener?.();
    };
  });
</script>

<svelte:head>
  <title>Misneach</title>
</svelte:head>

{@render children()}
