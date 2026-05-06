import type { Handle } from '@sveltejs/kit';
import { sessionCookieName, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const authMode = (process.env.AUTH_MODE || 'token').toLowerCase();
  const tokenModeEnabled = authMode !== 'session';
  const token = event.cookies.get(sessionCookieName());
  event.locals.auth = token ? await verifySession(token) : null;
  const isDashboardRoute = event.url.pathname.startsWith('/dashboard');
  const isSignupRoute = event.url.pathname.startsWith('/auth/signup');
  const isLearner = (event.locals.auth?.role ?? 'learner') === 'learner';
  const signupComplete = event.locals.auth?.signupComplete !== false;

  if (!tokenModeEnabled && isDashboardRoute && !event.locals.auth) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/login' }
    });
  }

  if (!tokenModeEnabled && isDashboardRoute && event.locals.auth && isLearner && !signupComplete) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/signup' }
    });
  }

  if (!tokenModeEnabled && isSignupRoute && event.locals.auth && isLearner && signupComplete) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' }
    });
  }

  return resolve(event);
};
