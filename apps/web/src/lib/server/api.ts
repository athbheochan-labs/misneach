import type { RequestEvent } from '@sveltejs/kit';
import { INTERNAL_AUTH_SECRET, NEST_INTERNAL_URL, NEST_INTERNAL_URLS } from '$env/static/private';

function resolveNestBaseUrls(): string[] {
  const configured = (NEST_INTERNAL_URL || '').trim();
  const configuredList = (NEST_INTERNAL_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = [
    configured,
    ...configuredList,
    'http://client:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ].filter(Boolean);

  return [...new Set(candidates)];
}

export async function nestFetch(
  event: RequestEvent,
  path: string,
  init: RequestInit = {},
  requireAuth = true
) {
  const baseUrls = resolveNestBaseUrls();
  const headers = new Headers(init.headers || {});

  if (requireAuth) {
    if (!event.locals.auth) {
      throw new Error('Unauthenticated');
    }

    headers.set('x-user-id', String(event.locals.auth.userId));
    headers.set('x-client-id', event.locals.auth.clientId);
    headers.set('x-session-id', event.locals.auth.sessionId);
    if (event.locals.auth.email) {
      headers.set('x-user-email', event.locals.auth.email);
    }
    if (event.locals.auth.role) {
      headers.set('x-user-role', event.locals.auth.role);
    }
    if (INTERNAL_AUTH_SECRET) {
      headers.set('x-internal-auth', INTERNAL_AUTH_SECRET);
    }
  }

  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const cause =
        error && typeof error === 'object' && 'cause' in error
          ? (error as { cause?: unknown }).cause
          : undefined;
      console.warn('nestFetch failed', {
        url: `${baseUrl}${path}`,
        message,
        cause,
      });
    }
  }

  throw lastError instanceof Error
    ? new Error(`All upstreams failed for path ${path}: ${lastError.message}`)
    : new Error(`All upstreams failed for path ${path}`);
}
