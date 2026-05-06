import {
  configurePlausible,
  enablePlausibleAutoPageviews,
  trackPlausibleEvent,
  trackPlausiblePageview,
} from '@decyphr/misneach-ui';

const trackLocalhost =
  import.meta.env.DEV && import.meta.env.PUBLIC_PLAUSIBLE_TRACK_LOCALHOST === 'true';

configurePlausible({
  domain: 'misneach.ie',
  trackLocalhost,
});

export function enableAutoPageviews() {
  void enablePlausibleAutoPageviews();
}

export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  void trackPlausibleEvent(eventName, props ? { props } : undefined);
}

export function trackPageview(url?: string) {
  void trackPlausiblePageview(url ? { url } : undefined);
}
