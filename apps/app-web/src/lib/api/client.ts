import { env } from '$env/dynamic/public';
import { loadAuthSession } from '$lib/mobile/session-storage';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const fromPublic = String(env.PUBLIC_API_BASE_URL || '').trim();
  if (!fromPublic) {
    if (typeof window !== 'undefined') {
      const maybeCapacitor = (window as any)?.Capacitor;
      const isNative = Boolean(maybeCapacitor?.isNativePlatform?.());
      // Sensible default for Android emulator when running bundled mobile mode.
      if (isNative) return 'http://10.0.2.2:8000';
    }
    return '';
  }
  return trimTrailingSlash(fromPublic);
}

function shouldStayOnAppWeb(input: string): boolean {
  return input.startsWith('/api/auth/signup/');
}

function normalizeGatewayPath(input: string): string {
  // When calling client gateway directly, strip the SvelteKit proxy prefix.
  if (input.startsWith('/api/proxy/')) {
    return `/${input.slice('/api/proxy/'.length)}`;
  }
  return input;
}

function resolveUrl(input: string): string {
  const base = resolveApiBaseUrl();
  if (!base || shouldStayOnAppWeb(input)) return input;

  const normalized = normalizeGatewayPath(input);

  if (/^https?:\/\//i.test(input)) return input;
  if (!normalized.startsWith('/')) return `${base}/${normalized}`;
  return `${base}${normalized}`;
}

type CapacitorHttpPlugin = {
  request?: (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    data?: unknown;
  }) => Promise<{
    status: number;
    headers?: Record<string, string>;
    data?: unknown;
  }>;
};

function isNativeCapacitorRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const maybeCapacitor = (window as any)?.Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
}

function getCapacitorHttpPlugin(): CapacitorHttpPlugin | null {
  if (typeof window === 'undefined') return null;
  return ((window as any)?.Capacitor?.Plugins?.CapacitorHttp || null) as CapacitorHttpPlugin | null;
}

function toCapacitorHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function toCapacitorData(init: RequestInit, headers: Headers): unknown {
  const body = init.body;
  if (body == null) return undefined;
  if (typeof body !== 'string') return body as unknown;

  const contentType = headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

function toResponse(
  payload: { status: number; headers?: Record<string, string>; data?: unknown },
): Response {
  const body =
    typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data ?? {});
  return new Response(body, {
    status: payload.status || 500,
    headers: new Headers(payload.headers || {}),
  });
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveUrl(input);
  const headers = new Headers(init.headers || {});
  const session = await loadAuthSession().catch(() => null);

  if (session?.accessToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${session.accessToken}`);
  }

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  const finalInit: RequestInit = {
    ...init,
    headers,
  };

  const capacitorHttp = getCapacitorHttpPlugin();
  const shouldUseNativeHttp =
    isNativeCapacitorRuntime() && Boolean(capacitorHttp?.request) && /^http:\/\//i.test(url);

  if (shouldUseNativeHttp && capacitorHttp?.request) {
    const nativeResponse = await capacitorHttp.request({
      url,
      method: (finalInit.method || 'GET').toUpperCase(),
      headers: toCapacitorHeaders(headers),
      data: toCapacitorData(finalInit, headers),
    });
    return toResponse(nativeResponse);
  }

  return fetch(url, finalInit);
}
