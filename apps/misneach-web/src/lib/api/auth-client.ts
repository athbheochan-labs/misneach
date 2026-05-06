import { apiFetch } from '$lib/api/client';

export async function requestMagicLink(email: string): Promise<Response> {
  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, appBaseUrl }),
  });
}

export async function exchangeMagicLink(email: string, token: string): Promise<Response> {
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-magic-token': token,
    },
    body: JSON.stringify({ email, token }),
  });
}
