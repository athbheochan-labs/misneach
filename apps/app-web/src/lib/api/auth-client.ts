import { apiFetch } from '$lib/api/client';

export type AuthMeUser = {
  id: number;
  clientId: string;
  email: string;
  role: 'admin' | 'learner';
  signupComplete: boolean;
};

export type AuthMeResult = {
  loggedIn: boolean;
  user: AuthMeUser | null;
  cause?: 'unauthenticated' | 'unavailable';
  status?: number;
};

export async function requestMagicLink(email: string): Promise<Response> {
  return apiFetch('/api/proxy/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function exchangeMagicLink(email: string, token: string): Promise<Response> {
  return apiFetch('/api/proxy/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-magic-token': token,
    },
    body: JSON.stringify({ email, token }),
  });
}

export async function getAuthMe(): Promise<AuthMeResult> {
  const res = await apiFetch('/api/proxy/auth/me', { cache: 'no-store' });
  if (!res.ok) {
    return {
      loggedIn: false,
      user: null,
      cause: res.status === 401 ? 'unauthenticated' : 'unavailable',
      status: res.status,
    };
  }
  const payload = await res.json().catch(() => ({} as any));

  const loggedIn = Boolean(payload?.loggedIn);
  const rawUser = payload?.user;
  if (!loggedIn || !rawUser) {
    return {
      loggedIn: false,
      user: null,
      cause: 'unauthenticated',
      status: 200,
    };
  }

  return {
    loggedIn: true,
    user: {
      id: Number(rawUser.id || 0),
      clientId: String(rawUser.clientId || ''),
      email: String(rawUser.email || ''),
      role: rawUser.role === 'admin' ? 'admin' : 'learner',
      signupComplete: Boolean(rawUser.signupComplete),
    },
    cause: undefined,
    status: 200,
  };
}

export async function requestLogout(): Promise<void> {
  await apiFetch('/api/proxy/auth/logout', { method: 'POST' });
}
