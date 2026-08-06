import { apiFetch } from '$lib/api/client';
import { clearAuthSession } from '$lib/mobile/session-storage';

export type AuthUser = {
  id: number;
  email: string;
  clientId: string;
  role: 'learner' | 'admin';
  signupComplete?: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string;
  createdAt?: string;
};

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

export async function getAuthMe(): Promise<{ loggedIn: boolean; user: AuthUser | null; cause?: string }> {
  const res = await apiFetch('/auth/me', { cache: 'no-store' });
  if (!res.ok) {
    return { loggedIn: false, user: null, cause: res.status === 401 ? 'unauthenticated' : 'unavailable' };
  }
  return res.json();
}

export async function updateProfile(body: {
  displayName?: string | null;
  avatarUrl?: string | null;
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string;
}): Promise<{ ok: boolean; user: AuthUser }> {
  const res = await apiFetch('/auth/me/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Unable to update profile');
  }
  return data;
}

export async function requestLogout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await clearAuthSession().catch(() => undefined);
}
