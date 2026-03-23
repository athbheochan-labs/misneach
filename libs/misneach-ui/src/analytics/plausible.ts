type PlausibleOptions = {
  domain: string;
  trackLocalhost?: boolean;
  apiHost?: string;
};

type PlausibleEventOptions = {
  props?: Record<string, string | number | boolean>;
  revenue?: { currency: string; amount: number };
  callback?: () => void;
};

type PlausiblePageviewOptions = {
  url?: string;
  referrer?: string;
  callback?: () => void;
  props?: Record<string, string | number | boolean>;
};

let configuredOptions: PlausibleOptions | null = null;
let scriptReadyPromise: Promise<boolean> | null = null;
let autoPageviewsEnabled = false;
let historyPatched = false;
let lastTrackedPath = '';

function canUseBrowserApis() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isLocalhost() {
  if (!canUseBrowserApis()) return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function ensurePlausibleStub() {
  if (!canUseBrowserApis()) return null;
  const w = window as Window & {
    plausible?: ((eventName: string, options?: Record<string, unknown>) => void) & {
      q?: Array<unknown[]>;
    };
  };
  if (!w.plausible) {
    const queued = ((...args: unknown[]) => {
      (queued.q ||= []).push(args);
    }) as ((eventName: string, options?: Record<string, unknown>) => void) & {
      q?: Array<unknown[]>;
    };
    w.plausible = queued;
  }
  return w.plausible;
}

function currentPath() {
  if (!canUseBrowserApis()) return '';
  return `${window.location.pathname}${window.location.search}`;
}

function shouldTrack() {
  if (!canUseBrowserApis() || !configuredOptions) return false;
  if (configuredOptions.trackLocalhost) return true;
  return !isLocalhost();
}

function ensureScriptLoaded(): Promise<boolean> {
  if (!shouldTrack()) return Promise.resolve(false);
  if (scriptReadyPromise) return scriptReadyPromise;

  scriptReadyPromise = new Promise<boolean>((resolve) => {
    if (!configuredOptions) {
      resolve(false);
      return;
    }

    ensurePlausibleStub();
    const existing = document.querySelector<HTMLScriptElement>('script[data-misneach-plausible="true"]');
    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.defer = true;
    script.src = `${configuredOptions.apiHost || 'https://plausible.io'}/js/script.tagged-events.js`;
    script.setAttribute('data-domain', configuredOptions.domain);
    script.setAttribute('data-misneach-plausible', 'true');
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptReadyPromise;
}

function emit(eventName: string, payload?: Record<string, unknown>) {
  if (!shouldTrack()) return;
  const plausible = ensurePlausibleStub();
  plausible?.(eventName, payload);
}

export function configurePlausible(options: PlausibleOptions) {
  configuredOptions = options;
  scriptReadyPromise = null;
}

export async function enablePlausibleAutoPageviews() {
  if (!canUseBrowserApis() || autoPageviewsEnabled) return;
  autoPageviewsEnabled = true;
  await ensureScriptLoaded();

  const firePageview = () => {
    const path = currentPath();
    if (!path || path === lastTrackedPath) return;
    lastTrackedPath = path;
    emit('pageview', { u: path });
  };

  firePageview();

  const onLocationChange = () => {
    firePageview();
  };

  window.addEventListener('popstate', onLocationChange);

  if (!historyPatched) {
    historyPatched = true;
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(...args: Parameters<History['pushState']>) {
      originalPushState(...args);
      queueMicrotask(onLocationChange);
    };
    window.history.replaceState = function replaceState(...args: Parameters<History['replaceState']>) {
      originalReplaceState(...args);
      queueMicrotask(onLocationChange);
    };
  }
}

export async function trackPlausibleEvent(eventName: string, options?: PlausibleEventOptions) {
  await ensureScriptLoaded();
  emit(eventName, options as Record<string, unknown> | undefined);
}

export async function trackPlausiblePageview(options?: PlausiblePageviewOptions) {
  await ensureScriptLoaded();
  const payload: Record<string, unknown> = {};
  if (options?.url) payload.u = options.url;
  if (options?.referrer) payload.r = options.referrer;
  if (options?.props) payload.props = options.props;
  if (options?.callback) payload.callback = options.callback;
  emit('pageview', Object.keys(payload).length ? payload : undefined);
}
