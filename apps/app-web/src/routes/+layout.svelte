<script lang="ts">
  import { browser } from '$app/environment';
import { afterNavigate, goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { enableAutoPageviews } from '$lib/analytics';
  import { toInAppPath } from '$lib/mobile/deep-links';
  import '../app.css';
  let { data, children } = $props();

  onMount(() => {
    if (!browser) return;
    enableAutoPageviews();

    const restoreDocumentScroll = () => {
      const root = document.documentElement;
      const body = document.body;

      root.style.overflow = '';
      root.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';

      root.classList.remove('scroll-locked', 'overflow-hidden', 'modal-open');
      body.classList.remove('scroll-locked', 'overflow-hidden', 'modal-open');
    };

    let removeListener: (() => void) | undefined;
    let removeBackListener: (() => void) | undefined;
    let removeViewportListeners: (() => void) | undefined;
    let removeTelemetry: (() => void) | undefined;
    let removeScrollRecoveryListeners: (() => void) | undefined;
    let trackTelemetryEvent: (event: string, meta?: Record<string, unknown>) => void = () => undefined;
    let trackTelemetryRoute: (route: string) => void = () => undefined;
    let trackTelemetryError: (event: string, error: unknown, meta?: Record<string, unknown>) => void = () =>
      undefined;

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
      trackTelemetryEvent('deep_link_opened', { url, inAppPath });
      await goto(inAppPath, { replaceState: true });
    };

    const cap = (window as any).Capacitor;
    const handlePageShow = () => restoreDocumentScroll();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreDocumentScroll();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    removeScrollRecoveryListeners = () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    restoreDocumentScroll();
    afterNavigate(() => {
      restoreDocumentScroll();
    });

    if (!cap?.isNativePlatform?.()) return;

    document.documentElement.setAttribute('data-native-mobile', 'true');
    document.body.setAttribute('data-native-mobile', 'true');
    setupViewportKeyboardTracking();
    trackTelemetryRoute(`${window.location.pathname}${window.location.search}`);
    afterNavigate((nav) => {
      if (!nav.to?.url) return;
      trackTelemetryRoute(`${nav.to.url.pathname}${nav.to.url.search}`);
    });

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const telemetry = await import('$lib/mobile/telemetry');
        const telemetryApi = await telemetry.startMobileTelemetry();
        trackTelemetryEvent = telemetryApi.trackEvent;
        trackTelemetryRoute = telemetryApi.trackRouteView;
        trackTelemetryError = telemetryApi.trackError;
        removeTelemetry = telemetryApi.stop;

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
            trackTelemetryEvent('hardware_back', { behavior: 'history_back', path });
            window.history.back();
            return;
          }
          trackTelemetryEvent('hardware_back', { behavior: 'exit_app', path });
          void App.exitApp();
        });
        removeBackListener = () => backListener.remove();
      } catch (error) {
        console.warn('Deep link setup failed', error);
        trackTelemetryError('mobile_init_failed', error);
      }
    })();

    return () => {
      removeListener?.();
      removeBackListener?.();
      removeTelemetry?.();
      removeViewportListeners?.();
      removeScrollRecoveryListeners?.();
      setKeyboardOffset(0);
      document.body.classList.remove('mobile-keyboard-open');
    };
  });
</script>

<svelte:head>
  <title>Misneach</title>
</svelte:head>

{@render children()}
