import { env } from '$env/dynamic/public';
import { loadAuthSession } from '$lib/mobile/session-storage';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const fromPublic = String(env.PUBLIC_API_BASE_URL || '').trim();
  if (!fromPublic) return '';
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

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
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

  return fetch(resolveUrl(input), finalInit);
}
