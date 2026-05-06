import { env } from '$env/dynamic/public';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  type AuthSessionRecord,
} from '$lib/mobile/session-storage';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const fromPublic = String(env.PUBLIC_API_BASE_URL || '').trim();
  return fromPublic ? trimTrailingSlash(fromPublic) : '';
}

function resolveUrl(input: string): string {
  const base = resolveApiBaseUrl();
  if (!base) return input;
  if (/^https?:\/\//i.test(input)) return input;
  if (!input.startsWith('/')) return `${base}/${input}`;
  return `${base}${input}`;
}

function isAuthRefreshPath(url: string): boolean {
  return /\/auth\/refresh(?:\?|$)/.test(url);
}

function isRetryableAuthPath(url: string): boolean {
  return !/\/auth\/(?:login|logout|refresh|verify-request|verify-token)(?:\?|$)/.test(url);
}

let refreshInFlight: Promise<AuthSessionRecord | null | 'unavailable'> | null = null;

async function refreshAccessToken(
  currentSession: AuthSessionRecord,
): Promise<AuthSessionRecord | null | 'unavailable'> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(resolveUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!data?.accessToken || !data?.refreshToken) return 'unavailable';

        const nextSession: AuthSessionRecord = {
          accessToken: String(data.accessToken),
          refreshToken: String(data.refreshToken),
          expiresInSec: Number(data.expiresInSec || 0) || undefined,
          issuedAtEpochSec: Math.floor(Date.now() / 1000),
        };
        await saveAuthSession(nextSession);
        return nextSession;
      }

      if (response.status === 400 || response.status === 401) {
        await clearAuthSession().catch(() => undefined);
        return null;
      }

      return 'unavailable';
    } catch {
      return 'unavailable';
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (
    response.status !== 401 ||
    !session?.refreshToken ||
    isAuthRefreshPath(url) ||
    !isRetryableAuthPath(url)
  ) {
    return response;
  }

  const refreshed = await refreshAccessToken(session);
  if (refreshed === 'unavailable') {
    return new Response(JSON.stringify({ error: 'Session refresh unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!refreshed?.accessToken) {
    return response;
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('authorization', `Bearer ${refreshed.accessToken}`);
  if (!retryHeaders.has('accept')) {
    retryHeaders.set('accept', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers: retryHeaders,
  });
}
