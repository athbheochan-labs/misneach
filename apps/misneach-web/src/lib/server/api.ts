import type { RequestEvent } from '@sveltejs/kit';
import { getInternalAuthSecret, resolveApiBaseUrls } from '$lib/server/upstreams';

export async function nestFetch(
  event: RequestEvent,
  path: string,
  init: RequestInit = {},
  requireAuth = true
) {
  const baseUrls = resolveApiBaseUrls();
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
    const internalAuthSecret = getInternalAuthSecret();
    if (internalAuthSecret) {
      headers.set('x-internal-auth', internalAuthSecret);
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
