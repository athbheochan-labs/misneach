import { browser } from '$app/environment';
import { apiFetch } from '$lib/api/client';

type TelemetryType = 'event' | 'error';

type TelemetryPayload = {
  type: TelemetryType;
  event: string;
  message?: string;
  stack?: string;
  route?: string;
  meta?: Record<string, unknown>;
  reportedAt: string;
  app: {
    appId?: string;
    appName?: string;
    version?: string;
    build?: string;
    platform?: string;
  };
};

type TelemetryApi = {
  trackEvent: (event: string, meta?: Record<string, unknown>) => void;
  trackRouteView: (route: string) => void;
  trackError: (event: string, error: unknown, meta?: Record<string, unknown>) => void;
  stop: () => void;
};

const noopApi: TelemetryApi = {
  trackEvent: () => undefined,
  trackRouteView: () => undefined,
  trackError: () => undefined,
  stop: () => undefined,
};

function isNativeCapacitorRuntime(): boolean {
  if (!browser) return false;
  const maybeCapacitor = (window as any)?.Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
}

function clampText(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function toStack(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.stack === 'string') {
    return clampText(error.stack, 3000);
  }
  if (typeof error === 'string') return clampText(error, 3000);
  return clampText(JSON.stringify(error), 3000);
}

let appInfoPromise: Promise<TelemetryPayload['app']> | null = null;

async function getAppInfo(): Promise<TelemetryPayload['app']> {
  if (!browser) return {};
  if (appInfoPromise) return appInfoPromise;

  appInfoPromise = (async () => {
    const platform = String((window as any)?.Capacitor?.getPlatform?.() || 'web');
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      return {
        appId: clampText(info.id, 120),
        appName: clampText(info.name, 120),
        version: clampText(info.version, 60),
        build: clampText(info.build, 60),
        platform,
      };
    } catch {
      return { platform };
    }
  })();

  return appInfoPromise;
}

async function postTelemetry(payload: Omit<TelemetryPayload, 'reportedAt' | 'app'>) {
  if (!isNativeCapacitorRuntime()) return;
  try {
    const app = await getAppInfo();
    const body: TelemetryPayload = {
      ...payload,
      reportedAt: new Date().toISOString(),
      app,
    };
    await apiFetch('/api/proxy/mobile/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Telemetry must never break app flows.
  }
}

export async function startMobileTelemetry(): Promise<TelemetryApi> {
  if (!isNativeCapacitorRuntime()) return noopApi;

  let activeRoute = `${window.location.pathname}${window.location.search}`;
  const recentErrorFingerprints = new Map<string, number>();

  const trackEvent = (event: string, meta?: Record<string, unknown>) => {
    const safeEvent = clampText(event, 120);
    if (!safeEvent) return;
    void postTelemetry({
      type: 'event',
      event: safeEvent,
      route: activeRoute,
      meta,
    });
  };

  const trackRouteView = (route: string) => {
    activeRoute = clampText(route, 300) || activeRoute;
    trackEvent('route_view', { route: activeRoute });
  };

  const trackError = (event: string, error: unknown, meta?: Record<string, unknown>) => {
    const safeEvent = clampText(event, 120);
    if (!safeEvent) return;

    const message =
      clampText(error instanceof Error ? error.message : String(error), 600) ||
      'Unknown mobile error';
    const stack = toStack(error);
    const fingerprint = `${safeEvent}:${message}`;
    const now = Date.now();
    const lastSeen = recentErrorFingerprints.get(fingerprint) || 0;
    if (now - lastSeen < 4000) return;
    recentErrorFingerprints.set(fingerprint, now);

    void postTelemetry({
      type: 'error',
      event: safeEvent,
      message,
      stack,
      route: activeRoute,
      meta,
    });
  };

  const onError = (event: ErrorEvent) => {
    trackError('window_error', event.error || event.message, {
      file: clampText(event.filename, 220),
      line: event.lineno,
      column: event.colno,
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    trackError('unhandled_rejection', event.reason, {});
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  trackEvent('app_opened');
  trackRouteView(activeRoute);

  return {
    trackEvent,
    trackRouteView,
    trackError,
    stop: () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    },
  };
}
