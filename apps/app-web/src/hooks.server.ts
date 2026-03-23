import type { Handle } from '@sveltejs/kit';
import { sessionCookieName, verifySession } from '$lib/server/auth';

const COURSE_PREVIEW_COOKIE = 'courses_preview_token';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(sessionCookieName());
  event.locals.auth = token ? await verifySession(token) : null;
  const isDashboardRoute = event.url.pathname.startsWith('/dashboard');
  const isBusinessRoute = event.url.pathname.startsWith('/business');
  const isSignupRoute = event.url.pathname.startsWith('/auth/signup');
  const isLearner = (event.locals.auth?.role ?? 'learner') === 'learner';
  const signupComplete = event.locals.auth?.signupComplete !== false;

  if ((isDashboardRoute || isBusinessRoute) && !event.locals.auth) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/login' }
    });
  }

  if (isDashboardRoute && event.locals.auth && isLearner && !signupComplete) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/signup' }
    });
  }

  if (isSignupRoute && event.locals.auth && isLearner && signupComplete) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' }
    });
  }

  if (event.locals.auth?.role === 'admin') {
    const previewToken = event.url.searchParams.get('previewToken');
    if (previewToken === 'off') {
      event.cookies.delete(COURSE_PREVIEW_COOKIE, { path: '/' });
    } else if (previewToken && process.env.COURSES_PREVIEW_ENABLED !== 'false') {
      event.cookies.set(COURSE_PREVIEW_COOKIE, previewToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 60,
      });
    }
  } else {
    event.cookies.delete(COURSE_PREVIEW_COOKIE, { path: '/' });
  }

  event.locals.previewToken = event.cookies.get(COURSE_PREVIEW_COOKIE) || null;

  return resolve(event);
};
