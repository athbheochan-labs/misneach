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
    let removeBackListener: (() => void) | undefined;
    let removeViewportListeners: (() => void) | undefined;

    const setKeyboardOffset = (offsetPx: number) => {
      const root = document.documentElement;
      const body = document.body;
      const safeOffset = Math.max(0, Math.round(offsetPx));
      root.style.setProperty('--mobile-keyboard-offset', `${safeOffset}px`);
      body.classList.toggle('mobile-keyboard-open', safeOffset > 0);
    };

    const setupViewportKeyboardTracking = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const update = () => {
        const keyboardOffset = window.innerHeight - viewport.height - viewport.offsetTop;
        setKeyboardOffset(keyboardOffset);
      };

      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      update();

      removeViewportListeners = () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      };
    };

    const openDeepLink = async (url: string) => {
      const inAppPath = toInAppPath(url);
      if (!inAppPath) return;
      await goto(inAppPath, { replaceState: true });
    };

    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    document.documentElement.setAttribute('data-native-mobile', 'true');
    document.body.setAttribute('data-native-mobile', 'true');
    setupViewportKeyboardTracking();

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

        const rootPaths = new Set(['/dashboard', '/auth/login', '/auth/signup', '/']);
        const backListener = await App.addListener('backButton', () => {
          const path = window.location.pathname;
          if (window.history.length > 1 && !rootPaths.has(path)) {
            window.history.back();
            return;
          }
          void App.exitApp();
        });
        removeBackListener = () => backListener.remove();
      } catch (error) {
        console.warn('Deep link setup failed', error);
      }
    })();

    return () => {
      removeListener?.();
      removeBackListener?.();
      removeViewportListeners?.();
      setKeyboardOffset(0);
      document.body.classList.remove('mobile-keyboard-open');
    };
  });
</script>

<svelte:head>
  <title>Misneach</title>
</svelte:head>

{@render children()}
